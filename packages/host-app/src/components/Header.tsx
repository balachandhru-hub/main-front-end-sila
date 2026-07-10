import React from 'react';
import './Header.css';
import vosx_logo from '../../public/assets/vosx-logo.png';

const Header: React.FC = () => {
  return (
    <header className="vx-header">
      <div className="vx-header-inner">
        <img src={vosx_logo} alt="VOSX" className="vx-logo-img" />
      </div>
    </header>
  );
};

export default Header;
