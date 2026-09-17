import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SilaLogo from "../../../host-app/public/assets/SILA_Logo.png";
import { useBuyerAuthStore } from '../store/useBuyerAuthStore';
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

const IconChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export interface HeaderNavLeaf {
  key: string;
  label: string;
}
// subItems can be a flat leaf (existing) or a non-clickable group with nested leaves.
export interface HeaderNavGroup {
  label: string;
  items: HeaderNavLeaf[];
}
export type HeaderNavSubEntry = HeaderNavLeaf | HeaderNavGroup;

const isHeaderNavGroup = (entry: HeaderNavSubEntry): entry is HeaderNavGroup => 'items' in entry;

const collectHeaderSubEntryKeys = (entries: HeaderNavSubEntry[]): string[] =>
  entries.flatMap((entry) => (isHeaderNavGroup(entry) ? collectHeaderSubEntryKeys(entry.items) : [entry.key]));

export interface HeaderNavItem {
  key: string;
  icon?: React.ReactNode;
  label: string;
  badge?: number;
  subItems?: HeaderNavSubEntry[];
}

export interface HeaderProps {
  navItems?: HeaderNavItem[];
  activeNav?: string;
  onNavClick?: (key: string) => void;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ navItems, activeNav, onNavClick, onLogout }) => {
  const navigate = useNavigate();
  // Sourced from the store, which fetches it once (on login and on reload) via
  // BuyerApp's mount effect - no per-component fetch, no local cache.
  const personDetail = useBuyerAuthStore((state) => state.personDetail);
  const userName = personDetail?.name || '';
  const userEmail = personDetail?.email || '';

  const firstLetter = userName ? userName.trim().charAt(0).toUpperCase() : '';

  const [openNavDropdown, setOpenNavDropdown] = useState<string | null>(null);
  const [navDropdownPos, setNavDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const navItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const closeDropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseDropdownTimeout = () => {
    if (closeDropdownTimeoutRef.current) {
      clearTimeout(closeDropdownTimeoutRef.current);
      closeDropdownTimeoutRef.current = null;
    }
  };

  const handleNavDropdownEnter = (key: string) => {
    clearCloseDropdownTimeout();
    const el = navItemRefs.current[key];
    if (el) {
      const rect = el.getBoundingClientRect();
      setNavDropdownPos({ top: rect.bottom, left: rect.left });
    }
    setOpenNavDropdown(key);
  };

  const handleNavDropdownLeave = () => {
    clearCloseDropdownTimeout();
    closeDropdownTimeoutRef.current = setTimeout(() => {
      setOpenNavDropdown(null);
    }, 150);
  };

  useEffect(() => {
    return () => clearCloseDropdownTimeout();
  }, []);

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
      navigate('/buyer/profile');
    }
  };

  const handleEditProfile = () => {
    setIsDropdownOpen(false);
    navigate('/buyer/profile');
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
      <div className="vsx-header-brand" >
        <a href="/buyer/dashboard">
        <img src={SilaLogo} alt="SILA Logo" className="vsx-header-logo" />
        </a>
        
      </div>

      {navItems && navItems.length > 0 && (
        <nav className="vsx-header-nav">
          {navItems.map((item) =>
            item.subItems && item.subItems.length > 0 ? (
              <div
                key={item.key}
                ref={(el) => { navItemRefs.current[item.key] = el; }}
                className="vsx-header-nav-dropdown"
                onMouseEnter={() => handleNavDropdownEnter(item.key)}
                onMouseLeave={handleNavDropdownLeave}
              >
                <button
                  type="button"
                  className={`vsx-header-nav-item${activeNav === item.key || collectHeaderSubEntryKeys(item.subItems).includes(activeNav || "") ? " vsx-header-nav-item-active" : ""}`}
                  onClick={() => onNavClick && onNavClick(item.key)}
                >
                  <span className="vsx-header-nav-label">{item.label}</span>
                  <span className="vsx-header-nav-chevron"><IconChevronDown /></span>
                </button>

                {openNavDropdown === item.key && navDropdownPos && (
                  <div
                    className="vsx-header-nav-dropdown-menu"
                    style={{ top: navDropdownPos.top, left: navDropdownPos.left }}
                    onMouseEnter={() => handleNavDropdownEnter(item.key)}
                    onMouseLeave={handleNavDropdownLeave}
                  >
                    {item.subItems.map((entry, entryIdx) =>
                      isHeaderNavGroup(entry) ? (
                        <div key={`${item.key}-group-${entryIdx}`} className="vsx-header-nav-subitem-group">
                          <div
                            className={`vsx-header-nav-subitem vsx-header-nav-subitem-parent${entry.items.some((leaf) => leaf.key === activeNav) ? " vsx-header-nav-subitem-active" : ""}`}
                          >
                            <span>{entry.label}</span>
                            <span className="vsx-header-nav-subitem-arrow">&rsaquo;</span>
                          </div>
                          <div className="vsx-header-nav-subitem-submenu">
                            {entry.items.map((leaf) => (
                              <button
                                key={leaf.key}
                                type="button"
                                className={`vsx-header-nav-subitem${activeNav === leaf.key ? " vsx-header-nav-subitem-active" : ""}`}
                                onClick={() => {
                                  setOpenNavDropdown(null);
                                  onNavClick && onNavClick(leaf.key);
                                }}
                              >
                                {leaf.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <button
                          key={entry.key}
                          type="button"
                          className={`vsx-header-nav-subitem${activeNav === entry.key ? " vsx-header-nav-subitem-active" : ""}`}
                          onClick={() => {
                            setOpenNavDropdown(null);
                            onNavClick && onNavClick(entry.key);
                          }}
                        >
                          {entry.label}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            ) : (
              <button
                key={item.key}
                type="button"
                className={`vsx-header-nav-item${activeNav === item.key ? " vsx-header-nav-item-active" : ""}`}
                onClick={() => onNavClick && onNavClick(item.key)}
              >
                <span className="vsx-header-nav-label">{item.label}</span>
                {item.badge ? <span className="vsx-header-nav-badge">{item.badge}</span> : null}
              </button>
            )
          )}
        </nav>
      )}

      <div className="vsx-header-spacer" />

      <div className="vsx-header-right" style={{ position: "relative" }}>
        <div className="vsx-header-user-card" onClick={handleAvatarClick} role="button" tabIndex={0}>
          <div className="vsx-header-account">
            <span className="vsx-header-account-name" title={userName}>{userName || 'Buyer Portal'}</span>
            <span className="vsx-header-account-email" title={userEmail}>{userEmail || 'Enterprise Access'}</span>
          </div>
          <div className="vsx-header-avatar">
            {firstLetter || 'B'}
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