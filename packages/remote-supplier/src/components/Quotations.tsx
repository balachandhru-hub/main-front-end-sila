import React, { useState } from 'react';
import { Button } from '@vosox/shared-ui';

interface RFQ {
  id: string;
  title: string;
  client: string;
  deadline: string;
  myBid: string | null;
  status: 'Open' | 'Submitted' | 'Closed';
}

export const Quotations: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [rfqs, setRFQs] = useState<RFQ[]>([
    { id: 'RFQ-8801', title: 'Supply of Office Laptops (50 Units)', client: 'Vortex Tech', deadline: '2026-07-15', myBid: null, status: 'Open' },
    { id: 'RFQ-8802', title: 'Network Switch Replacements', client: 'Financial Corp', deadline: '2026-07-20', myBid: '$18,500', status: 'Submitted' },
    { id: 'RFQ-8803', title: 'Cloud Data Migration Services', client: 'Retail Giant', deadline: '2026-07-22', myBid: null, status: 'Open' },
    { id: 'RFQ-8804', title: 'Cybersecurity Threat Monitoring', client: 'Gov Agency', deadline: '2026-06-30', myBid: '$41,200', status: 'Closed' },
    { id: 'RFQ-8805', title: 'Helpdesk Software Support License', client: 'Media Networks', deadline: '2026-07-02', myBid: '$5,900', status: 'Submitted' },
  ]);

  const [activeRFQId, setActiveRFQId] = useState<string | null>(null);
  const [bidValue, setBidValue] = useState('');

  const handleSubmitBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRFQId || !bidValue) return;

    setRFQs(rfqs.map(rfq => {
      if (rfq.id === activeRFQId) {
        return {
          ...rfq,
          myBid: `$${parseFloat(bidValue).toLocaleString()}`,
          status: 'Submitted'
        };
      }
      return rfq;
    }));

    setBidValue('');
    setActiveRFQId(null);
  };

  const filteredRFQs = rfqs.filter(rfq => {
    const matchesSearch = rfq.title.toLowerCase().includes(search.toLowerCase()) || 
                          rfq.client.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterStatus === 'All' || 
                          (filterStatus === 'Submitted' && rfq.myBid !== null) || 
                          (filterStatus === 'Open' && rfq.myBid === null && rfq.status === 'Open') ||
                          (filterStatus === 'Closed' && rfq.status === 'Closed');
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <div className="header-bar">
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '6px' }}>Quotations & Bids</h1>
          <p style={{ color: 'var(--text-muted)' }}>Respond to buyer RFQs and check bid history</p>
        </div>
      </div>

      {activeRFQId && (
        <div className="glass-card" style={{ marginBottom: '30px', animation: 'fadeIn 0.3s ease' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', fontWeight: 600 }}>
            Submit Proposal for {activeRFQId}
          </h3>
          <form onSubmit={handleSubmitBid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Project Title</label>
              <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', fontSize: '0.95rem' }}>
                {rfqs.find(r => r.id === activeRFQId)?.title}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Your Bid Price ($)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 15000"
                value={bidValue}
                onChange={e => setBidValue(e.target.value)}
                required
              />
            </div>
            <div>
              <Button type="submit" variant="primary" fullWidth={true}>Submit Bid</Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search RFQ or Client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '320px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Status:</span>
          {['All', 'Open', 'Submitted', 'Closed'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                background: filterStatus === status ? 'var(--primary-color)' : 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                color: 'var(--text-color)',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'var(--transition-smooth)'
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* RFQ List */}
      <div className="glass-card">
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>RFQ ID</th>
                <th>RFQ Title</th>
                <th>Client</th>
                <th>Deadline</th>
                <th>Your Bid</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRFQs.length > 0 ? (
                filteredRFQs.map(rfq => (
                  <tr key={rfq.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{rfq.id}</td>
                    <td>{rfq.title}</td>
                    <td>{rfq.client}</td>
                    <td>{rfq.deadline}</td>
                    <td>{rfq.myBid || <span style={{ color: 'var(--text-dark)' }}>--</span>}</td>
                    <td>
                      <span className={`badge ${
                        rfq.status === 'Open' && !rfq.myBid ? 'badge-success' :
                        rfq.status === 'Closed' ? 'badge-danger' :
                        'badge-info'
                      }`}>
                        {rfq.myBid ? 'Submitted' : rfq.status}
                      </span>
                    </td>
                    <td>
                      {rfq.status === 'Open' && !rfq.myBid ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setActiveRFQId(rfq.id);
                          }}
                        >
                          Place Bid
                        </Button>
                      ) : rfq.myBid ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setActiveRFQId(rfq.id);
                            setBidValue(rfq.myBid ? rfq.myBid.replace(/[\$,]/g, '') : '');
                          }}
                        >
                          Modify Bid
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" disabled={true}>Closed</Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dark)', padding: '30px' }}>
                    No quotations found matching the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Quotations;
