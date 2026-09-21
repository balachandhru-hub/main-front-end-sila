import React, { useEffect, useMemo, useRef, useState } from "react";
import "../../../../remote-buyer/src/components/BuyerRFQChat/BuyerRFQChat.css";
import { isErrorResponse } from "@vosox/shared-ui";
import type { ChatMessageDto, ChatThreadDto, PersonDetailDto } from "../../api/supplierApi";
import {
  fetchSupplierMessageThreads,
  fetchSupplierMessageHistory,
  markSupplierThreadAsRead,
  sendSupplierMessage,
  downloadSupplierMessageAttachment,
} from "../../api/supplierApi";
import { useSupplierAuthStore } from "../../store/useSupplierAuthStore";
import { toastService } from "@vosox/shared-ui";
import SupplierChatConversation from "./SupplierChatConversation";
import SupplierChatDetails from "./SupplierChatDetails";
import type { ObservedParticipant } from "./types";
import {
  downloadBase64File,
  fileToBase64,
  formatThreadTime,
  getInitials,
} from "../../../../remote-buyer/src/components/BuyerRFQChat/chatUtils";
import { IconClose, IconMessageSquare } from "../../../../remote-buyer/src/components/BuyerRFQChat/ChatIcons";
import { startRfqChatHub, stopRfqChatHub } from "../../../../remote-buyer/src/signalr/rfqChatHub";
import { apiKey as supplierApiKey } from "../../api/supplierInstance";

const HISTORY_PAGE_LIMIT = 20;

interface SupplierRFQChatProps {
  onClose: () => void;
  rfqId: string;
  rfqNumber?: string;
  rfqTitle?: string;
  supplierId: string;
  /** From the RFQ-by-id response — preferred over the threads API's counterpartyName. */
  buyerId?: string;
  buyerName?: string;
  /**
   * Logged-in user's profile when it lives outside the supplier auth store
   * (e.g. Supplier Admin, whose profile is in the platform-user store).
   */
  personDetail?: PersonDetailDto | null;
}

