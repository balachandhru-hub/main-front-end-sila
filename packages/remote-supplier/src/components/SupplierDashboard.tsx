import React, { useState } from 'react';
import './SupplierDashboard.css';
import { useAuthStore } from '../../../host-app/src/store/useAuthStore';

// SVGs for Icons (Self-contained, highly robust)
const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const RfqIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const QuoteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const OrderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const ContractIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M12.5 12.5L10 15l-1.5-1.5" />
  </svg>
);

const InvoiceIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="22" x2="9" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="8" y1="8" x2="16" y2="8" />
  </svg>
);

const PaymentIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const MessageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const ProfileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const SupplierDashboard: React.FC = () => {
  const logout = useAuthStore.getState().logout;
  const organizationName = sessionStorage.getItem('vosox_organization_name') || 'Apex Office & Technology Supp...';
  const firstLetter = organizationName.trim().charAt(0).toUpperCase();

  const [activeTab, setActiveTab] = useState('Dashboard');

  const menuItems = [
    { label: 'Dashboard', icon: <HomeIcon /> },
    { label: 'Invitations', icon: <MailIcon />, badge: 2 },
    { label: 'RFQs', icon: <RfqIcon />, badge: 2 },
    { label: 'Quotations', icon: <QuoteIcon /> },
    { label: 'Purchase Orders', icon: <OrderIcon /> },
    { label: 'Contracts', icon: <ContractIcon /> },
    { label: 'Invoices', icon: <InvoiceIcon /> },
    { label: 'Payments', icon: <PaymentIcon /> },
    { label: 'Messages', icon: <MessageIcon /> },
    { label: 'Company Profile', icon: <ProfileIcon /> },
    { label: 'Settings', icon: <SettingsIcon /> },
  ];

  return (
    <div className="sd-layout">
      {/* Sidebar */}
      <aside className="sd-sidebar">
        <div className="sd-sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Outfit', sans-serif", fontSize: '1.4rem', fontWeight: 700 }}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            VOSOX
          </span>
        </div>
        <ul className="sd-nav">
          {menuItems.map((item) => (
            <li
              key={item.label}
              className={`sd-nav-item ${activeTab === item.label ? 'active' : ''}`}
              onClick={() => setActiveTab(item.label)}
            >
              <span className="sd-nav-label">
                <span className="sd-nav-icon">{item.icon}</span>
                {item.label}
              </span>
              {item.badge && <span className="sd-nav-badge">{item.badge}</span>}
            </li>
          ))}
          <li
            className="sd-nav-item"
            style={{ marginTop: 'auto', color: '#dc2626' }}
            onClick={logout}
          >
            <span className="sd-nav-label">
              <span className="sd-nav-icon" style={{ transform: 'rotate(180deg)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
              Log Out
            </span>
          </li>
        </ul>
      </aside>

      {/* Main Container */}
      <div className="sd-container">
        {/* Top Header */}
        <header className="sd-header">
          <div className="sd-header-actions">
            <div className="sd-notification-bell">
              <BellIcon />
              <div className="sd-notification-dot" />
            </div>
            
            <div className="sd-user-profile">
              <div className="sd-user-info">
                <div className="sd-user-name" title={organizationName}>
                  {organizationName}
                </div>
                <div className="sd-user-role-badge">
                  <CheckCircleIcon />
                  Verified Vendor
                </div>
              </div>
              <div className="sd-user-avatar">
                {firstLetter}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="sd-content">
          {/* Title Section */}
          <div className="sd-title-section">
            <h1 className="sd-title">Supplier Operations Command</h1>
            <p className="sd-subtitle">Real-time procurement tracking, bid submittals, and transaction monitoring.</p>
          </div>

          {/* Verification Banner */}
          <div className="sd-status-banner">
            <div className="sd-banner-dot" />
            <div className="sd-banner-text">
              <div className="sd-banner-title">Active Approved Supplier Status (100%)</div>
              <div className="sd-banner-desc">Your credentials, certification audit records, and bank routes are verified for secure bidding.</div>
            </div>
          </div>

          {/* Summary Stats Grid */}
          <div className="sd-summary-grid">
            <div className="sd-summary-card">
              <span className="sd-summary-icon"><MailIcon /></span>
              <span className="sd-summary-label">Invitations</span>
              <span className="sd-summary-value">2</span>
              <span className="sd-summary-link">Pending review &gt;</span>
            </div>
            <div className="sd-summary-card">
              <span className="sd-summary-icon"><RfqIcon /></span>
              <span className="sd-summary-label">Active RFQs</span>
              <span className="sd-summary-value">2</span>
              <span className="sd-summary-link">Bids open &gt;</span>
            </div>
            <div className="sd-summary-card">
              <span className="sd-summary-icon"><QuoteIcon /></span>
              <span className="sd-summary-label">Bids Submitted</span>
              <span className="sd-summary-value">3</span>
              <span className="sd-summary-link">Track outcomes</span>
            </div>
            <div className="sd-summary-card">
              <span className="sd-summary-icon"><OrderIcon /></span>
              <span className="sd-summary-label">Purchase Order</span>
              <span className="sd-summary-value">4</span>
              <span className="sd-summary-link">Accept orders &gt;</span>
            </div>
            <div className="sd-summary-card">
              <span className="sd-summary-icon"><InvoiceIcon /></span>
              <span className="sd-summary-label">Due Invoices</span>
              <span className="sd-summary-value">2</span>
              <span className="sd-summary-link">Invoice list &gt;</span>
            </div>
            <div className="sd-summary-card">
              <span className="sd-summary-icon"><BellIcon /></span>
              <span className="sd-summary-label">Notifications</span>
              <span className="sd-summary-value">3</span>
              <span className="sd-summary-link">Inquiries &amp; Alerts &gt;</span>
            </div>
          </div>

          {/* Opportunities and Recent POs */}
          <div className="sd-main-grid">
            {/* Recent Sourcing Opportunities */}
            <div className="sd-card">
              <div className="sd-card-header">
                <h3 className="sd-card-title">Recent Sourcing Opportunities</h3>
                <span className="sd-card-link">View All RFQs &rarr;</span>
              </div>
              <div className="sd-list">
                <div className="sd-opportunity-item">
                  <div className="sd-opp-info">
                    <div className="sd-opp-meta">
                      <span className="sd-opp-rfq">RFQ-1024</span>
                      <span className="sd-opp-divider">&#8226;</span>
                      <span className="sd-opp-company">ABC Manufacturing Inc.</span>
                    </div>
                    <div className="sd-opp-title">Office Furniture Supply</div>
                    <div className="sd-opp-dates">Closes: 2026-07-25 &nbsp;|&nbsp; Deliv: Sector 4</div>
                  </div>
                  <button className="sd-btn-outline">View RFQ Details</button>
                </div>

                <div className="sd-opportunity-item">
                  <div className="sd-opp-info">
                    <div className="sd-opp-meta">
                      <span className="sd-opp-rfq">RFQ-1025</span>
                      <span className="sd-opp-divider">&#8226;</span>
                      <span className="sd-opp-company">Global Tech Solutions Inc.</span>
                    </div>
                    <div className="sd-opp-title">Enterprise Laptops &amp; Peripherals</div>
                    <div className="sd-opp-dates">Closes: 2026-08-05 &nbsp;|&nbsp; Deliv: 400 Tech Ally</div>
                  </div>
                  <button className="sd-btn-outline">View RFQ Details</button>
                </div>

                <div className="sd-opportunity-item">
                  <div className="sd-opp-info">
                    <div className="sd-opp-meta">
                      <span className="sd-opp-rfq">RFQ-1021</span>
                      <span className="sd-opp-divider">&#8226;</span>
                      <span className="sd-opp-company">Eco-Friendly Logistics Ltd</span>
                    </div>
                    <div className="sd-opp-title">Recycled Stationery Bulk</div>
                    <div className="sd-opp-dates">Closes: 2026-07-12 &nbsp;|&nbsp; Deliv: Frankfurt</div>
                  </div>
                  <button className="sd-btn-outline">View RFQ Details</button>
                </div>
              </div>
            </div>

            {/* Recent Purchase Orders */}
            <div className="sd-card">
              <div className="sd-card-header">
                <h3 className="sd-card-title">Recent Purchase Orders</h3>
                <span className="sd-card-link">View All &rarr;</span>
              </div>
              <div className="sd-list">
                <div className="sd-po-item">
                  <div className="sd-po-left">
                    <div className="sd-po-meta">
                      <span className="sd-po-id">PO-2026-98412</span>
                      <span className="sd-badge sd-badge-accepted">Accepted</span>
                    </div>
                    <div className="sd-po-company">Global Tech Solutions Inc.</div>
                    <div className="sd-po-date">Order Date: 2026-07-04</div>
                  </div>
                  <div className="sd-po-right">
                    <span className="sd-po-amount">$18,500.00</span>
                    <span className="sd-po-process">Process &rarr;</span>
                  </div>
                </div>

                <div className="sd-po-item">
                  <div className="sd-po-left">
                    <div className="sd-po-meta">
                      <span className="sd-po-id">PO-2026-88501</span>
                      <span className="sd-badge sd-badge-accepted">Accepted</span>
                    </div>
                    <div className="sd-po-company">Apex Partners</div>
                    <div className="sd-po-date">Order Date: 2026-06-22</div>
                  </div>
                  <div className="sd-po-right">
                    <span className="sd-po-amount">$4,200.00</span>
                    <span className="sd-po-process">Process &rarr;</span>
                  </div>
                </div>

                <div className="sd-po-item">
                  <div className="sd-po-left">
                    <div className="sd-po-meta">
                      <span className="sd-po-id">PO-2026-88214</span>
                      <span className="sd-badge sd-badge-delivered">Delivered</span>
                    </div>
                    <div className="sd-po-company">ABC Manufacturing Inc.</div>
                    <div className="sd-po-date">Order Date: 2026-06-10</div>
                  </div>
                  <div className="sd-po-right">
                    <span className="sd-po-amount">$9,800.00</span>
                    <span className="sd-po-process">Process &rarr;</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Smart Sourcing Matchmaker */}
          <div className="sd-card">
            <div className="sd-card-header" style={{ marginBottom: '8px' }}>
              <h3 className="sd-card-title">Smart Sourcing Matchmaker</h3>
            </div>
            <p className="sd-subtitle" style={{ marginBottom: '24px' }}>
              Active enterprise buyers looking for products and services matching your certified categories and registered ship-to locations.
            </p>
            
            <div className="sd-matchmaker-grid">
              <div className="sd-match-card">
                <div className="sd-match-header">
                  <div className="sd-match-buyer-row">
                    <div className="sd-match-avatar">VL</div>
                    <div className="sd-match-buyer-info">
                      <span className="sd-match-buyer-name">Vertex Labs Singapore</span>
                      <span className="sd-match-seeking">Seeking: IT Hardware &amp; Accessories</span>
                    </div>
                  </div>
                  <span className="sd-match-badge">Singapore</span>
                </div>
                <p className="sd-match-desc">
                  Vertex Labs is a cutting-edge deep tech incubator looking to outfit their brand-new engineering office space with state of...
                </p>
                <div className="sd-match-rep">
                  <span>Representative</span>
                  <span className="sd-match-rep-val">Dr. Adrian Cheng</span>
                </div>
                <div className="sd-match-actions">
                  <button className="sd-btn-outline">Profile</button>
                  <button className="sd-btn-green">Message</button>
                </div>
              </div>

              <div className="sd-match-card">
                <div className="sd-match-header">
                  <div className="sd-match-buyer-row">
                    <div className="sd-match-avatar" style={{ backgroundColor: '#2563eb' }}>SH</div>
                    <div className="sd-match-buyer-info">
                      <span className="sd-match-buyer-name">Starlight Hospitality Group</span>
                      <span className="sd-match-seeking">Seeking: Office Furniture</span>
                    </div>
                  </div>
                  <span className="sd-match-badge">European Union</span>
                </div>
                <p className="sd-match-desc">
                  Starlight Group coordinates multi-location boutique hotel lounges and business centers across Europe. Currently...
                </p>
                <div className="sd-match-rep">
                  <span>Representative</span>
                  <span className="sd-match-rep-val">Evelyn Carter</span>
                </div>
                <div className="sd-match-actions">
                  <button className="sd-btn-outline">Profile</button>
                  <button className="sd-btn-blue">Send Interest</button>
                </div>
              </div>

              <div className="sd-match-card">
                <div className="sd-match-header">
                  <div className="sd-match-buyer-row">
                    <div className="sd-match-avatar" style={{ backgroundColor: '#2563eb' }}>VS</div>
                    <div className="sd-match-buyer-info">
                      <span className="sd-match-buyer-name">Vanguard Sourcing Partners</span>
                      <span className="sd-match-seeking">Seeking: Stationery</span>
                    </div>
                  </div>
                  <span className="sd-match-badge">North America</span>
                </div>
                <p className="sd-match-desc">
                  Vanguard supplies administrative desks and corporate centers with specialized FSC certified eco-friendly writing materials, premium...
                </p>
                <div className="sd-match-rep">
                  <span>Representative</span>
                  <span className="sd-match-rep-val">Robert Miller</span>
                </div>
                <div className="sd-match-actions">
                  <button className="sd-btn-outline">Profile</button>
                  <button className="sd-btn-blue">Send Interest</button>
                </div>
              </div>

              <div className="sd-match-card">
                <div className="sd-match-header">
                  <div className="sd-match-buyer-row">
                    <div className="sd-match-avatar" style={{ backgroundColor: '#2563eb' }}>HB</div>
                    <div className="sd-match-buyer-info">
                      <span className="sd-match-buyer-name">Horizon BioTech</span>
                      <span className="sd-match-seeking">Seeking: Breakroom Supplies</span>
                    </div>
                  </div>
                  <span className="sd-match-badge">United Kingdom</span>
                </div>
                <p className="sd-match-desc">
                  Horizon BioTech operates premium research facilities and corporate office buildings. They require high-volume premium organic coffee...
                </p>
                <div className="sd-match-rep">
                  <span>Representative</span>
                  <span className="sd-match-rep-val">Claire Johnston</span>
                </div>
                <div className="sd-match-actions">
                  <button className="sd-btn-outline">Profile</button>
                  <button className="sd-btn-blue">Send Interest</button>
                </div>
              </div>
            </div>

            <div className="sd-pagination">
              <span className="sd-page-btn">&lt;</span>
              <span className="sd-page-btn active">1</span>
              <span className="sd-page-btn">&gt;</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SupplierDashboard;