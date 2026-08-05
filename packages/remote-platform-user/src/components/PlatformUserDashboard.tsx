import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutPlatformUser } from '../api/platformApi';
import type { BusinessProfileDto, PlatformEntityType, PlatformRecordDto } from '../dto/platformDto';
import { useAuthStore } from '../../../host-app/src/store/useAuthStore';
import {
  FaEnvelope,
  FaPhone,
  FaGlobe,
  FaMapMarkerAlt,
  FaSignOutAlt,
  FaCog,
} from 'react-icons/fa';
import { PlatformUserPopup } from './PlatformUserPopup';
import './PlatformUserDashboard.css';
const sila_logo = `${window.location.protocol}//${window.location.host}/assets/SILA_Logo.png`;

// ─── Dummy module cards shown on the dashboard (design mirrors the previous buyer/supplier cards) ───
interface DashboardCardData {
  organizationId: string;
  id: string;
  type: PlatformEntityType;
  isActive: boolean;
  businessProfile: BusinessProfileDto;
}

const DUMMY_CARDS: DashboardCardData[] = [
  {
    organizationId: 'ORG-10021',
    id: 'BYR-10021',
    type: 'buyers',
    isActive: true,
    businessProfile: {
      organizationName: 'Meridian Retail Group',
      email: 'procurement@meridianretail.com',
      phone: '+91 98765 43210',
      website: 'www.meridianretail.com',
      businessType: 'Buyer',
      industry: 'Retail & FMCG',
      description: 'Multi-city retail chain sourcing packaged goods and private label products across India.',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      status: 'APPROVED',
      isActive: true,
    } as BusinessProfileDto,
  },
  {
    organizationId: 'ORG-10022',
    id: 'SUP-10022',
    type: 'suppliers',
    isActive: true,
    businessProfile: {
      organizationName: 'Vantage Industrial Supplies',
      email: 'sales@vantageindustrial.com',
      phone: '+91 91234 56780',
      website: 'www.vantageindustrial.com',
      businessType: 'Supplier',
      industry: 'Manufacturing',
      description: 'Manufacturer and distributor of industrial hardware, fasteners, and precision components.',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      status: 'APPROVED',
      isActive: true,
    } as BusinessProfileDto,
  },
  {
    organizationId: 'ORG-10023',
    id: 'BYR-10023',
    type: 'buyers',
    isActive: true,
    businessProfile: {
      organizationName: 'Northline Hospitality Pvt Ltd',
      email: 'purchase@northlinehotels.com',
      phone: '+91 98111 22334',
      website: 'www.northlinehotels.com',
      businessType: 'Buyer',
      industry: 'Hospitality',
      description: 'Hotel and resort group procuring kitchen supplies, linens, and facility maintenance items.',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      status: 'PENDING',
      isActive: true,
    } as BusinessProfileDto,
  },
  {
    organizationId: 'ORG-10024',
    id: 'SUP-10024',
    type: 'suppliers',
    isActive: true,
    businessProfile: {
      organizationName: 'Coastal Foods & Beverages Co.',
      email: 'orders@coastalfoodsco.com',
      phone: '+91 90000 11223',
      website: 'www.coastalfoodsco.com',
      businessType: 'Supplier',
      industry: 'Food & Beverage',
      description: 'Bulk supplier of packaged foods, beverages, and specialty ingredients to institutional buyers.',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      status: 'APPROVED',
      isActive: true,
    } as BusinessProfileDto,
  },
  {
    organizationId: 'ORG-10025',
    id: 'BYR-10025',
    type: 'buyers',
    isActive: false,
    businessProfile: {
      organizationName: 'Prime Healthcare Systems',
      email: 'supplychain@primehealthcare.in',
      phone: '+91 99887 76655',
      website: 'www.primehealthcare.in',
      businessType: 'Buyer',
      industry: 'Healthcare',
      description: 'Hospital network sourcing medical consumables, equipment, and facility maintenance services.',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      status: 'APPROVED',
      isActive: false,
    } as BusinessProfileDto,
  },
  {
    organizationId: 'ORG-10026',
    id: 'SUP-10026',
    type: 'suppliers',
    isActive: true,
    businessProfile: {
      organizationName: 'Zenith Packaging Solutions',
      email: 'info@zenithpackaging.com',
      phone: '+91 97766 54433',
      website: 'www.zenithpackaging.com',
      businessType: 'Supplier',
      industry: 'Packaging',
      description: 'Custom and standard packaging manufacturer serving FMCG, e-commerce, and pharma clients.',
      city: 'Ahmedabad',
      state: 'Gujarat',
      country: 'India',
      status: 'REJECTED',
      isActive: true,
    } as BusinessProfileDto,
  },
];

