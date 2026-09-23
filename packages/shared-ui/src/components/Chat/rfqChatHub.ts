import * as signalR from "@microsoft/signalr";
import type { ChatMessageDto } from "./chatTypes";

// Hub routes confirmed by the backend team. The SignalR client is only ever
// given the hub route itself (never /negotiate) — it appends that itself.
const BUYER_CHAT_HUB_PATH = "/buyermessageHub";
const SUPPLIER_CHAT_HUB_PATH = "/suppliermessageHub";
// Confirmed from live traffic: the backend broadcasts a new message on both
// of these events, each carrying the identical ChatMessageDto payload (as a
// single object, not an array). Subscribed to both since there's no basis to
// drop either — duplicate delivery is already handled by the callers'
// id-based dedup.
const RECEIVE_MESSAGE_EVENTS = ["NewMessage", "NewMessageNotification"] as const;

type ConnectionStatus = "connected" | "disconnected";

// Shared by the Buyer Admin RFQ chat (connects with just rfqId to receive
// every supplier thread under that RFQ) and the Supplier Admin RFQ chat
// (also passes supplierId so it only ever receives its own single thread
// with the buyer, never another supplier's conversation on the same RFQ).
export interface RfqChatHubParams {
  rfqId: string;
  supplierId?: string;
  /**
   * Extra headers for the connection's HTTP requests (the negotiate call,
   * and long-polling/SSE if the browser falls back to them). Browsers
   * cannot attach custom headers to a WebSocket handshake, so this will
   * NOT reach the backend once the connection has upgraded to WebSockets.
   * Used to carry the same `X-API-Key` the supplier/platform REST clients
   * already send (see supplierInstance.ts) — the Buyer Admin chat's REST
   * client sends no such key, so it passes none here either.
   */
  headers?: Record<string, string>;
  /**
   * ExternalSupplier chat only. An ExternalSupplier has no JWT, so the hub
   * (MessageHub.OnConnectedAsync) authenticates it from the `session_token`
   * and `external_rfq_id` QUERY STRING params - it never reads the
   * X-Session-Token header, which cannot reach the WebSocket handshake
   * anyway. Without this the connection is rejected and the supplier never
   * receives the buyer's messages.
   */
  externalSessionToken?: string;
}

// SignalR's built-in console logger reports a deliberately stopped attempt
// ("The connection was stopped during negotiation") at Error level. That is
// expected whenever a chat effect is cleaned up mid-connect (see the
// AbortError handling in startRfqChatHub), so log just that one at debug and
// leave every other message at its normal level.
const chatHubLogger: signalR.ILogger = {
  log(level, message) {
    const text = `[${new Date().toISOString()}] ${signalR.LogLevel[level]}: ${message}`;
    if (message.includes("stopped during negotiation")) console.debug(text);
    else if (level >= signalR.LogLevel.Error) console.error(text);
    else if (level === signalR.LogLevel.Warning) console.warn(text);
    else if (level === signalR.LogLevel.Information) console.info(text);
    else console.debug(text);
  },
};

let connection: signalR.HubConnection | null = null;
let currentConnectionKey: string | null = null;
let isConnecting = false;
let connectionPromise: Promise<void> | null = null;
// Identifies which connect attempt currently owns the state above. Needed
// because `currentConnectionKey` alone can't distinguish "a newer attempt
// for the same rfqId/supplierId" from "this exact attempt" — a superseded
// attempt's late-firing callbacks (onclose, or even a delayed success) must
// not be allowed to touch state that a newer, still-live connection owns.
let activeAttemptId = 0;

const buildConnectionKey = ({ rfqId, supplierId, externalSessionToken }: RfqChatHubParams) =>
  `${rfqId}::${supplierId || ""}::${externalSessionToken ? "external" : ""}`;

const buildHubUrl = ({ rfqId, supplierId, externalSessionToken }: RfqChatHubParams) => {
  const apiBaseUrl = (import.meta.env.VITE_AUTH_API_BASE as string).replace(/\/+$/, "");
  // supplierId is only ever passed by the Supplier Admin chat —
  // the Buyer Admin chat always connects with just rfqId.
  const hubPath = supplierId ? SUPPLIER_CHAT_HUB_PATH : BUYER_CHAT_HUB_PATH;
  const query = new URLSearchParams({ rfqId });
  if (supplierId) query.set("supplierId", supplierId);
  if (externalSessionToken) {
    query.set("session_token", externalSessionToken);
    query.set("external_rfq_id", rfqId);
  }
  return `${apiBaseUrl}${hubPath}?${query.toString()}`;
};

