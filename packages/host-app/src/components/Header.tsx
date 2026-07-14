import React from 'react';
import './Header.css';
import sila_logo from '../../public/assets/SILA_Logo.png';

const Header: React.FC = () => {
  return (
    <header className="vx-header">
      <div className="vx-header-inner">
        <img src={sila_logo} alt="SILA" className="vx-logo-img" />
      </div>
    </header>
  );
};

export default Header;
