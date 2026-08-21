import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FaCog,
  FaThLarge,
  FaList,
  FaExternalLinkAlt,
  FaBars,
  FaTimes,
  FaCheckCircle,
} from 'react-icons/fa';
import { PlatformUserDetailView } from './PlatformUserDetailView';
import './PlatformUserDashboard.css';

const sila_logo = `${window.location.protocol}//${window.location.host}/assets/SILA_Logo.png`;

const PAGE_SIZE = 8;

export const PlatformUserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState<BuyerDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sectionLoading, setSectionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PlatformEntityType>('buyers');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const [buyerIndex, setBuyerIndex] = useState<number>(0);
  const [supplierIndex, setSupplierIndex] = useState<number>(0);
  const [buyersHasMore, setBuyersHasMore] = useState<boolean>(true);
  const [suppliersHasMore, setSuppliersHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const [selectedDetail, setSelectedDetail] = useState<{ type: PlatformEntityType; record: PlatformRecordDto } | null>(
    null
  );

  const loadBuyers = useCallback(async (index: number = 0) => {
    setSectionLoading(true);
    try {
      const data = await getAllBuyers({ index, limit: PAGE_SIZE });
      const resolved = Array.isArray(data) ? data : (data as any)?.buyers || (data as any)?.data || [];
      setBuyers(resolved);
      setBuyerIndex(0);
      setBuyersHasMore(resolved.length === PAGE_SIZE);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch buyers:', err);
      setError(err.message || 'Failed to load buyers.');
    } finally {
      setSectionLoading(false);
    }
  }, []);

  const loadSuppliers = useCallback(async (index: number = 0) => {
    setSectionLoading(true);
    try {
      const data = await getAllSuppliers({ index, limit: PAGE_SIZE });
      const resolved = Array.isArray(data) ? data : (data as any)?.suppliers || (data as any)?.data || [];
      setSuppliers(resolved);
      setSupplierIndex(0);
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

  // Infinite Scroll fetch function
  const loadMore = useCallback(async () => {
    if (loadingMore || loading || sectionLoading) return;

    if (activeTab === 'buyers') {
      if (!buyersHasMore) return;
      setLoadingMore(true);
      const nextIndex = buyerIndex + 1;
      try {
        const data = await getAllBuyers({ index: nextIndex, limit: PAGE_SIZE });
        const resolved = Array.isArray(data) ? data : (data as any)?.buyers || (data as any)?.data || [];
        if (resolved.length > 0) {
          setBuyers((prev) => {
            const existingIds = new Set(prev.map((item) => item.organizationId || (item as any).id));
            const newItems = resolved.filter((item: any) => !existingIds.has(item.organizationId || item.id));
            return [...prev, ...newItems];
          });
          setBuyerIndex(nextIndex);
        }
        setBuyersHasMore(resolved.length === PAGE_SIZE);
      } catch (err: any) {
        console.error('Failed to load more buyers:', err);
      } finally {
        setLoadingMore(false);
      }
    } else {
      if (!suppliersHasMore) return;
      setLoadingMore(true);
      const nextIndex = supplierIndex + 1;
      try {
        const data = await getAllSuppliers({ index: nextIndex, limit: PAGE_SIZE });
        const resolved = Array.isArray(data) ? data : (data as any)?.suppliers || (data as any)?.data || [];
        if (resolved.length > 0) {
          setSuppliers((prev) => {
            const existingIds = new Set(prev.map((item) => item.organizationId || (item as any).id));
            const newItems = resolved.filter((item: any) => !existingIds.has(item.organizationId || item.id));
            return [...prev, ...newItems];
          });
          setSupplierIndex(nextIndex);
        }
        setSuppliersHasMore(resolved.length === PAGE_SIZE);
      } catch (err: any) {
        console.error('Failed to load more suppliers:', err);
      } finally {
        setLoadingMore(false);
      }
    }
  }, [activeTab, buyerIndex, supplierIndex, buyersHasMore, suppliersHasMore, loadingMore, loading, sectionLoading]);

  // Window scroll event listener for Infinite Scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

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

  const getCompanyInitials = (name: string) => {
    if (!name || name === 'Unnamed Business') return 'UB';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getRecordProfile = (item: PlatformRecordDto) => {
    const profile = item.businessProfile || ({} as BusinessProfileDto);
    const raw = item as any;

    const organizationName = profile.organizationName || raw.organizationName || raw.name || 'Unnamed Business';
    const email = profile.email || raw.email || 'No email provided';
    const phone = profile.phone || raw.phone || 'No phone number';
    const country = profile.country || raw.country || '';
    const city = profile.city || raw.city || '';
    const state = profile.state || raw.state || '';
    const industry = profile.industry || raw.industry || '';
    const businessType = profile.businessType || raw.businessType || '';
    const website = profile.website || raw.website || '';
    const description = profile.description || raw.description || '';
    const orgId = item.organizationId || raw.organizationId || item.id || raw.id || '';

    const locationParts = [city, state, country].filter(Boolean);
    const location = locationParts.join(', ') || 'No address specified';
    const initials = getCompanyInitials(organizationName);

    return {
      orgId,
      organizationName,
      email,
      phone,
      country,
      city,
      state,
      location,
      industry,
      businessType,
      website,
      description,
      initials,
    };
  };

  const filterList = (list: PlatformRecordDto[]) => {
    return list.filter((item) => {
      const rec = getRecordProfile(item);
      const query = searchQuery.toLowerCase();

      return (
        rec.organizationName.toLowerCase().includes(query) ||
        rec.email.toLowerCase().includes(query) ||
        rec.industry.toLowerCase().includes(query) ||
        rec.businessType.toLowerCase().includes(query) ||
        rec.country.toLowerCase().includes(query) ||
        rec.city.toLowerCase().includes(query) ||
        rec.orgId.toLowerCase().includes(query)
      );
    });
  };

  const filteredList = activeTab === 'buyers' ? filterList(buyers) : filterList(suppliers);

  return (
    <div className="plat-layout">
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && <div className="plat-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* LEFT NAVIGATION SIDEBAR */}
      <aside className={`plat-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="plat-sidebar-brand">
          <img src={sila_logo} alt="SILA Logo" className="plat-sidebar-logo" />
          <button className="plat-sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
            <FaTimes />
          </button>
        </div>

        <nav className="plat-sidebar-nav">
          <div className="plat-nav-section-label">MANAGEMENT</div>
          
          <button
            className={`plat-nav-item ${activeTab === 'buyers' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('buyers');
              setSelectedDetail(null);
              setSidebarOpen(false);
            }}
          >
            <div className="plat-nav-icon plat-icon-buyer">
              <FaUser />
            </div>
            <span className="plat-nav-label">Buyers</span>
          </button>

          <button
            className={`plat-nav-item ${activeTab === 'suppliers' ? 'active active-supplier' : ''}`}
            onClick={() => {
              setActiveTab('suppliers');
              setSelectedDetail(null);
              setSidebarOpen(false);
            }}
          >
            <div className="plat-nav-icon plat-icon-supplier">
              <FaBuilding />
            </div>
            <span className="plat-nav-label">Suppliers</span>
          </button>
            <button
            className="plat-sidebar-logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Log Out"
          >
            <FaSignOutAlt className="plat-logout-icon" />
            <span>{loggingOut ? 'Logging out...' : 'Log Out'}</span>
          </button>
        </nav>

        {/* BOTTOM LOGOUT BUTTON & USER CARD IN SIDEBAR */}
        <div className="plat-sidebar-footer">
        
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      {!selectedDetail ? (
        <div className="plat-main-wrapper">
        {/* TOP HEADER BAR */}
        <header className="plat-topbar">
          <div className="plat-topbar-left">
            <button className="plat-mobile-toggle" onClick={() => setSidebarOpen(true)} title="Open Menu">
              <FaBars />
            </button>
            <div>
              <h1 className="plat-topbar-title">Platform Administrator Dashboard</h1>
              <p className="plat-topbar-subtitle">
                Monitor & manage registered {activeTab === 'buyers' ? 'buyers' : 'suppliers'} on SILA Platform
              </p>
            </div>
          </div>

          {/* TOP RIGHT ACTIONS & PROFILE BUTTON */}
          <div className="plat-topbar-actions">
            {/* Profile Dropdown Button */}
            <div className="plat-profile-dropdown-wrapper">
              <button
                className="plat-profile-btn"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                title="Profile Menu"
              >
                <div className="plat-profile-avatar-circle">PA</div>
                <div className="plat-profile-btn-info">
                  <span className="plat-profile-name">Admin</span>
                  <span className="plat-profile-role">Platform</span>
                </div>
              </button>

              {showProfileMenu && (
                <div className="plat-profile-popover">
                  <div className="plat-popover-header">
                    <div className="plat-popover-avatar">PA</div>
                    <div>
                      <div className="plat-popover-name">Platform Administrator</div>
                      <div className="plat-popover-email">admin@sila-platform.com</div>
                    </div>
                  </div>
                  <div className="plat-popover-divider" />
                  <button
                    className="plat-popover-item"
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleSettingsClick();
                    }}
                  >
                    <FaCog /> Settings & Preferences
                  </button>
                  <button
                    className="plat-popover-item plat-popover-logout"
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleLogout();
                    }}
                    disabled={loggingOut}
                  >
                    <FaSignOutAlt /> {loggingOut ? 'Logging out...' : 'Log Out'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN BODY CONTENT */}
        <main className="plat-main-content">

          {/* CONTROLS BAR: SEARCH, TABS & VIEW TOGGLE */}
          <div className="plat-controls-card">
            <div className="plat-search-bar">
              <FaSearch className="plat-search-lens" />
              <input
                type="text"
                placeholder={`Search ${activeTab} by name, email, industry, or location...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="plat-search-field"
              />
              {searchQuery && (
                <button className="plat-search-clear" onClick={() => setSearchQuery('')}>
                  <FaTimes />
                </button>
              )}
            </div>

            <div className="plat-controls-right">
              {/* Entity Type Toggle Tabs */}
              <div className="plat-segmented-tabs">
                <button
                  className={`plat-seg-tab ${activeTab === 'buyers' ? 'active-buyer-tab' : ''}`}
                  onClick={() => setActiveTab('buyers')}
                >
                  <FaUser style={{ marginRight: '6px' }} /> Buyers ({buyers.length})
                </button>
                <button
                  className={`plat-seg-tab ${activeTab === 'suppliers' ? 'active-supplier-tab' : ''}`}
                  onClick={() => setActiveTab('suppliers')}
                >
                  <FaBuilding style={{ marginRight: '6px' }} /> Suppliers ({suppliers.length})
                </button>
              </div>

              {/* Grid / Table View Mode Switcher */}
              <div className="plat-view-switcher">
                <button
                  className={`plat-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid Card View"
                >
                  <FaThLarge />
                </button>
                <button
                  className={`plat-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Table View"
                >
                  <FaList />
                </button>
              </div>
            </div>
          </div>

          {/* ERROR BANNER */}
          {error && <div className="plat-error-alert">{error}</div>}

          {/* CONTENT SECTION */}
          {loading ? (
            <div className="plat-loading-wrapper">
              <div className="plat-spinner-ring"></div>
              <span className="plat-loading-text">Loading platform registry data...</span>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="plat-empty-card">
              <div className="plat-empty-avatar">{activeTab === 'buyers' ? <FaUser /> : <FaBuilding />}</div>
              <h3 className="plat-empty-heading">No {activeTab} found</h3>
              <p className="plat-empty-subtext">
                {searchQuery
                  ? `No matching ${activeTab} found for "${searchQuery}".`
                  : `There are currently no registered ${activeTab} on this page.`}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* REDESIGNED GRID CARD VIEW */
            <div className={`plat-grid-container ${sectionLoading ? 'plat-grid-loading' : ''}`}>
              {filteredList.map((item) => {
                const rec = getRecordProfile(item);

                return (
                  <div
                    key={rec.orgId || Math.random()}
                    className={`plat-v2-card ${activeTab}`}
                    onClick={() => setSelectedDetail({ type: activeTab, record: item })}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="plat-v2-card-header">
                      <div className={`plat-v2-avatar ${activeTab}-avatar`}>{rec.initials}</div>
                      <div className="plat-v2-header-meta">
                        <div className="plat-v2-title-row">
                          <h3 className="plat-v2-card-title">{rec.organizationName}</h3>
                          <span className="plat-v2-status-chip">
                            <FaCheckCircle style={{ marginRight: '4px', fontSize: '10px' }} /> Active
                          </span>
                        </div>
                        <div className="plat-v2-badge-group">
                          {rec.businessType && <span className="plat-v2-pill plat-v2-pill-type">{rec.businessType}</span>}
                          {rec.industry && <span className="plat-v2-pill plat-v2-pill-industry">{rec.industry}</span>}
                        </div>
                      </div>
                    </div>

                    {rec.description && (
                      <p className="plat-v2-desc" title={rec.description}>
                        {rec.description}
                      </p>
                    )}

                    <div className="plat-v2-contact-grid">
                      <div className="plat-v2-contact-item">
                        <FaEnvelope className="plat-v2-contact-icon" />
                        <span className="plat-v2-contact-val" title={rec.email}>
                          {rec.email}
                        </span>
                      </div>
                      <div className="plat-v2-contact-item">
                        <FaPhone className="plat-v2-contact-icon" />
                        <span className="plat-v2-contact-val">{rec.phone}</span>
                      </div>
                      <div className="plat-v2-contact-item">
                        <FaMapMarkerAlt className="plat-v2-contact-icon" />
                        <span className="plat-v2-contact-val" title={rec.location}>
                          {rec.location}
                        </span>
                      </div>
                      {rec.website && (
                        <div className="plat-v2-contact-item">
                          <FaGlobe className="plat-v2-contact-icon" />
                          <a
                            href={rec.website.startsWith('http') ? rec.website : `https://${rec.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="plat-v2-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {rec.website} <FaExternalLinkAlt style={{ fontSize: '10px', marginLeft: '3px' }} />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className={`plat-table-container ${sectionLoading ? 'plat-grid-loading' : ''}`}>
              <table className="plat-data-table">
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Business Type</th>
                    <th>Industry</th>
                    <th>Contact Info</th>
                    <th>Location</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item) => {
                    const rec = getRecordProfile(item);

                    return (
                      <tr key={rec.orgId || Math.random()}>
                        <td>
                          <div className="plat-tbl-org">
                            <div className={`plat-tbl-avatar ${activeTab}-avatar`}>{rec.initials}</div>
                            <div>
                              <div className="plat-tbl-org-name">{rec.organizationName}</div>
                              <div className="plat-tbl-org-id">ID: #{rec.orgId}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="plat-v2-pill plat-v2-pill-type">{rec.businessType || 'N/A'}</span>
                        </td>
                        <td>
                          <span className="plat-v2-pill plat-v2-pill-industry">{rec.industry || 'N/A'}</span>
                        </td>
                        <td>
                          <div className="plat-tbl-contact">
                            <div>{rec.email}</div>
                            <div className="plat-tbl-phone">{rec.phone}</div>
                          </div>
                        </td>
                        <td>{rec.location || 'N/A'}</td>
                        <td>
                          <button
                            className="plat-v2-action-btn"
                            onClick={() => setSelectedDetail({ type: activeTab, record: item })}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* INFINITE SCROLL LOADING INDICATOR */}
          {loadingMore && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '24px', color: '#64748b' }}>
              <div className="plat-spinner-ring" style={{ width: '20px', height: '20px' }}></div>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Loading more {activeTab}...</span>
            </div>
          )}
        </main>
      </div>
      ) : (
        /* RENDER FULL PAGE DETAIL VIEW WHEN CARD IS CLICKED */
        <div style={{ flex: 1, marginLeft: 'var(--plat-sidebar-width)' }}>
          <PlatformUserDetailView
            type={selectedDetail.type}
            record={selectedDetail.record}
            onBack={() => setSelectedDetail(null)}
            onStatusUpdated={() => {
              if (activeTab === 'buyers') loadBuyers(buyerIndex);
              else loadSuppliers(supplierIndex);
            }}
            onSettingsClick={handleSettingsClick}
          />
        </div>
      )}
    </div>
  );
};

export default PlatformUserDashboard;