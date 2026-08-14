import { useState, useEffect } from 'react';
import { FaEye as Eye, FaEdit as Edit2, FaTrash as Trash2, FaPlus as Plus } from 'react-icons/fa';
import { toastService } from '@vosox/shared-ui';
import './usertemplate.css';
import {
  createBuyerVerificationTemplate,
  createVerificationTemplateQuestion,
  fetchBuyerVerificationTemplateById,
  fetchBuyerVerificationTemplates,
  updateVerificationTemplateQuestion,
  deleteVerificationTemplate,
  type CreateVerificationTemplatePayload,
  type VerificationTemplateQuestionDto,
} from '../../../remote-buyer/src/api/Buyerapi';

interface TemplateQuestion {
  questionId: string;
  question: string;
  questionKey: string;
  questionType: string;
  displayOrder: number;
  answer: string;
  options: string[];
  isRequired: boolean;
}

interface VerificationTemplate {
  templateId: string;
  templateCode: string;
  templateName: string;
  templateType: string;
  description?: string;
  questions: TemplateQuestion[];
}

interface UserTemplateProps {
  templates?: VerificationTemplate[];
}

interface FormField {
  id: number;
  questionId?: string;
  label: string;
  type: 'Text' | 'Dropdown' | 'Radio button' | 'Checkbox' | 'Date' | 'Email';
  placeholder?: string;
  options?: string[];
  mandatory: boolean;
}

interface TemplateFormData {
  name: string;
  description: string;
  fields: FormField[];
}

