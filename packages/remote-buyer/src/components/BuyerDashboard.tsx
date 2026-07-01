import React, { useState } from 'react';
import { Button } from '@vosox/shared-ui';

export const BuyerDashboard: React.FC = () => {
  const [vendorCount, setVendorCount] = useState(14);
  const [selectedReq, setSelectedReq] = useState<string | null>(null);

  const requisitions = [
    { id: 'REQ-2026-001', item: 'Enterprise Cloud Subscription', department: 'IT', cost: '$45,000', status: 'Pending Approval' },
    { id: 'REQ-2026-002', item: 'Office Workspace Hardware', department: 'HR / Operations', cost: '$12,300', status: 'Approved' },
    { id: 'REQ-2026-003', item: 'Security Systems Integration', department: 'Security', cost: '$8,500', status: 'Rejected' },
    { id: 'REQ-2026-004', item: 'Design Assets & Subscriptions', department: 'Marketing', cost: '$3,200', status: 'Approved' },
  ];

  return (
    <div>
      <div className="header-bar">
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '6px' }}>Buyer Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Procurement insights and tracking for buyers</p>
        </div>
        <Button variant="primary" onClick={() => setVendorCount(prev => prev + 1)}>
          Quick Invite Vendor
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="glass-card metric-card">
          <div className="metric-title">Total Spent YTD</div>
          <div className="metric-value">$684,200</div>
          <div className="metric-trend trend-up">
            ▲ 12.4% <span style={{ color: 'var(--text-dark)' }}>vs last quarter</span>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-title">Active POs</div>
          <div className="metric-value">48</div>
          <div className="metric-trend trend-up">
            ▲ 4 new <span style={{ color: 'var(--text-dark)' }}>this week</span>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-title">Requisitions</div>
          <div className="metric-value">12</div>
          <div className="metric-trend trend-down">
            ▼ -8% <span style={{ color: 'var(--text-dark)' }}>vs last month</span>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-title">Partner Vendors</div>
          <div className="metric-value">{vendorCount}</div>
          <div className="metric-trend trend-up">
            ▲ Active agreements
          </div>
        </div>
      </div>

      {/* Requisitions Section */}
      <div className="glass-card">
        <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '18px' }}>
          Recent Requisitions
        </h2>
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Requisition ID</th>
                <th>Requested Item</th>
                <th>Department</th>
                <th>Est. Cost</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requisitions.map(req => (
                <tr key={req.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{req.id}</td>
                  <td>{req.item}</td>
                  <td>{req.department}</td>
                  <td>{req.cost}</td>
                  <td>
                    <span className={`badge ${
                      req.status === 'Approved' ? 'badge-success' :
                      req.status === 'Pending Approval' ? 'badge-warning' :
                      'badge-danger'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedReq(req.id === selectedReq ? null : req.id)}
                    >
                      {selectedReq === req.id ? 'Close Details' : 'View'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedReq && (
          <div 
            className="glass-card" 
            style={{ 
              marginTop: '20px', 
              background: 'rgba(99, 102, 241, 0.05)', 
              borderColor: 'var(--primary-color)',
              animation: 'fadeIn 0.3s ease'
            }}
          >
            <h3 style={{ marginBottom: '8px' }}>Detailed View: {selectedReq}</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Detailed auditing and approver remarks for {selectedReq} are listed here. The procurement workflow requires double sign-offs for budgets exceeding $10k.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerDashboard;
