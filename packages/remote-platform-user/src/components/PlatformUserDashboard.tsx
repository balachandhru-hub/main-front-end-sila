import React, { useState, useEffect } from 'react';
import { getAllBuyers, getAllSuppliers, logoutPlatformUser, type Buyer, type Supplier } from '../api/platformApi';
import { useAuthStore } from '../../../host-app/src/store/useAuthStore';
import { FaUser, FaBuilding, FaEnvelope, FaPhone, FaGlobe, FaMapMarkerAlt, FaSearch, FaSignOutAlt } from 'react-icons/fa';
import './PlatformUserDashboard.css';
const sila_logo = `${window.location.protocol}//${window.location.host}/assets/SILA_Logo.png`;

export const PlatformUserDashboard: React.FC = () => {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'buyers' | 'suppliers'>('buyers');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loggingOut, setLoggingOut] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const [buyersResult, suppliersResult] = await Promise.allSettled([
        getAllBuyers({ index: 0, limit: 50 }),
        getAllSuppliers({ index: 0, limit: 50 }),
      ]);

      const errors: string[] = [];

      if (buyersResult.status === 'fulfilled') {
        const buyersData = buyersResult.value;
        const resolvedBuyers = Array.isArray(buyersData)
          ? buyersData
          : (buyersData as any)?.buyers || (buyersData as any)?.data || [];
        setBuyers(resolvedBuyers);
      } else {
        console.error('Failed to fetch buyers:', buyersResult.reason);
        errors.push(buyersResult.reason?.message || 'Failed to load buyers.');
      }

      if (suppliersResult.status === 'fulfilled') {
        const suppliersData = suppliersResult.value;
        const resolvedSuppliers = Array.isArray(suppliersData)
          ? suppliersData
          : (suppliersData as any)?.suppliers || (suppliersData as any)?.data || [];
        setSuppliers(resolvedSuppliers);
      } else {
        console.error('Failed to fetch suppliers:', suppliersResult.reason);
        errors.push(suppliersResult.reason?.message || 'Failed to load suppliers.');
      }

      if (errors.length > 0) {
        setError(errors.join(' '));
      }
      setLoading(false);
    };
    fetchData();
  }, []);

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

  const filterList = (list: any[]) => {
    return list.filter((item) => {
      const profile = item.businessProfile || item;
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

  return (
    <div className="plat-dashboard">
      {/* Top Header Bar with Left Logo */}
      <header className="plat-top-header">
        <img src={sila_logo} alt="SILA" className="plat-top-logo" />
        <button
          className="plat-logout-btn"
          onClick={handleLogout}
          disabled={loggingOut}
          title="Log out"
        >
          <FaSignOutAlt />
          {loggingOut ? 'Logging out...' : 'Log Out'}
        </button>
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
              <span className="plat-stat-label">Total Registered Buyers</span>
            </div>
          </div>

          <div className="plat-stat-card" onClick={() => setActiveTab('suppliers')} style={{ cursor: 'pointer' }}>
            <div className="plat-stat-icon-wrapper plat-stat-icon-suppliers">
              <FaBuilding />
            </div>
            <div className="plat-stat-info">
              <span className="plat-stat-value">{loading ? '...' : suppliers.length}</span>
              <span className="plat-stat-label">Total Registered Suppliers</span>
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
              placeholder={`Search ${activeTab}...`}
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
                <div className="plat-empty-icon">
                  {activeTab === 'buyers' ? <FaUser /> : <FaBuilding />}
                </div>
                <h3 className="plat-empty-title">No {activeTab} found</h3>
                <p className="plat-empty-desc">
                  {searchQuery ? `No results matching "${searchQuery}"` : `There are currently no registered ${activeTab} on the platform.`}
                </p>
              </div>
            ) : (
              <div className="plat-cards-grid">
                {filteredList.map((item) => {
                  const profile = item.businessProfile || item;
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
                          {bizType && (
                            <span className="plat-badge plat-badge-type">{bizType}</span>
                          )}
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
                          <span className="plat-detail-text" title={email}>{email}</span>
                        </div>

                        <div className="plat-detail-item">
                          <FaPhone className="plat-detail-icon" />
                          <span className="plat-detail-text">{phone}</span>
                        </div>

                        <div className="plat-detail-item">
                          <FaMapMarkerAlt className="plat-detail-icon" />
                          <span className="plat-detail-text" title={location}>{location}</span>
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

                      <div className="plat-card-footer">
                        ID: {item.organizationId}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PlatformUserDashboard;