import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // Add this import
import { getAllBuyers, getAllSuppliers, logoutPlatformUser } from '../api/platformApi';
import type { BuyerDto, SupplierDto, BusinessProfileDto, PlatformEntityType, PlatformRecordDto } from '../dto/platformDto';
import {
  FaUser,
  FaBuilding,
  FaEnvelope,
  FaPhone,
  FaGlobe,
  FaMapMarkerAlt,
  FaSearch,
  FaSignOutAlt,
  FaChevronLeft,
  FaChevronRight,
  FaCog,
} from 'react-icons/fa';
import { PlatformUserPopup } from './PlatformUserPopup';
import './PlatformUserDashboard.css';
const sila_logo = `${window.location.protocol}//${window.location.host}/assets/SILA_Logo.png`;

const PAGE_SIZE = 8;

export const PlatformUserDashboard: React.FC = () => {
  const navigate = useNavigate(); // Add this hook
  const [buyers, setBuyers] = useState<BuyerDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sectionLoading, setSectionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PlatformEntityType>('buyers');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loggingOut, setLoggingOut] = useState<boolean>(false);

  const [buyerIndex, setBuyerIndex] = useState<number>(0);
  const [supplierIndex, setSupplierIndex] = useState<number>(0);
  const [buyersHasMore, setBuyersHasMore] = useState<boolean>(false);
  const [suppliersHasMore, setSuppliersHasMore] = useState<boolean>(false);

  const [selectedDetail, setSelectedDetail] = useState<{ type: PlatformEntityType; record: PlatformRecordDto } | null>(
    null
  );

  const loadBuyers = useCallback(async (index: number) => {
    setSectionLoading(true);
    try {
      const data = await getAllBuyers({ index, limit: PAGE_SIZE });
      const resolved = Array.isArray(data) ? data : (data as any)?.buyers || (data as any)?.data || [];
      setBuyers(resolved);
      setBuyersHasMore(resolved.length === PAGE_SIZE);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch buyers:', err);
      setError(err.message || 'Failed to load buyers.');
    } finally {
      setSectionLoading(false);
    }
  }, []);

  const loadSuppliers = useCallback(async (index: number) => {
    setSectionLoading(true);
    try {
      const data = await getAllSuppliers({ index, limit: PAGE_SIZE });
      const resolved = Array.isArray(data) ? data : (data as any)?.suppliers || (data as any)?.data || [];
      setSuppliers(resolved);
      setSuppliersHasMore(resolved.length === PAGE_SIZE);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch suppliers:', err);
      setError(err.message || 'Failed to load suppliers.');
    } finally {
      setSectionLoading(false);
    }
  }, []);

  // Initial load: fetch both lists' first page
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [buyersResult, suppliersResult] = await Promise.allSettled([
        getAllBuyers({ index: 0, limit: PAGE_SIZE }),
        getAllSuppliers({ index: 0, limit: PAGE_SIZE }),
      ]);

      const errors: string[] = [];

      if (buyersResult.status === 'fulfilled') {
        const resolved = Array.isArray(buyersResult.value)
          ? buyersResult.value
          : (buyersResult.value as any)?.buyers || (buyersResult.value as any)?.data || [];
        setBuyers(resolved);
        setBuyersHasMore(resolved.length === PAGE_SIZE);
      } else {
        console.error('Failed to fetch buyers:', buyersResult.reason);
        errors.push(buyersResult.reason?.message || 'Failed to load buyers.');
      }

      if (suppliersResult.status === 'fulfilled') {
        const resolved = Array.isArray(suppliersResult.value)
          ? suppliersResult.value
          : (suppliersResult.value as any)?.suppliers || (suppliersResult.value as any)?.data || [];
        setSuppliers(resolved);
        setSuppliersHasMore(resolved.length === PAGE_SIZE);
      } else {
        console.error('Failed to fetch suppliers:', suppliersResult.reason);
        errors.push(suppliersResult.reason?.message || 'Failed to load suppliers.');
      }

      if (errors.length > 0) setError(errors.join(' '));
      setLoading(false);
    })();
  }, []);

  const handleNextPage = () => {
    if (activeTab === 'buyers') {
      if (!buyersHasMore) return;
      const nextIndex = buyerIndex + 1;
      setBuyerIndex(nextIndex);
      loadBuyers(nextIndex);
    } else {
      if (!suppliersHasMore) return;
      const nextIndex = supplierIndex + 1;
      setSupplierIndex(nextIndex);
      loadSuppliers(nextIndex);
    }
  };

  const handlePrevPage = () => {
    if (activeTab === 'buyers') {
      if (buyerIndex === 0) return;
      const prevIndex = buyerIndex - 1;
      setBuyerIndex(prevIndex);
      loadBuyers(prevIndex);
    } else {
      if (supplierIndex === 0) return;
      const prevIndex = supplierIndex - 1;
      setSupplierIndex(prevIndex);
      loadSuppliers(prevIndex);
    }
  };

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
      sessionStorage.clear();
      window.dispatchEvent(new CustomEvent('session:expired'));
      setLoggingOut(false);
    }
  };

  const filterList = (list: PlatformRecordDto[]) => {
    return list.filter((item) => {
      const profile = item.businessProfile || ({} as BusinessProfileDto);
      const name = (profile.organizationName || '').toLowerCase();
      const email = (profile.email || '').toLowerCase();
      const industry = (profile.industry || '').toLowerCase();
      const bizType = (profile.businessType || '').toLowerCase();
      const country = (profile.country || '').toLowerCase();
      const city = (profile.city || '').toLowerCase();
      const query = searchQuery.toLowerCase();

      return (
        name.includes(query) ||
        email.includes(query) ||
        industry.includes(query) ||
        bizType.includes(query) ||
        country.includes(query) ||
        city.includes(query)
      );
    });
  };

  const filteredList = activeTab === 'buyers' ? filterList(buyers) : filterList(suppliers);
  const currentIndex = activeTab === 'buyers' ? buyerIndex : supplierIndex;
  const currentHasMore = activeTab === 'buyers' ? buyersHasMore : suppliersHasMore;

  return (
    <div className="plat-dashboard">
      {/* Top Header Bar with Logo, Settings, and Logout */}
      <header className="plat-top-header">
        <img src={sila_logo} alt="SILA" className="plat-top-logo" />
        <div className="plat-header-actions">
          <button
            className="plat-settings-btn"
            onClick={handleSettingsClick}
            title="Settings"
          >
            <FaCog />
          </button>
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

        {/* Stats Section */}
        <section className="plat-stats-grid">
          <div className="plat-stat-card" onClick={() => setActiveTab('buyers')} style={{ cursor: 'pointer' }}>
            <div className="plat-stat-icon-wrapper plat-stat-icon-buyers">
              <FaUser />
            </div>
            <div className="plat-stat-info">
              <span className="plat-stat-value">{loading ? '...' : buyers.length}</span>
              <span className="plat-stat-label">Buyers On This Page</span>
            </div>
          </div>

          <div className="plat-stat-card" onClick={() => setActiveTab('suppliers')} style={{ cursor: 'pointer' }}>
            <div className="plat-stat-icon-wrapper plat-stat-icon-suppliers">
              <FaBuilding />
            </div>
            <div className="plat-stat-info">
              <span className="plat-stat-value">{loading ? '...' : suppliers.length}</span>
              <span className="plat-stat-label">Suppliers On This Page</span>
            </div>
          </div>
        </section>

        {/* Controls Bar */}
        <div className="plat-controls-bar">
          <div className="plat-tabs">
            <button
              onClick={() => setActiveTab('buyers')}
              className={`plat-tab-btn ${activeTab === 'buyers' ? 'active' : ''}`}
            >
              Buyers ({buyers.length})
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`plat-tab-btn ${activeTab === 'suppliers' ? 'active active-suppliers' : ''}`}
            >
              Suppliers ({suppliers.length})
            </button>
          </div>

          <div className="plat-search-wrapper">
            <FaSearch className="plat-search-icon" />
            <input
              type="text"
              placeholder={`Search ${activeTab} on this page...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="plat-search-input"
            />
          </div>
        </div>

        {/* Error Banner */}
        {error && <div className="plat-error-banner">{error}</div>}

        {/* Loading Spinner */}
        {loading ? (
          <div className="plat-loading-container">
            <div className="plat-spinner"></div>
            <span style={{ color: '#4a5568', fontWeight: 500 }}>Loading platform registry...</span>
          </div>
        ) : (
          <>
            {filteredList.length === 0 ? (
              <div className="plat-empty-state">
                <div className="plat-empty-icon">{activeTab === 'buyers' ? <FaUser /> : <FaBuilding />}</div>
                <h3 className="plat-empty-title">No {activeTab} found</h3>
                <p className="plat-empty-desc">
                  {searchQuery
                    ? `No results matching "${searchQuery}" on this page.`
                    : `There are currently no registered ${activeTab} on this page.`}
                </p>
              </div>
            ) : (
              <div className={`plat-cards-grid ${sectionLoading ? 'plat-cards-grid-loading' : ''}`}>
                {filteredList.map((item) => {
                  const profile = item.businessProfile || ({} as BusinessProfileDto);
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
                              style={{ color: activeTab === 'buyers' ? '#3182ce' : '#805ad5', textDecoration: 'none' }}
                            >
                              {website}
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="plat-card-footer plat-card-footer-actions">
                        <span>ID: {item.organizationId}</span>
                        <button
                          className="plat-see-more-btn"
                          onClick={() => setSelectedDetail({ type: activeTab, record: item })}
                        >
                          See More Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            <div className="plat-pagination-bar">
              <button className="plat-pagination-btn" onClick={handlePrevPage} disabled={currentIndex === 0 || sectionLoading}>
                <FaChevronLeft />
                Previous
              </button>
              <span className="plat-pagination-label">
                Page {currentIndex + 1}
                {sectionLoading && ' · Loading...'}
              </span>
              <button className="plat-pagination-btn" onClick={handleNextPage} disabled={!currentHasMore || sectionLoading}>
                Next
                <FaChevronRight />
              </button>
            </div>
          </>
        )}
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