export default function UserTemplate({ templates = [] }: UserTemplateProps) {
  const [apiTemplates, setApiTemplates] = useState<VerificationTemplate[]>(templates);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    fields: [],
  });

  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [fieldForm, setFieldForm] = useState({
    label: '',
    type: 'Text' as 'Text' | 'Dropdown' | 'Radio button' | 'Checkbox' | 'Date' | 'Email',
    options: '',
    mandatory: false,
  });

  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [viewingTemplate, setViewingTemplate] = useState<VerificationTemplate | null>(null);
  const [loadingViewId, setLoadingViewId] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [deletedQuestionIds, setDeletedQuestionIds] = useState<string[]>([]);

  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [editingTemplate, setEditingTemplate] = useState<VerificationTemplate | null>(null);
  const [editFormData, setEditFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    fields: [],
  });
  const [editingFieldIdForEdit, setEditingFieldIdForEdit] = useState<number | null>(null);
  const [editFieldForm, setEditFieldForm] = useState({
    label: '',
    type: 'Text' as 'Text' | 'Dropdown' | 'Radio button' | 'Checkbox' | 'Date' | 'Email',
    options: '',
    mandatory: false,
  });
  const [showEditFieldForm, setShowEditFieldForm] = useState(false);
  const [updatingTemplate, setUpdatingTemplate] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const loadPage = async (page: number): Promise<boolean> => {
    setLoadingTemplates(true);
    setTemplatesError(null);
    try {
      const index = (page - 1) * itemsPerPage;
      const result = await fetchBuyerVerificationTemplates(index, itemsPerPage);

      if (!Array.isArray(result)) {
        setTemplatesError(result.message || 'Failed to load templates');
        return false;
      }

      if (result.length === 0 && page > 1) {
        return loadPage(page - 1);
      }

      setCurrentPage(page);
      setApiTemplates(result);
      setHasNextPage(result.length === itemsPerPage);
      return true;
    } catch (err: any) {
      setTemplatesError(err?.message || 'Failed to load templates');
      return false;
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    loadPage(1);
  }, []);

  const handleNextPage = () => {
    if (hasNextPage && !loadingTemplates) {
      loadPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1 && !loadingTemplates) {
      loadPage(currentPage - 1);
    }
  };

  const fieldTypes = [
    'Text',
    'Dropdown',
    'Radio button',
    'Checkbox',
    'Date',
    'Email',
  ];

  const handleCreateTemplate = () => {
    setShowCreateForm(true);
    setCurrentStep(1);
    setPublishError(null);
    setFormData({ name: '', description: '', fields: [] });
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setCurrentStep(1);
    setPublishError(null);
    setFormData({ name: '', description: '', fields: [] });
  };

  const handleStep1Next = () => {
    if (!formData.name.trim()) {
      toastService.error('Please enter a template name');
      return;
    }
    setCurrentStep(2);
  };

  const handleAddField = () => {
    setEditingFieldId(null);
    setFieldForm({
      label: '',
      type: 'Text',
      options: '',
      mandatory: false,
    });
    setShowFieldForm(true);
  };

  const handleEditField = (fieldId: number) => {
    const field = formData.fields.find((f) => f.id === fieldId);
    if (field) {
      setEditingFieldId(fieldId);
      setFieldForm({
        label: field.label,
        type: field.type,
        options: field.options?.join(', ') || '',
        mandatory: field.mandatory,
      });
      setShowFieldForm(true);
    }
  };

  const handleDeleteField = (fieldId: number) => {
    setFormData({
      ...formData,
      fields: formData.fields.filter((f) => f.id !== fieldId),
    });
  };

  const handleSaveField = () => {
    if (!fieldForm.label.trim()) {
      toastService.error('Please enter a question label');
      return;
    }

    const newField: FormField = {
      id: editingFieldId || Date.now(),
      label: fieldForm.label,
      type: fieldForm.type,
      options: fieldForm.options
        ? fieldForm.options.split(',').map((opt) => opt.trim())
        : undefined,
      mandatory: fieldForm.mandatory,
    };

    if (editingFieldId) {
      setFormData({
        ...formData,
        fields: formData.fields.map((f) =>
          f.id === editingFieldId ? newField : f
        ),
      });
      toastService.success('Field updated successfully');
    } else {
      setFormData({
        ...formData,
        fields: [...formData.fields, newField],
      });
      toastService.success('Field added successfully');
    }

    setShowFieldForm(false);
  };

  const handlePublishTemplate = async () => {
    if (!formData.name.trim()) {
      toastService.error('Please enter a template name');
      return;
    }

    if (formData.fields.length === 0) {
      toastService.error('Please add at least one field');
      return;
    }

    setPublishing(true);
    setPublishError(null);

    try {
      const templatePayload: CreateVerificationTemplatePayload = {
        templateName: formData.name,
        description: formData.description,
      };

      const templateResult = await createBuyerVerificationTemplate(templatePayload);

      if (typeof templateResult !== 'string') {
        setPublishError(templateResult.message || 'Failed to create template');
        return;
      }

      const templateId = templateResult;

      for (let i = 0; i < formData.fields.length; i++) {
        const field = formData.fields[i];

        const questionDto: VerificationTemplateQuestionDto = {
          verificationTemplateId: templateId,
          question: field.label,
          questionType: field.type,
          isRequired: Boolean(field.mandatory),
          displayOrder: i,
          options: field.options || [],
        };

        const questionResult = await createVerificationTemplateQuestion({
          verificationTemplateQuestionDto: questionDto,
        });

        if (typeof questionResult !== 'string') {
          setPublishError(
            `Template created, but failed to save question "${field.label}": ${questionResult.message}`
          );
          return;
        }
      }

      const refreshed = await loadPage(1);
      if (!refreshed) {
        setPublishError('Template created, but the template list could not be refreshed. Please reload.');
        return;
      }

      handleCancelCreate();
      toastService.success('Template created successfully');
    } catch (err: any) {
      setPublishError(err?.message || 'Something went wrong while publishing the template.');
    } finally {
      setPublishing(false);
    }
  };

  const handleViewTemplate = async (templateId: string) => {
    setLoadingViewId(templateId);
    setViewError(null);

    try {
      const result = await fetchBuyerVerificationTemplateById(templateId);

      if ('statusCode' in result) {
        setViewError(result.message || 'Failed to load template details');
        return;
      }

      setViewingTemplate(result);
    } catch (err: any) {
      setViewError(err?.message || 'Failed to load template details');
    } finally {
      setLoadingViewId(null);
    }
  };

  const handleOpenEditTemplate = (template: VerificationTemplate) => {
    setEditingTemplate(template);
    const convertedFields: FormField[] = template.questions.map((q, idx) => ({
      id: idx,
      questionId: q.questionId,
      label: q.question,
      type: q.questionType as 'Text' | 'Dropdown' | 'Radio button' | 'Checkbox' | 'Date' | 'Email',
      options: q.options && q.options.length > 0 ? q.options : undefined,
      mandatory: q.isRequired ?? false,
    }));
    setEditFormData({
      name: template.templateName,
      description: template.description || '',
      fields: convertedFields,
    });
    setUpdateError(null);
    setDeletedQuestionIds([]);
  };

  const handleCancelEdit = () => {
    setEditingTemplate(null);
    setEditFormData({ name: '', description: '', fields: [] });
    setShowEditFieldForm(false);
    setUpdateError(null);
    setDeletedQuestionIds([]);
  };

  const handleAddFieldForEdit = () => {
    setEditingFieldIdForEdit(null);
    setEditFieldForm({
      label: '',
      type: 'Text',
      options: '',
      mandatory: false,
    });
    setShowEditFieldForm(true);
  };

  const handleEditFieldForEdit = (fieldId: number) => {
    const field = editFormData.fields.find((f) => f.id === fieldId);
    if (field) {
      setEditingFieldIdForEdit(fieldId);
      setEditFieldForm({
        label: field.label,
        type: field.type,
        options: field.options?.join(', ') || '',
        mandatory: field.mandatory,
      });
      setShowEditFieldForm(true);
    }
  };

  const handleDeleteFieldForEdit = (fieldId: number) => {
    const fieldToDelete = editFormData.fields.find((f) => f.id === fieldId);

    if (fieldToDelete?.questionId) {
      setDeletedQuestionIds((prev) => [...prev, fieldToDelete.questionId!]);
    }

    setEditFormData({
      ...editFormData,
      fields: editFormData.fields.filter((f) => f.id !== fieldId),
    });
  };

  const handleSaveFieldForEdit = () => {
    if (!editFieldForm.label.trim()) {
      toastService.error('Please enter a question label');
      return;
    }

    const originalField =
      editingFieldIdForEdit !== null
        ? editFormData.fields.find((f) => f.id === editingFieldIdForEdit)
        : undefined;

    const newField: FormField = {
      id: editingFieldIdForEdit ?? Date.now(),
      questionId: originalField?.questionId,
      label: editFieldForm.label,
      type: editFieldForm.type,
      options: editFieldForm.options
        ? editFieldForm.options.split(',').map((opt) => opt.trim())
        : undefined,
      mandatory: editFieldForm.mandatory,
    };

    if (editingFieldIdForEdit !== null) {
      setEditFormData({
        ...editFormData,
        fields: editFormData.fields.map((f) =>
          f.id === editingFieldIdForEdit ? newField : f
        ),
      });
      toastService.success('Field updated successfully');
    } else {
      setEditFormData({
        ...editFormData,
        fields: [...editFormData.fields, newField],
      });
      toastService.success('Field added successfully');
    }

    setShowEditFieldForm(false);
  };

  const handleUpdateTemplate = async () => {
    if (editFormData.fields.length === 0) {
      toastService.error('Please add at least one field');
      return;
    }

    if (!editingTemplate) return;

    setUpdatingTemplate(true);
    setUpdateError(null);

    try {
      for (let i = 0; i < editFormData.fields.length; i++) {
        const field = editFormData.fields[i];
        const options = (field.options || []).map((optionText, idx) => ({
          optionText,
          displayOrder: idx,
        }));

        if (field.questionId) {
          const result = await updateVerificationTemplateQuestion({
            verificationTemplateQuestionDto: {
              id: field.questionId,
              verificationTemplateId: editingTemplate.templateId,
              question: field.label,
              questionType: field.type,
              isRequired: Boolean(field.mandatory),
              displayOrder: i,
              options,
            },
          });

          if (typeof result !== 'string') {
            setUpdateError(
              `Failed to update question "${field.label}": ${result.message}`
            );
            return;
          }
        } else {
          const result = await createVerificationTemplateQuestion({
            verificationTemplateQuestionDto: {
              verificationTemplateId: editingTemplate.templateId,
              question: field.label,
              questionType: field.type,
              isRequired: Boolean(field.mandatory),
              displayOrder: i,
              options: field.options || [],
            },
          });

          if (typeof result !== 'string') {
            setUpdateError(
              `Failed to add question "${field.label}": ${result.message}`
            );
            return;
          }
        }
      }

      for (const questionId of deletedQuestionIds) {
        const originalQuestion = editingTemplate.questions.find(
          (q) => q.questionId === questionId
        );

        if (!originalQuestion) continue;

        const result = await updateVerificationTemplateQuestion({
          verificationTemplateQuestionDto: {
            id: questionId,
            verificationTemplateId: editingTemplate.templateId,
            question: originalQuestion.question,
            questionType: originalQuestion.questionType,
            isRequired: Boolean(originalQuestion.isRequired),
            displayOrder: originalQuestion.displayOrder,
            isDeleted: true,
            options: (originalQuestion.options || []).map((optionText, idx) => ({
              optionText,
              displayOrder: idx,
            })),
          },
        });

        if (typeof result !== 'string') {
          setUpdateError(
            `Failed to delete question "${originalQuestion.question}": ${result.message}`
          );
          return;
        }
      }

      const refreshed = await loadPage(currentPage);
      if (!refreshed) {
        setUpdateError(
          'Questions saved, but the template list could not be refreshed. Please reload.'
        );
        return;
      }

      handleCancelEdit();
      toastService.success('Template updated successfully');
    } catch (err: any) {
      setUpdateError(
        err?.message || 'Something went wrong while updating the template.'
      );
    } finally {
      setUpdatingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    setDeletingTemplateId(templateId);
    setDeleteError(null);

    try {
      const result = await deleteVerificationTemplate(templateId);

      if (typeof result !== 'boolean' || result !== true) {
        const message =
          result && typeof result === 'object' && 'message' in result
            ? (result as { message?: string }).message || 'Failed to delete template'
            : 'Failed to delete template';
        setDeleteError(message);
        toastService.error(message);
        return;
      }

      const refreshed = await loadPage(currentPage);
      if (!refreshed) {
        setDeleteError('Template deleted, but the template list could not be refreshed. Please reload.');
        return;
      }

      toastService.success('Template deleted successfully');
    } catch (err: any) {
      const message = err?.message || 'Something went wrong while deleting the template.';
      setDeleteError(message);
      toastService.error(message);
    } finally {
      setDeletingTemplateId(null);
    }
  };

  if (showCreateForm) {
    return (
      <div className="ut-container">
        <div className="ut-header">
          <div className="ut-header-content">
            <h1>Onboarding Registration Templates</h1>
            <p>Configure compliance checks, required physical files, and document parameters for unverified vendor groups.</p>
          </div>
        </div>

        {currentStep === 1 ? (
          <div className="ut-form-card">
            <div className="ut-form-header">
              <span className="ut-step-indicator">Step 1 of 2</span>
              <h2>Enter Template Information</h2>
            </div>

            <div className="ut-form-group">
              <label>Template Name</label>
              <input
                type="text"
                placeholder="Enter template name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="ut-form-group">
              <label>Description</label>
              <textarea
                placeholder="Explain the target supplier group and compliance standards met this checklist."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
              />
            </div>

            <div className="ut-form-actions">
              <button className="ut-btn-cancel" onClick={handleCancelCreate}>
                Cancel
              </button>
              <button className="ut-btn-primary" onClick={handleStep1Next}>
                Next
              </button>
            </div>
          </div>
        ) : (
          <div className="ut-form-card">
            <div className="ut-form-header">
              <span className="ut-step-indicator">Step 2 of 2</span>
              <h2>Configure Form Fields</h2>
            </div>

            <div className="ut-add-field-section">
              <button className="ut-btn-add-field" onClick={handleAddField}>
                <Plus size={18} /> Add Form Field
              </button>
            </div>

            {showFieldForm && (
              <div className="ut-inline-field-form">
                <div className="ut-inline-form-container">
                  <div className="ut-form-group">
                    <label>Field Type</label>
                    <select
                      value={fieldForm.type}
                      onChange={(e) =>
                        setFieldForm({
                          ...fieldForm,
                          type: e.target.value as 'Text' | 'Dropdown' | 'Radio button' | 'Checkbox' | 'Date' | 'Email'
                        })
                      }
                    >
                      {fieldTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ut-form-group">
                    <label>Question Label</label>
                    <input
                      type="text"
                      placeholder="eg. Business Type"
                      value={fieldForm.label}
                      onChange={(e) =>
                        setFieldForm({ ...fieldForm, label: e.target.value })
                      }
                    />
                  </div>

                  {(fieldForm.type === 'Dropdown' ||
                    fieldForm.type === 'Radio button') && (
                    <div className="ut-form-group">
                      <label>Available Options (Comma Separated)</label>
                      <input
                        type="text"
                        placeholder="eg. Manufacturer, Distributor, Retailer"
                        value={fieldForm.options}
                        onChange={(e) =>
                          setFieldForm({
                            ...fieldForm,
                            options: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                  <div className="ut-form-group ut-form-group--checkbox">
                    <input
                      type="checkbox"
                      id="mandatory"
                      checked={fieldForm.mandatory}
                      onChange={(e) =>
                        setFieldForm({
                          ...fieldForm,
                          mandatory: e.target.checked,
                        })
                      }
                    />
                    <label htmlFor="mandatory">
                      Make this field mandatory (*)
                    </label>
                  </div>

                  <div className="ut-inline-form-actions">
                    <button
                      className="ut-btn-cancel"
                      onClick={() => setShowFieldForm(false)}
                    >
                      Cancel
                    </button>
                    <button className="ut-btn-primary" onClick={handleSaveField}>
                      Save Field
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="ut-fields-list">
              <h3 className="ut-fields-list-title">Configured Form Schema ({formData.fields.length})</h3>
              {formData.fields.length === 0 ? (
                <p className="ut-empty-state">No fields added yet. Click "Add Form Field" to get started.</p>
              ) : (
                formData.fields.map((field) => (
                  <div key={field.id} className="ut-field-item">
                    <div className="ut-field-info">
                      <div className="ut-field-name">{field.label}</div>
                      <div className="ut-field-type">Type: {field.type}</div>
                      {field.mandatory && (
                        <div className="ut-field-mandatory">Mandatory</div>
                      )}
                    </div>
                    <div className="ut-field-actions">
                      <button
                        className="ut-btn-edit-field"
                        onClick={() => handleEditField(field.id)}
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      <button
                        className="ut-btn-delete-field"
                        onClick={() => handleDeleteField(field.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {publishError && (
              <div className="ut-error-message ut-error-message--form">
                {publishError}
              </div>
            )}

            <div className="ut-form-actions">
              <button className="ut-btn-cancel" onClick={() => setCurrentStep(1)} disabled={publishing}>
                Cancel
              </button>
              <button className="ut-btn-publish" onClick={handlePublishTemplate} disabled={publishing}>
                {publishing ? 'Publishing...' : 'Publish Template'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ut-container">
      <div className="ut-header">
        <div className="ut-header-content">
          <h1>Onboarding Registration Templates</h1>
          <p>Configure compliance checks, required physical files, and document parameters for unverified vendor groups.</p>
        </div>
        <button className="ut-btn-create" onClick={handleCreateTemplate}>
          + Create Template
        </button>
      </div>

      {viewError && (
        <div className="ut-error-message ut-error-message--page">
          {viewError}
        </div>
      )}

      {deleteError && (
        <div className="ut-error-message ut-error-message--page">
          {deleteError}
        </div>
      )}

      {templatesError && (
        <div className="ut-error-message ut-error-message--page">
          {templatesError}
        </div>
      )}

      {/* Templates Table */}
      {apiTemplates.length > 0 && (
        <div className="ut-table-wrapper">
          <table className="ut-table">
            <thead>
              <tr>
                <th className="ut-col-name">TEMPLATE NAME</th>
                <th className="ut-col-modified">LAST MODIFIED</th>
                <th className="ut-col-action">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {apiTemplates.map((template) => (
                <tr key={template.templateId} className="ut-table-row">
                  <td className="ut-col-name">
                    <div className="ut-template-name-wrapper">
                      <div className="ut-template-name">{template.templateName}</div>
                      <div className="ut-template-description">
                        {template.questions.length} questions • {template.templateType}
                      </div>
                    </div>
                  </td>
                  <td className="ut-col-modified">
                    {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="ut-col-action">
                    <div className={`ut-action-buttons ${template.templateType === "DEFAULT" ? "ut-default-template" : ""}`}>
                      <button
                        className="ut-btn-action ut-btn-view"
                        title="View"
                        onClick={() => handleViewTemplate(template.templateId)}
                        disabled={loadingViewId === template.templateId}
                      >
                        <Eye size={18} />
                        {loadingViewId === template.templateId ? 'Loading...' : 'View'}
                      </button>
                      <button
                        className="ut-btn-action ut-btn-edit"
                        title="Edit"
                        onClick={() => handleOpenEditTemplate(template)}
                      >
                        <Edit2 size={18} />
                        Edit
                      </button>
                      <button
                        className="ut-btn-action ut-btn-delete"
                        title="Delete"
                        onClick={() => setConfirmDeleteId(template.templateId)}
                        disabled={deletingTemplateId === template.templateId}
                      >
                        <Trash2 size={18} />
                        {deletingTemplateId === template.templateId ? 'Deleting...' : ''}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {(currentPage > 1 || hasNextPage) && (
            <div className="ut-pagination-controls">
              <button
                className="ut-btn-pagination"
                onClick={handlePrevPage}
                disabled={currentPage === 1 || loadingTemplates}
              >
                ← Previous
              </button>
              <span className="ut-pagination-info">
                Page {currentPage}
              </span>
              <button
                className="ut-btn-pagination"
                onClick={handleNextPage}
                disabled={!hasNextPage || loadingTemplates}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {apiTemplates.length === 0 && (
        <div className="ut-empty-state-container">
          <p>No templates available. Create a new template to get started.</p>
        </div>
      )}

      {/* View Template Modal */}
      {viewingTemplate && (
        <div className="ut-modal-overlay" onClick={() => setViewingTemplate(null)}>
          <div className="ut-modal ut-modal--view" onClick={(e) => e.stopPropagation()}>
            <div className="ut-modal-header">
              <div className="ut-modal-header-info">
                <h2 className="ut-modal-title">{viewingTemplate.templateName}</h2>
                <div className="ut-modal-subtitle">
                  {viewingTemplate.templateType} • Code: {viewingTemplate.templateCode}
                </div>
              </div>
              <button
                className="ut-btn-cancel ut-modal-close-btn"
                onClick={() => setViewingTemplate(null)}
              >
                Close
              </button>
            </div>

            {viewingTemplate.questions.length === 0 ? (
              <p className="ut-empty-state">No questions configured for this template.</p>
            ) : (
              <div className="ut-modal-questions">
                {viewingTemplate.questions
                  .slice()
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((q) => (
                    <div key={q.questionId} className="ut-field-item ut-field-item--flush">
                      <div className="ut-field-info">
                        <div className="ut-field-name">{q.question}</div>
                        <div className="ut-field-type">Type: {q.questionType}</div>
                        {q.options && q.options.length > 0 && (
                          <div className="ut-field-type">Options: {q.options.join(', ')}</div>
                        )}
                        {q.isRequired && (
                          <div className="ut-field-mandatory">Mandatory</div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="ut-modal-overlay ut-modal-overlay--scrollable" onClick={handleCancelEdit}>
          <div className="ut-form-card ut-modal ut-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ut-form-header">
              <span className="ut-step-indicator">Edit Template</span>
              <h2>Update Template Information</h2>
            </div>

            <div className="ut-form-group">
              <label>Template Name</label>
              <input
                type="text"
                className="ut-input--readonly"
                readOnly
                value={editFormData.name}
              />
            </div>

            <div className="ut-form-group">
              <label>Description</label>
              <textarea
                className="ut-textarea--readonly"
                readOnly
                value={editFormData.description}
                rows={4}
              />
            </div>

            <div className="ut-add-field-section">
              <button className="ut-btn-add-field" onClick={handleAddFieldForEdit}>
                <Plus size={18} /> Add Form Field
              </button>
            </div>

            {showEditFieldForm && (
              <div className="ut-inline-field-form">
                <div className="ut-inline-form-container">
                  <div className="ut-form-group">
                    <label>Field Type</label>
                    <select
                      value={editFieldForm.type}
                      onChange={(e) =>
                        setEditFieldForm({
                          ...editFieldForm,
                          type: e.target.value as 'Text' | 'Dropdown' | 'Radio button' | 'Checkbox' | 'Date' | 'Email'
                        })
                      }
                    >
                      {fieldTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ut-form-group">
                    <label>Question Label</label>
                    <input
                      type="text"
                      placeholder="eg. Business Type"
                      value={editFieldForm.label}
                      onChange={(e) =>
                        setEditFieldForm({ ...editFieldForm, label: e.target.value })
                      }
                    />
                  </div>

                  {(editFieldForm.type === 'Dropdown' ||
                    editFieldForm.type === 'Radio button') && (
                    <div className="ut-form-group">
                      <label>Available Options (Comma Separated)</label>
                      <input
                        type="text"
                        placeholder="eg. Manufacturer, Distributor, Retailer"
                        value={editFieldForm.options}
                        onChange={(e) =>
                          setEditFieldForm({
                            ...editFieldForm,
                            options: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                  <div className="ut-form-group ut-form-group--checkbox">
                    <input
                      type="checkbox"
                      id="mandatory-edit"
                      checked={editFieldForm.mandatory}
                      onChange={(e) =>
                        setEditFieldForm({
                          ...editFieldForm,
                          mandatory: e.target.checked,
                        })
                      }
                    />
                    <label htmlFor="mandatory-edit">
                      Make this field mandatory (*)
                    </label>
                  </div>

                  <div className="ut-inline-form-actions">
                    <button
                      className="ut-btn-cancel"
                      onClick={() => setShowEditFieldForm(false)}
                    >
                      Cancel
                    </button>
                    <button className="ut-btn-primary" onClick={handleSaveFieldForEdit}>
                      Save Field
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="ut-fields-list">
              <h3 className="ut-fields-list-title">Configured Form Schema ({editFormData.fields.length})</h3>
              {editFormData.fields.length === 0 ? (
                <p className="ut-empty-state">No fields added yet. Click "Add Form Field" to get started.</p>
              ) : (
                editFormData.fields.map((field) => (
                  <div key={field.id} className="ut-field-item">
                    <div className="ut-field-info">
                      <div className="ut-field-name">{field.label}</div>
                      <div className="ut-field-type">Type: {field.type}</div>
                      {field.mandatory && (
                        <div className="ut-field-mandatory">Mandatory</div>
                      )}
                    </div>
                    <div className="ut-field-actions">
                      <button
                        className="ut-btn-edit-field"
                        onClick={() => handleEditFieldForEdit(field.id)}
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      <button
                        className="ut-btn-delete-field"
                        onClick={() => handleDeleteFieldForEdit(field.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {updateError && (
              <div className="ut-error-message ut-error-message--form">
                {updateError}
              </div>
            )}

            <div className="ut-form-actions">
              <button className="ut-btn-cancel" onClick={handleCancelEdit} disabled={updatingTemplate}>
                Cancel
              </button>
              <button className="ut-btn-publish" onClick={handleUpdateTemplate} disabled={updatingTemplate}>
                {updatingTemplate ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Delete Confirmation */}
      {confirmDeleteId && (
        <div className="ut-modal-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="ut-modal ut-modal--confirm" onClick={(e) => e.stopPropagation()}>
            <p className="ut-confirm-text">Are you sure you want to delete this template? This cannot be undone.</p>
            <div className="ut-form-actions">
              <button className="ut-btn-cancel" onClick={() => setConfirmDeleteId(null)}>
                Cancel
              </button>
              <button
                className="ut-btn-delete-confirm"
                onClick={() => {
                  const templateId = confirmDeleteId;
                  setConfirmDeleteId(null);
                  handleDeleteTemplate(templateId);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}