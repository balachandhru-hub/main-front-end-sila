import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaBox,
  FaPlus,
  FaPen,
  FaTrash,
  FaCheck,
  FaTimes,
  FaUpload,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { getAllBuyers } from '../api/platformApi';
import {
  getItemMastersByBuyer,
  createItemMaster,
  updateItemMaster,
  deleteItemMaster,
  uploadItemMasterExcel,
} from '../api/itemmasterapi';
import type { ItemMasterDto } from '../api/itemmasterapi';
import type { BuyerDto } from '../dto/platformDto';
import { useDepartmentStore } from './useDepartmentStore';
import './ItemMaster.css';

const sila_logo = `${window.location.protocol}//${window.location.host}/assets/SILA_Logo.png`;

// ─── Confirmation Popup ───
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
    <div className="im-popup-overlay" onClick={onCancel}>
      <div className="im-popup" onClick={(e) => e.stopPropagation()}>
        <div className="im-popup-header">
          <FaExclamationTriangle className="im-popup-icon" />
          <h3 className="im-popup-title">{title}</h3>
        </div>
        <div className="im-popup-body">
          <p className="im-popup-message">{message}</p>
        </div>
        <div className="im-popup-footer">
          <button className="im-popup-btn-cancel" onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
          <button className="im-popup-btn-confirm" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Toast ───
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
    <div className={`im-toast im-toast-${type}`}>
      <span>{message}</span>
      <button className="im-toast-close" onClick={onClose}>
        <FaTimes />
      </button>
    </div>
  );
};

