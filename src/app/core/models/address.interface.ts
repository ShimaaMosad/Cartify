export interface Address {
  _id: string;
  name: string;
  details: string;
  phone: string;
  city: string;
}

export interface AddAddressRequest {
  name: string;
  details: string;
  phone: string;
  city: string;
}

export interface AddressesListResponse {
  status: string;
  message?: string;
  results?: number;
  data: Address[];
}

export interface SingleAddressResponse {
  status: string;
  message?: string;
  data: Address;
}
