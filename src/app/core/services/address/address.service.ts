import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AddAddressRequest,
  Address,
  AddressesListResponse,
  SingleAddressResponse,
} from '../../models/address.interface';

@Injectable({
  providedIn: 'root',
})
export class AddressesService {
  private readonly http = inject(HttpClient);
  private readonly addressesUrl = `${environment.apiUrl}/api/v1/addresses`;

  readonly addresses = signal<Address[]>([]);
  readonly selectedAddress = signal<Address | null>(null);
  readonly isLoading = signal<boolean>(false);

  getLoggedUserAddresses(): Observable<AddressesListResponse> {
    this.isLoading.set(true);

    return this.http.get<AddressesListResponse>(this.addressesUrl).pipe(
      tap({
        next: (res) => {
          const list = Array.isArray(res?.data) ? res.data : [];
          this.addresses.set(list);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      }),
    );
  }

  getSpecificAddress(addressId: string): Observable<SingleAddressResponse> {
    this.isLoading.set(true);

    return this.http.get<SingleAddressResponse>(`${this.addressesUrl}/${addressId}`).pipe(
      tap({
        next: (res) => {
          this.selectedAddress.set(res?.data ?? null);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      }),
    );
  }

  addAddress(payload: AddAddressRequest): Observable<AddressesListResponse> {
    this.isLoading.set(true);

    return this.http.post<AddressesListResponse>(this.addressesUrl, payload).pipe(
      tap({
        next: (res) => {
          if (Array.isArray(res?.data)) {
            this.addresses.set(res.data);
          }
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      }),
    );
  }

  removeAddress(addressId: string): Observable<AddressesListResponse> {
    this.isLoading.set(true);

    return this.http.delete<AddressesListResponse>(`${this.addressesUrl}/${addressId}`).pipe(
      tap({
        next: (res) => {
          if (Array.isArray(res?.data)) {
            this.addresses.set(res.data);
          } else {
            this.addresses.update((list) => list.filter((item) => item._id !== addressId));
          }
          if (this.selectedAddress()?._id === addressId) {
            this.selectedAddress.set(null);
          }
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      }),
    );
  }
}
