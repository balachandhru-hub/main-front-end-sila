import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileView} from '@vosox/shared-ui';
import type { PersonDetail, PersonDetailUpdate } from '@vosox/shared-ui';
import { getPersonDetail, updatePersonDetail } from '../api/supplierApi';
import Header from '../components/Header';

const SupplierProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const personId = typeof window !== 'undefined' ? sessionStorage.getItem('vosox_person_id') : null;

  const [personDetail, setPersonDetail] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!personId) {
      setError('No person ID found in session.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getPersonDetail(personId);
      setPersonDetail(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async (updates: PersonDetailUpdate) => {
    if (!personId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updatePersonDetail(personId, updates);
      setPersonDetail(updated);
    } catch (e: any) {
      setError(e.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#ffffff' }}>
      <Header />
      <ProfileView
        personDetail={personDetail}
        loading={loading}
        saving={saving}
        error={error}
        onSave={handleSave}
        onBack={() => navigate('/supplier/dashboard')}
      />
    </div>
  );
};

export default SupplierProfilePage;