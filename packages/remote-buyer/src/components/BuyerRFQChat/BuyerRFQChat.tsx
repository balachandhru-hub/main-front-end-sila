import React, { useEffect, useMemo, useRef, useState } from "react";
import "./BuyerRFQChat.css";
import type { RfqSupplierRefDto } from "../../dto/rfqDto";
import type { ChatMessageDto, ChatThreadDto } from "../../dto/chatDto";
import {
  fetchBuyerMessageThreads,
  fetchBuyerMessageHistory,
  markBuyerThreadAsRead,
  sendBuyerMessage,
  downloadBuyerMessageAttachment,
  getPersonDetailCached,
} from "../../api/Buyerapi";
import type { PersonDetailDto } from "../../api/Buyerapi";
import { toastService, isErrorResponse } from "@vosox/shared-ui";
import ChatConversation from "./ChatConversation";
import ChatDetails from "./ChatDetails";
import type { ChatSupplier, ObservedParticipant } from "./types";
import { downloadBase64File, fileToBase64, formatThreadTime, getInitials } from "./chatUtils";
import { IconClose, IconMessageSquare } from "./ChatIcons";
import { startRfqChatHub, stopRfqChatHub } from "../../signalr/rfqChatHub";

const HISTORY_PAGE_LIMIT = 20;

interface BuyerRFQChatProps {
  onClose: () => void;
  rfqId: string;
  rfqNumber?: string;
  rfqTitle?: string;
  /** The ONLY source of which suppliers appear in the chat and their display names. */
  supplierIds: RfqSupplierRefDto[];
  /** supplierId -> known organization/supplier display name, e.g. sourced from supplierQuotation. */
  supplierNames?: Record<string, string>;
}

