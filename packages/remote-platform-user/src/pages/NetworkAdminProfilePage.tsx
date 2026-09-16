import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileView } from '@vosox/shared-ui';
import type { PersonDetail, PersonDetailUpdate } from '@vosox/shared-ui';
import { isErrorResponse } from '@vosox/shared-ui';
import { getPersonDetailCached, updatePersonDetail, invalidatePersonDetailCache } from '../api/networkAdminApi';
import { useNetworkAdminAuthStore } from '../store/useAuthStore';
import Header from '../components/Header';

const NetworkAdminProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const authLoading = useNetworkAdminAuthStore((state) => state.isLoading);
  const currentUser = useNetworkAdminAuthStore((state) => state.currentUser);
  const initializeFromSession = useNetworkAdminAuthStore((state) => state.initializeFromSession);
  const networkAdminHome =
    currentUser?.userRole === 'SUPPLIER_NETWORK_ADMIN'
      ? '/platform-user/supplier-network-admin'
      : '/platform-user/buyer-network-admin';
  const hasLoadedRef = useRef(false);

  const [personDetail, setPersonDetail] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeFromSession();
  }, [initializeFromSession]);

  const loadProfile = useCallback(async () => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

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
      invalidatePersonDetailCache(result);
      setPersonDetail(result as unknown as PersonDetail);
    }

    setSaving(false);
  };

  if (authLoading) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-color)' }}>
      <Header />
      <div style={{ marginTop: '4rem' }}>
        <ProfileView
          personDetail={personDetail}
          loading={loading}
          saving={saving}
          error={error}
          onSave={handleSave}
          onBack={() => navigate(networkAdminHome)}
        />
      </div>
    </div>
  );
};

export default NetworkAdminProfilePage;