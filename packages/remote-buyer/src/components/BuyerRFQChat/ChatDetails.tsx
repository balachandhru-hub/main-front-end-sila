import React from "react";
import type { PersonDetailDto } from "../../api/Buyerapi";
import type { ChatSupplier, ObservedParticipant } from "./types";
import { getInitials } from "./chatUtils";
import { IconChevronLeft } from "./ChatIcons";

interface ChatDetailsProps {
  supplier: ChatSupplier;
  buyerProfile: PersonDetailDto | null;
  isLoadingBuyerProfile: boolean;
  observedParticipants: ObservedParticipant[];
  onBack: () => void;
}

const ChatDetails: React.FC<ChatDetailsProps> = ({
  supplier,
  buyerProfile,
  isLoadingBuyerProfile,
  observedParticipants,
  onBack,
}) => {
  const buyerDisplayName = buyerProfile?.name || buyerProfile?.userName || "Buyer";

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
          <div className="brc-supplier-avatar brcd-hero-avatar">{getInitials(supplier.supplierName)}</div>
          <div className="brcd-hero-name">{supplier.supplierName}</div>
          <div className="brcd-hero-sub">Supplier</div>
        </div>

        <div className="brcd-section">
          <div className="brcd-section-title">Supplier</div>
          <div className="brcd-field">
            <span className="brcd-field-label">Name</span>
            <span className="brcd-field-value">{supplier.supplierName}</span>
          </div>
        </div>

        <div className="brcd-section">
          <div className="brcd-section-title">Chat participants</div>

          <div className="brcd-participant-group-label">Buyer</div>
          {isLoadingBuyerProfile ? (
            <div className="brcd-empty-note">Loading buyer details...</div>
          ) : buyerProfile ? (
            <div className="brc-participant-row">
              <div className="brc-supplier-avatar brc-participant-avatar">{getInitials(buyerDisplayName)}</div>
              <div className="brc-participant-info">
                <div className="brc-participant-name">{buyerDisplayName} (You)</div>
                <div className="brc-participant-email">{buyerProfile.email}</div>
              </div>
            </div>
          ) : (
            <div className="brcd-empty-note">Buyer details unavailable.</div>
          )}

          <div className="brcd-participant-group-label">{supplier.supplierName}</div>
          {observedParticipants.length === 0 ? (
            <div className="brcd-empty-note">
              No users from {supplier.supplierName} have sent a message in this conversation yet.
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

export default ChatDetails;
