import React, { useState } from 'react';
import { Button } from '@vosox/shared-ui';

export const PlatformUserDashboard: React.FC = () => {
  const [platformUserCount, setPlatformUserCount] = useState(142);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  const accessRequests = [
    { id: 'USER-2026-041', name: 'Alice Johnson', role: 'Buyer', department: 'Procurement', status: 'Pending' },
    { id: 'USER-2026-042', name: 'Bob Smith', role: 'Supplier', department: 'Vendor Relations', status: 'Approved' },
    { id: 'USER-2026-043', name: 'Charlie Davis', role: 'Buyer', department: 'IT Support', status: 'Rejected' },
    { id: 'USER-2026-044', name: 'Diana Prince', role: 'Platform User', department: 'Platform Admin', status: 'Approved' },
  ];

  return (
    <div>
      <div className="header-bar">
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '6px' }}>Platform User Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Administrative insights, user management, and portal tracking</p>
        </div>
        <Button variant="primary" onClick={() => setPlatformUserCount(prev => prev + 1)}>
          Quick Provision User
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="glass-card metric-card">
          <div className="metric-title">Users Managed</div>
          <div className="metric-value">{platformUserCount}</div>
          <div className="metric-trend trend-up">
            ▲ 14.2% <span style={{ color: 'var(--text-dark)' }}>active users</span>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-title">Connected Apps</div>
          <div className="metric-value">8</div>
          <div className="metric-trend trend-up">
            ▲ All systems online
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-title">Pending Access Requests</div>
          <div className="metric-value">3</div>
          <div className="metric-trend trend-down">
            ▼ Requires attention
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-title">Platform Health</div>
          <div className="metric-value">99.8%</div>
          <div className="metric-trend trend-up">
            ▲ Optimal status
          </div>
        </div>
      </div>

      {/* Access Requests Section */}
      <div className="glass-card">
        <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '18px' }}>
          Recent Access Requests
        </h2>
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>User Name</th>
                <th>Assigned Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {accessRequests.map(req => (
                <tr key={req.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{req.id}</td>
                  <td>{req.name}</td>
                  <td>{req.role}</td>
                  <td>{req.department}</td>
                  <td>
                    <span className={`badge ${
                      req.status === 'Approved' ? 'badge-success' :
                      req.status === 'Pending' ? 'badge-warning' :
                      'badge-danger'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedRequest(req.id === selectedRequest ? null : req.id)}
                    >
                      {selectedRequest === req.id ? 'Close Details' : 'View'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedRequest && (
          <div 
            className="glass-card" 
            style={{ 
              marginTop: '20px', 
              background: 'rgba(99, 102, 241, 0.05)', 
              borderColor: 'var(--primary-color)',
              animation: 'fadeIn 0.3s ease'
            }}
          >
            <h3 style={{ marginBottom: '8px' }}>Detailed View: {selectedRequest}</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Audit log details for request {selectedRequest}. Platform administrators must verify user identity and role assignment bounds before approving credentials.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformUserDashboard;
