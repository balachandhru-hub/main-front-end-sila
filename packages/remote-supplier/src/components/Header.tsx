import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SilaLogo from "../assets/SILA_Logo.png";
import { getPersonDetailCached } from '../api/supplierApi';
import { isErrorResponse } from '@vosox/shared-ui';
import "./Header.css";

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

const IconBuilding = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
    <path d="M6 12H4a2 2 0 0 0-2 2v8" />
    <path d="M18 9h2a2 2 0 0 1 2 2v11" />
    <path d="M10 6h4" />
    <path d="M10 10h4" />
    <path d="M10 14h4" />
    <path d="M10 18h4" />
  </svg>
);

const IconHelpCircle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);

const IconLogOut = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export interface HeaderNavItem {
  key: string;
  icon?: React.ReactNode;
  label: string;
  badge?: number;
}

export interface HeaderProps {
  navItems?: HeaderNavItem[];
  activeNav?: string;
  onNavClick?: (key: string) => void;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ navItems, activeNav, onNavClick, onLogout }) => {
  const navigate = useNavigate();
  const hasLoadedRef = useRef(false);

  const [orgName, setOrgName] = useState<string>('');
  const [orgEmail, setOrgEmail] = useState<string>('');

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadPersonDetail = async () => {
      const result = await getPersonDetailCached();

      if (isErrorResponse(result)) {
        return;
      }

      setOrgName(result.organizationName || '');
      setOrgEmail(result.organizationEmail || '');
    };

    loadPersonDetail();
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

  const handleCompanyProfile = () => {
    setIsDropdownOpen(false);
    if (onNavClick) {
      onNavClick("companyProfile");
    } else {
      navigate('/supplier/profile');
    }
  };

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

  const handleLogoutClick = () => {
    setIsDropdownOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      sessionStorage.clear();
      localStorage.clear();
      window.dispatchEvent(new CustomEvent("session:expired"));
    }
  };

  return (
    <header className="vsx-header">
      <img src={SilaLogo} alt="SILA Logo" className="vsx-header-logo" />

      {navItems && navItems.length > 0 && (
        <nav className="vsx-header-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`vsx-header-nav-item${activeNav === item.key ? " vsx-header-nav-item-active" : ""}`}
              onClick={() => onNavClick && onNavClick(item.key)}
            >
              <span className="vsx-header-nav-label">{item.label}</span>
              {item.badge ? <span className="vsx-header-nav-badge">{item.badge}</span> : null}
            </button>
          ))}
        </nav>
      )}

      <div className="vsx-header-spacer" />

      <div className="vsx-header-right" style={{ position: "relative" }}>
        <div className="vsx-header-user-card" onClick={handleAvatarClick} role="button" tabIndex={0}>
          <div className="vsx-header-account">
            <span className="vsx-header-account-name" title={orgName}>{orgName || 'Supplier Portal'}</span>
            <span className="vsx-header-account-email" title={orgEmail}>{orgEmail || 'Enterprise Access'}</span>
          </div>
          <div className="vsx-header-avatar">
            {firstLetter || 'S'}
          </div>
        </div>

        {isDropdownOpen && (
          <div ref={dropdownRef} className="vsx-profile-dropdown">
            <button className="vsx-dropdown-item" onClick={handleCompanyProfile}>
              <IconBuilding />
              <span>Company Profile</span>
            </button>
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
            <div className="vsx-dropdown-divider" />
            <button className="vsx-dropdown-item vsx-dropdown-item-danger" onClick={handleLogoutClick}>
              <IconLogOut />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;