import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaPen,
  FaCheck,
  FaTrash,
  FaTimes,
  FaBuilding,
  FaExclamationTriangle,
} from 'react-icons/fa';
import {
  getAllBuyers,
  getDepartmentsByBuyer,
  getCostCentersByDepartment,
} from '../api/platformApi';
import {
  deleteDepartment,
  deleteCostCenter,
  updateDepartment,
  updateCostCenter,
} from '../api/departmentcostapi';
import type { DepartmentListItemDto, CostCenterListItemDto } from '../api/platformApi';
import type { BuyerDto } from '../dto/platformDto';
import { useDepartmentStore } from './useDepartmentStore';
import './DepartmentCostList.css';

const sila_logo = `${window.location.protocol}//${window.location.host}/assets/SILA_Logo.png`;

// ─── Confirmation Popup Component ───
interface ConfirmPopupProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ConfirmPopup: React.FC<ConfirmPopupProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="dcl-popup-overlay" onClick={onCancel}>
      <div className="dcl-popup" onClick={(e) => e.stopPropagation()}>
        <div className="dcl-popup-header">
          <FaExclamationTriangle className="dcl-popup-icon" />
          <h3 className="dcl-popup-title">{title}</h3>
        </div>
        <div className="dcl-popup-body">
          <p className="dcl-popup-message">{message}</p>
        </div>
        <div className="dcl-popup-footer">
          <button className="dcl-popup-btn-cancel" onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
          <button className="dcl-popup-btn-confirm" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Toast Component ───
interface ToastProps {
  message: string;
  type: 'error' | 'success';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`dcl-toast dcl-toast-${type}`}>
      <span>{message}</span>
      <button className="dcl-toast-close" onClick={onClose}>
        <FaTimes />
      </button>
    </div>
  );
};

