import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, UserRole } from '../../types';
import { useNetworkAdminAuthStore } from '../../store/useAuthStore';
import UserListTable from '../UserListTable/UserListTable';
import CreateUserModal from '../CreateUserModal/CreateUserModal';
import { ToastContainer, toastService } from '@vosox/shared-ui';
import CompanyProfile from '../CompanyProfile/CompanyProfile';
import Header from '../Header'; 
import {
  getOrganizationUsers,
  createPerson,
  deleteUser,
  logoutNetworkAdmin,
} from '../../api/networkAdminApi';

import {
  FaUserShield,
  FaUsers,
  FaUserCheck,
  FaLayerGroup,
  FaSearch,
  FaPlus,
} from 'react-icons/fa';
import './NetworkAdminDashboard.css';

const NavIconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const navItems: { key: string; icon: React.ReactNode; label: string }[] = [
  { key: 'manageUsers', icon: <NavIconUsers />, label: 'Manage Users' },
];

const sectionTitles: Record<string, { title: string; subtitle: string }> = {
  manageUsers: {
    title: 'Network Admin Dashboard',
    subtitle: 'Manage your network users and settings',
  },
  companyProfile: {
    title: 'Company Details',
    subtitle: 'View and manage your company information',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Configure your preferences and settings',
  },
};

const NetworkAdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const currentUser = useNetworkAdminAuthStore((state) => state.currentUser);
  const isLoading = useNetworkAdminAuthStore((state) => state.isLoading);
  const logout = useNetworkAdminAuthStore((state) => state.logout);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [modalCreateRole, setModalCreateRole] = useState<UserRole>(
    currentUser?.userRole === 'BUYER_NETWORK_ADMIN'
      ? 'BUYER_ADMINISTRATOR'
      : 'SUPPLIER_ADMINISTRATOR'
  );

  const [activeNav, setActiveNav] = useState<string>('manageUsers');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!currentUser?.organizationId) return;

    const fetchUsers = async () => {
      setIsLoadingData(true);
      setError(null);

      try {
        const users = await getOrganizationUsers(currentUser.organizationId!);
        setAllUsers(users);
      } catch (err: any) {
        setError('Failed to load users');
        setAllUsers([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchUsers();
  }, [currentUser]);

  const handleCreateUser = async (newUser: User) => {
    setIsCreatingUser(true);

    try {
      const personId = await createPerson({
        name: newUser.name,
        email: newUser.email,
        phone: (newUser as any).phone || '',
        country: (newUser as any).country || '',
        addressLine: (newUser as any).addressLine || '',
        userName: (newUser as any).userName || '',
        password: (newUser as any).password || 'temp123',
        roleId: (newUser as any).roleId,
      });

      const userWithPersonId: User = { ...newUser, id: personId, personId };
      setAllUsers((prev) => [...prev, userWithPersonId]);

      toastService.success('User created successfully!');
      setIsModalOpen(false);
    } catch (err: any) {
      const errorMessage = 'Failed to create user';

      if (errorMessage.includes('Username already exists')) {
        toastService.error('This username is already taken. Please choose a different one.');
      } else if (errorMessage.includes('Email already exists')) {
        toastService.error('This email is already registered. Please use a different email.');
      } else {
        toastService.error(errorMessage);
      }
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = (userId: string) => {
    const user = allUsers.find((u) => u.id === userId);
    if (!user) return;

    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeletingUser(true);

    try {
      const personId = userToDelete.personId || userToDelete.id;

      await deleteUser(personId);

      setAllUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));

      toastService.success(`User "${userToDelete.name}" deleted successfully!`);

      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      toastService.error(err.message || 'Failed to delete user');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleNavClick = (key: string) => {
    setIsMobileSidebarOpen(false);
    setActiveNav(key);
  };

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutNetworkAdmin();
      toastService.success('Logged out successfully!');
    } catch (err) {
      toastService.info('Logging out...');
    } finally {
      logout();
      sessionStorage.clear();
      setLoggingOut(false);
      window.dispatchEvent(new CustomEvent('session:expired'));
    }
  }, [loggingOut, logout]);

  const filterUsers = (list: User[]) => {
    const query = searchQuery.toLowerCase();
    if (!query) return list;
    return list.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const uname = ((u as any).userName || '').toLowerCase();
      return name.includes(query) || email.includes(query) || uname.includes(query);
    });
  };

  if (isLoading) {
    return (
      <div className="nad-loading-container">
        <div className="nad-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="nad-not-auth-container">
        <h2>Not Authenticated</h2>
        <p>Please login first to access this dashboard.</p>
        <button onClick={() => navigate('/login')} className="nad-redirect-btn">
          Go to Login
        </button>
      </div>
    );
  }

  const activeCount = allUsers.filter((u) => u.status === 'active').length;
  const administrators = allUsers.filter(
    (u) =>
      u.userRole === 'BUYER_ADMINISTRATOR' ||
      u.userRole === 'SUPPLIER_ADMINISTRATOR'
  );
  const regularUsers = allUsers.filter(
    (u) =>
      u.userRole === 'BUYER_USER' ||
      u.userRole === 'SUPPLIER_USER'
  );

  const adminLabel =
    currentUser.userRole === 'BUYER_NETWORK_ADMIN'
      ? 'Buyer Administrators'
      : 'Supplier Administrators';
  const userLabel =
    currentUser.userRole === 'BUYER_NETWORK_ADMIN'
      ? 'Buyer Users'
      : 'Supplier Users';

  const filteredAdministrators = filterUsers(administrators);
  const filteredUsers = filterUsers(regularUsers);
  const allFilteredUsers = [...filteredAdministrators, ...filteredUsers];

  const showUsersView = activeNav === 'manageUsers';
  const currentSectionInfo = sectionTitles[activeNav] || sectionTitles.manageUsers;

  return (
    <div className="nad-page" style={{ paddingTop: "5.25rem" }}>
      <ToastContainer />

      <Header />

      <div className={`nad-shell${isMobileSidebarOpen ? ' nad-sidebar-open-mobile' : ''}`}>
        {/* <button
          type="button"
          className="nad-mobile-sidebar-toggle"
          onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
          aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileSidebarOpen}
        >
          {isMobileSidebarOpen ? <IconClose /> : <IconMenu />}
        </button> */}

        {/* <div
          className="nad-sidebar-backdrop"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        /> */}

        {/* <aside className="nad-sidebar">
          <nav className="nad-nav">
            {navItems.map((item) => (
              <div
                key={item.key}
                className={`nad-nav-item${activeNav === item.key ? ' nad-nav-item-active' : ''}`}
                onClick={() => handleNavClick(item.key)}
                role="button"
                tabIndex={0}
                title={item.label}
              >
                <span className="nad-nav-icon">{item.icon}</span>
                <span className="nad-nav-label">{item.label}</span>
              </div>
            ))}

            <div
              className={`nad-nav-item nad-nav-item-logout${loggingOut ? ' nad-nav-item-disabled' : ''}`}
              onClick={handleLogout}
              role="button"
              tabIndex={0}
              aria-disabled={loggingOut}
              title="Log out"
            >
              <span className="nad-nav-icon">
                <LogoutIcon />
              </span>
              <span className="nad-nav-label">{loggingOut ? 'Logging out...' : 'Log Out'}</span>
            </div>
          </nav>
       </aside> */}

        <div className="nad-main">
          <main className="nad-content">
            <header className="nad-content-header">
              <h1 className="nad-title">{currentSectionInfo.title}</h1>
              <p className="nad-subtitle">{currentSectionInfo.subtitle}</p>
            </header>

            {showUsersView ? (
              <>
                <section className="nad-stats-grid">
                  <div className="nad-stat-card">
                    <div className="nad-stat-icon-wrapper nad-stat-icon-blue">
                      <FaUserShield />
                    </div>
                    <div className="nad-stat-info">
                      <span className="nad-stat-value">{administrators.length}</span>
                      <span className="nad-stat-label">{adminLabel}</span>
                    </div>
                  </div>

                  <div className="nad-stat-card">
                    <div className="nad-stat-icon-wrapper nad-stat-icon-indigo">
                      <FaUsers />
                    </div>
                    <div className="nad-stat-info">
                      <span className="nad-stat-value">{regularUsers.length}</span>
                      <span className="nad-stat-label">{userLabel}</span>
                    </div>
                  </div>

                  <div className="nad-stat-card">
                    <div className="nad-stat-icon-wrapper nad-stat-icon-green">
                      <FaUserCheck />
                    </div>
                    <div className="nad-stat-info">
                      <span className="nad-stat-value">{activeCount}</span>
                      <span className="nad-stat-label">Active Users</span>
                    </div>
                  </div>

                  <div className="nad-stat-card">
                    <div className="nad-stat-icon-wrapper nad-stat-icon-orange">
                      <FaLayerGroup />
                    </div>
                    <div className="nad-stat-info">
                      <span className="nad-stat-value">{allUsers.length}</span>
                      <span className="nad-stat-label">Total Users</span>
                    </div>
                  </div>
                </section>

                <div className="nad-controls-bar">
                  <div className="nad-search-wrapper">
                    <FaSearch className="nad-search-icon" />
                    <input
                      type="text"
                      placeholder="Search by name, email or username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="nad-search-input"
                      aria-label="Search users"
                    />
                  </div>

                  <div className="nad-action-buttons">
                    <button
                      className="nad-create-btn"
                      onClick={() => {
                        setModalCreateRole(
                          currentUser.userRole === 'BUYER_NETWORK_ADMIN'
                            ? 'BUYER_ADMINISTRATOR'
                            : 'SUPPLIER_ADMINISTRATOR'
                        );
                        setIsModalOpen(true);
                      }}
                      disabled={isCreatingUser}
                      title="Create a new administrator user"
                    >
                      <FaPlus />
                      Create {adminLabel.slice(0, -1)}
                    </button>

                    <button
                      className="nad-create-btn nad-create-user-btn"
                      onClick={() => {
                        setModalCreateRole(
                          currentUser.userRole === 'BUYER_NETWORK_ADMIN'
                            ? 'BUYER_USER'
                            : 'SUPPLIER_USER'
                        );
                        setIsModalOpen(true);
                      }}
                      disabled={isCreatingUser}
                      title="Create a new regular user"
                    >
                      <FaPlus />
                      Create {userLabel.slice(0, -1)}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="nad-alert-error">
                    <strong>Error:</strong> {error}
                  </div>
                )}
                {success && <div className="nad-alert-success">{success}</div>}

                {isLoadingData ? (
                  <div className="nad-loading-data">
                    <div className="nad-spinner"></div>
                    <p>Please wait...</p>
                  </div>
                ) : (
                  <div className="nad-lists-section">
                    <UserListTable
                      users={allFilteredUsers}
                      title="All Users"
                      onDelete={handleDeleteUser}
                    />
                  </div>
                )}
              </>
            ) : activeNav === 'companyProfile' ? (
              <CompanyProfile mode="network-admin" showHeader={false} />
            ) : (
              <div className="nad-empty-state">
                <p>This section is coming soon. Check back later for more features.</p>
              </div>
            )}
          </main>
        </div>
      </div>

      <CreateUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateUser}
        createRole={modalCreateRole}
        isLoading={isCreatingUser}
      />

      {isDeleteModalOpen && (
        <div className="nad-modal-overlay">
          <div className="nad-delete-modal">
            <h3>Delete User</h3>
            <p>Are you sure you want to delete <strong>{userToDelete?.name}</strong>?</p>
            <p className="nad-delete-warning">This action cannot be undone.</p>

            <div className="nad-delete-actions">
              <button
                className="nad-delete-cancel-btn"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
                disabled={isDeletingUser}
              >
                Cancel
              </button>

              <button
                className="nad-delete-confirm-btn"
                onClick={confirmDeleteUser}
                disabled={isDeletingUser}
              >
                {isDeletingUser ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkAdminDashboard;