import React, { useState } from 'react';
import { Button } from '@vosox/shared-ui';

export const SupplierDashboard: React.FC = () => {
  const [winRate, setWinRate] = useState(68);
  const [selectedBid, setSelectedBid] = useState<string | null>(null);

  const bids = [
    { id: 'RFQ-5051', title: 'Data Center Cooling Upgrades', buyer: 'Metro Gov Office', value: '$84,000', status: 'In Review' },
    { id: 'RFQ-5052', title: 'SaaS Customer Portal Dev', department: 'Vosox Systems Inc', value: '$120,000', status: 'Won' },
    { id: 'RFQ-5053', title: 'Cybersecurity Network Audit', department: 'Enterprise Org', value: '$35,000', status: 'Lost' },
    { id: 'RFQ-5054', title: 'AI Integration Proof of Concept', department: 'Tech Giant Ltd', value: '$95,000', status: 'Submitted' },
  ];

  return (
    <div>
      <div className="header-bar">
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '6px' }}>Supplier Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Lead pipelines, order statuses, and performance</p>
        </div>
        <Button variant="primary" onClick={() => setWinRate(prev => Math.min(100, prev + 1))}>
          Refresh Analytics
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="glass-card metric-card">
          <div className="metric-title">Revenue YTD</div>
          <div className="metric-value">$1,248,600</div>
          <div className="metric-trend trend-up">
            ▲ 18.2% <span style={{ color: 'var(--text-dark)' }}>vs last fiscal year</span>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-title">Active Bids</div>
          <div className="metric-value">14</div>
          <div className="metric-trend trend-up">
            ▲ 2 new <span style={{ color: 'var(--text-dark)' }}>this week</span>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-title">Bids Won</div>
          <div className="metric-value">9</div>
          <div className="metric-trend trend-up">
            ▲ 74% win efficiency
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-title">Bid Win Rate</div>
          <div className="metric-value">{winRate}%</div>
          <div className="metric-trend trend-up" style={{ color: 'var(--accent-color)' }}>
            ★ Premium Tier Seller
          </div>
        </div>
      </div>

      {/* Recent Bids Section */}
      <div className="glass-card">
        <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '18px' }}>
          Recent RFQ Submissions
        </h2>
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>RFQ ID</th>
                <th>Project Title</th>
                <th>Client / Buyer</th>
                <th>Bid Value</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bids.map(bid => (
                <tr key={bid.id}>
                  <td style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{bid.id}</td>
                  <td>{bid.title}</td>
                  <td>{bid.buyer || bid.department}</td>
                  <td>{bid.value}</td>
                  <td>
                    <span className={`badge ${
                      bid.status === 'Won' ? 'badge-success' :
                      bid.status === 'In Review' || bid.status === 'Submitted' ? 'badge-warning' :
                      'badge-danger'
                    }`}>
                      {bid.status}
                    </span>
                  </td>
                  <td>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedBid(bid.id === selectedBid ? null : bid.id)}
                    >
                      {selectedBid === bid.id ? 'Close Details' : 'View'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedBid && (
          <div 
            className="glass-card" 
            style={{ 
              marginTop: '20px', 
              background: 'rgba(168, 85, 247, 0.05)', 
              borderColor: 'var(--accent-color)',
              animation: 'fadeIn 0.3s ease'
            }}
          >
            <h3 style={{ marginBottom: '8px' }}>Detailed View: {selectedBid}</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Feedback and pricing breakdown details for bid {selectedBid}. Negotiation history is confidential between the buyer organization and your authorized company representatives.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierDashboard;
