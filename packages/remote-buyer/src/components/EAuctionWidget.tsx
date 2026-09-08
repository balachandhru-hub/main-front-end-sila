import React, { useState } from 'react';
import './EAuctionWidget.css';

/* ---------------------------------- Interfaces ---------------------------------- */

export interface LiveAuctionItem {
  id: string;
  name: string;
  itemCode: string;
  category: string;
  closingIn: string;
  currentBid: string;
  leadSupplier: string;
  userRank: number;
}

export interface SupplierBidLeaderboard {
  rank: number;
  supplierName: string;
  bidAmount: string;
  messageCount: number;
}

export interface LiveChatMessage {
  id: string;
  sender: string;
  avatarClass: string;
  text: string;
  time: string;
}

/* ---------------------------------- Mock Live Data ---------------------------------- */

const mockAuctions: LiveAuctionItem[] = [
  {
    id: "lot-023",
    name: "Global IT Hardware Refresh - Tier 1 Laptops",
    itemCode: "AUCTION-2026-0901",
    category: "IT Hardware",
    closingIn: "14:500",
    currentBid: "$48,000.00",
    leadSupplier: "CompUSA Direct",
    userRank: 1,
  },
  {
    id: "lot-024",
    name: "Facility Management Services - Midwest Region",
    itemCode: "AUCTION-2026-0902",
    category: "Services",
    closingIn: "08:120",
    currentBid: "$49,000.00",
    leadSupplier: "OfficeMax Global",
    userRank: 2,
  },
  {
    id: "lot-025",
    name: "Office Supply Annual Contract",
    itemCode: "AUCTION-2026-0903",
    category: "Office Supplies",
    closingIn: "22:040",
    currentBid: "$18,250.00",
    leadSupplier: "SecureNet IT",
    userRank: 1,
  },
];

const mockLeaderboard: SupplierBidLeaderboard[] = [
  { rank: 1, supplierName: "CompUSA Direct", bidAmount: "$48,000", messageCount: 2 },
  { rank: 2, supplierName: "OfficeMax Global", bidAmount: "$49,000", messageCount: 1 },
  { rank: 3, supplierName: "TechSupplies Inc.", bidAmount: "$49,000", messageCount: 3 },
  { rank: 4, supplierName: "DataCorp Services", bidAmount: "$52,230", messageCount: 1 },
  { rank: 5, supplierName: "SecureNet IT", bidAmount: "$58,250", messageCount: 0 },
];

const initialChatMessages: LiveChatMessage[] = [
  { id: "c1", sender: "CompUSA Direct", avatarClass: "avatar-red", text: "Can we get clarification on the technical specifications for Lot #023?", time: "14:20" },
  { id: "c2", sender: "GlobalCorp Solutions Buyer (Alice W.)", avatarClass: "avatar-blue", text: "Clarification sent to all bidders. Check attachments in portal.", time: "14:22" },
  { id: "c3", sender: "DataCorp", avatarClass: "avatar-gold", text: "Happy to discuss volume quantity discounts for batch submittals.", time: "14:25" },
  { id: "c4", sender: "TechSupplies", avatarClass: "avatar-teal", text: "Confirming we can meet the delivery timeline for UAE location.", time: "14:28" },
];

/* ---------------------------------- Component ---------------------------------- */

