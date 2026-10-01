import { create } from 'zustand';
import { isErrorResponse } from '@vosox/shared-ui';
import { getMyOrganizationModels, type ModelDto } from '../api/modelApi';

/** Licence key of the hospitality operations module (invoice capture, goods receipts, stock). */
export const OPERATIONS_MODEL_KEY = 'SILA_HORECA_RECIPE_MANAGEMENT';

export interface OrganizationModelsState {
  /** The models (licensed modules) the platform has assigned to the signed-in organization. */
  models: ModelDto[];
  loaded: boolean;
  // Fetched once per session; the menus of several sections read the same answer.
  fetchModels: () => Promise<void>;
  reset: () => void;
}

export const useOrganizationModelsStore = create<OrganizationModelsState>((set, get) => ({
  models: [],
  loaded: false,

  fetchModels: async () => {
    if (get().loaded) return;
    const result = await getMyOrganizationModels();
    // On a failure the organization is treated as having no extra modules; the next visit tries again.
    if (isErrorResponse(result)) return;
    set({ models: result, loaded: true });
  },

  reset: () => {
    set({ models: [], loaded: false });
  },
}));

/** True when the organization is licensed for the model. */
export const hasOrganizationModel = (models: ModelDto[], key: string): boolean =>
  models.some((model) => model.key === key);

if (typeof window !== 'undefined') {
  window.addEventListener('session:expired', () => {
    useOrganizationModelsStore.getState().reset();
  });
}
