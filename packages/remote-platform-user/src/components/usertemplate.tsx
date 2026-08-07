import { useState } from 'react';
import { FaEye as Eye, FaEdit as Edit2, FaTrash as Trash2, FaPlus as Plus } from 'react-icons/fa';
import './usertemplate.css';

interface Template {
  id: number;
  name: string;
  category: string;
  lastModified: string;
  description: string;
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
  category: string;
  description: string;
  fields: FormField[];
}

export default function TemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: 1,
      name: 'Standard Supplier Registration',
      category: 'General',
      lastModified: '20 Jul 2026',
      description: 'Standard compliance checklist for onboarding suppliers.',
    },
    {
      id: 2,
      name: 'IT Vendor Registration',
      category: 'IT',
      lastModified: '19 Jul 2026',
      description: 'Compliance check for software vendors and IT service providers.',
    },
    {
      id: 3,
      name: 'Manufacturing Supplier Registration',
      category: 'Manufacturing',
      lastModified: '17 Jul 2026',
      description: 'Compliance check including physical safety licenses and raw material certifications.',
    },
    {
      id: 4,
      name: 'Logistics Provider',
      category: 'Logistics',
      lastModified: '15 Jul 2026',
      description: 'Verification of transport assets, customs certifications, and state freight permits.',
    },
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    category: 'General',
    description: '',
    fields: [],
  });

  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [fieldForm, setFieldForm] = useState({
    label: '',
    type: 'Text' as 'Text' | 'Dropdown' | 'Radio button' | 'Checkbox' | 'Date' | 'Email',
    placeholder: '',
    options: '',
    mandatory: false,
  });

  const categoryOptions = [
    'General',
    'IT',
    'Manufacturing',
    'Logistics',
    'HR',
    'Finance',
  ];

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
    setFormData({ name: '', category: 'General', description: '', fields: [] });
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setCurrentStep(1);
    setFormData({ name: '', category: 'General', description: '', fields: [] });
  };

  const handleStep1Next = () => {
    if (formData.name.trim()) {
      setCurrentStep(2);
    }
  };

  const handleAddField = () => {
    setEditingFieldId(null);
    setFieldForm({
      label: '',
      type: 'Text',
      placeholder: '',
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
        placeholder: field.placeholder || '',
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
      alert('Please enter a question label');
      return;
    }

    const newField: FormField = {
      id: editingFieldId || Date.now(),
      label: fieldForm.label,
      type: fieldForm.type,
      placeholder: fieldForm.placeholder,
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
    } else {
      setFormData({
        ...formData,
        fields: [...formData.fields, newField],
      });
    }

    setShowFieldForm(false);
  };

  const handlePublishTemplate = () => {
    if (formData.name.trim() && formData.fields.length > 0) {
      const newTemplate: Template = {
        id: Date.now(),
        name: formData.name,
        category: formData.category,
        description: formData.description,
        lastModified: new Date().toLocaleDateString('en-GB'),
      };

      setTemplates([newTemplate, ...templates]);
      handleCancelCreate();
      alert('Template published successfully!');
    } else {
      alert('Please complete the template with at least one field');
    }
  };

  const handleDeleteTemplate = (id: number) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setTemplates(templates.filter((t) => t.id !== id));
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

            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
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

                  <div className="form-group">
                    <label>Placeholder Text</label>
                    <input
                      type="text"
                      placeholder="eg. Enter business type"
                      value={fieldForm.placeholder}
                      onChange={(e) =>
                        setFieldForm({
                          ...fieldForm,
                          placeholder: e.target.value,
                        })
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

            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setCurrentStep(1)}>
                Cancel
              </button>
              <button className="btn-publish" onClick={handlePublishTemplate}>
                Publish Template
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

      <div className="templates-table">
        <table>
          <thead>
            <tr>
              <th>Template Name</th>
              <th>Category</th>
              <th>Last Modified</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <tr key={template.id}>
                <td>
                  <div className="template-name-cell">
                    <strong>{template.name}</strong>
                    <p>{template.description}</p>
                  </div>
                </td>
                <td>
                  <span className={`badge badge-${template.category.toLowerCase()}`}>
                    {template.category}
                  </span>
                </td>
                <td>{template.lastModified}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-action btn-view" title="View">
                      <Eye size={16} /> View
                    </button>
                    <button className="btn-action btn-edit" title="Edit">
                      <Edit2 size={16} /> Edit
                    </button>
                    <button
                      className="btn-action btn-delete"
                      title="Delete"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}