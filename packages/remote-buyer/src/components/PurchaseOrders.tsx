import React, { useState } from 'react';
import { Button } from '@vosox/shared-ui';

interface PO {
  id: string;
  vendor: string;
  amount: string;
  date: string;
  status: 'Draft' | 'Sent' | 'Completed' | 'Cancelled';
}

export const PurchaseOrders: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [pos, setPOs] = useState<PO[]>([
    { id: 'PO-99120', vendor: 'Global Logistics Corp', amount: '$14,500', date: '2026-06-28', status: 'Sent' },
    { id: 'PO-99121', vendor: 'TechSolutions Ltd', amount: '$23,200', date: '2026-06-25', status: 'Completed' },
    { id: 'PO-99122', vendor: 'Office Supply Depot', amount: '$3,800', date: '2026-06-20', status: 'Completed' },
    { id: 'PO-99123', vendor: 'Prime Builders', amount: '$42,000', date: '2026-06-19', status: 'Draft' },
    { id: 'PO-99124', vendor: 'Apex Consulting Group', amount: '$11,000', date: '2026-06-15', status: 'Cancelled' },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newVendor, setNewVendor] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const handleAddPO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendor || !newAmount) return;

    const newPO: PO = {
      id: `PO-${Math.floor(10000 + Math.random() * 90000)}`,
      vendor: newVendor,
      amount: `$${parseFloat(newAmount).toLocaleString()}`,
      date: new Date().toISOString().split('T')[0],
      status: 'Draft',
    };

    setPOs([newPO, ...pos]);
    setNewVendor('');
    setNewAmount('');
    setShowAddForm(false);
  };

  const filteredPOs = pos.filter(po => {
    const matchesSearch = po.id.toLowerCase().includes(search.toLowerCase()) || 
                          po.vendor.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterStatus === 'All' || po.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <div className="header-bar">
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '6px' }}>Purchase Orders</h1>
          <p style={{ color: 'var(--text-muted)' }}>Generate, track, and send purchase orders</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel PO creation' : 'Create New PO'}
        </Button>
      </div>

      {showAddForm && (
        <div className="glass-card" style={{ marginBottom: '30px', animation: 'fadeIn 0.3s ease' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', fontWeight: 600 }}>Create New Purchase Order</h3>
          <form onSubmit={handleAddPO} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Vendor Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Acme Corp"
                value={newVendor}
                onChange={e => setNewVendor(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Total Amount ($)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 5000"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <Button type="submit" variant="primary" fullWidth={true}>Save as Draft</Button>
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
            placeholder="Search PO ID or Vendor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '320px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Status:</span>
          {['All', 'Draft', 'Sent', 'Completed', 'Cancelled'].map(status => (
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

      {/* PO Table */}
      <div className="glass-card">
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>PO ID</th>
                <th>Vendor</th>
                <th>Amount</th>
                <th>Created Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPOs.length > 0 ? (
                filteredPOs.map(po => (
                  <tr key={po.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{po.id}</td>
                    <td>{po.vendor}</td>
                    <td>{po.amount}</td>
                    <td>{po.date}</td>
                    <td>
                      <span className={`badge ${
                        po.status === 'Completed' ? 'badge-success' :
                        po.status === 'Sent' ? 'badge-info' :
                        po.status === 'Draft' ? 'badge-warning' :
                        'badge-danger'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {po.status === 'Draft' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setPOs(pos.map(p => p.id === po.id ? { ...p, status: 'Sent' } : p));
                            }}
                          >
                            Send
                          </Button>
                        )}
                        {po.status === 'Sent' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setPOs(pos.map(p => p.id === po.id ? { ...p, status: 'Completed' } : p));
                            }}
                          >
                            Complete
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">Audit</Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dark)', padding: '30px' }}>
                    No purchase orders found matching the filter criteria.
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

export default PurchaseOrders;
