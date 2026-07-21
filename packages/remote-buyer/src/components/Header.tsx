import React from 'react';
import SilaLogo from "../../../host-app/public/assets/SILA_Logo.png";
import "./Header.css";

const IconBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const Header: React.FC = () => {
  const organizationName =
    (typeof window !== "undefined" && sessionStorage.getItem("vosox_organization_name")) ||
    "Apex Office & Technology Supp...";
  const firstLetter = organizationName.trim().charAt(0).toUpperCase();

  return (
    <header className="pud-header" style={{ width: "100%", zIndex: 10, position: "relative" }}>
      <div className="pud-header-left">
        <div className="pud-logo">
          <img src={SilaLogo} alt="SILA Logo" className="pud-logo-img" />
        </div>
      </div>
      <div className="pud-header-spacer" />
      <div className="pud-header-right">
        <span className="pud-header-bell">
          <IconBell />
        </span>
        <div className="pud-header-account">
          <span className="pud-header-account-name" title={organizationName}>
            {organizationName}
          </span>
          <span className="pud-header-account-verified">
            <IconCheck /> Verified Vendor
          </span>
        </div>
        <div className="pud-header-avatar">{firstLetter}</div>
      </div>
    </header>
  );
};

export default Header;
