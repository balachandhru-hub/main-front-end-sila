import React, { useState } from 'react';
import { Button, Loader } from '@vosox/shared-ui';
import { createBusinessUser } from './api/departmentcostapi'; 
import { Country } from 'country-state-city';
import { CiMail } from 'react-icons/ci';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaPhone, FaMapMarkerAlt, FaGlobe } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './BuyerAdmin.css';

interface BusinessUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  country: string;
  addressLine: string;
  userName: string;
  createdDate: string;
}

const BuyerAdmin: React.FC = () => {
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dummy data
  const [users, setUsers] = useState<BusinessUser[]>([
    {
      id: '1',
      email: 'user1@example.com',
      name: 'John Doe',
      phone: '9876543210',
      country: 'US',
      addressLine: 'New York, NY',
      userName: 'johndoe',
      createdDate: '2024-01-15',
    },
    {
      id: '2',
      email: 'user2@example.com',
      name: 'Jane Smith',
      phone: '9876543211',
      country: 'US',
      addressLine: 'Los Angeles, CA',
      userName: 'janesmith',
      createdDate: '2024-02-20',
    },
    {
      id: '3',
      email: 'user3@example.com',
      name: 'Mike Johnson',
      phone: '9876543212',
      country: 'US',
      addressLine: 'Chicago, IL',
      userName: 'mikejohnson',
      createdDate: '2024-03-10',
    },
    {
      id: '4',
      email: 'user4@example.com',
      name: 'Sarah Williams',
      phone: '9876543213',
      country: 'US',
      addressLine: 'Houston, TX',
      userName: 'sarahwilliams',
      createdDate: '2024-04-05',
    },
  ]);

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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
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
      // ✅ Call API to create business user
      const response = await createBusinessUser({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        addressLine: formData.addressLine,
        userName: formData.userName,
        password: formData.password,
      });

      if (response.statusCode === 200 || response.statusCode === 201) {
        // ✅ Show success toast
        toast.success(`User created successfully! ID: ${response.data?.id || 'Created'}`, {
          position: 'top-right',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });

        // Get country name
        const countryFullName = Country.getAllCountries().find(c => c.isoCode === formData.country)?.name || formData.country;

        // Add new user to dummy data
        const newUser: BusinessUser = {
          id: response.data?.id || (users.length + 1).toString(),
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          country: countryFullName,
          addressLine: formData.addressLine,
          userName: formData.userName,
          createdDate: new Date().toISOString().split('T')[0],
        };

        setUsers((prev) => [newUser, ...prev]);
        handleCloseModal();
      } else {
        // ✅ Show error toast
        toast.error(response.message || 'Failed to create business user', {
          position: 'top-right',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        setError(response.message || 'Failed to create business user');
      }
    } catch (err: any) {
      // ✅ Show error toast
      toast.error(err.message || 'Failed to create business user', {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setError(err.message || 'Failed to create business user');
      console.error('Create user error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="buyer-admin-container">
      {/* ✅ Toast Container */}
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

      {/* Header Section */}
      <div className="buyer-admin-header">
        <div className="buyer-admin-header-left">
          <h1 className="buyer-admin-title">Buyer Business User List</h1>
          <p className="buyer-admin-subtitle">Manage and view all business users</p>
        </div>
        <div className="buyer-admin-header-right">
          <Button variant="primary" size="lg" onClick={handleCreateClick}>
            Create User
          </Button>
        </div>
      </div>

      {/* User Cards Grid */}
      <div className="buyer-admin-cards-grid">
        {users.map((user) => (
          <div key={user.id} className="buyer-admin-card">
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
                <label className="card-label"><FaPhone /> Phone</label>
                <p className="card-value">{user.phone}</p>
              </div>
              <div className="card-field">
                <label className="card-label"><FaGlobe /> Country</label>
                <p className="card-value">{user.country}</p>
              </div>
              <div className="card-field">
                <label className="card-label"><FaMapMarkerAlt /> Address</label>
                <p className="card-value">{user.addressLine}</p>
              </div>
              <div className="card-field">
                <label className="card-label"> Created Date</label>
                <p className="card-value">{user.createdDate}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="buyer-admin-modal-overlay" onClick={handleCloseModal}>
          <div className="buyer-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="buyer-admin-modal-header">
              <h2>Create Business User</h2>
              <button className="buyer-admin-modal-close" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="buyer-admin-form">
              {error && <div className="buyer-admin-error">{error}</div>}

              <div className="buyer-admin-form-group">
                <label className="buyer-admin-label"><FaUser /> Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  className="buyer-admin-input"
                />
              </div>

              <div className="buyer-admin-form-group">
                <label className="buyer-admin-label"><CiMail /> Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  className="buyer-admin-input"
                />
              </div>

              <div className="buyer-admin-form-group">
                <label className="buyer-admin-label"><FaUser /> Username</label>
                <input
                  type="text"
                  name="userName"
                  value={formData.userName}
                  onChange={handleInputChange}
                  placeholder="Enter username"
                  className="buyer-admin-input"
                />
              </div>

              <div className="buyer-admin-form-group">
                <label className="buyer-admin-label"><FaPhone /> Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter 10-digit phone number"
                  className="buyer-admin-input"
                />
              </div>

              <div className="buyer-admin-form-group">
                <label className="buyer-admin-label"><FaGlobe /> Country</label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="buyer-admin-input buyer-admin-select"
                >
                  <option value="">Select Country</option>
                  {Country.getAllCountries().map((c) => (
                    <option key={c.isoCode} value={c.isoCode}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="buyer-admin-form-group">
                <label className="buyer-admin-label"><FaMapMarkerAlt /> Address</label>
                <input
                  type="text"
                  name="addressLine"
                  value={formData.addressLine}
                  onChange={handleInputChange}
                  placeholder="Enter address"
                  className="buyer-admin-input"
                />
              </div>

              <div className="buyer-admin-form-group">
                <label className="buyer-admin-label"><FaLock /> Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter password"
                    className="buyer-admin-input"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="buyer-admin-password-toggle"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="buyer-admin-form-group">
                <label className="buyer-admin-label"><FaLock /> Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm password"
                    className="buyer-admin-input"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="buyer-admin-password-toggle"
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="buyer-admin-form-actions">
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

export default BuyerAdmin;