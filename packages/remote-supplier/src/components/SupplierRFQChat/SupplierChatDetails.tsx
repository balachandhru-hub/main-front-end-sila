import React from "react";
import type { PersonDetailDto } from "../../api/supplierApi";
import { getInitials } from "../../../../remote-buyer/src/components/BuyerRFQChat/chatUtils";
import { IconChevronLeft } from "../../../../remote-buyer/src/components/BuyerRFQChat/ChatIcons";

interface SupplierChatDetailsProps {
  counterpartyName: string;
  myProfile: PersonDetailDto | null;
  isLoadingMyProfile: boolean;
  onBack: () => void;
}

const SupplierChatDetails: React.FC<SupplierChatDetailsProps> = ({
  counterpartyName,
  myProfile,
  isLoadingMyProfile,
  onBack,
}) => {
  const myDisplayName = myProfile?.name || myProfile?.userName || "You";

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

          <div className="brcd-participant-group-label">You</div>
          {isLoadingMyProfile ? (
            <div className="brcd-empty-note">Loading your details...</div>
          ) : myProfile ? (
            <div className="brc-participant-row">
              <div className="brc-supplier-avatar brc-participant-avatar">{getInitials(myDisplayName)}</div>
              <div className="brc-participant-info">
                <div className="brc-participant-name">{myDisplayName} (You)</div>
                <div className="brc-participant-email">{myProfile.email}</div>
              </div>
            </div>
          ) : (
            <div className="brcd-empty-note">Your details are unavailable.</div>
          )}

          <div className="brcd-participant-group-label">Buyer</div>
          <div className="brc-participant-row">
            <div className="brc-supplier-avatar brc-participant-avatar">{getInitials(counterpartyName)}</div>
            <div className="brc-participant-info">
              <div className="brc-participant-name">{counterpartyName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierChatDetails;