const BuyerRFQChat: React.FC<BuyerRFQChatProps> = ({
  onClose,
  rfqId,
  rfqNumber,
  rfqTitle,
  supplierIds,
  supplierNames,
}) => {
  const [threads, setThreads] = useState<ChatThreadDto[]>([]);
  // Starts true (not false) because threads are always fetched on mount — this
  // keeps the auto-select-first-supplier effect below from firing on the very
  // first render pass, before that fetch has actually populated `threads`.
  const [loadingThreads, setLoadingThreads] = useState(true);

  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "conversation">("list");
  const [isChatDetailsOpen, setIsChatDetailsOpen] = useState(false);

  const [buyerProfile, setBuyerProfile] = useState<PersonDetailDto | null>(null);
  const [isLoadingBuyerProfile, setIsLoadingBuyerProfile] = useState(false);

  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [scrollTick, setScrollTick] = useState(0);

  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);

  // Read inside the SignalR handler (registered once per rfqId) so it always
  // sees the currently open thread without reconnecting on every supplier switch.
  const selectedThreadIdRef = useRef<string | null>(null);

  // One chat thread per supplier. `supplierIds` from the RFQ is the ONLY
  // source for which suppliers appear here — a matching thread (if any) is
  // merged in, but a supplier with no thread still gets a "Start chat" entry.
  const chatSuppliers = useMemo<ChatSupplier[]>(() => {
    const list: ChatSupplier[] = supplierIds
      .filter((s) => !!s?.supplierId)
      .map((s) => {
        const thread = threads.find((t) => t.supplierId === s.supplierId) || null;
        const supplierName = thread?.counterpartyName || s.supplierName || supplierNames?.[s.supplierId] || "Supplier";
        return {
          supplierId: s.supplierId,
          supplierName,
          thread,
        };
      });

    list.sort((a, b) => {
      const at = a.thread?.lastMessageAt ? new Date(a.thread.lastMessageAt).getTime() : 0;
      const bt = b.thread?.lastMessageAt ? new Date(b.thread.lastMessageAt).getTime() : 0;
      return bt - at;
    });

    return list;
  }, [supplierIds, threads, supplierNames]);

  const currentSupplier = chatSuppliers.find((s) => s.supplierId === selectedSupplierId) || null;
  const totalUnread = threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);

  // Individual supplier-side people are only knowable from who has actually
  // sent a message in the currently open thread — not from invitedUsers.
  const observedParticipants = useMemo<ObservedParticipant[]>(() => {
    const seen = new Map<string, string>();
    for (const message of messages) {
      if (message.senderOrganizationType?.toLowerCase() === "buyer") continue;
      if (!message.senderUserId || !message.senderName) continue;
      if (!seen.has(message.senderUserId)) seen.set(message.senderUserId, message.senderName);
    }
    return Array.from(seen.entries()).map(([userId, name]) => ({ userId, name }));
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    const loadBuyerProfile = async () => {
      setIsLoadingBuyerProfile(true);
      try {
        // Cached/shared with the dashboard Header, so this does not trigger a
        // duplicate network call when the profile is already loaded.
        const result = await getPersonDetailCached();
        if (cancelled) return;
        if (!isErrorResponse(result)) {
          setBuyerProfile(result);
        }
      } finally {
        if (!cancelled) setIsLoadingBuyerProfile(false);
      }
    };
    loadBuyerProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadThreads = async () => {
      setLoadingThreads(true);
      try {
        const data = await fetchBuyerMessageThreads(rfqId);
        if (!cancelled) setThreads(data);
      } catch (err: any) {
        if (!cancelled) {
          const msg = err?.message || "Failed to load conversations.";
          toastService.error(msg);
        }
      } finally {
        if (!cancelled) setLoadingThreads(false);
      }
    };
    loadThreads();
    return () => {
      cancelled = true;
    };
  }, [rfqId]);

  useEffect(() => {
    selectedThreadIdRef.current = currentSupplier?.thread?.threadId || null;
  }, [currentSupplier]);

  // Routes a live SignalR message into the open conversation (if it belongs to
  // the thread currently on screen) and/or the supplier list preview/unread
  // count. Uses a ref for the selected thread instead of a dependency so the
  // hub connection below doesn't need to be recreated every time the buyer
  // switches suppliers.
  const handleIncomingMessages = (payload: ChatMessageDto | ChatMessageDto[]) => {
    const incoming = Array.isArray(payload) ? payload : [payload];
    if (incoming.length === 0) return;

    const openThreadId = selectedThreadIdRef.current;
    console.log("[BuyerRFQChat] Incoming SignalR payload:", {
      incomingCount: incoming.length,
      openThreadId,
      incomingThreadIds: incoming.map((m) => m.threadId),
    });

    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const forOpenThread = incoming.filter(
        (m) => m.threadId === openThreadId && !existingIds.has(m.id)
      );
      return forOpenThread.length > 0 ? [...prev, ...forOpenThread] : prev;
    });

    if (incoming.some((m) => m.threadId === openThreadId)) {
      setScrollTick((t) => t + 1);
    }

    let hasUnknownThread = false;
    setThreads((prev) => {
      const next = [...prev];
      incoming.forEach((message) => {
        const idx = next.findIndex((t) => t.threadId === message.threadId);
        if (idx === -1) {
          hasUnknownThread = true;
          return;
        }
        const isOpenThread = message.threadId === openThreadId;
        next[idx] = {
          ...next[idx],
          lastMessageBody: message.body || (message.attachments?.length ? "Sent an attachment" : ""),
          lastMessageAt: message.dateCreated,
          unreadCount: isOpenThread ? 0 : next[idx].unreadCount + 1,
        };
      });
      return next;
    });

    // A message for a thread this panel hasn't seen yet (e.g. a supplier's
    // first reply) — refresh the thread list from the existing REST endpoint
    // rather than guessing at a new ChatThreadDto's fields.
    if (hasUnknownThread) {
      fetchBuyerMessageThreads(rfqId)
        .then((data) => setThreads(data))
        .catch((err) => {
          console.error("[BuyerRFQChat] Failed to refresh threads after an unrecognized SignalR message:", err);
        });
    }
  };

  useEffect(() => {
    startRfqChatHub({ rfqId }, handleIncomingMessages).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[BuyerRFQChat] SignalR connection failed:", err);
    });

    return () => {
      stopRfqChatHub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId]);

  useEffect(() => {
    if (!loadingThreads && !selectedSupplierId && chatSuppliers.length > 0) {
      setSelectedSupplierId(chatSuppliers[0].supplierId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingThreads, chatSuppliers.length]);

  useEffect(() => {
    setMessages([]);
    setMessagesError(null);
    setHistoryIndex(0);
    setHasMoreHistory(false);

    if (!selectedSupplierId) return;
    const supplier = chatSuppliers.find((s) => s.supplierId === selectedSupplierId);
    const thread = supplier?.thread;
    if (!thread) return;

    let cancelled = false;
    const loadHistory = async () => {
      setLoadingMessages(true);
      try {
        const data = await fetchBuyerMessageHistory(thread.threadId, 0, HISTORY_PAGE_LIMIT);
        if (cancelled) return;
        const sorted = [...data].sort(
          (a, b) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime()
        );
        setMessages(sorted);
        setHistoryIndex(data.length);
        setHasMoreHistory(data.length === HISTORY_PAGE_LIMIT);
        setScrollTick((t) => t + 1);

        if (thread.unreadCount > 0) {
          markBuyerThreadAsRead(thread.threadId)
            .then(() => {
              setThreads((prev) =>
                prev.map((t) => (t.threadId === thread.threadId ? { ...t, unreadCount: 0 } : t))
              );
            })
            .catch((err: any) => {
              toastService.error(err?.message || "Failed to mark conversation as read.");
            });
        }
      } catch (err: any) {
        if (!cancelled) setMessagesError(err?.message || "Failed to load conversation history.");
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    };

    loadHistory();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSupplierId]);

  const handleSelectSupplier = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setIsChatDetailsOpen(false);
    setMobileView("conversation");
  };

  const handleBackToList = () => setMobileView("list");

  const handleLoadOlder = async () => {
    const thread = currentSupplier?.thread;
    if (!thread || loadingMoreMessages || !hasMoreHistory) return;
    setLoadingMoreMessages(true);
    try {
      const data = await fetchBuyerMessageHistory(thread.threadId, historyIndex, HISTORY_PAGE_LIMIT);
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
    if (!selectedSupplierId || isSendingMessage) return false;
    const supplier = chatSuppliers.find((s) => s.supplierId === selectedSupplierId);
    if (!supplier) return false;

    setIsSendingMessage(true);
    try {
      const attachments = await Promise.all(
        files.map(async (file) => ({
          fileBytes: await fileToBase64(file),
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
        }))
      );

      const response = await sendBuyerMessage({
        rfqId,
        supplierId: selectedSupplierId,
        body,
        attachments,
      });

      // The SignalR broadcast for this same message can arrive before this
      // REST response does — dedup by id so it isn't appended twice.
      setMessages((prev) => (prev.some((m) => m.id === response.id) ? prev : [...prev, response]));

      setThreads((prev) => {
        const idx = prev.findIndex((t) => t.supplierId === selectedSupplierId);
        if (idx === -1) {
          const newThread: ChatThreadDto = {
            threadId: response.threadId,
            rfqId,
            rfqNumber: rfqNumber || "",
            buyerId: "",
            supplierId: selectedSupplierId,
            counterpartyName: supplier.supplierName,
            lastMessageBody: response.body,
            lastMessageAt: response.dateCreated,
            unreadCount: 0,
          };
          return [newThread, ...prev];
        }
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          threadId: response.threadId,
          lastMessageBody: response.body || (response.attachments.length > 0 ? "Sent an attachment" : ""),
          lastMessageAt: response.dateCreated,
          unreadCount: 0,
        };
        return updated;
      });

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
      const data = await downloadBuyerMessageAttachment(attachmentId);
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
                {totalUnread > 0 ? `${rfqNumber ? " • " : ""}${totalUnread} unread` : ""}
              </div>
            </div>
          </div>
          <button type="button" className="brc-close-btn" onClick={onClose} aria-label="Close chat">
            <IconClose />
          </button>
        </div>

        {supplierIds.length === 0 ? (
          <div className="brc-empty-state">
            <div className="brc-empty-state-icon">
              <IconMessageSquare />
            </div>
            <div className="brc-empty-state-title">No suppliers are invited to this RFQ.</div>
          </div>
        ) : (
          <div className={`brc-body brc-mobile-${mobileView}`}>
            <div className="brc-supplier-list">
              <div className="brc-supplier-list-header">Chats</div>
              <div className="brc-supplier-items">
                {loadingThreads ? (
                  <div className="brc-loading-state">
                    <div className="brc-spinner-md" />
                    <span>Loading conversations...</span>
                  </div>
                ) : chatSuppliers.length === 0 ? (
                  <div className="brc-empty-state">
                    <div className="brc-empty-state-title">No suppliers are invited to this RFQ.</div>
                  </div>
                ) : (
                  <>
                    {chatSuppliers.map((supplier) => (
                      <div
                        key={supplier.supplierId}
                        className={`brc-supplier-item${
                          supplier.supplierId === selectedSupplierId ? " brc-supplier-item-active" : ""
                        }`}
                        onClick={() => handleSelectSupplier(supplier.supplierId)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="brc-supplier-avatar">{getInitials(supplier.supplierName)}</div>
                        <div className="brc-supplier-info">
                          <div className="brc-supplier-name-row">
                            <span className="brc-supplier-name">{supplier.supplierName}</span>
                            {supplier.thread?.lastMessageAt && (
                              <span className="brc-supplier-time">
                                {formatThreadTime(supplier.thread.lastMessageAt)}
                              </span>
                            )}
                          </div>
                          <div className="brc-supplier-preview-row">
                            {supplier.thread ? (
                              <span className="brc-supplier-preview">
                                {supplier.thread.lastMessageBody || "No messages yet"}
                              </span>
                            ) : (
                              <span className="brc-supplier-preview-start">Start chat</span>
                            )}
                            {!!supplier.thread?.unreadCount && (
                              <span className="brc-unread-badge">
                                {supplier.thread.unreadCount > 99 ? "99+" : supplier.thread.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {isChatDetailsOpen && currentSupplier ? (
              <ChatDetails
                supplier={currentSupplier}
                buyerProfile={buyerProfile}
                isLoadingBuyerProfile={isLoadingBuyerProfile}
                observedParticipants={observedParticipants}
                onBack={() => setIsChatDetailsOpen(false)}
              />
            ) : (
              <ChatConversation
                supplier={currentSupplier}
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
        )}
      </div>
    </div>
  );
};

export default BuyerRFQChat;
