import React from 'react';

export const SupplierDashboard: React.FC = () => {
  const userId = sessionStorage.getItem('vosox_user_id');
  const personId = sessionStorage.getItem('vosox_person_id');
  const organizationId = sessionStorage.getItem('vosox_organization_id');
  const roleId = sessionStorage.getItem('vosox_role_id');
  const userRole = sessionStorage.getItem('vosox_user_role');

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: '#ffffff',
      padding: '32px',
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: '1px solid #e5e7eb'
    }}>
      <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '24px', color: '#111827' }}>
        Supplier Dashboard
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
          <strong style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>User ID</strong>
          <span style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#1f2937', wordBreak: 'break-all' }}>{userId || 'N/A'}</span>
        </div>

        <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
          <strong style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Person ID</strong>
          <span style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#1f2937', wordBreak: 'break-all' }}>{personId || 'N/A'}</span>
        </div>

        <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
          <strong style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Organization ID</strong>
          <span style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#1f2937', wordBreak: 'break-all' }}>{organizationId || 'N/A'}</span>
        </div>

        <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
          <strong style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Role ID</strong>
          <span style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#1f2937', wordBreak: 'break-all' }}>{roleId || 'N/A'}</span>
        </div>

        <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
          <strong style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>User Role</strong>
          <span style={{ fontSize: '1rem', color: '#1f2937', fontWeight: 600 }}>{userRole || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
};

export default SupplierDashboard;