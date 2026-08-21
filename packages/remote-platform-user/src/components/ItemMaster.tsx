import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
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
import { useDepartmentStore } from './useDepartmentStore';
import './ItemMaster.css';

const sila_logo = `${window.location.protocol}//${window.location.host}/assets/SILA_Logo.png`;

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

  const { selectedBuyer, setSelectedBuyer } = useDepartmentStore();


  const [itemMasters, setItemMasters] = useState<ItemMasterDto[]>([]);
  const [itemMastersLoading, setItemMastersLoading] = useState(false);

  const [description, setDescription] = useState('');
  const [materialCode, setMaterialCode] = useState('');
  const [materialGroup, setMaterialGroup] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editMaterialCode, setEditMaterialCode] = useState('');
  const [editMaterialGroup, setEditMaterialGroup] = useState('');
  const [originalItem, setOriginalItem] = useState<ItemMasterDto | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletePopup, setDeletePopup] = useState<{
    isOpen: boolean;
    itemId: string;
    itemName: string;
  }>({ isOpen: false, itemId: '', itemName: '' });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);


  useEffect(() => {
    const fetchBuyers = async () => {
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
        showToast(err.message || 'Failed to load buyers.', 'error');
      }
    };
    fetchBuyers();
  }, []);

  const fetchItemMasters = async (buyerId: string) => {
    setItemMastersLoading(true);
    try {
      const data = await getItemMastersByBuyer(buyerId, { index: 0, limit: 100 });
      const resolved = Array.isArray(data) ? data : (data as any)?.itemMasters || (data as any)?.data || [];
      setItemMasters(resolved);
    } catch (err: any) {
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
  }, [selectedBuyer?.id]);

  const showToast = (message: string, type: 'error' | 'success') => {
    setToast({ message, type });
  };

  const resetForm = () => {
    setDescription('');
    setMaterialCode('');
    setMaterialGroup('');
  };

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

  const startEdit = (item: ItemMasterDto) => {
    setEditingItem(item.id);
    setEditDescription(item.description);
    setEditMaterialCode(item.materialCode);
    setEditMaterialGroup(item.materialGroup);
    setOriginalItem(item);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditDescription('');
    setEditMaterialCode('');
    setEditMaterialGroup('');
    setOriginalItem(null);
  };

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

  const openDeletePopup = (item: ItemMasterDto) => {
    setDeletePopup({
      isOpen: true,
      itemId: item.id,
      itemName: item.description,
    });
  };

  const closeDeletePopup = () => {
    setDeletePopup((prev) => ({ ...prev, isOpen: false }));
  };

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

  const handleClose = () => {
    navigate('../settings');
  };

  const isFormDisabled = !selectedBuyer;

  return (
    <div className="im-page-container">
      <header className="im-top-header">
        <img src={sila_logo} alt="SILA" className="im-top-logo" />
      </header>

      <div className="im-content-wrapper">
        <div className="im-page-title-section">
          <div className="im-title-left">
            <h1 className="im-page-title">Item Master</h1>
            <p className="im-page-subtitle">Manage item master data for buyers</p>
          </div>
          <button className="im-close-btn" onClick={handleClose} title="Close">
            <FaTimes />
          </button>
        </div>

        <div className="im-form-section">
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

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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