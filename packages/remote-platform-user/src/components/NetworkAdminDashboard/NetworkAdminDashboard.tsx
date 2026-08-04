import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, UserRole } from '../../types';
import { useNetworkAdminAuthStore } from '../../store/useAuthStore';
import UserListTable from '../UserListTable/UserListTable';
import CreateUserModal from '../CreateUserModal/CreateUserModal';
import { ToastContainer, toastService } from '@vosox/shared-ui';
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
  FaSignOutAlt,
  FaSearch,
  FaPlus,
} from 'react-icons/fa';
import './NetworkAdminDashboard.css';

const sila_logo = `${window.location.protocol}//${window.location.host}/assets/SILA_Logo.png`;

const NetworkAdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const currentUser = useNetworkAdminAuthStore((state) => state.currentUser);
  const isLoading = useNetworkAdminAuthStore((state) => state.isLoading);
  const logout = useNetworkAdminAuthStore((state) => state.logout);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, ] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalCreateRole, setModalCreateRole] = useState<UserRole>(
  currentUser?.userRole === 'BUYER_NETWORK_ADMIN'
      ? 'BUYER_ADMINISTRATOR'
      : 'SUPPLIER_ADMINISTRATOR'
  );

  useEffect(() => {
    useNetworkAdminAuthStore.getState().initializeFromSession();
  }, []);

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

      toastService.success("User created successfully!");
      setIsModalOpen(false);
    } catch (err: any) {
      const errorMessage = "Failed to create user";

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

  const handleDeleteUser = async (userId: string) => {
    const user = allUsers.find((u) => u.id === userId);
    if (!user) return;

    if (!confirm(`Are you sure you want to delete ${user.name}?`)) return;

    try {
      await deleteUser(userId);
      setAllUsers((prev) => prev.filter((u) => u.id !== userId));
      toastService.success(`User "${user.name}" deleted successfully!`);
    } catch (err: any) {
      toastService.error(`Failed to delete user: ${err.message}`);
    }
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

  const activeCount = allUsers.filter((u) => u.status === 'active').length;
  const filteredAdministrators = filterUsers(administrators);
  const filteredUsers = filterUsers(regularUsers);

  return (
    <div className="nad-dashboard">
      <ToastContainer />
      <header className="nad-top-header">
        <img src={sila_logo} alt="SILA" className="nad-top-logo" />
        <div className="nad-header-actions">
          <button
            className="nad-logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Log out"
          >
            <FaSignOutAlt />
            {loggingOut ? 'Logging out...' : 'Log Out'}
          </button>
        </div>
      </header>

      <div className="nad-content-wrapper">
        <header className="nad-header">
          <h1 className="nad-title">Network Admin Dashboard</h1>
          <p className="nad-subtitle">
            Manage your network users and settings
          </p>
        </header>

        <section className="nad-stats-grid">
          <div className="nad-stat-card">
            <div className="nad-stat-icon-wrapper nad-stat-icon-admins">
              <FaUserShield />
            </div>
            <div className="nad-stat-info">
              <span className="nad-stat-value">{administrators.length}</span>
              <span className="nad-stat-label">{adminLabel}</span>
            </div>
          </div>

          <div className="nad-stat-card">
            <div className="nad-stat-icon-wrapper nad-stat-icon-users">
              <FaUsers />
            </div>
            <div className="nad-stat-info">
              <span className="nad-stat-value">{regularUsers.length}</span>
              <span className="nad-stat-label">{userLabel}</span>
            </div>
          </div>

          <div className="nad-stat-card">
            <div className="nad-stat-icon-wrapper nad-stat-icon-active">
              <FaUserCheck />
            </div>
            <div className="nad-stat-info">
              <span className="nad-stat-value">{activeCount}</span>
              <span className="nad-stat-label">Active Users</span>
            </div>
          </div>

          <div className="nad-stat-card">
            <div className="nad-stat-icon-wrapper nad-stat-icon-total">
              <FaLayerGroup />
            </div>
            <div className="nad-stat-info">
              <span className="nad-stat-value">{allUsers.length}</span>
              <span className="nad-stat-label">Total Users</span>
            </div>
          </div>
        </section>

        <div className='nad-controls-bar'>
          <div className='nad-search-wrapper'>
            <FaSearch className='nad-search-icon' />
            <input
              type='text'
              placeholder='Search by name, email or username...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='nad-search-input'
            />
          </div>

          <div className='nad-action-buttons'>
            <button
              className='nad-create-btn'
              onClick={() => {
                setModalCreateRole(
                  currentUser.userRole === 'BUYER_NETWORK_ADMIN'
                    ? 'BUYER_ADMINISTRATOR'
                    : 'SUPPLIER_ADMINISTRATOR'
                );
                setIsModalOpen(true);
              }}
              disabled={isCreatingUser}
            >
              <FaPlus />
              Create New {adminLabel.slice(0, -1)}
            </button>

            <button
              className='nad-create-btn nad-create-user-btn'
              onClick={() => {
                setModalCreateRole(
                  currentUser.userRole === 'BUYER_NETWORK_ADMIN'
                    ? 'BUYER_USER'
                    : 'SUPPLIER_USER'
                );
                setIsModalOpen(true);
              }}
              disabled={isCreatingUser}
            >
              <FaPlus />
              Create New {userLabel.slice(0, -1)}
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
            <p>Loading your data...</p>
          </div>
        ) : (
          <div className="nad-lists-section">
            <UserListTable
              users={filteredAdministrators}
              title={adminLabel}
              onDelete={handleDeleteUser}
            />
            <UserListTable
              users={filteredUsers}
              title={userLabel}
              onDelete={handleDeleteUser}
            />
          </div>
        )}
      </div>

    <CreateUserModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      onCreate={handleCreateUser}
      createRole={modalCreateRole}
      isLoading={isCreatingUser}
    />
    </div>
  );
};

export default NetworkAdminDashboard;