import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileView} from '@vosox/shared-ui';
import type { PersonDetail, PersonDetailUpdate } from '@vosox/shared-ui';
import { getPersonDetail, updatePersonDetail } from '../api/networkAdminApi';
import { useNetworkAdminAuthStore } from '../store/useAuthStore';
import Header from '../components/Header';

const BuyerAdminProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useNetworkAdminAuthStore((state) => state.currentUser);
  const authLoading = useNetworkAdminAuthStore((state) => state.isLoading);
  const initializeFromSession = useNetworkAdminAuthStore((state) => state.initializeFromSession);

  const personId = currentUser?.personId ?? null;

  const [personDetail, setPersonDetail] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeFromSession();
  }, [initializeFromSession]);

  const loadProfile = useCallback(async () => {
    if (!personId) {
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
    if (!authLoading) {
      loadProfile();
    }
  }, [authLoading, loadProfile]);

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

  if (authLoading) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#ffffff' }}>
      <Header />
      <div style={{ marginTop: '4rem' }}>
        <ProfileView
          personDetail={personDetail}
          loading={loading}
          saving={saving}
          error={error}
          onSave={handleSave}
          onBack={() => navigate('/platform-user/buyer-admin')}
        />
      </div>
    </div>
  );
};

export default BuyerAdminProfilePage;