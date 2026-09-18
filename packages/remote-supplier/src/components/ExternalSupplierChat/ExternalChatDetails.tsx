import React from "react";
import type { ObservedParticipant } from "./types";
import { getInitials } from "../../../../remote-buyer/src/components/BuyerRFQChat/chatUtils";
import { IconChevronLeft } from "../../../../remote-buyer/src/components/BuyerRFQChat/ChatIcons";

interface ExternalChatDetailsProps {
  counterpartyName: string;
  observedParticipants: ObservedParticipant[];
  onBack: () => void;
}

// Unlike the logged-in Buyer/Supplier chats, an external supplier bid link has
// no authenticated profile to show for "You" — the invited contact is only
// ever known by the RFQ invitation itself, not a per-user session.
const ExternalChatDetails: React.FC<ExternalChatDetailsProps> = ({
  counterpartyName,
  observedParticipants,
  onBack,
}) => {
  return (
    <div className="brc-details">
      <div className="brcd-header">
        <button type="button" className="brcd-back-btn" onClick={onBack} aria-label="Back to conversation">
          <IconChevronLeft />
        </button>
        <div className="brcd-header-title">Chat Details</div>
      </div>

      <div className="brcd-body">
        <div className="brcd-hero">
          <div className="brc-supplier-avatar brcd-hero-avatar">{getInitials(counterpartyName)}</div>
          <div className="brcd-hero-name">{counterpartyName}</div>
          <div className="brcd-hero-sub">Buyer</div>
        </div>

        <div className="brcd-section">
          <div className="brcd-section-title">Conversation</div>
          <div className="brcd-field">
            <span className="brcd-field-label">Counterparty</span>
            <span className="brcd-field-value">{counterpartyName}</span>
          </div>
        </div>

        <div className="brcd-section">
          <div className="brcd-section-title">Chat participants</div>

          <div className="brcd-participant-group-label">External Supplier</div>
          <div className="brc-participant-row">
            <div className="brc-supplier-avatar brc-participant-avatar">{getInitials("External Supplier")}</div>
            <div className="brc-participant-info">
              <div className="brc-participant-name">You (External Supplier)</div>
            </div>
          </div>

          <div className="brcd-participant-group-label">{counterpartyName}</div>
          {observedParticipants.length === 0 ? (
            <div className="brcd-empty-note">
              No one from {counterpartyName} has sent a message in this conversation yet.
            </div>
          ) : (
            observedParticipants.map((participant) => (
              <div key={participant.userId} className="brc-participant-row">
                <div className="brc-supplier-avatar brc-participant-avatar">{getInitials(participant.name)}</div>
                <div className="brc-participant-info">
                  <div className="brc-participant-name">{participant.name}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ExternalChatDetails;