export const startRfqChatHub = async (
  params: RfqChatHubParams,
  onReceiveMessages: (messages: ChatMessageDto | ChatMessageDto[]) => void,
  onStatusChange?: (status: ConnectionStatus) => void
) => {
  const key = buildConnectionKey(params);

  if (isConnecting && currentConnectionKey === key && connectionPromise) {
    console.log("[SignalR] Connect already in flight for", key, "— awaiting it instead of starting a second one.");
    try {
      await connectionPromise;
      return;
    } catch (err) {
      // The in-flight attempt we were piggy-backing on was aborted (e.g. by
      // a concurrent stop from a React StrictMode dev-mode
      // mount/cleanup/remount tearing down the first of the two mounts
      // before it finished negotiating). Don't propagate that failure —
      // fall through and start a fresh connection instead, since this call
      // represents a still-mounted effect that genuinely needs one.
      console.warn("[SignalR] The connection attempt this call was waiting on was aborted — retrying.", err);
    }
  }

  if (connection && currentConnectionKey === key && connection.state === signalR.HubConnectionState.Connected) {
    console.log("[SignalR] Already connected for", key, "— reusing existing connection.");
    return;
  }

  if (connection && currentConnectionKey !== key) {
    console.log("[SignalR] Switching connection from", currentConnectionKey, "to", key, "— stopping the old one first.");
    await stopRfqChatHub();
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  isConnecting = true;
  currentConnectionKey = key;
  const myAttemptId = ++activeAttemptId;

  const hubUrl = buildHubUrl(params);
  console.log("[SignalR] Connecting...", hubUrl);

  try {
    // Captured locally (not just read back off the module-level `connection`
    // variable) because a concurrent stop — e.g. React StrictMode's
    // mount/cleanup/remount in dev — can null out that module variable while
    // this specific connection's own .start() is still in flight.
    const activeConnection = new signalR.HubConnectionBuilder()
      .configureLogging(chatHubLogger)
      .withUrl(hubUrl, {
        withCredentials: true,
        headers: params.headers,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents,
        skipNegotiation: false,
        timeout: 30000,
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .build();
    connection = activeConnection;

    for (const eventName of RECEIVE_MESSAGE_EVENTS) {
      activeConnection.off(eventName);
      activeConnection.on(eventName, (payload: ChatMessageDto | ChatMessageDto[]) => {
        console.log(`[SignalR] ${eventName}`, payload);
        onReceiveMessages(payload);
      });
    }

    activeConnection.onreconnecting((err) => {
      console.warn("[SignalR] Reconnecting...", err);
      if (myAttemptId !== activeAttemptId) return; // superseded — not the live connection anymore
      onStatusChange?.("disconnected");
    });

    activeConnection.onreconnected(() => {
      console.log("[SignalR] Reconnected");
      if (myAttemptId !== activeAttemptId) return;
      onStatusChange?.("connected");
    });

    activeConnection.onclose((err) => {
      console.warn("[SignalR] Connection closed", err);
      // Only clear shared state if this attempt is still the one that owns
      // it — a superseded attempt's close firing late must not clobber a
      // newer, still-live connection's state.
      if (myAttemptId === activeAttemptId) {
        if (currentConnectionKey === key) {
          connection = null;
          currentConnectionKey = null;
        }
        isConnecting = false;
      }
      onStatusChange?.("disconnected");
    });

    connectionPromise = activeConnection.start();
    await connectionPromise;

    if (myAttemptId !== activeAttemptId) {
      // A newer attempt (e.g. from a React StrictMode remount) already took
      // over while this one was negotiating. This connection is redundant —
      // stop it quietly instead of leaving two live connections around.
      console.warn("[SignalR] A newer connection attempt superseded this one after it connected — stopping the redundant one.");
      for (const eventName of RECEIVE_MESSAGE_EVENTS) activeConnection.off(eventName);
      await activeConnection.stop().catch(() => {});
      return;
    }

    isConnecting = false;
    connectionPromise = null;
    console.log("[SignalR] Connected", { hubUrl, state: activeConnection.state });
    onStatusChange?.("connected");
  } catch (err) {
    // An AbortError means this attempt was stopped on purpose while it was
    // still negotiating - stopRfqChatHub() from an effect cleanup (React
    // StrictMode's dev mount/cleanup/remount, or the rfqId/supplier changing
    // or the panel closing). That is not a connection failure: don't log it
    // as one, don't surface it to the caller, and don't report "disconnected"
    // for a connection that was never meant to stay open.
    if (err instanceof signalR.AbortError || (err as Error | undefined)?.name === "AbortError") {
      console.debug("[SignalR] Connection attempt stopped during negotiation (intentional):", key);
      if (myAttemptId === activeAttemptId) {
        connection = null;
        currentConnectionKey = null;
        isConnecting = false;
        connectionPromise = null;
      }
      return;
    }

    console.error("[SignalR] Connection failed:", err, "URL:", hubUrl);
    if (myAttemptId === activeAttemptId) {
      connection = null;
      currentConnectionKey = null;
      isConnecting = false;
      connectionPromise = null;
    }
    onStatusChange?.("disconnected");
    throw err;
  }
};

export const stopRfqChatHub = async () => {
  const stopping = connection;
  if (stopping) {
    try {
      for (const eventName of RECEIVE_MESSAGE_EVENTS) stopping.off(eventName);

      if (stopping.state !== signalR.HubConnectionState.Disconnected) {
        console.log("[SignalR] Stopping connection", currentConnectionKey);
        await stopping.stop();
      }
    } catch (err) {
      console.warn("[SignalR] Error while stopping connection:", err);
    } finally {
      // stop() is async: by the time it resolves, a newer connect attempt
      // (e.g. StrictMode's remount) may already own the shared state. Only
      // clear it if it is still the connection we were asked to stop.
      if (connection === stopping) {
        connection = null;
        currentConnectionKey = null;
        isConnecting = false;
        connectionPromise = null;
      }
    }
  }
};
