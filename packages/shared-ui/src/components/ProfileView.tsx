import React, { useState, useEffect } from 'react';
import type { PersonDetail, PersonDetailUpdate } from '../types/profile';
import './ProfileView.css';

interface ProfileViewProps {
  personDetail: PersonDetail | null;
  loading: boolean;
  saving?: boolean;
  error?: string | null;
  onSave: (updates: PersonDetailUpdate) => Promise<void> | void;
  onBack: () => void;
}

const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 6-10 7L2 6" />
  </svg>
);

const IconPhone = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const IconAt = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-5.5 8.28" />
  </svg>
);

const IconMapPin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconGlobe = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
  </svg>
);

// const IconArrowLeft = () => (
//   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//     <line x1="19" y1="12" x2="5" y2="12" />
//     <polyline points="12 19 5 12 12 5" />
//   </svg>
// );

const IconBack = () => (
<svg width="35" height="35" viewBox="0 0 24 24" fill="#ffffff" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <path d="M13.5 8l-4 4 4 4"/>
  </svg>
);

const IconEdit = () => (
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);

const EDITABLE_FIELDS: { key: keyof PersonDetail; label: string; icon: React.ReactNode }[] = [
  { key: 'name', label: 'Full Name', icon: <IconUser /> },
  { key: 'email', label: 'Email address', icon: <IconMail /> },
  { key: 'phone', label: 'Phone', icon: <IconPhone /> },
  { key: 'userName', label: 'Username', icon: <IconAt /> },
  { key: 'addressLine', label: 'Address', icon: <IconMapPin /> },
  { key: 'country', label: 'Country', icon: <IconGlobe /> },
];

export const ProfileView: React.FC<ProfileViewProps> = ({
  personDetail,
  loading,
  saving = false,
  error,
  onSave,
  onBack,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<PersonDetailUpdate>({});

  useEffect(() => {
    if (personDetail) {
      const { personId, userId, organizationId, roleId, roleName, ...editable } = personDetail;
      setFormData(editable);
    }
  }, [personDetail]);

  const handleChange = (key: keyof PersonDetail, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleEditClick = () => setIsEditing(true);

  const handleCancel = () => {
    if (personDetail) {
      const { personId, userId, organizationId, roleId, roleName, ...editable } = personDetail;
      setFormData(editable);
    }
    setIsEditing(false);
  };

  const handleUpdate = async () => {
    await onSave(formData);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-page-loading">Loading profile…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="profile-page-error">{error}</div>
      </div>
    );
  }

  if (!personDetail) {
    return null;
  }

  const initial = personDetail.name ? personDetail.name.charAt(0).toUpperCase() : '?';

  return (
    <div className="profile-page">
      <button className="profile-back-btn" onClick={onBack} type="button">
        <IconBack />
      </button>
      <div className="profile-banner">
        <div className="profile-banner-left">
          <div className="profile-banner-name">
            <div className="profile-avatar">{initial}</div>
            <div>
              <div className="profile-hero-name">{personDetail.name}</div>
              <div className="profile-hero-sub">
                <span className="profile-role-pill">{personDetail.roleName}</span>
              </div>
            </div>
          </div>

          <div className="edit-button">
            {!isEditing ? (
              <button className="profile-edit-btn" onClick={handleEditClick} type="button">
                <IconEdit/>Edit
              </button>
            ) : (
              <div className="profile-edit-actions">
                <button
                  className="profile-cancel-btn"
                  onClick={handleCancel}
                  disabled={saving}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="profile-update-btn"
                  onClick={handleUpdate}
                  disabled={saving}
                  type="button"
                >
                  {saving ? 'Updating…' : 'Update'}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="profile-section-card">
          <div className="profile-section-header">
            <div>
              <h2>Personal Information</h2>
              <p>Manage your name, contact details, and account identifiers.</p>
            </div>

          </div>

          <div className="profile-fields-grid">
            {EDITABLE_FIELDS.map(({ key, label, icon }) => (
              <div className={`profile-field ${isEditing ? 'is-editing' : ''}`} key={key}>
                <label>
                  <span className="profile-field-icon">{icon}</span>
                  {label}
                </label>
                <input
                  type="text"
                  value={(formData[key as keyof PersonDetailUpdate] as string) ?? ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  readOnly={!isEditing}
                  disabled={!isEditing}
                />
              </div>
            ))}
          </div>
        </div>
      </div>


    </div>

  );
};