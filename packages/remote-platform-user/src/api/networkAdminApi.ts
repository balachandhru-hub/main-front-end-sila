import platformInstance from './platformInstance';
import type {
  OrganizationUserDto,
  CreatePersonRequestDto,
  CountriesResponseDto,
} from '../dto/networkAdminDto';
import type { User } from '../types';


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


export const deleteUser = async (userId: string): Promise<void> => {
  try {
    await platformInstance.delete(`/api/v1/users/${userId}`);
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