const SupplierRFQChat: React.FC<SupplierRFQChatProps> = ({
  onClose,
  rfqId,
  rfqNumber,
  rfqTitle,
  supplierId,
  buyerId,
  buyerName,
  personDetail,
}) => {
  // The supplier side of an RFQ is always a single conversation with the
  // buyer who created it — unlike the Buyer Admin chat, there is no list of
  // counterparties to group/select between.
  const [thread, setThread] = useState<ChatThreadDto | null>(null);
  const [loadingThread, setLoadingThread] = useState(true);

  const [mobileView, setMobileView] = useState<"list" | "conversation">("list");
  const [isChatDetailsOpen, setIsChatDetailsOpen] = useState(false);

  // Sourced from the store, which fetches it once (on login and on reload) via
  // SupplierApp's mount effect - no per-component fetch, no local cache.
  const storePersonDetail = useSupplierAuthStore((state) => state.personDetail);
  const myProfile = personDetail ?? storePersonDetail;

  const isLoadingMyProfile = useSupplierAuthStore((state) => state.personDetailLoading);

  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [scrollTick, setScrollTick] = useState(0);

  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);

  // Read inside the SignalR handler (registered once per rfqId/supplierId) so
  // it always sees the current thread without needing to reconnect once the
  // very first message resolves it.
  const threadIdRef = useRef<string | null>(null);

  // buyerName/buyerId from the RFQ-by-id response are the source of truth for
  // the Buyer's identity — the threads API's counterpartyName is only a
  // fallback for when buyerName is unavailable.
  const counterpartyName = buyerName || thread?.counterpartyName || "Buyer";

  // Other supplier-side people are only knowable from who has actually sent
  // a message in this thread — not from any invited-users list.
  const observedParticipants = useMemo<ObservedParticipant[]>(() => {
    const seen = new Map<string, string>();
    for (const message of messages) {
      if (message.senderOrganizationType?.toLowerCase() !== "supplier") continue;
      if (!message.senderUserId || !message.senderName) continue;
      if (message.senderUserId === myProfile?.userId) continue;
      if (!seen.has(message.senderUserId)) seen.set(message.senderUserId, message.senderName);
    }
    return Array.from(seen.entries()).map(([userId, name]) => ({ userId, name }));
  }, [messages, myProfile?.userId]);

  const loadInitialHistory = async (threadId: string, unreadCount: number) => {
    setLoadingMessages(true);
    setMessagesError(null);
    try {
      const data = await fetchSupplierMessageHistory(threadId, 0, HISTORY_PAGE_LIMIT);
      if (isErrorResponse(data)) {
        setMessagesError(data.description || data.message || "Failed to load conversation history.");
        return;
      }
      const sorted = [...data].sort(
        (a, b) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime()
      );
      setMessages(sorted);
      setHistoryIndex(data.length);
      setHasMoreHistory(data.length === HISTORY_PAGE_LIMIT);
      setScrollTick((t) => t + 1);

      if (unreadCount > 0) {
        const readResult = await markSupplierThreadAsRead(threadId);
        if (isErrorResponse(readResult)) {
          toastService.error(readResult.description || readResult.message || "Failed to mark conversation as read.");
        } else {
          setThread((prev) => (prev && prev.threadId === threadId ? { ...prev, unreadCount: 0 } : prev));
        }
      }
    } catch (err: any) {
      setMessagesError(err?.message || "Failed to load conversation history.");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setLoadingThread(true);
      try {
        const result = await fetchSupplierMessageThreads(rfqId);
        if (cancelled) return;
        if (isErrorResponse(result)) {
          const msg = result.description || result.message || "Failed to load conversation.";
          toastService.error(msg);
          setLoadingThread(false);
          return;
        }
        const existing = result.find((t) => t.supplierId === supplierId) || null;
        setThread(existing);
        setLoadingThread(false);
        if (existing) {
          await loadInitialHistory(existing.threadId, existing.unreadCount);
        }
      } catch (err: any) {
        if (!cancelled) {
          const msg = err?.message || "Failed to load conversation.";
          toastService.error(msg);
          setLoadingThread(false);
        }
      }
    };
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId, supplierId]);

  useEffect(() => {
    threadIdRef.current = thread?.threadId || null;
  }, [thread]);

  // Routes a live SignalR message into the conversation. The connection is
  // scoped to this rfqId+supplierId pair (see below), so every message it
  // delivers already belongs to this supplier's single thread with the
  // buyer — unlike the Buyer Admin chat there's no list of other threads to
  // route around.
  const handleIncomingMessages = (payload: ChatMessageDto | ChatMessageDto[]) => {
    const incoming = Array.isArray(payload) ? payload : [payload];
    if (incoming.length === 0) return;

    const openThreadId = threadIdRef.current;
    const relevant = openThreadId ? incoming.filter((m) => m.threadId === openThreadId) : incoming;
    console.log("[SupplierRFQChat] Incoming SignalR payload:", {
      incomingCount: incoming.length,
      openThreadId,
      relevantCount: relevant.length,
    });
    if (relevant.length === 0) return;

    let appended: ChatMessageDto[] = [];
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      appended = relevant.filter((m) => !existingIds.has(m.id));
      return appended.length > 0 ? [...prev, ...appended] : prev;
    });

    if (appended.length === 0) {
      console.log("[SupplierRFQChat] All incoming messages were already present (duplicate) — nothing appended.");
      return;
    }

    setScrollTick((t) => t + 1);

    const latest = appended[appended.length - 1];
    setThread((prev) => ({
      threadId: latest.threadId,
      rfqId,
      rfqNumber: rfqNumber || prev?.rfqNumber || "",
      buyerId: buyerId || prev?.buyerId || "",
      supplierId,
      counterpartyName: prev?.counterpartyName || counterpartyName,
      lastMessageBody: latest.body || (latest.attachments?.length > 0 ? "Sent an attachment" : ""),
      lastMessageAt: latest.dateCreated,
      unreadCount: 0,
    }));
  };

  useEffect(() => {
    // supplierId is included so the backend scopes this connection to just
    // this supplier's thread on the RFQ — a bare rfqId (as used by the Buyer
    // Admin chat, which legitimately needs every supplier thread on the RFQ)
    // would otherwise also deliver other suppliers' conversations here.
    // The API key mirrors every other supplierInstance REST call (see
    // supplierInstance.ts) — sent on the negotiate request; browsers cannot
    // attach it to the WebSocket/SSE upgrade itself (a platform limitation,
    // see rfqChatHub.ts).
    startRfqChatHub({ rfqId, supplierId, headers: { "X-API-Key": supplierApiKey } }, handleIncomingMessages).catch(
      (err) => {
        console.error("[SupplierRFQChat] SignalR connection failed:", err);
      }
    );

    return () => {
      stopRfqChatHub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId, supplierId]);

  const handleSelectThread = () => setMobileView("conversation");
  const handleBackToList = () => setMobileView("list");

  const handleLoadOlder = async () => {
    if (!thread || loadingMoreMessages || !hasMoreHistory) return;
    setLoadingMoreMessages(true);
    try {
      const data = await fetchSupplierMessageHistory(thread.threadId, historyIndex, HISTORY_PAGE_LIMIT);
      if (isErrorResponse(data)) {
        toastService.error(data.description || data.message || "Failed to load older messages.");
        return;
      }
      const sorted = [...data].sort(
        (a, b) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime()
      );
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        return [...sorted.filter((m) => !existingIds.has(m.id)), ...prev];
      });
      setHistoryIndex((prev) => prev + data.length);
      setHasMoreHistory(data.length === HISTORY_PAGE_LIMIT);
    } catch (err: any) {
      toastService.error(err?.message || "Failed to load older messages.");
    } finally {
      setLoadingMoreMessages(false);
    }
  };

  const handleSendMessage = async (body: string, files: File[]): Promise<boolean> => {
    if (isSendingMessage) return false;
    setIsSendingMessage(true);
    try {
      const attachments = await Promise.all(
        files.map(async (file) => ({
          fileBytes: await fileToBase64(file),
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
        }))
      );

      const result = await sendSupplierMessage({ rfqId, supplierId, body, attachments });
      if (isErrorResponse(result)) {
        toastService.error(result.description || result.message || "Failed to send message.");
        return false;
      }

      // The SignalR broadcast for this same message can arrive before this
      // REST response does — dedup by id so it isn't appended twice.
      setMessages((prev) => (prev.some((m) => m.id === result.id) ? prev : [...prev, result]));
      setThread((prev) => ({
        threadId: result.threadId,
        rfqId,
        rfqNumber: rfqNumber || prev?.rfqNumber || "",
        buyerId: buyerId || prev?.buyerId || "",
        supplierId,
        counterpartyName,
        lastMessageBody: result.body || (result.attachments.length > 0 ? "Sent an attachment" : ""),
        lastMessageAt: result.dateCreated,
        unreadCount: 0,
      }));
      setScrollTick((t) => t + 1);
      return true;
    } catch (err: any) {
      toastService.error(err?.message || "Failed to send message.");
      return false;
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleDownloadAttachment = async (attachmentId: string, fallbackFileName: string) => {
    if (downloadingAttachmentId) return;
    setDownloadingAttachmentId(attachmentId);
    try {
      const data = await downloadSupplierMessageAttachment(attachmentId);
      if (isErrorResponse(data)) {
        toastService.error(data.description || data.message || "Failed to download attachment.");
        return;
      }
      downloadBase64File(data.fileBytes, data.fileName || fallbackFileName, data.contentType);
    } catch (err: any) {
      toastService.error(err?.message || "Failed to download attachment.");
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  return (
    <div className="brc-overlay" onClick={onClose}>
      <div className="brc-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="brc-header">
          <div className="brc-header-title-row">
            <span className="brc-header-icon">
              <IconMessageSquare />
            </span>
            <div className="brc-header-text">
              <h2 className="brc-header-title">{rfqTitle ? `Chat — ${rfqTitle}` : "RFQ Chat"}</h2>
              <div className="brc-header-subtitle">
                {rfqNumber ? `${rfqNumber}` : ""}
                {!!thread?.unreadCount && `${rfqNumber ? " • " : ""}${thread.unreadCount} unread`}
              </div>
            </div>
          </div>
          <button type="button" className="brc-close-btn" onClick={onClose} aria-label="Close chat">
            <IconClose />
          </button>
        </div>

        <div className={`brc-body brc-mobile-${mobileView}`}>
          <div className="brc-supplier-list">
            <div className="brc-supplier-list-header">Chats</div>
            <div className="brc-supplier-items">
              {loadingThread ? (
                <div className="brc-loading-state">
                  <div className="brc-spinner-md" />
                  <span>Loading conversation...</span>
                </div>
              ) : (
                <>
                  <div
                    className="brc-supplier-item brc-supplier-item-active"
                    onClick={handleSelectThread}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="brc-supplier-avatar">{getInitials(counterpartyName)}</div>
                    <div className="brc-supplier-info">
                      <div className="brc-supplier-name-row">
                        <span className="brc-supplier-name">{counterpartyName}</span>
                        {thread?.lastMessageAt && (
                          <span className="brc-supplier-time">{formatThreadTime(thread.lastMessageAt)}</span>
                        )}
                      </div>
                      {rfqNumber && <div className="brc-supplier-user-count">{rfqNumber}</div>}
                      <div className="brc-supplier-preview-row">
                        {thread ? (
                          <span className="brc-supplier-preview">{thread.lastMessageBody || "No messages yet"}</span>
                        ) : (
                          <span className="brc-supplier-preview-start">Start chat</span>
                        )}
                        {!!thread?.unreadCount && (
                          <span className="brc-unread-badge">
                            {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {isChatDetailsOpen ? (
            <SupplierChatDetails
              counterpartyName={counterpartyName}
              myProfile={myProfile}
              isLoadingMyProfile={isLoadingMyProfile}
              observedParticipants={observedParticipants}
              onBack={() => setIsChatDetailsOpen(false)}
            />
          ) : (
            <SupplierChatConversation
              counterpartyName={counterpartyName}
              myProfile={myProfile}
              hasThread={!!thread}
              messages={messages}
              isLoadingMessages={loadingMessages}
              messagesError={messagesError}
              hasMoreHistory={hasMoreHistory}
              isLoadingMoreMessages={loadingMoreMessages}
              onLoadOlder={handleLoadOlder}
              isSendingMessage={isSendingMessage}
              onSendMessage={handleSendMessage}
              downloadingAttachmentId={downloadingAttachmentId}
              onDownloadAttachment={handleDownloadAttachment}
              onBackToList={handleBackToList}
              onOpenDetails={() => setIsChatDetailsOpen(true)}
              scrollTick={scrollTick}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierRFQChat;
