import React, { useState, useEffect } from 'react';
import { Button, Loader } from '@vosox/shared-ui';
import { createBusinessUser, getOrganizationUsers } from './api/departmentcostapi'; 
import { Country } from 'country-state-city';
import { CiMail } from 'react-icons/ci';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaPhone, FaMapMarkerAlt, FaGlobe } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './UserAdmin.css';
import { useAuthStore } from '../../host-app/src/store/useAuthStore';

interface BusinessUser {
  personId: string;
  userId: string;
  name: string;
  email: string;
  userName: string;
  roleId: string;
  roleName: string;
  // Optional: only present for newly created users before refresh
  phone?: string;
  country?: string;
  addressLine?: string;
  createdDate?: string;
}

const UserAdmin: React.FC = () => {
  const { userRole } = useAuthStore();
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

  // Fetch real users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      const orgId = sessionStorage.getItem('vosox_organization_id');
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
  }, []);

  const getPageTitle = () => {
    if (userRole === 'buyer-admin') return 'Buyer Business User List';
    if (userRole === 'supplier-admin') return 'Supplier Business User List';
    return 'Business User List';
  };

  const getPageSubtitle = () => {
    return `Manage and view all ${getUserTypeDisplayName()}s`;
  };

  const getBusinessUserRoleId = () => {
    if (userRole === 'buyer-admin') return '5a72f81e-a2c5-4f4a-bd55-6376c3c9ed73';
    if (userRole === 'supplier-admin') return '937aab61-b505-4e1c-a5a3-cd63e29c6db9';
    return null;
  };

  const getUserTypeDisplayName = () => {
    if (userRole === 'buyer-admin') return 'Buyer User';
    if (userRole === 'supplier-admin') return 'Supplier User';
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

  return (
    <div className="user-admin-container">
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

      <div className="user-admin-header">
        <div className="user-admin-header-left">
          <h1 className="user-admin-title">{getPageTitle()}</h1>
          <p className="user-admin-subtitle">{getPageSubtitle()}</p>
        </div>
        <div className="user-admin-header-right">
          <Button variant="primary" size="lg" onClick={handleCreateClick}>
            Create User
          </Button>
        </div>
      </div>

      <div className="user-admin-cards-grid">
        {listLoading ? (
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader color="#2f7cf6" />
          </div>
        ) : users.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            No users found.
          </div>
        ) : (
          users.map((user) => (
            <div key={user.personId} className="user-admin-card">
              <div className="card-header">
                <h3 className="card-name">{user.name}</h3>
              </div>
              <div className="card-body">
                <div className="card-field">
                  <label className="card-label"><CiMail /> Email</label>
                  <p className="card-value">{user.email}</p>
                </div>
                <div className="card-field">
                  <label className="card-label"><FaUser /> Username</label>
                  <p className="card-value">{user.userName}</p>
                </div>
                <div className="card-field">
                  <label className="card-label"><FaUser /> Role</label>
                  <p className="card-value">{user.roleName}</p>
                </div>
                {user.phone && (
                  <div className="card-field">
                    <label className="card-label"><FaPhone /> Phone</label>
                    <p className="card-value">{user.phone}</p>
                  </div>
                )}
                {user.country && (
                  <div className="card-field">
                    <label className="card-label"><FaGlobe /> Country</label>
                    <p className="card-value">{user.country}</p>
                  </div>
                )}
                {user.addressLine && (
                  <div className="card-field">
                    <label className="card-label"><FaMapMarkerAlt /> Address</label>
                    <p className="card-value">{user.addressLine}</p>
                  </div>
                )}
                {user.createdDate && (
                  <div className="card-field">
                    <label className="card-label">Created Date</label>
                    <p className="card-value">{user.createdDate}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="user-admin-modal-overlay" onClick={handleCloseModal}>
          <div className="user-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="user-admin-modal-header">
              <h2>Create {getUserTypeDisplayName()}</h2>
              <button className="user-admin-modal-close" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="user-admin-form">
              {error && <div className="user-admin-error">{error}</div>}

              <div className="user-admin-form-group">
                <label className="user-admin-label"><FaUser /> Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  className="user-admin-input"
                />
              </div>

              <div className="user-admin-form-group">
                <label className="user-admin-label"><CiMail /> Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  className="user-admin-input"
                />
              </div>

              <div className="user-admin-form-group">
                <label className="user-admin-label"><FaUser /> Username</label>
                <input
                  type="text"
                  name="userName"
                  value={formData.userName}
                  onChange={handleInputChange}
                  placeholder="Enter username"
                  className="user-admin-input"
                />
              </div>

              <div className="user-admin-form-group">
                <label className="user-admin-label"><FaPhone /> Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter 10-digit phone number"
                  className="user-admin-input"
                />
              </div>

              <div className="user-admin-form-group">
                <label className="user-admin-label"><FaGlobe /> Country</label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="user-admin-input user-admin-select"
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
                <label className="user-admin-label"><FaMapMarkerAlt /> Address</label>
                <input
                  type="text"
                  name="addressLine"
                  value={formData.addressLine}
                  onChange={handleInputChange}
                  placeholder="Enter address"
                  className="user-admin-input"
                />
              </div>

              <div className="user-admin-form-group">
                <label className="user-admin-label"><FaLock /> Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter password"
                    className="user-admin-input"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="user-admin-password-toggle"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="user-admin-form-group">
                <label className="user-admin-label"><FaLock /> Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm password"
                    className="user-admin-input"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="user-admin-password-toggle"
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="user-admin-form-actions">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={handleCloseModal}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </form>

            {isLoading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)', borderRadius: '12px' }}>
                <Loader color="#2f7cf6" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAdmin;