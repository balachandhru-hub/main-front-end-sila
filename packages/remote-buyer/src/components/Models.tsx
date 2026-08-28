import React, { useEffect, useState } from 'react';
import { FaCube } from 'react-icons/fa';
import { getMyOrganizationModels } from '../api/modelApi';
import type { ModelDto } from '../api/modelApi';
import { isErrorResponse } from '@vosox/shared-ui';
import './Models.css';

const Models: React.FC = () => {
  const [models, setModels] = useState<ModelDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getMyOrganizationModels();
        if (cancelled) return;

        if (isErrorResponse(result)) {
          setError(result.message || 'Failed to load models');
          return;
        }
        setModels(result);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load models');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpen = (model: ModelDto) => {
    window.alert(`"${model.modelName}" is not available to launch yet. Please check back soon.`);
  };

  return (
    <>
      <h1 className="pud-title">Models</h1>
      <p className="pud-subtitle">Models your organization currently has access to.</p>

      {isLoading ? (
        <div className="models-loading-wrapper">
          <div className="models-loading-inner">
            <div className="pud-spinner" />
            <span>Loading models...</span>
          </div>
        </div>
      ) : error ? (
        <div className="models-message models-message-error">{error}</div>
      ) : models.length === 0 ? (
        <div className="models-message models-message-empty">
          No models have been assigned to your organization yet. Contact your administrator for access.
        </div>
      ) : (
        <div className="models-grid">
          {models.map((model) => (
            <div className="models-card" key={model.id}>
              <div className="models-card-icon">
                <FaCube />
              </div>
              <div className="models-card-body">
                <div className="models-card-title">{model.modelName}</div>
              </div>
              <div className="models-card-footer">
                <button type="button" className="models-open-btn" onClick={() => handleOpen(model)}>
                  Open →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default Models;