export const ItemMaster: React.FC = () => {
  const navigate = useNavigate();

  // ─── Zustand Store ───
  const { selectedBuyer, setSelectedBuyer } = useDepartmentStore();

  // ─── Local State: Buyers List ───
  const [buyers, setBuyers] = useState<BuyerDto[]>([]);
  const [buyersLoading, setBuyersLoading] = useState(false);

  // ─── Local State: Item Masters ───
  const [itemMasters, setItemMasters] = useState<ItemMasterDto[]>([]);
  const [itemMastersLoading, setItemMastersLoading] = useState(false);

  // ─── Form State ───
  const [description, setDescription] = useState('');
  const [materialCode, setMaterialCode] = useState('');
  const [materialGroup, setMaterialGroup] = useState('');
  const [creating, setCreating] = useState(false);

  // ─── Edit State ───
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editMaterialCode, setEditMaterialCode] = useState('');
  const [editMaterialGroup, setEditMaterialGroup] = useState('');
  const [originalItem, setOriginalItem] = useState<ItemMasterDto | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // ─── Delete State ───
  const [deletePopup, setDeletePopup] = useState<{
    isOpen: boolean;
    itemId: string;
    itemName: string;
  }>({ isOpen: false, itemId: '', itemName: '' });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ─── Upload State ───
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Toast State ───
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
        showToast(err.message || 'Failed to load buyers.', 'error');
      } finally {
        setBuyersLoading(false);
      }
    };
    fetchBuyers();
  }, []);

  // ─── Fetch Item Masters when Buyer Selected ───
  const fetchItemMasters = async (buyerId: string) => {
    setItemMastersLoading(true);
    try {
      const data = await getItemMastersByBuyer(buyerId, { index: 0, limit: 100 });
      const resolved = Array.isArray(data) ? data : (data as any)?.itemMasters || (data as any)?.data || [];
      setItemMasters(resolved);
    } catch (err: any) {
      console.error('Failed to fetch item masters:', err);
      showToast(err.message || 'Failed to load item masters.', 'error');
    } finally {
      setItemMastersLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedBuyer) {
      setItemMasters([]);
      return;
    }
    fetchItemMasters(selectedBuyer.id);
  }, [selectedBuyer]);

  // ─── Helper: Show Toast ───
  const showToast = (message: string, type: 'error' | 'success') => {
    setToast({ message, type });
  };

  // ─── Buyer Select Handler ───
  const handleBuyerSelect = (buyerId: string) => {
    if (!buyerId) {
      setSelectedBuyer(null);
      resetForm();
      return;
    }
    const buyer = buyers.find((b) => b.id === buyerId);
    if (buyer) {
      setSelectedBuyer({
        id: buyer.id,
        organizationId: buyer.organizationId,
        organizationName: buyer.businessProfile?.organizationName || 'Unnamed',
      });
      resetForm();
      cancelEdit();
    }
  };

  // ─── Reset Form ───
  const resetForm = () => {
    setDescription('');
    setMaterialCode('');
    setMaterialGroup('');
  };

  // ─── Create Item Master ───
  const handleCreate = async () => {
    if (!selectedBuyer) {
      showToast('Please select a buyer', 'error');
      return;
    }
    if (!description.trim()) {
      showToast('Please enter description', 'error');
      return;
    }
    if (!materialCode.trim()) {
      showToast('Please enter material code', 'error');
      return;
    }
    if (!materialGroup.trim()) {
      showToast('Please enter material group', 'error');
      return;
    }

    setCreating(true);
    try {
      await createItemMaster({
        buyerId: selectedBuyer.id,
        description: description.trim(),
        materialCode: materialCode.trim(),
        materialGroup: materialGroup.trim(),
      });

      showToast('Item master created successfully!', 'success');
      resetForm();
      await fetchItemMasters(selectedBuyer.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to create item master.', 'error');
    } finally {
      setCreating(false);
    }
  };

  // ─── Start Edit ───
  const startEdit = (item: ItemMasterDto) => {
    setEditingItem(item.id);
    setEditDescription(item.description);
    setEditMaterialCode(item.materialCode);
    setEditMaterialGroup(item.materialGroup);
    setOriginalItem(item);
  };

  // ─── Cancel Edit ───
  const cancelEdit = () => {
    setEditingItem(null);
    setEditDescription('');
    setEditMaterialCode('');
    setEditMaterialGroup('');
    setOriginalItem(null);
  };

  // ─── Save Edit ───
  const handleSaveEdit = async (itemId: string) => {
    if (!selectedBuyer || !originalItem) return;

    const descChanged = editDescription.trim() !== originalItem.description;
    const codeChanged = editMaterialCode.trim() !== originalItem.materialCode;
    const groupChanged = editMaterialGroup.trim() !== originalItem.materialGroup;

    if (!descChanged && !codeChanged && !groupChanged) {
      cancelEdit();
      return;
    }

    setSavingEdit(true);
    try {
      await updateItemMaster(itemId, {
        buyerId: selectedBuyer.id,
        description: editDescription.trim(),
        materialCode: editMaterialCode.trim(),
        materialGroup: editMaterialGroup.trim(),
      });

      showToast('Item master updated successfully!', 'success');
      cancelEdit();
      await fetchItemMasters(selectedBuyer.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to update item master.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // ─── Open Delete Popup ───
  const openDeletePopup = (item: ItemMasterDto) => {
    setDeletePopup({
      isOpen: true,
      itemId: item.id,
      itemName: item.description,
    });
  };

  // ─── Close Delete Popup ───
  const closeDeletePopup = () => {
    setDeletePopup((prev) => ({ ...prev, isOpen: false }));
  };

  // ─── Confirm Delete ───
  const handleConfirmDelete = async () => {
    if (!deletePopup.itemId) return;

    setDeleteLoading(true);
    try {
      await deleteItemMaster(deletePopup.itemId);
      showToast('Item master deleted successfully!', 'success');
      closeDeletePopup();
      if (selectedBuyer) {
        await fetchItemMasters(selectedBuyer.id);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete item master.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Upload File ───
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBuyer) return;

    setUploading(true);
    try {
      await uploadItemMasterExcel(selectedBuyer.id, file);
      showToast('File uploaded successfully!', 'success');
      await fetchItemMasters(selectedBuyer.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to upload file.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleBack = () => {
    navigate('../settings');
  };

  const isFormDisabled = !selectedBuyer;

  return (
    <div className="im-page-container">
      {/* Top Header */}
      <header className="im-top-header">
        <img src={sila_logo} alt="SILA" className="im-top-logo" />
      </header>

      <div className="im-content-wrapper">
        {/* Back Button */}
        <div className="im-back-wrapper">
          <button className="im-back-btn-content" onClick={handleBack}>
            <FaArrowLeft />
            <span>Back</span>
          </button>
        </div>

        {/* Page Title */}
        <div className="im-page-title-section">
          <h1 className="im-page-title">Item Master</h1>
          <p className="im-page-subtitle">Manage item master data for buyers</p>
        </div>

        {/* Form Section */}
        <div className="im-form-section">
          {/* Buyer Dropdown */}
          <div className="im-form-group">
            <label className="im-form-label">
              Buyer Name <span className="im-required">*</span>
            </label>
            <div className="im-select-wrapper">
              <select
                className="im-form-select"
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
                  className="im-clear-select-btn"
                  onClick={() => handleBuyerSelect('')}
                  title="Clear buyer"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="im-form-group">
            <label className="im-form-label">
              Description <span className="im-required">*</span>
            </label>
            <input
              type="text"
              className={`im-form-input ${isFormDisabled ? 'im-input-disabled' : ''}`}
              placeholder={selectedBuyer ? 'Enter description' : 'Select a buyer first'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isFormDisabled}
            />
          </div>

          {/* Material Code */}
          <div className="im-form-group">
            <label className="im-form-label">
              Material Code <span className="im-required">*</span>
            </label>
            <input
              type="text"
              className={`im-form-input ${isFormDisabled ? 'im-input-disabled' : ''}`}
              placeholder={selectedBuyer ? 'Enter material code' : 'Select a buyer first'}
              value={materialCode}
              onChange={(e) => setMaterialCode(e.target.value)}
              disabled={isFormDisabled}
            />
          </div>

          {/* Material Group */}
          <div className="im-form-group">
            <label className="im-form-label">
              Material Group <span className="im-required">*</span>
            </label>
            <input
              type="text"
              className={`im-form-input ${isFormDisabled ? 'im-input-disabled' : ''}`}
              placeholder={selectedBuyer ? 'Enter material group' : 'Select a buyer first'}
              value={materialGroup}
              onChange={(e) => setMaterialGroup(e.target.value)}
              disabled={isFormDisabled}
            />
          </div>

          {/* Actions: Create + Upload */}
          <div className="im-form-actions">
            <button
              className="im-btn-create"
              onClick={handleCreate}
              disabled={creating || isFormDisabled}
            >
              <FaPlus />
              {creating ? 'Creating...' : 'Create Item Master'}
            </button>

            {selectedBuyer && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  accept=".xlsx,.xls,.csv"
                />
                <button
                  className="im-btn-upload"
                  onClick={triggerFileUpload}
                  disabled={uploading}
                >
                  <FaUpload />
                  {uploading ? 'Uploading...' : 'Upload Excel'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {/* Table Section */}
        <div className="im-table-section">
          {!selectedBuyer ? (
            <div className="im-empty-state">
              <FaBox className="im-empty-icon" />
              <h3 className="im-empty-title">Select a Buyer</h3>
              <p className="im-empty-desc">Choose a buyer to view item masters.</p>
            </div>
          ) : itemMastersLoading ? (
            <div className="im-loading-container">
              <div className="im-spinner"></div>
              <span>Loading item masters...</span>
            </div>
          ) : (
            <div className="im-table-wrapper">
              <table className="im-table">
                <thead>
                  <tr>
                    <th className="im-th-desc">Description</th>
                    <th className="im-th-code">Material Code</th>
                    <th className="im-th-group">Material Group</th>
                    <th className="im-th-edit">Edit</th>
                    <th className="im-th-delete">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {itemMasters.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="im-no-data">
                        No item masters found for this buyer.
                      </td>
                    </tr>
                  ) : (
                    itemMasters.map((item, index) => (
                      <tr
                        key={item.id}
                        className={index % 2 === 0 ? 'im-row-even' : 'im-row-odd'}
                      >
                        {/* Description */}
                        <td className="im-td-desc">
                          {editingItem === item.id ? (
                            <input
                              type="text"
                              className="im-edit-input"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                            />
                          ) : (
                            item.description
                          )}
                        </td>

                        {/* Material Code */}
                        <td className="im-td-code">
                          {editingItem === item.id ? (
                            <input
                              type="text"
                              className="im-edit-input"
                              value={editMaterialCode}
                              onChange={(e) => setEditMaterialCode(e.target.value)}
                            />
                          ) : (
                            item.materialCode
                          )}
                        </td>

                        {/* Material Group */}
                        <td className="im-td-group">
                          {editingItem === item.id ? (
                            <input
                              type="text"
                              className="im-edit-input"
                              value={editMaterialGroup}
                              onChange={(e) => setEditMaterialGroup(e.target.value)}
                            />
                          ) : (
                            item.materialGroup
                          )}
                        </td>

                        {/* Edit */}
                        <td className="im-td-edit">
                          {editingItem === item.id ? (
                            <div className="im-edit-actions">
                              <button
                                className="im-save-btn"
                                onClick={() => handleSaveEdit(item.id)}
                                disabled={savingEdit}
                                title="Save"
                              >
                                {savingEdit ? '...' : <FaCheck />}
                              </button>
                              <button
                                className="im-cancel-btn"
                                onClick={cancelEdit}
                                disabled={savingEdit}
                                title="Cancel"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          ) : (
                            <button
                              className="im-edit-btn"
                              onClick={() => startEdit(item)}
                              title="Edit"
                            >
                              <FaPen />
                            </button>
                          )}
                        </td>

                        {/* Delete */}
                        <td className="im-td-delete">
                          <button
                            className="im-delete-btn"
                            onClick={() => openDeletePopup(item)}
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Popup */}
      <ConfirmPopup
        isOpen={deletePopup.isOpen}
        title="Delete Item Master"
        message={`Are you sure you want to delete "${deletePopup.itemName}"?`}
        onConfirm={handleConfirmDelete}
        onCancel={closeDeletePopup}
        isLoading={deleteLoading}
      />
    </div>
  );
};

export default ItemMaster;