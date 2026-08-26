import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileView } from '@vosox/shared-ui';
import type { PersonDetail, PersonDetailUpdate } from '@vosox/shared-ui';
import { isErrorResponse } from '@vosox/shared-ui';
import { getPersonDetailCached, updatePersonDetail, invalidatePersonDetailCache } from '../api/networkAdminApi';
import { useNetworkAdminAuthStore } from '../store/useAuthStore';
import Header from '../components/Header';

const BuyerAdminProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const authLoading = useNetworkAdminAuthStore((state) => state.isLoading);
  const initializeFromSession = useNetworkAdminAuthStore((state) => state.initializeFromSession);

  const [personDetail, setPersonDetail] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeFromSession();
  }, [initializeFromSession]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getPersonDetailCached();

    if (isErrorResponse(result)) {
      setError(result.message || 'Failed to load profile.');
      setPersonDetail(null);
    } else {
      setPersonDetail(result as unknown as PersonDetail);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading) {
      loadProfile();
    }
  }, [authLoading, loadProfile]);

  const handleSave = async (updates: PersonDetailUpdate) => {
    setSaving(true);
    setError(null);

    const result = await updatePersonDetail(updates);

    if (isErrorResponse(result)) {
      setError(result.message || 'Failed to update profile.');
    } else {
      invalidatePersonDetailCache();
      setPersonDetail(result as unknown as PersonDetail);
    }

    setSaving(false);
  };

  if (authLoading) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#ffffff' }}>
      <Header />
        <ProfileView
          personDetail={personDetail}
          loading={loading}
          saving={saving}
          error={error}
          onSave={handleSave}
          onBack={() => navigate('/platform-user/buyer-admin')}
        />
    </div>
  );
};

export default BuyerAdminProfilePage;