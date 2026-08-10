import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SilaLogo from "../assets/SILA_Logo.png";
import { getPersonDetail } from '../api/supplierApi';
import "./Header.css";
import { toast } from 'react-toastify';

const IconEdit = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconHelpCircle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);

const Header: React.FC = () => {
  const navigate = useNavigate();

  const [orgName, setOrgName] = useState<string>('');
  const [orgEmail, setOrgEmail] = useState<string>('');

  useEffect(() => {
    const personId = sessionStorage.getItem('vosox_person_id');
    if (!personId) return;

    getPersonDetail(personId)
      .then((detail: any) => {
        setOrgName(detail.organizationName || '');
        setOrgEmail(detail.organizationEmail || '');
      })
      .catch(() => toast.error("Failed to fetch person details"));
  }, []);

  const firstLetter = orgName ? orgName.trim().charAt(0).toUpperCase() : '';

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  const handleAvatarClick = () => setIsDropdownOpen((prev) => !prev);

  const handleEditProfile = () => {
    setIsDropdownOpen(false);
    navigate('/supplier/profile');
  };

  const handleResetPassword = () => {
    setIsDropdownOpen(false);
  };

  const handleSupport = () => {
    setIsDropdownOpen(false);
  };

  return (
    <header className="vsx-header">
      <img src={SilaLogo} alt="SILA Logo" className="vsx-header-logo" />

      <div className="vsx-header-spacer" />

      <div className="vsx-header-right">
        <div className="vsx-header-account">
          <span className="vsx-header-account-name" title={orgName}>{orgName}</span>
          <span className="vsx-header-account-email" title={orgEmail}>{orgEmail}</span>
        </div>

        <div style={{ position: "relative" }}>
          <div
            className="vsx-header-avatar"
            onClick={handleAvatarClick}
            role="button"
            tabIndex={0}
          >
            {firstLetter}
          </div>

          {isDropdownOpen && (
            <div ref={dropdownRef} className="vsx-profile-dropdown">
              <button className="vsx-dropdown-item" onClick={handleEditProfile}>
                <IconEdit />
                <span>Edit Profile</span>
              </button>
              <button className="vsx-dropdown-item" onClick={handleResetPassword}>
                <IconLock />
                <span>Reset Password</span>
              </button>
              <button className="vsx-dropdown-item" onClick={handleSupport}>
                <IconHelpCircle />
                <span>Support</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;