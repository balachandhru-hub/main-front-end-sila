import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaTimes, FaBuilding, FaList, FaCheck, FaBox, FaClipboard } from 'react-icons/fa';
import { getAllBuyers, createBuyerDepartment } from '../api/platformApi';
import { useDepartmentStore } from './useDepartmentStore'; 
import './departmentbuyer.css';

const sila_logo = `${window.location.protocol}//${window.location.host}/assets/SILA_Logo.png`;

export const Department: React.FC = () => {
  const navigate = useNavigate();

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

  const [showPopup, setShowPopup] = useState(false);

  const fetchAndSelectBuyer = async () => {
    try {
      const data = await getAllBuyers({ index: 0, limit: 1000 });
      const resolved = Array.isArray(data) ? data : (data as any)?.buyers || (data as any)?.data || [];

      const first = resolved[0] as any;
      if (first) {
        const buyerId = first.buyerId || first.id;
        const orgId = first.organizationId || first.id;
        const orgName = first.organizationName || first.businessProfile?.organizationName || 'Unnamed';

        if (buyerId) {
          setSelectedBuyer({
            id: buyerId,
            organizationId: orgId,
            organizationName: orgName,
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch buyers:', err);
    }
  };

  useEffect(() => {
    fetchAndSelectBuyer();
  }, []);

  const handleBack = () => {
    navigate('../dashboard');
  };

  const handleViewDepartmentList = () => {
    navigate('../departmentcostlist');
  };

  const handleViewItemMaster = () => {
    navigate('../itemmaster');
  };

  const handleViewTemplates = () => {
    navigate('../templates');
  };

  const openPopup = () => {
    resetForm();
    fetchAndSelectBuyer();
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    resetForm();
  };

  const handleAddCostCenter = () => {
    addCostCenter('');
  };

  const handleRemoveCostCenter = (index: number) => {
    if (costCenters.length <= 1) return;
    removeCostCenter(index);
  };

  const handleCostCenterChange = (index: number, value: string) => {
    updateCostCenter(index, value);
  };

  const handleCreate = async () => {
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

    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      await createBuyerDepartment(
        selectedBuyer.id,
        selectedBuyer.organizationId,
        departmentName.trim(),
        validCostCenters
      );

      setCreateSuccess('Department created successfully!');

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



  return (
    <div className="dept-page-container">
      <header className="dept-top-header">
        <img src={sila_logo} alt="SILA" className="dept-top-logo" />
      </header>

      <div className="dept-content-wrapper">
        <div className="dept-back-wrapper">
          <button className="dept-back-btn-content" onClick={handleBack}>
            <FaArrowLeft />
            <span>Back</span>
          </button>
        </div>

        <div className="dept-settings-list">
          <div className="dept-settings-card">
            <div className="dept-settings-card-icon item-master">
              <FaBox />
            </div>
            <div className="dept-settings-card-content">
              <h3 className="dept-settings-card-title">Item Master</h3>
              <p className="dept-settings-card-desc">Manage item master data and configurations</p>
            </div>
            <button className="dept-settings-card-btn primary" onClick={handleViewItemMaster}>
              Open
            </button>
          </div>

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

          <div className="dept-settings-card">
            <div className="dept-settings-card-icon templates">
              <FaClipboard />
            </div>
            <div className="dept-settings-card-content">
              <h3 className="dept-settings-card-title">Templates</h3>
              <p className="dept-settings-card-desc">Create and manage department templates for quick setup</p>
            </div>
            <button className="dept-settings-card-btn primary" onClick={handleViewTemplates}>
              Manage
            </button>
          </div>
        </div>
      </div>

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