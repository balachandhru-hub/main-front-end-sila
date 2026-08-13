import { useState, useEffect } from 'react';
import { FaEye as Eye, FaEdit as Edit2, FaTrash as Trash2, FaPlus as Plus } from 'react-icons/fa';
import { toastService } from '@vosox/shared-ui';
import './usertemplate.css';
import {
  createBuyerVerificationTemplate,
  createVerificationTemplateQuestion,
  fetchBuyerVerificationTemplateById,
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
  questions: TemplateQuestion[];
}

interface UserTemplateProps {
  templates?: VerificationTemplate[];
}

interface FormField {
  id: number;
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

  useEffect(() => {
    if (templates && templates.length > 0) {
      setApiTemplates(templates);
    }
  }, [templates]);


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
          isRequired: field.mandatory,
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

      const fullTemplate = await fetchBuyerVerificationTemplateById(templateId);

      if ('statusCode' in fullTemplate) {
        setPublishError(fullTemplate.message || 'Template saved, but failed to reload it');
        return;
      }

      setApiTemplates([fullTemplate, ...apiTemplates]);
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

  if (showCreateForm) {
    return (
      <div className="template-container">
        <div className="template-header">
          <div className="header-content">
            <h1>Onboarding Registration Templates</h1>
            <p>Configure compliance checks, required physical files, and document parameters for unverified vendor groups.</p>
          </div>
        </div>

        {currentStep === 1 ? (
          <div className="form-card">
            <div className="form-header">
              <span className="step-indicator">Step 1 of 2</span>
              <h2>Enter Template Information</h2>
            </div>

            <div className="form-group">
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

            <div className="form-group">
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

            <div className="form-actions">
              <button className="btn-cancel" onClick={handleCancelCreate}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleStep1Next}>
                Next
              </button>
            </div>
          </div>
        ) : (
          <div className="form-card">
            <div className="form-header">
              <span className="step-indicator">Step 2 of 2</span>
              <h2>Configure Form Fields</h2>
            </div>

            <div className="add-field-section">
              <button
                className="btn-add-field"
                onClick={handleAddField}
              >
                <Plus size={18} /> Add Form Field
              </button>
            </div>

            {showFieldForm && (
              <div className="inline-field-form">
                <div className="inline-form-container">
                  <div className="form-group">
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

                  <div className="form-group">
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
                    <div className="form-group">
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

                  <div className="form-group checkbox">
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

                  <div className="inline-form-actions">
                    <button
                      className="btn-cancel"
                      onClick={() => setShowFieldForm(false)}
                    >
                      Cancel
                    </button>
                    <button className="btn-primary" onClick={handleSaveField}>
                      Save Field
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="fields-list">
              <h3>Configured Form Schema ({formData.fields.length})</h3>
              {formData.fields.length === 0 ? (
                <p className="empty-state">No fields added yet. Click "Add Form Field" to get started.</p>
              ) : (
                formData.fields.map((field) => (
                  <div key={field.id} className="field-item">
                    <div className="field-info">
                      <div className="field-name">{field.label}</div>
                      <div className="field-type">Type: {field.type}</div>
                      {field.mandatory && (
                        <div className="field-mandatory">Mandatory</div>
                      )}
                    </div>
                    <div className="field-actions">
                      <button
                        className="btn-edit"
                        onClick={() => handleEditField(field.id)}
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      <button
                        className="btn-delete"
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
              <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '16px' }}>
                {publishError}
              </div>
            )}

            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setCurrentStep(1)} disabled={publishing}>
                Cancel
              </button>
              <button className="btn-publish" onClick={handlePublishTemplate} disabled={publishing}>
                {publishing ? 'Publishing...' : 'Publish Template'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="template-container">
      <div className="template-header">
        <div className="header-content">
          <h1>Onboarding Registration Templates</h1>
          <p>Configure compliance checks, required physical files, and document parameters for unverified vendor groups.</p>
        </div>
        <button className="btn-create" onClick={handleCreateTemplate}>
          + Create Template
        </button>
      </div>

      {viewError && (
        <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
          {viewError}
        </div>
      )}

      {/* Templates Table */}
      {apiTemplates.length > 0 && (
        <div className="templates-table-wrapper">
          <table className="templates-table">
            <thead>
              <tr>
                <th className="col-name">TEMPLATE NAME</th>
                <th className="col-modified">LAST MODIFIED</th>
                <th className="col-action">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {apiTemplates.map((template) => (
                <tr key={template.templateId} className="template-row">
                  <td className="col-name">
                    <div className="template-name-wrapper">
                      <div className="template-name">{template.templateName}</div>
                      <div className="template-description">
                        {template.questions.length} questions • {template.templateType}
                      </div>
                    </div>
                  </td>
                  <td className="col-modified">
                    {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="col-action">
                    <div className="action-buttons">
                      <button
                        className="btn-action btn-view"
                        title="View"
                        onClick={() => handleViewTemplate(template.templateId)}
                        disabled={loadingViewId === template.templateId}
                      >
                        <Eye size={18} />
                        {loadingViewId === template.templateId ? 'Loading...' : 'View'}
                      </button>
                      <button className="btn-action btn-edit" title="Edit" disabled>
                        <Edit2 size={18} />
                        Edit
                      </button>
                      <button className="btn-action btn-delete" title="Delete" disabled>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {apiTemplates.length === 0 && (
        <div className="empty-state-container">
          <p>No templates available. Create a new template to get started.</p>
        </div>
      )}

      {/* View Template Modal */}
      {viewingTemplate && (
        <div
          className="bad-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setViewingTemplate(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '10px',
              padding: '24px',
              maxWidth: '560px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>{viewingTemplate.templateName}</h2>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  {viewingTemplate.templateType} • Code: {viewingTemplate.templateCode}
                </div>
              </div>
              <button
                className="btn-cancel"
                onClick={() => setViewingTemplate(null)}
                style={{ padding: '6px 12px' }}
              >
                Close
              </button>
            </div>

            {viewingTemplate.questions.length === 0 ? (
              <p className="empty-state">No questions configured for this template.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {viewingTemplate.questions
                  .slice()
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((q) => (
                    <div key={q.questionId} className="field-item" style={{ marginBottom: 0 }}>
                      <div className="field-info">
                        <div className="field-name">{q.question}</div>
                        <div className="field-type">Type: {q.questionType}</div>
                        {q.options && q.options.length > 0 && (
                          <div className="field-type">Options: {q.options.join(', ')}</div>
                        )}
                        {q.isRequired && (
                          <div className="field-mandatory">Mandatory</div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}