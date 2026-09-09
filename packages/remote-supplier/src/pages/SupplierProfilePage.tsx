import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileView } from '@vosox/shared-ui';
import type { PersonDetail, PersonDetailUpdate } from '@vosox/shared-ui';
import { isErrorResponse } from '@vosox/shared-ui';
import { getPersonDetailCached, updatePersonDetail, invalidatePersonDetailCache } from '../api/supplierApi';
import Header from '../components/Header';

const SupplierProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const hasLoadedRef = useRef(false);

  const [personDetail, setPersonDetail] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    setLoading(true);
    setError(null);

    const result = await getPersonDetailCached();

    if (isErrorResponse(result)) {
      setError(result.message || 'Failed to load profile.');
    } else {
      setPersonDetail(result as unknown as PersonDetail);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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