export const EAuctionWidget: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<LiveAuctionItem>(mockAuctions[0]);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>(initialChatMessages);
  const [newMessageText, setNewMessageText] = useState("");
  const [awardedSupplier, setAwardedSupplier] = useState<string | null>(null);

  const handleSendMessage = () => {
    if (!newMessageText.trim()) return;
    const msg: LiveChatMessage = {
      id: `c_${Date.now()}`,
      sender: "Buyer (Alice W.)",
      avatarClass: "avatar-blue",
      text: newMessageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, msg]);
    setNewMessageText("");
  };

  const handleConfirmAward = () => {
    setAwardedSupplier(selectedLot.leadSupplier);
    alert(`🎉 Award confirmed for ${selectedLot.name} to ${selectedLot.leadSupplier}! Contract generation initialized.`);
  };

  return (
    <>
      {/* Bottom Right Floating Trigger Widget with Green Border */}
      <div
        className="eauction-floating-bar"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Hover Popover Preview Card */}
        {isHovered && !isModalOpen && (
          <div className="eauction-preview-popover">
            <div className="eauction-preview-header">
              <div className="eauction-preview-title">
                <span>⚡ Live e-Auction Portal</span>
              </div>
              <span className="eauction-live-status">LIVE SOURCING</span>
            </div>

            <div className="eauction-preview-item">
              <div className="eauction-preview-item-title">{selectedLot.name}</div>
              <div className="eauction-preview-meta">
                <span>Lead Bid: <strong className="eauction-bid-price">{selectedLot.currentBid}</strong></span>
                <span>Closing: <strong className="eauction-timer">{selectedLot.closingIn}</strong></span>
              </div>
            </div>

            <button
              className="eauction-enter-btn"
              onClick={() => setIsModalOpen(true)}
            >
              <span>Enter Live Bidding Console</span>
              <span>➔</span>
            </button>
          </div>
        )}

        {/* Floating Bar Button */}
        <button
          className="eauction-trigger-btn"
          onClick={() => setIsModalOpen(true)}
          title="Open SAP Ariba Live e-Auction Console"
        >
          <span className="eauction-pulse-dot" />
          <span>⚡ Live e-Auction</span>
          <span className="eauction-badge-count">{mockAuctions.length} Live</span>
        </button>
      </div>

      {/* Full Live Portal Modal View */}
      {isModalOpen && (
        <div className="eauction-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="eauction-portal-container"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Header Bar */}
            <div className="eauction-portal-header">
              <div className="eauction-brand">
                <div className="eauction-logo-icon">e</div>
                <div>
                  <div className="eauction-portal-title">eAuction Portal</div>
                  <div style={{ fontSize: '0.71875rem', color: '#e0f2fe' }}>SAP Ariba Live Sourcing v2.1</div>
                </div>
              </div>

              <div className="eauction-project-banner">
                <span style={{ fontSize: '0.75rem', color: '#e0f2fe', textTransform: 'uppercase' }}>Current Sourcing Project:</span>
                <span className="eauction-project-name">Global IT Hardware Refresh</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.8125rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  👤 Buyer: <strong>Alice W.</strong>
                </span>
                <button
                  className="eauction-portal-close"
                  onClick={() => setIsModalOpen(false)}
                  title="Close e-Auction Console"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Main Portal Body */}
            <div className="eauction-portal-body">
              {/* Left Sidebar Filters */}
              <div className="eauction-left-sidebar">
                <div>
                  <div className="eauction-section-header">Live Auctions</div>
                  <div className="eauction-sidebar-menu">
                    <div className="eauction-sidebar-item active">⚡ Quick Links</div>
                    <div className="eauction-sidebar-item">📦 Quick Lots</div>
                    <div className="eauction-sidebar-item">📱 Applications</div>
                    <div className="eauction-sidebar-item">📇 Contacts</div>
                  </div>
                </div>

                <div>
                  <div className="eauction-section-header">Filters</div>
                  <div className="eauction-filter-group">
                    <label className="eauction-filter-checkbox">
                      <input type="checkbox" defaultChecked /> Closing In
                    </label>
                    <label className="eauction-filter-checkbox">
                      <input type="checkbox" /> My Max Bid
                    </label>
                    <label className="eauction-filter-checkbox">
                      <input type="checkbox" /> Flashing Item
                    </label>
                    <label className="eauction-filter-checkbox">
                      <input type="checkbox" /> My Current Bid
                    </label>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                  <div className="eauction-section-header">RFx Requests</div>
                  <div style={{ fontSize: '0.78125rem', color: '#64748b' }}>
                    3 Active RFQ Live Tenders
                  </div>
                </div>
              </div>

              {/* Main Content Workspace */}
              <div className="eauction-main-content">
                {/* Active Bids & Rank Grid */}
                <div className="eauction-panel-light">
                  <div className="eauction-panel-head">
                    <div className="eauction-panel-title-text">MY ACTIVE BIDS & RANKS</div>
                    <span style={{ fontSize: '0.75rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.2rem 0.6rem', borderRadius: '0.375rem', fontWeight: 700 }}>
                      REAL-TIME TABLE ACTIVE
                    </span>
                  </div>

                  <table className="eauction-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Item ID/Name</th>
                        <th>Category</th>
                        <th>Closing In</th>
                        <th>Current Lead Bid</th>
                        <th>Rank #1 Lead</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockAuctions.map((auc, idx) => (
                        <tr
                          key={auc.id}
                          style={{
                            background: auc.id === selectedLot.id ? '#eff6ff' : 'transparent',
                            cursor: 'pointer',
                          }}
                          onClick={() => setSelectedLot(auc)}
                        >
                          <td>{idx + 1}</td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{auc.name}</div>
                            <div style={{ fontSize: '0.71875rem', color: '#64748b' }}>{auc.itemCode}</div>
                          </td>
                          <td>{auc.category}</td>
                          <td>
                            <span className="eauction-timer">{auc.closingIn}</span>
                          </td>
                          <td>
                            <span className="eauction-bid-price">{auc.currentBid}</span>
                          </td>
                          <td>
                            <span className={`eauction-rank-badge rank-${auc.userRank}`}>
                              {auc.userRank}
                            </span>
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.78125rem', color: '#475569' }}>
                              {auc.leadSupplier}
                            </span>
                          </td>
                          <td>
                            <button className="eauction-action-btn">VIEW LOT</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Split Bottom Workspace */}
                <div className="eauction-grid-split">
                  {/* Left Column: Live Bidding View & Messaging */}
                  <div className="eauction-panel-light" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="eauction-panel-head">
                      <div className="eauction-panel-title-text">
                        LIVE BIDDING VIEW: <span style={{ color: '#0057b8' }}>{selectedLot.name}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>LIVE MESSAGING ACTIVE</span>
                    </div>

                    {/* Live Leaderboard Bids Popover (Matching Ref Image Overlay) */}
                    <div className="eauction-bids-overlay-card" style={{ marginBottom: '1rem' }}>
                      <div className="eauction-bids-title">LIVE SUPPLIER BIDS LEADERBOARD</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                        {mockLeaderboard.map((bid) => (
                          <div
                            key={bid.rank}
                            style={{
                              background: '#ffffff',
                              padding: '0.5rem',
                              borderRadius: '0.375rem',
                              border: bid.rank === 1 ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span className={`eauction-rank-badge rank-${bid.rank}`}>{bid.rank}</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857' }}>{bid.bidAmount}</span>
                            </div>
                            <div style={{ fontSize: '0.71875rem', color: '#475569', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                              {bid.supplierName}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Live Chat Discussion */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div className="eauction-chat-timeline">
                        {chatMessages.map((msg) => (
                          <div key={msg.id} className="eauction-chat-msg">
                            <div className={`eauction-chat-avatar ${msg.avatarClass}`}>
                              {msg.sender.charAt(0)}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                <strong style={{ color: '#0f172a', fontSize: '0.8125rem' }}>{msg.sender}</strong>
                                <span style={{ color: '#64748b', fontSize: '0.71875rem' }}>{msg.time}</span>
                              </div>
                              <div style={{ color: '#334155', fontSize: '0.8125rem' }}>{msg.text}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Chat Input */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        <input
                          type="text"
                          placeholder="Broadcast message to live e-Auction bidders..."
                          value={newMessageText}
                          onChange={(e) => setNewMessageText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          style={{
                            flex: 1,
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '0.375rem',
                            padding: '0.5rem 0.75rem',
                            color: '#0f172a',
                            fontSize: '0.8125rem',
                          }}
                        />
                        <button
                          onClick={handleSendMessage}
                          style={{
                            background: '#0057b8',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '0.375rem',
                            padding: '0.5rem 1rem',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                          }}
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Awarding Panel & History */}
                  <div className="eauction-panel-light" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="eauction-panel-title-text">AWARDING PANEL</div>

                    <div className="eauction-award-box">
                      <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                        RANKED SUPPLIERS FOR AWARD
                      </div>

                      <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>AWARD LOT TO:</div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#047857', margin: '0.25rem 0' }}>
                          🥇 {selectedLot.leadSupplier} ({selectedLot.currentBid})
                        </div>
                      </div>

                      <button
                        className="eauction-btn-confirm"
                        onClick={handleConfirmAward}
                      >
                        {awardedSupplier === selectedLot.leadSupplier ? "✓ AWARD CONFIRMED" : "CONFIRM AWARD"}
                      </button>
                    </div>

                    <div style={{ flex: 1, background: '#f8fafc', borderRadius: '0.5rem', padding: '0.875rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        AWARD HISTORY
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.375rem' }}>
                          <strong>Lot 4010: Office Supplies</strong>
                          <div style={{ color: '#047857', fontWeight: 600 }}>Awarded to Staples Business</div>
                        </div>
                        <div>
                          <strong>Lot 4008: IT Hardware Refurbish</strong>
                          <div style={{ color: '#047857', fontWeight: 600 }}>Awarded to Meridian Logistics</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          background: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                        onClick={() => alert("📩 Award Notification dispatched to all participating bidders!")}
                      >
                        POST & NOTIFY
                      </button>
                      <button
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          background: '#0057b8',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                        onClick={() => alert("📄 SAP Ariba Award Contract PDF generated successfully!")}
                      >
                        GENERATE CONTRACT
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EAuctionWidget;