export const PlatformUserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState<boolean>(false);

  const [selectedDetail, setSelectedDetail] = useState<{ type: PlatformEntityType; record: PlatformRecordDto } | null>(
    null
  );

  const handleSettingsClick = () => {
    navigate('../settings');
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutPlatformUser();
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      useAuthStore.getState().logout();
      window.dispatchEvent(new CustomEvent('session:expired'));
      setLoggingOut(false);
    }
  };

  return (
    <div className="plat-dashboard">
      {/* Top Header Bar with Logo and Logout */}
      <header className="plat-top-header">
        <img src={sila_logo} alt="SILA" className="plat-top-logo" />
        <div className="plat-header-actions">
          <button
            className="plat-logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Log out"
          >
            <FaSignOutAlt />
            {loggingOut ? 'Logging out...' : 'Log Out'}
          </button>
        </div>
      </header>

      <div className="plat-content-wrapper">
        {/* Header */}
        <header className="plat-header">
          <h1 className="plat-title">Platform Administrator Dashboard</h1>
          <p className="plat-subtitle">Manage, view, and monitor registered buyers and suppliers on the platform.</p>
        </header>

        {/* Cards Grid */}
        <div className="plat-cards-grid">
          {DUMMY_CARDS.map((item) => {
            const profile = item.businessProfile;
            const name = profile.organizationName || 'Unnamed Business';
            const email = profile.email || 'No email provided';
            const phone = profile.phone || 'No phone number';
            const website = profile.website;
            const bizType = profile.businessType;
            const industry = profile.industry;
            const description = profile.description;

            const locationParts = [profile.city, profile.state, profile.country].filter(Boolean);
            const location = locationParts.join(', ') || 'No address specified';

            return (
              <div key={item.organizationId} className="plat-card">
                <div className="plat-card-header">
                  <div className="plat-card-title-row">
                    <h3 className="plat-card-name">{name}</h3>
                    {bizType && <span className="plat-badge plat-badge-type">{bizType}</span>}
                  </div>
                  {industry && (
                    <div style={{ marginTop: '4px' }}>
                      <span className="plat-badge plat-badge-industry">{industry}</span>
                    </div>
                  )}
                </div>

                {description && (
                  <p className="plat-card-desc" title={description}>
                    {description}
                  </p>
                )}

                <div className="plat-card-details">
                  <div className="plat-detail-item">
                    <FaEnvelope className="plat-detail-icon" />
                    <span className="plat-detail-text" title={email}>
                      {email}
                    </span>
                  </div>

                  <div className="plat-detail-item">
                    <FaPhone className="plat-detail-icon" />
                    <span className="plat-detail-text">{phone}</span>
                  </div>

                  <div className="plat-detail-item">
                    <FaMapMarkerAlt className="plat-detail-icon" />
                    <span className="plat-detail-text" title={location}>
                      {location}
                    </span>
                  </div>

                  {website && (
                    <div className="plat-detail-item">
                      <FaGlobe className="plat-detail-icon" />
                      <a
                        href={website.startsWith('http') ? website : `https://${website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="plat-detail-text"
                        style={{ color: item.type === 'buyers' ? '#3182ce' : '#805ad5', textDecoration: 'none' }}
                      >
                        {website}
                      </a>
                    </div>
                  )}
                </div>

                <div className="plat-card-footer plat-card-footer-actions">
                  <span>ID: {item.organizationId}</span>
                  <div className="plat-card-footer-btns">
                    <button
                      className="plat-card-settings-btn"
                      onClick={handleSettingsClick}
                      title="Settings"
                    >
                      <FaCog />
                    </button>
                    <button
                      className="plat-see-more-btn"
                      onClick={() => setSelectedDetail({ type: item.type, record: item as unknown as PlatformRecordDto })}
                    >
                      See More Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDetail && (
        <PlatformUserPopup
          type={selectedDetail.type}
          record={selectedDetail.record}
          onClose={() => setSelectedDetail(null)}
        />
      )}
    </div>
  );
};

export default PlatformUserDashboard;