export const DepartmentCostList: React.FC = () => {
  const navigate = useNavigate();

  // ─── Zustand Store ───
  const { selectedBuyer, setSelectedBuyer } = useDepartmentStore();

  // ─── Local State: Buyers List ───
  const [buyers, setBuyers] = useState<BuyerDto[]>([]);
  const [buyersLoading, setBuyersLoading] = useState(false);

  // ─── Local State: Departments ───
  const [departments, setDepartments] = useState<DepartmentListItemDto[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);

  // ─── Local State: Selected Department ───
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentListItemDto | null>(null);

  // ─── Local State: Cost Centers ───
  const [costCenters, setCostCenters] = useState<CostCenterListItemDto[]>([]);
  const [costCentersLoading, setCostCentersLoading] = useState(false);

  // ─── Edit Mode State ───
  const [isEditing, setIsEditing] = useState(false);
  const [editDepartmentName, setEditDepartmentName] = useState('');
  const [editCostCenters, setEditCostCenters] = useState<CostCenterListItemDto[]>([]);

  // ─── Original Snapshots (for change detection) ───
  const [originalDepartmentName, setOriginalDepartmentName] = useState('');
  const [originalCostCenters, setOriginalCostCenters] = useState<CostCenterListItemDto[]>([]);

  // ─── Confirmation Popup State ───
  const [confirmPopup, setConfirmPopup] = useState<{
    isOpen: boolean;
    type: 'department' | 'costcenter';
    title: string;
    message: string;
    targetId: string;
    targetIndex?: number;
  }>({
    isOpen: false,
    type: 'department',
    title: '',
    message: '',
    targetId: '',
  });

  // ─── Loading States ───
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // ─── Error / Toast State ───
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  // ─── Fetch Buyers on Mount ───
  useEffect(() => {
    const fetchBuyers = async () => {
      setBuyersLoading(true);
      try {
        const data = await getAllBuyers({ index: 0, limit: 1000 });
        const resolved = Array.isArray(data) ? data : (data as any)?.buyers || (data as any)?.data || [];
        setBuyers(resolved);
      } catch (err: any) {
        console.error('Failed to fetch buyers:', err);
        setError(err.message || 'Failed to load buyers.');
      } finally {
        setBuyersLoading(false);
      }
    };
    fetchBuyers();
  }, []);

  // ─── Fetch Departments when Buyer Selected ───
  useEffect(() => {
    if (!selectedBuyer) {
      setDepartments([]);
      setSelectedDepartment(null);
      setCostCenters([]);
      return;
    }

    const fetchDepartments = async () => {
      setDepartmentsLoading(true);
      setError(null);
      try {
        const data = await getDepartmentsByBuyer(selectedBuyer.id, { index: 0, limit: 100 });
        const resolved = Array.isArray(data) ? data : (data as any)?.departments || (data as any)?.data || [];
        setDepartments(resolved);
      } catch (err: any) {
        console.error('Failed to fetch departments:', err);
        setError(err.message || 'Failed to load departments.');
      } finally {
        setDepartmentsLoading(false);
      }
    };

    fetchDepartments();
  }, [selectedBuyer]);

  // ─── Fetch Cost Centers when Department Selected ───
  const fetchCostCenters = async (deptId: string) => {
    setCostCentersLoading(true);
    setError(null);
    try {
      const data = await getCostCentersByDepartment(deptId, { index: 0, limit: 100 });
      const resolved = Array.isArray(data) ? data : (data as any)?.costCenters || (data as any)?.data || [];
      setCostCenters(resolved);
    } catch (err: any) {
      console.error('Failed to fetch cost centers:', err);
      setError(err.message || 'Failed to load cost centers.');
    } finally {
      setCostCentersLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedDepartment) {
      setCostCenters([]);
      return;
    }
    fetchCostCenters(selectedDepartment.id);
  }, [selectedDepartment]);

  // ─── Buyer Select Handler ───
  const handleBuyerSelect = (buyerId: string) => {
    if (!buyerId) {
      setSelectedBuyer(null);
      return;
    }
    const buyer = buyers.find((b) => b.id === buyerId);
    if (buyer) {
      setSelectedBuyer({
        id: buyer.id,
        organizationId: buyer.organizationId,
        organizationName: buyer.businessProfile?.organizationName || 'Unnamed',
      });
      setSelectedDepartment(null);
      setCostCenters([]);
      setIsEditing(false);
    }
  };

  // ─── Department Select Handler ───
  const handleDepartmentSelect = (deptId: string) => {
    if (!deptId) {
      setSelectedDepartment(null);
      return;
    }
    const dept = departments.find((d) => d.id === deptId);
    if (dept) {
      setSelectedDepartment(dept);
      setIsEditing(false);
    }
  };

  // ─── Edit Mode ───
  const handleEdit = () => {
    // Store original snapshots for change detection
    setOriginalDepartmentName(selectedDepartment?.department || '');
    setOriginalCostCenters([...costCenters]);
    // Set edit values
    setEditDepartmentName(selectedDepartment?.department || '');
    setEditCostCenters([...costCenters]);
    setIsEditing(true);
    setError(null);
  };

  // ─── Smart Save ───
  const handleSave = async () => {
    if (!selectedDepartment) return;

    // Detect changes
    const deptChanged = editDepartmentName.trim() !== originalDepartmentName.trim();
    const changedCostCenters = editCostCenters.filter((cc, i) => {
      const original = originalCostCenters[i];
      return !original || cc.costCenter.trim() !== original.costCenter.trim();
    });

    // If nothing changed, just exit edit mode
    if (!deptChanged && changedCostCenters.length === 0) {
      setIsEditing(false);
      return;
    }

    setSaveLoading(true);
    setError(null);

    try {
      const promises: Promise<any>[] = [];

      // Department changed → hit PUT
      if (deptChanged) {
        promises.push(
          updateDepartment(selectedDepartment.id, editDepartmentName.trim())
        );
      }

      // Cost centers changed → hit PUT for each changed one
      for (const cc of changedCostCenters) {
        promises.push(updateCostCenter(cc.id, cc.costCenter.trim()));
      }

      await Promise.all(promises);

      // Success → re-fetch to show updated data
      if (deptChanged && selectedDepartment) {
        // Update local department name
        setSelectedDepartment({
          ...selectedDepartment,
          department: editDepartmentName.trim(),
        });
        // Re-fetch departments list to update dropdown
        if (selectedBuyer) {
          const data = await getDepartmentsByBuyer(selectedBuyer.id, { index: 0, limit: 100 });
          const resolved = Array.isArray(data) ? data : (data as any)?.departments || (data as any)?.data || [];
          setDepartments(resolved);
        }
      }

      // Re-fetch cost centers
      if (selectedDepartment) {
        await fetchCostCenters(selectedDepartment.id);
      }

      setIsEditing(false);
      setToast({ message: 'Changes saved successfully!', type: 'success' });
    } catch (err: any) {
      console.error('Save failed:', err);
      setToast({ message: err.message || 'Failed to save changes.', type: 'error' });
      // Stay in edit mode on error
    } finally {
      setSaveLoading(false);
    }
  };

  // ─── Cancel Edit ───
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditCostCenters([]);
    setEditDepartmentName('');
    setError(null);
  };

  // ─── Open Department Delete Confirmation ───
  const openDeleteDepartmentConfirm = () => {
    if (!selectedDepartment) return;
    setConfirmPopup({
      isOpen: true,
      type: 'department',
      title: 'Delete Department',
      message: `Are you sure you want to delete the department "${selectedDepartment.department}"? This will also remove all associated cost centers.`,
      targetId: selectedDepartment.id,
    });
  };

  // ─── Open Cost Center Delete Confirmation ───
  const openDeleteCostCenterConfirm = (costCenterId: string, costCenterName: string, index: number) => {
    setConfirmPopup({
      isOpen: true,
      type: 'costcenter',
      title: 'Delete Cost Center',
      message: `Are you sure you want to delete the cost center "${costCenterName}"?`,
      targetId: costCenterId,
      targetIndex: index,
    });
  };

  // ─── Close Confirmation Popup ───
  const closeConfirmPopup = () => {
    setConfirmPopup((prev) => ({ ...prev, isOpen: false }));
  };

  // ─── Handle Confirm Delete ───
  const handleConfirmDelete = async () => {
    if (!confirmPopup.targetId) return;

    setDeleteLoading(true);
    setError(null);

    try {
      if (confirmPopup.type === 'department') {
        await deleteDepartment(confirmPopup.targetId);
        // Clear everything
        setSelectedDepartment(null);
        setCostCenters([]);
        setDepartments((prev) => prev.filter((d) => d.id !== confirmPopup.targetId));
        setIsEditing(false);
        setToast({ message: 'Department deleted successfully!', type: 'success' });
      } else {
        await deleteCostCenter(confirmPopup.targetId);
        // Re-fetch cost centers to refresh list
        if (selectedDepartment) {
          await fetchCostCenters(selectedDepartment.id);
        }
        // Also remove from edit state if in edit mode
        if (confirmPopup.targetIndex !== undefined) {
          setEditCostCenters((prev) => prev.filter((_, i) => i !== confirmPopup.targetIndex));
        }
        setToast({ message: 'Cost center deleted successfully!', type: 'success' });
      }
      closeConfirmPopup();
    } catch (err: any) {
      setToast({ message: err.message || `Failed to delete ${confirmPopup.type}.`, type: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBack = () => {
    navigate('../settings');
  };

  return (
    <div className="dcl-page-container">
      {/* Top Header */}
      <header className="dcl-top-header">
        <img src={sila_logo} alt="SILA" className="dcl-top-logo" />
      </header>

      <div className="dcl-content-wrapper">
        {/* Back Button */}
        <div className="dcl-back-wrapper">
          <button className="dcl-back-btn-content" onClick={handleBack}>
            <FaArrowLeft />
            <span>Back</span>
          </button>
        </div>

        {/* Page Title */}
        <div className="dcl-page-title-section">
          <h1 className="dcl-page-title">Department & Cost Center List</h1>
          <p className="dcl-page-subtitle">Select a buyer and department to view and manage cost centers</p>
        </div>

        {/* Filters Bar */}
        <div className="dcl-filters-bar">
          {/* Buyer Dropdown */}
          <div className="dcl-filter-group">
            <label className="dcl-filter-label">
              Buyer Name <span className="dcl-required">*</span>
            </label>
            <div className="dcl-select-wrapper">
              <select
                className="dcl-form-select"
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
              {selectedBuyer && (
                <button
                  className="dcl-clear-select-btn"
                  onClick={() => handleBuyerSelect('')}
                  title="Clear buyer"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>

          {/* Department Dropdown */}
          <div className="dcl-filter-group">
            <label className="dcl-filter-label">
              Department <span className="dcl-required">*</span>
            </label>
            <div className="dcl-select-wrapper">
              <select
                className={`dcl-form-select ${!selectedBuyer ? 'dcl-select-disabled' : ''}`}
                value={selectedDepartment?.id || ''}
                onChange={(e) => handleDepartmentSelect(e.target.value)}
                disabled={!selectedBuyer || departmentsLoading}
              >
                <option value="">
                  {!selectedBuyer
                    ? 'Select buyer first'
                    : departmentsLoading
                    ? 'Loading departments...'
                    : '-- Choose a Department --'}
                </option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.department}
                  </option>
                ))}
              </select>
              {selectedDepartment && (
                <button
                  className="dcl-clear-select-btn"
                  onClick={() => handleDepartmentSelect('')}
                  title="Clear department"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && <div className="dcl-error-banner">{error}</div>}

        {/* Toast Notification */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {/* Table Section */}
        <div className="dcl-table-section">
          {!selectedDepartment ? (
            <div className="dcl-empty-state">
              <FaBuilding className="dcl-empty-icon" />
              <h3 className="dcl-empty-title">
                {!selectedBuyer ? 'Select a Buyer' : 'Select a Department'}
              </h3>
              <p className="dcl-empty-desc">
                {!selectedBuyer
                  ? 'Choose a buyer from the dropdown above to get started.'
                  : 'Choose a department to view its cost centers.'}
              </p>
            </div>
          ) : costCentersLoading ? (
            <div className="dcl-loading-container">
              <div className="dcl-spinner"></div>
              <span>Loading cost centers...</span>
            </div>
          ) : (
            <div className="dcl-table-wrapper">
              <table className="dcl-table">
                <thead>
                  <tr>
                    <th className="dcl-th-dept">Department</th>
                    <th className="dcl-th-cc">Cost Center</th>
                    <th className="dcl-th-edit">Edit</th>
                    <th className="dcl-th-delete">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {costCenters.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="dcl-no-data">
                        No cost centers found for this department.
                      </td>
                    </tr>
                  ) : (
                    (isEditing ? editCostCenters : costCenters).map((cc, index) => (
                      <tr
                        key={isEditing ? `edit-${index}` : cc.id}
                        className={index % 2 === 0 ? 'dcl-row-even' : 'dcl-row-odd'}
                      >
                        {/* Department — rowspan on first row only */}
                        {index === 0 && (
                          <td
                            className="dcl-td-dept"
                            rowSpan={isEditing ? editCostCenters.length : costCenters.length}
                          >
                            {isEditing ? (
                              <input
                                type="text"
                                className="dcl-edit-input"
                                value={editDepartmentName}
                                onChange={(e) => setEditDepartmentName(e.target.value)}
                              />
                            ) : (
                              <span className="dcl-dept-name">{selectedDepartment.department}</span>
                            )}
                          </td>
                        )}

                        {/* Cost Center */}
                        <td className="dcl-td-cc">
                          {isEditing ? (
                            <div className="dcl-cc-edit-row">
                              <input
                                type="text"
                                className="dcl-edit-input"
                                value={cc.costCenter}
                                onChange={(e) => {
                                  const updated = [...editCostCenters];
                                  updated[index] = { ...updated[index], costCenter: e.target.value };
                                  setEditCostCenters(updated);
                                }}
                              />
                              <button
                                className="dcl-cc-delete-btn"
                                onClick={() => openDeleteCostCenterConfirm(cc.id, cc.costCenter, index)}
                                title="Delete cost center"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          ) : (
                            <span className="dcl-cc-name">{cc.costCenter}</span>
                          )}
                        </td>

                        {/* Edit — only on first row */}
                        {index === 0 && (
                          <td
                            className="dcl-td-edit"
                            rowSpan={isEditing ? editCostCenters.length : costCenters.length}
                          >
                            {isEditing ? (
                              <div className="dcl-edit-actions">
                                <button
                                  className="dcl-save-btn"
                                  onClick={handleSave}
                                  disabled={saveLoading}
                                  title="Save changes"
                                >
                                  {saveLoading ? '...' : <FaCheck />}
                                </button>
                                <button
                                  className="dcl-cancel-btn"
                                  onClick={handleCancelEdit}
                                  disabled={saveLoading}
                                  title="Cancel"
                                >
                                  <FaTimes />
                                </button>
                              </div>
                            ) : (
                              <button
                                className="dcl-edit-btn"
                                onClick={handleEdit}
                                title="Edit department"
                              >
                                <FaPen />
                              </button>
                            )}
                          </td>
                        )}

                        {/* Delete — only on first row (department delete) */}
                        {index === 0 && (
                          <td
                            className="dcl-td-delete"
                            rowSpan={isEditing ? editCostCenters.length : costCenters.length}
                          >
                            <button
                              className="dcl-delete-btn"
                              onClick={openDeleteDepartmentConfirm}
                              title="Delete department"
                            >
                              <FaTrash />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}

                  {/* Edge case: editing with all cost centers deleted */}
                  {isEditing && editCostCenters.length === 0 && (
                    <tr>
                      <td className="dcl-td-dept">
                        <input
                          type="text"
                          className="dcl-edit-input"
                          value={editDepartmentName}
                          onChange={(e) => setEditDepartmentName(e.target.value)}
                        />
                      </td>
                      <td className="dcl-td-cc dcl-no-cc">No cost centers remaining</td>
                      <td className="dcl-td-edit">
                        <div className="dcl-edit-actions">
                          <button className="dcl-save-btn" onClick={handleSave} disabled={saveLoading}>
                            {saveLoading ? '...' : <FaCheck />}
                          </button>
                          <button className="dcl-cancel-btn" onClick={handleCancelEdit} disabled={saveLoading}>
                            <FaTimes />
                          </button>
                        </div>
                      </td>
                      <td className="dcl-td-delete">
                        <button className="dcl-delete-btn" onClick={openDeleteDepartmentConfirm}>
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Popup */}
      <ConfirmPopup
        isOpen={confirmPopup.isOpen}
        title={confirmPopup.title}
        message={confirmPopup.message}
        onConfirm={handleConfirmDelete}
        onCancel={closeConfirmPopup}
        isLoading={deleteLoading}
      />
    </div>
  );
};

export default DepartmentCostList;