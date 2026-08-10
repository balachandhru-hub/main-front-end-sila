import platformInstance from './platformInstance';
import type {
  OrganizationUserDto,
  CreatePersonRequestDto,
  CountriesResponseDto,
} from '../dto/networkAdminDto';
import type { User } from '../types';
import type {
  NetworkAdminProfileResponse,
  NetworkAdminOnboardingResponse,
  NetworkAdminBuyerRegistrationPayload,
  NetworkAdminUpdateRejectedBuyerPayload,
  NetworkAdminSupplierRegistrationPayload,
  NetworkAdminUpdateRejectedSupplierPayload,
} from '../dto/networkAdminDto';

export type NetworkAdminRole = 'BUYER_NETWORK_ADMIN' | 'SUPPLIER_NETWORK_ADMIN';

export interface PersonDetailDto {
  personId: string;
  userId: string;
  organizationId: string;
  name: string;
  email: string;
  phone: string;
  userName: string;
  addressLine: string;
  country: string;
  roleId: string;
  roleName: string;
  organizationName: string;
  organizationEmail: string;
}

export const getOrganizationUsers = async (organizationId: string): Promise<User[]> => {
  try {
    const response = await platformInstance.get<OrganizationUserDto[]>(
      '/api/v1/identity/organization-users',
      {
        params: { organizationId },
      }
    );

    const users = response.data || [];

    return users.map((dto) => ({
      id: dto.userId,
      personId: dto.personId,
      email: dto.email,
      name: dto.name,
      userName: dto.userName,
      userRole: dto.roleName as any,
      roleId: dto.roleId,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'active' as const,
      organizationId,
    }));
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.description ||
      error.message ||
      'Failed to fetch users';
    throw new Error(errorMsg);
  }
};


export const getCountries = async (
  index: number = 0,
  limit: number = 50,
  searchTerm: string = ''
): Promise<CountriesResponseDto> => {
  try {
    const response = await platformInstance.get<CountriesResponseDto>(
      '/api/v1/masterdata/countries',
      {
        params: {
          index,
          limit,
          searchTerm,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.description ||
      error.message ||
      'Failed to fetch countries';
    throw new Error(errorMsg);
  }
};


export const createPerson = async (data: CreatePersonRequestDto): Promise<string> => {
  try {
    const response = await platformInstance.post<string>('/api/v1/identity/person', data);
    return response.data;
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.description ||
      error.message ||
      'Failed to create person';
    throw new Error(errorMsg);
  }
};


export const deleteUser = async (personId: string): Promise<void> => {
  try {
    await platformInstance.delete('/api/v1/identity/delete-person', {
      params: {
        personId,
      },
    });
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.description ||
      error.message ||
      'Failed to delete user';
    throw new Error(errorMsg);
  }
};


export const logoutNetworkAdmin = async (): Promise<void> => {
  try {
    await platformInstance.put('/api/v1/identity/auth/logout');
  } catch (error: any) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;
    const errMsg = responseData?.message || responseData?.description || 'Failed to logout.';
    throw new Error(`${errMsg} (${status})`);
  }
};


export const getNetworkAdminProfile = async (
  role: NetworkAdminRole
): Promise<NetworkAdminProfileResponse | null> => {
  const endpoint = role === 'BUYER_NETWORK_ADMIN' ? '/api/v1/buyer/profile' : '/api/v1/supplier/profile';

  try {
    const response = await platformInstance.get<NetworkAdminProfileResponse>(endpoint);

    if (response.status === 204 || !response.data || Object.keys(response.data).length === 0) {
      return null;
    }

    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 204 || error?.response?.status === 404) {
      return null;
    }
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.description ||
      error.message ||
      'Failed to fetch profile';
    throw new Error(errorMsg);
  }
};

export const getNetworkAdminOnboardingDetails = async (): Promise<NetworkAdminOnboardingResponse> => {
  try {
    const response = await platformInstance.get<NetworkAdminOnboardingResponse>('/api/v1/identity/onboarding');
    return response.data;
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.description ||
      error.message ||
      'Failed to fetch onboarding details';
    throw new Error(errorMsg);
  }
};

export const createNetworkAdminBuyerProfile = async (
  payload: NetworkAdminBuyerRegistrationPayload
): Promise<any> => {
  try {
    const response = await platformInstance.post('/api/v1/buyer/register', payload);
    return response.data;
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.description ||
      error.message ||
      'Failed to create buyer profile';
    throw new Error(errorMsg);
  }
};

export const createNetworkAdminSupplierProfile = async (
  payload: NetworkAdminSupplierRegistrationPayload
): Promise<any> => {
  try {
    const response = await platformInstance.post('/api/v1/supplier/register', payload);
    return response.data;
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.description ||
      error.message ||
      'Failed to create supplier profile';
    throw new Error(errorMsg);
  }
};

export const updateRejectedNetworkAdminBuyer = async (
  payload: NetworkAdminUpdateRejectedBuyerPayload
): Promise<any> => {
  try {
    const response = await platformInstance.put('/api/v1/buyer/update-rejected-buyer', payload);
    return response.data;
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.description ||
      error.message ||
      'Failed to update rejected buyer profile';
    throw new Error(errorMsg);
  }
};

export const updateRejectedNetworkAdminSupplier = async (
  payload: NetworkAdminUpdateRejectedSupplierPayload
): Promise<any> => {
  try {
    const response = await platformInstance.put('/api/v1/supplier/update-rejected-supplier', payload);
    return response.data;
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.description ||
      error.message ||
      'Failed to update rejected supplier profile';
    throw new Error(errorMsg);
  }
};



export const getPersonDetail = async (personId: string): Promise<PersonDetailDto> => {
  try {
    const response = await platformInstance.get<PersonDetailDto>(
      '/api/v1/identity/person-detail',
      { params: { personId } }
    );
    return response.data;
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.description ||
      error.message ||
      'Failed to fetch person details';
    throw new Error(errorMsg);
  }
};

export const updatePersonDetail = async (
  personId: string,
  data: Partial<PersonDetailDto>
): Promise<PersonDetailDto> => {
  try {
    const response = await platformInstance.put<PersonDetailDto>(
      '/api/v1/identity/person-detail',
      { personId, ...data }
    );
    return response.data;
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.description ||
      error.message ||
      'Failed to update person details';
    throw new Error(errorMsg);
  }
};