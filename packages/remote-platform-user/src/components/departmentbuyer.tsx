import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaTimes, FaBuilding, FaUserTie, FaList, FaCheck } from 'react-icons/fa';
import { getAllBuyers, createBuyerDepartment } from '../api/platformApi';
import type { BuyerDto } from '../dto/platformDto';
import { useDepartmentStore } from './useDepartmentStore'; 
import './departmentbuyer.css';

const sila_logo = `${window.location.protocol}//${window.location.host}/assets/SILA_Logo.png`;

export const Department: React.FC = () => {
  const navigate = useNavigate();

  // ─── Local state: buyers list (this stays local, not in zustand) ───
  const [buyers, setBuyers] = useState<BuyerDto[]>([]);
  const [buyersLoading, setBuyersLoading] = useState(false);

  // ─── Zustand Store: all form + UI state ───
  const {
    selectedBuyer,
    setSelectedBuyer,
    departmentName,
    setDepartmentName,
    costCenters,
    addCostCenter,
    updateCostCenter,
    removeCostCenter,
    loading: creating,
    setLoading: setCreating,
    error: createError,
    setError: setCreateError,
    success: createSuccess,
    setSuccess: setCreateSuccess,
    resetForm,
  } = useDepartmentStore();

  // ─── Popup visibility (local, not in zustand) ───
  const [showPopup, setShowPopup] = useState(false);

  // Fetch buyers on mount
  useEffect(() => {
    const fetchBuyers = async () => {
      setBuyersLoading(true);
      try {
        const data = await getAllBuyers({ index: 0, limit: 1000 });
        // Resolve data shape (same pattern as your dashboard)
        const resolved = Array.isArray(data) ? data : (data as any)?.buyers || (data as any)?.data || [];
        setBuyers(resolved);
      } catch (err: any) {
        console.error('Failed to fetch buyers:', err);
      } finally {
        setBuyersLoading(false);
      }
    };
    fetchBuyers();
  }, []);

  const handleBack = () => {
    navigate('../dashboard');
  };

  const handleViewDepartmentList = () => {
    navigate('../departmentcostlist');
  };

  const openPopup = () => {
    resetForm();           // clears zustand form state
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    resetForm();
  };

  // ─── Cost Center Handlers (now use zustand actions) ───
  const handleAddCostCenter = () => {
    addCostCenter('');     // adds empty string to array
  };

  const handleRemoveCostCenter = (index: number) => {
    if (costCenters.length <= 1) return;
    removeCostCenter(index);
  };

  const handleCostCenterChange = (index: number, value: string) => {
    updateCostCenter(index, value);
  };

  // ─── Create Department (uses zustand state) ───
  const handleCreate = async () => {
    // Validation
    if (!selectedBuyer) {
      setCreateError('Please select a buyer');
      return;
    }
    if (!departmentName.trim()) {
      setCreateError('Please enter department name');
      return;
    }
    const validCostCenters = costCenters.filter((cc) => cc.trim() !== '');
    if (validCostCenters.length === 0) {
      setCreateError('At least one cost center is required');
      return;
    }

    // Find full buyer object to get orgId + orgName
    const buyer = buyers.find((b) => b.id === selectedBuyer.id);
    if (!buyer) {
      setCreateError('Invalid buyer selected');
      return;
    }

    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      // API call with zustand state values
      await createBuyerDepartment(
        buyer.id,
        buyer.organizationId,
        departmentName.trim(),
        validCostCenters
      );

      setCreateSuccess('Department created successfully!');
      
      // Auto-close after success
      setTimeout(() => {
        resetForm();
        setShowPopup(false);
      }, 2000);

    } catch (err: any) {
      setCreateError(err.message || 'Failed to create department');
    } finally {
      setCreating(false);
    }
  };

  // ─── Buyer Selection Handler ───
  const handleBuyerSelect = (buyerId: string) => {
    const buyer = buyers.find((b) => b.id === buyerId);
    if (buyer) {
      setSelectedBuyer({
        id: buyer.id,
        organizationId: buyer.organizationId,
        organizationName: buyer.businessProfile?.organizationName || 'Unnamed',
      });
    } else {
      setSelectedBuyer(null);
    }
    setCreateError(null);
    setCreateSuccess(null);
  };

  return (
    <div className="dept-page-container">
      {/* Top Header */}
      <header className="dept-top-header">
        <img src={sila_logo} alt="SILA" className="dept-top-logo" />
      </header>

      <div className="dept-content-wrapper">
        {/* Back Button */}
        <div className="dept-back-wrapper">
          <button className="dept-back-btn-content" onClick={handleBack}>
            <FaArrowLeft />
            <span>Back</span>
          </button>
        </div>

        {/* Settings List */}
        <div className="dept-settings-list">
          {/* Host */}
          <div className="dept-settings-card">
            <div className="dept-settings-card-icon host">
              <FaUserTie />
            </div>
            <div className="dept-settings-card-content">
              <h3 className="dept-settings-card-title">Host</h3>
              <p className="dept-settings-card-desc">Host management settings</p>
            </div>
            <button className="dept-settings-card-btn" disabled>
              Coming Soon
            </button>
          </div>

          {/* Add Department & Cost Center */}
          <div className="dept-settings-card active">
            <div className="dept-settings-card-icon dept">
              <FaBuilding />
            </div>
            <div className="dept-settings-card-content">
              <h3 className="dept-settings-card-title">Add Department & Cost Center</h3>
              <p className="dept-settings-card-desc">Create departments with associated cost centers for buyers</p>
            </div>
            <button className="dept-settings-card-btn primary" onClick={openPopup}>
              Open
            </button>
          </div>

          {/* Department & Cost Center List */}
          <div className="dept-settings-card">
            <div className="dept-settings-card-icon list">
              <FaList />
            </div>
            <div className="dept-settings-card-content">
              <h3 className="dept-settings-card-title">Department & Cost Center List</h3>
              <p className="dept-settings-card-desc">View and manage all departments and cost centers</p>
            </div>
            <button className="dept-settings-card-btn primary" onClick={handleViewDepartmentList}>
              View
            </button>
          </div>
        </div>
      </div>

      {/* Popup Modal */}
      {showPopup && (
        <div className="dept-popup-overlay" onClick={closePopup}>
          <div className="dept-popup" onClick={(e) => e.stopPropagation()}>
            <div className="dept-popup-header">
              <h2 className="dept-popup-title">
                <FaBuilding className="dept-popup-title-icon" />
                Add Department & Cost Center
              </h2>
              <button className="dept-popup-close" onClick={closePopup}>
                <FaTimes />
              </button>
            </div>

            <div className="dept-popup-body">
              {/* Buyer Dropdown */}
              <div className="dept-form-group">
                <label className="dept-form-label">
                  Select Buyer <span className="dept-required">*</span>
                </label>
                <select
                  className="dept-form-select"
                  value={selectedBuyer?.id || ''}
                  onChange={(e) => handleBuyerSelect(e.target.value)}
                  disabled={buyersLoading}
                >
                  <option value="">{buyersLoading ? 'Loading buyers...' : '-- Choose a Buyer --'}</option>
                  {buyers.map((buyer) => (
                    <option key={buyer.id} value={buyer.id}>
                      {buyer.businessProfile?.organizationName || 'Unnamed'} — {buyer.businessProfile?.email || 'No email'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Input */}
              <div className="dept-form-group">
                <label className="dept-form-label">
                  Department Name <span className="dept-required">*</span>
                  <span className="dept-hint">(Only one department per creation)</span>
                </label>
                <input
                  type="text"
                  className={`dept-form-input ${!selectedBuyer ? 'dept-input-disabled' : ''}`}
                  placeholder={selectedBuyer ? 'Enter department name' : 'Select a buyer first'}
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  disabled={!selectedBuyer}
                />
              </div>

              {/* Cost Centers */}
              <div className="dept-form-group">
                <label className="dept-form-label">
                  Cost Centers <span className="dept-required">*</span>
                  <span className="dept-hint">(At least one required, multiple allowed)</span>
                </label>
                <div className="dept-cost-centers-list">
                  {costCenters.map((cc, index) => (
                    <div key={index} className="dept-cost-center-row">
                      <input
                        type="text"
                        className={`dept-form-input dept-cost-input ${!selectedBuyer ? 'dept-input-disabled' : ''}`}
                        placeholder={selectedBuyer ? `Cost Center ${index + 1}` : 'Select a buyer first'}
                        value={cc}
                        onChange={(e) => handleCostCenterChange(index, e.target.value)}
                        disabled={!selectedBuyer}
                      />
                      {costCenters.length > 1 && selectedBuyer && (
                        <button
                          className="dept-remove-cc-btn"
                          onClick={() => handleRemoveCostCenter(index)}
                          title="Remove"
                        >
                          <FaTimes />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  className={`dept-add-cc-btn ${!selectedBuyer ? 'dept-btn-disabled' : ''}`}
                  onClick={handleAddCostCenter}
                  disabled={!selectedBuyer}
                >
                  <FaPlus />
                  Add
                </button>
              </div>

              {/* Messages */}
              {createError && <div className="dept-error-msg">{createError}</div>}
              {createSuccess && (
                <div className="dept-success-msg">
                  <FaCheck /> {createSuccess}
                </div>
              )}
            </div>

            <div className="dept-popup-footer">
              <button className="dept-btn-secondary" onClick={closePopup}>
                Cancel
              </button>
              <button
                className="dept-btn-primary"
                onClick={handleCreate}
                disabled={creating || !selectedBuyer}
              >
                {creating ? 'Creating...' : 'Create Department'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Department;