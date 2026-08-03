export interface OrganizationUserDto {
  personId: string;
  userId: string;
  name: string;
  email: string;
  userName: string;
  roleId: string;
  roleName: string;
}

export interface CreatePersonRequestDto {
  name: string;
  email: string;
  phone: string;
  country: string;
  addressLine: string;
  userName: string;
  password: string;
  roleId: string;
}

export interface CountryDto {
  id: string;
  countryName: string;
  countryCode: string;
  mobileCountryCode: string;
}


export interface CountriesResponseDto {
  items: CountryDto[];
  totalCount: number;
  index: number;
  limit: number;
}


export interface ErrorResponseDto {
  statusCode: number;
  message: string;
  description: string;
}