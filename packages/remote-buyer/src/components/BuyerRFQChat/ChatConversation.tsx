import React, { useEffect, useRef, useState } from "react";
import { EmptyState, Loader } from "@vosox/shared-ui";
import type { ChatMessageDto } from "../../dto/chatDto";
import type { ChatSupplier, PendingAttachment } from "./types";
import { formatDateSeparator, formatFileSize, formatMessageTime, getInitials, isSameCalendarDay } from "./chatUtils";
import {
  IconMessageSquare,
  IconSend,
  IconPaperclip,
  IconFile,
  IconChevronLeft,
  IconClose,
  IconUsers,
} from "./ChatIcons";

interface ChatConversationProps {
  supplier: ChatSupplier | null;
  messages: ChatMessageDto[];
  isLoadingMessages: boolean;
  messagesError: string | null;
  hasMoreHistory: boolean;
  isLoadingMoreMessages: boolean;
  onLoadOlder: () => void;
  isSendingMessage: boolean;
  onSendMessage: (body: string, attachments: File[]) => Promise<boolean>;
  downloadingAttachmentId: string | null;
  onDownloadAttachment: (attachmentId: string, fileName: string) => void;
  onBackToList: () => void;
  onOpenDetails: () => void;
  scrollTick: number;
}

const ChatConversation: React.FC<ChatConversationProps> = ({
  supplier,
  messages,
  isLoadingMessages,
  messagesError,
  hasMoreHistory,
  isLoadingMoreMessages,
  onLoadOlder,
  isSendingMessage,
  onSendMessage,
  downloadingAttachmentId,
  onDownloadAttachment,
  onBackToList,
  onOpenDetails,
  scrollTick,
}) => {
  const [messageText, setMessageText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessageText("");
    setPendingAttachments([]);
  }, [supplier?.supplierId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [scrollTick]);

  if (!supplier) {
    return (
      <div className="brc-conversation">
        <div className="brc-state-wrap">
          <EmptyState
            icon={<IconMessageSquare />}
            title="Select a supplier"
            description="Choose a supplier from the list to view or start a conversation."
          />
        </div>
      </div>
    );
  }

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const additions: PendingAttachment[] = Array.from(files).map((file) => ({
      localId: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
    }));
    setPendingAttachments((prev) => [...prev, ...additions]);
    e.target.value = "";
  };

  const removeAttachment = (localId: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.localId !== localId));
  };

  const canSend = (messageText.trim().length > 0 || pendingAttachments.length > 0) && !isSendingMessage;

  const handleSend = async () => {
    if (!canSend) return;
    const trimmed = messageText.trim();
    const files = pendingAttachments.map((a) => a.file);
    const success = await onSendMessage(trimmed, files);
    if (success) {
      setMessageText("");
      setPendingAttachments([]);
    }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="brc-conversation">
      <div className="brc-conversation-header">
        <button type="button" className="brc-back-to-list" onClick={onBackToList} aria-label="Back to supplier list">
          <IconChevronLeft />
        </button>
        <div className="brc-supplier-avatar" aria-hidden="true">
          {getInitials(supplier.supplierName)}
        </div>
        <div className="brc-conversation-header-text">
          <h3 className="brc-conversation-name">{supplier.supplierName}</h3>
          <button type="button" className="brc-conversation-participants-toggle" onClick={onOpenDetails}>
            <IconUsers />
            Chat details
          </button>
        </div>
      </div>

      {isLoadingMessages ? (
        <div className="brc-state-wrap">
          <Loader size={24} message="Loading conversation history..." />
        </div>
      ) : messagesError ? (
        <div className="brc-state-wrap">
          <EmptyState variant="error" title={messagesError} />
        </div>
      ) : messages.length === 0 ? (
        <div className="brc-state-wrap">
          <EmptyState
            icon={<IconMessageSquare />}
            title="No messages yet"
            description={
              supplier.thread
                ? "No messages yet. Start the conversation by sending a message."
                : `Start a conversation with ${supplier.supplierName}.`
            }
          />
        </div>
      ) : (
        <div className="brc-messages" role="log" aria-label={`Messages with ${supplier.supplierName}`}>
          {hasMoreHistory && (
            <button
              type="button"
              className="brc-load-older"
              onClick={onLoadOlder}
              disabled={isLoadingMoreMessages}
            >
              {isLoadingMoreMessages ? "Loading..." : "Load older messages"}
            </button>
          )}

          {messages.map((message, index) => {
            const isOwn = message.senderOrganizationType?.toLowerCase() === "buyer";
            const previousMessage = messages[index - 1];
            const showDateSeparator =
              !previousMessage || !isSameCalendarDay(previousMessage.dateCreated, message.dateCreated);
            return (
              <React.Fragment key={message.id}>
                {showDateSeparator && (
                  <div className="brc-date-separator">
                    <span>{formatDateSeparator(message.dateCreated)}</span>
                  </div>
                )}
                <div className={`brc-message-row ${isOwn ? "brc-message-row-own" : "brc-message-row-other"}`}>
                  <div className="brc-message-sender">{isOwn ? "You" : message.senderName}</div>
                  <div className="brc-message-bubble">
                    {message.body && <div className="brc-message-body">{message.body}</div>}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="brc-message-attachments">
                        {message.attachments.map((att) => (
                          <button
                            key={att.id}
                            type="button"
                            className="brc-attachment-chip"
                            onClick={() => onDownloadAttachment(att.id, att.fileName)}
                            disabled={downloadingAttachmentId === att.id}
                            title={`Download ${att.fileName}`}
                          >
                            <span className="brc-attachment-chip-icon" aria-hidden="true">
                              <IconFile />
                            </span>
                            <span className="brc-attachment-chip-info">
                              <span className="brc-attachment-chip-name">{att.fileName}</span>
                              <br />
                              <span className="brc-attachment-chip-size">
                                {downloadingAttachmentId === att.id ? "Downloading..." : formatFileSize(att.fileSizeBytes)}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <time className="brc-message-time" dateTime={message.dateCreated}>
                    {formatMessageTime(message.dateCreated)}
                  </time>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {pendingAttachments.length > 0 && (
        <div className="brc-attachment-preview-row">
          {pendingAttachments.map((att) => (
            <div key={att.localId} className="brc-attachment-preview-chip">
              <IconFile />
              <span className="brc-attachment-preview-name" title={att.file.name}>
                {att.file.name}
              </span>
              <span>({formatFileSize(att.file.size)})</span>
              <button
                type="button"
                className="brc-attachment-preview-remove"
                onClick={() => removeAttachment(att.localId)}
                aria-label={`Remove ${att.file.name}`}
              >
                <IconClose />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="brc-composer">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="brc-file-input"
          tabIndex={-1}
          aria-hidden="true"
          onChange={handleFilesSelected}
        />
        <button
          type="button"
          className="brc-attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSendingMessage}
          title="Attach files"
          aria-label="Attach files"
        >
          <IconPaperclip />
        </button>
        <textarea
          className="brc-composer-input"
          placeholder="Type a message..."
          aria-label={`Message ${supplier.supplierName}`}
          rows={1}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={handleComposerKeyDown}
          disabled={isSendingMessage}
        />
        <button type="button" className="brc-send-btn" onClick={handleSend} disabled={!canSend}>
          {isSendingMessage ? <span className="brc-spinner-sm" aria-hidden="true" /> : <IconSend />}
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatConversation;
