import platformInstance from './platformInstance';

// ─── DTOs ───
export interface DeleteResponseDto {
  statusCode: number;
  message: string;
  description: string;
  id: string;
}

// ─── Delete Department ───
export const deleteDepartment = async (departmentId: string): Promise<DeleteResponseDto> => {
  try {
    const response = await platformInstance.delete(`/api/v1/buyer/department/${departmentId}`);
    return response.data;
  } catch (error: any) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;

    let errMsg = 'Failed to delete department.';
    if (typeof responseData === 'string') {
      errMsg = responseData;
    } else if (responseData?.message) {
      errMsg = responseData.message;
    } else if (responseData?.description) {
      errMsg = responseData.description;
    } else if (error.message) {
      errMsg = error.message;
    }

    throw new Error(`${errMsg} (${status})`);
  }
};

// ─── Delete Cost Center ───
export const deleteCostCenter = async (costCenterId: string): Promise<DeleteResponseDto> => {
  try {
    const response = await platformInstance.delete(`/api/v1/buyer/costcenter/${costCenterId}`);
    return response.data;
  } catch (error: any) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;

    let errMsg = 'Failed to delete cost center.';
    if (typeof responseData === 'string') {
      errMsg = responseData;
    } else if (responseData?.message) {
      errMsg = responseData.message;
    } else if (responseData?.description) {
      errMsg = responseData.description;
    } else if (error.message) {
      errMsg = error.message;
    }

    throw new Error(`${errMsg} (${status})`);
  }
};

// ─── Update Department ───
export const updateDepartment = async (
  departmentId: string,
  departmentName: string
): Promise<DeleteResponseDto> => {
  try {
    const response = await platformInstance.put(`/api/v1/buyer/department/${departmentId}`, {
      department: departmentName,
    });
    return response.data;
  } catch (error: any) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;

    let errMsg = 'Failed to update department.';
    if (typeof responseData === 'string') {
      errMsg = responseData;
    } else if (responseData?.message) {
      errMsg = responseData.message;
    } else if (responseData?.description) {
      errMsg = responseData.description;
    } else if (error.message) {
      errMsg = error.message;
    }

    throw new Error(`${errMsg} (${status})`);
  }
};

// ─── Update Cost Center ───
export const updateCostCenter = async (
  costCenterId: string,
  costCenterName: string
): Promise<DeleteResponseDto> => {
  try {
    const response = await platformInstance.put(`/api/v1/buyer/costcenter/${costCenterId}`, {
      costCenter: costCenterName,
    });
    return response.data;
  } catch (error: any) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;

    let errMsg = 'Failed to update cost center.';
    if (typeof responseData === 'string') {
      errMsg = responseData;
    } else if (responseData?.message) {
      errMsg = responseData.message;
    } else if (responseData?.description) {
      errMsg = responseData.description;
    } else if (error.message) {
      errMsg = error.message;
    }

    throw new Error(`${errMsg} (${status})`);
  }
};