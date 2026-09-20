import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  EmptyState,
  Loader,
  PageHeader,
  SearchInput,
  ToastContainer,
  toastService as toast,
} from '@vosox/shared-ui';
import { createBusinessUser, getOrganizationUsers } from './api/departmentcostapi';
import { Country } from 'country-state-city';
import { FaEye, FaEyeSlash, FaPlus, FaTimes, FaUsers, FaExclamationCircle } from 'react-icons/fa';
import './UserAdmin.css';
import { useNetworkAdminAuthStore } from './store/useAuthStore';

interface BusinessUser {
  personId: string;
  userId: string;
  name: string;
  email: string;
  userName: string;
  roleId: string;
  roleName: string;
  phone?: string;
  country?: string;
  addressLine?: string;
  createdDate?: string;
}

const UserAdmin: React.FC = () => {
  const currentUser = useNetworkAdminAuthStore((state) => state.currentUser);
  const userRole = currentUser?.userRole;
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    addressLine: '',
    userName: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch real users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      const orgId = currentUser?.organizationId;
      if (!orgId) {
        setError('Organization ID not found. Please log in again.');
        return;
      }
      setListLoading(true);
      try {
        const data = await getOrganizationUsers(orgId);
        setUsers(data);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load users', {
          position: 'top-right',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } finally {
        setListLoading(false);
      }
    };
    fetchUsers();
  }, [currentUser?.organizationId]);

  const getPageTitle = () => {
    if (userRole === 'BUYER_ADMINISTRATOR') return 'Buyer Business User List';
    if (userRole === 'SUPPLIER_ADMINISTRATOR') return 'Supplier Business User List';
    return 'Business User List';
  };

  const getPageSubtitle = () => {
    return `Manage and view all ${getUserTypeDisplayName()}s`;
  };

  const getBusinessUserRoleId = () => {
    if (userRole === 'BUYER_ADMINISTRATOR') return '5a72f81e-a2c5-4f4a-bd55-6376c3c9ed73';
    if (userRole === 'SUPPLIER_ADMINISTRATOR') return '937aab61-b505-4e1c-a5a3-cd63e29c6db9';
    return null;
  };

  const getUserTypeDisplayName = () => {
   if (userRole === 'BUYER_ADMINISTRATOR') return 'Buyer User';
    if (userRole === 'SUPPLIER_ADMINISTRATOR') return 'Supplier User';
    return 'Business User';
  };

  const handleCreateClick = () => {
    setShowModal(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      country: '',
      addressLine: '',
      userName: '',
      password: '',
      confirmPassword: '',
    });
    setError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.country ||
      !formData.addressLine ||
      !formData.userName ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError('All fields are required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!/^\d{10}$/.test(formData.phone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setIsLoading(true);

    try {
      const roleId = getBusinessUserRoleId();
      const userTypeDisplay = getUserTypeDisplayName();

      if (!roleId) {
        setError('Invalid user role. Cannot create business user.');
        setIsLoading(false);
        return;
      }

      const response = await createBusinessUser({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        addressLine: formData.addressLine,
        userName: formData.userName,
        password: formData.password,
        roleId: roleId,
      });

      const isSuccess = response.statusCode >= 200 && response.statusCode < 300;
      const userId = response.id || response.data?.id;

      if (isSuccess && userId) {
        toast.success(`${userTypeDisplay} created successfully! ID: ${userId}`, {
          position: 'top-right',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });

        const countryFullName = Country.getAllCountries().find(c => c.isoCode === formData.country)?.name || formData.country;

        const newUser: BusinessUser = {
          personId: userId,
          userId: userId,
          name: formData.name,
          email: formData.email,
          userName: formData.userName,
          roleId: roleId,
          roleName: userTypeDisplay,
          phone: formData.phone,
          country: countryFullName,
          addressLine: formData.addressLine,
          createdDate: new Date().toISOString().split('T')[0],
        };

        setUsers((prev) => [newUser, ...prev]);
        handleCloseModal();
      } else {
        const errorMessage = response.message || response.description || 'Failed to create business user';
        toast.error(errorMessage, {
          position: 'top-right',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        setError(errorMessage);
        console.error('API Response:', response);
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.response?.data?.message || 'Failed to create business user';
      toast.error(errorMessage, {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setError(errorMessage);
      console.error('Create user error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.userName || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.country || '').toLowerCase().includes(q)
    );
  }, [searchQuery, users]);

  const renderPasswordField = (
    id: string,
    name: 'password' | 'confirmPassword',
    label: string,
    placeholder: string,
    visible: boolean,
    toggle: () => void
  ) => (
    <div className="user-admin-form-group">
      <label htmlFor={id} className="user-admin-label">
        {label} <span className="sila-required" aria-hidden="true">*</span>
      </label>
      <div className="user-admin-password-wrapper">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          name={name}
          value={formData[name]}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="user-admin-input user-admin-input--with-toggle"
          aria-required="true"
        />
        <button
          type="button"
          onClick={toggle}
          className="user-admin-password-toggle"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="ua-dashboard">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      <PageHeader className="ua-header" title={getPageTitle()} description={getPageSubtitle()} />

      <div className="ua-content-wrapper">
        <div className="ua-controls-bar">
          <SearchInput
            containerClassName="ua-search-wrapper"
            className="ua-search-input"
            placeholder="Search by name, email, username, phone or country..."
            label="Search users"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="ua-action-buttons">
            <Button className="ua-create-btn" onClick={handleCreateClick} disabled={isLoading}>
              <FaPlus aria-hidden="true" />
              Create {getUserTypeDisplayName()}
            </Button>
          </div>
        </div>

        {listLoading ? (
          <div className="ua-loading-data">
            <Loader message="Loading your data..." />
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            className="ua-empty-state"
            icon={<FaUsers aria-hidden="true" />}
            title={searchQuery ? 'No users match your search.' : 'No users found.'}
          />
        ) : (
          <>
            <div className="ua-table-wrapper sila-table-wrap">
              <table className="ua-table sila-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Username</th>
                    <th scope="col">User Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.personId}>
                      <td>
                        <div className="ua-cell-name">{user.name}</div>
                      </td>
                      <td>{user.email}</td>
                      <td className="ua-cell-muted">{user.userName}</td>
                      <td>
                        <span className="ua-role-badge sila-badge sila-badge--neutral">{user.roleName}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ua-table-footer sila-pagination">
              <span>
                Showing {filteredUsers.length} of {users.length} users
              </span>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="user-admin-modal-overlay" onClick={handleCloseModal}>
          <div
            className="user-admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ua-create-user-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="user-admin-modal-header">
              <h2 id="ua-create-user-title">Create {getUserTypeDisplayName()}</h2>
              <button
                type="button"
                className="user-admin-modal-close"
                onClick={handleCloseModal}
                aria-label="Close dialog"
              >
                <FaTimes aria-hidden="true" />
              </button>
            </div>

            <form className="user-admin-form">
              {error && (
                <div className="user-admin-error sila-alert sila-alert--danger" role="alert">
                  <FaExclamationCircle className="user-admin-error-icon" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <div className="user-admin-form-grid">
                <div className="user-admin-form-group">
                  <label htmlFor="ua-name" className="user-admin-label">
                    Name <span className="sila-required" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="ua-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                    className="user-admin-input"
                    aria-required="true"
                  />
                </div>

                <div className="user-admin-form-group">
                  <label htmlFor="ua-email" className="user-admin-label">
                    Email Address <span className="sila-required" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="ua-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                    className="user-admin-input"
                    aria-required="true"
                  />
                </div>

                <div className="user-admin-form-group">
                  <label htmlFor="ua-username" className="user-admin-label">
                    Username <span className="sila-required" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="ua-username"
                    type="text"
                    name="userName"
                    value={formData.userName}
                    onChange={handleInputChange}
                    placeholder="Enter username"
                    className="user-admin-input"
                    aria-required="true"
                  />
                </div>

                <div className="user-admin-form-group">
                  <label htmlFor="ua-phone" className="user-admin-label">
                    Phone <span className="sila-required" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="ua-phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter 10-digit phone number"
                    className="user-admin-input"
                    aria-required="true"
                  />
                </div>

                <div className="user-admin-form-group">
                  <label htmlFor="ua-country" className="user-admin-label">
                    Country <span className="sila-required" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="ua-country"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="user-admin-input user-admin-select"
                    aria-required="true"
                  >
                    <option value="">Select Country</option>
                    {Country.getAllCountries().map((c) => (
                      <option key={c.isoCode} value={c.isoCode}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="user-admin-form-group">
                  <label htmlFor="ua-address" className="user-admin-label">
                    Address <span className="sila-required" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="ua-address"
                    type="text"
                    name="addressLine"
                    value={formData.addressLine}
                    onChange={handleInputChange}
                    placeholder="Enter address"
                    className="user-admin-input"
                    aria-required="true"
                  />
                </div>

                {renderPasswordField('ua-password', 'password', 'Password', 'Enter password', showPassword, () =>
                  setShowPassword(!showPassword)
                )}
                {renderPasswordField(
                  'ua-confirm-password',
                  'confirmPassword',
                  'Confirm Password',
                  'Confirm password',
                  showConfirmPassword,
                  () => setShowConfirmPassword(!showConfirmPassword)
                )}
              </div>
            </form>
            <footer className="user-admin-footer">
              <div className="user-admin-form-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseModal}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading}
                  onClick={handleSubmit}
                >
                  {isLoading ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </footer>

            {isLoading && (
              <div className="user-admin-loading-overlay">
                <Loader />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAdmin;