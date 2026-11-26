import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Address } from '../../core/models/address.interface';
import { AddressesService } from '../../core/services/address/address.service';
import { ToastService } from '../../core/services/toast/toast.service';

const DEFAULT_ADDRESS_STORAGE_KEY = 'cartify_default_address_id';

@Component({
  selector: 'app-addresses',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './address.component.html',
})
export class AddressesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly addressesService = inject(AddressesService);
  private readonly toastr = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly addresses = this.addressesService.addresses;
  readonly isLoading = this.addressesService.isLoading;

  readonly isSubmitting = signal<boolean>(false);
  readonly deletingId = signal<string | null>(null);
  readonly selectedAddressId = signal<string | null>(this.readStoredDefaultAddressId());

  readonly defaultAddress = computed<Address | null>(() => {
    const list = this.addresses();
    if (!list.length) return null;
    const selectedId = this.selectedAddressId();
    if (selectedId) {
      const matched = list.find((item) => item._id === selectedId);
      if (matched) return matched;
    }
    return list[0];
  });

  readonly addressForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    city: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    phone: ['', [Validators.required, Validators.pattern(/^01[0125][0-9]{8}$/)]],
    details: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(250)]],
  });

  ngOnInit(): void {
    this.loadAddresses();
  }

  loadAddresses(): void {
    this.addressesService
      .getLoggedUserAddresses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res?.data) ? res.data : [];
          this.syncDefaultSelection(list);
        },
      });
  }

  isDefaultAddress(address: Address): boolean {
    return this.defaultAddress()?._id === address._id;
  }

  onSelectDefaultAddress(address: Address): void {
    if (!address?._id) return;
    this.selectedAddressId.set(address._id);
    this.persistDefaultAddressId(address._id);
    this.toastr.success(
      `"${address.name}" set as your default shipping address.`,
      'Default Address Updated',
    );
  }

  onAddAddress(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const raw = this.addressForm.getRawValue();

    this.addressesService
      .addAddress({
        name: raw.name.trim(),
        city: raw.city.trim(),
        phone: raw.phone.trim(),
        details: raw.details.trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.addressForm.reset({ name: '', city: '', phone: '', details: '' });

          const updatedList = Array.isArray(res?.data) ? res.data : this.addresses();
          const newAddress = updatedList.find(
            (item) =>
              item.name === raw.name.trim() &&
              item.details === raw.details.trim() &&
              item.phone === raw.phone.trim(),
          );
          if (newAddress?._id) {
            this.selectedAddressId.set(newAddress._id);
            this.persistDefaultAddressId(newAddress._id);
          } else {
            this.syncDefaultSelection(updatedList);
          }

          this.toastr.success(res?.message || 'Address added successfully.', 'Address Saved');
        },
        error: () => {
          this.isSubmitting.set(false);
        },
      });
  }

  onDeleteAddress(address: Address): void {
    const id = address._id;
    if (!id) return;

    this.deletingId.set(id);
    this.addressesService
      .removeAddress(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.deletingId.set(null);
          const remaining = Array.isArray(res?.data) ? res.data : this.addresses();
          if (this.selectedAddressId() === id) {
            const nextDefaultId = remaining[0]?._id ?? null;
            this.selectedAddressId.set(nextDefaultId);
            this.persistDefaultAddressId(nextDefaultId);
          }
          this.toastr.success(
            res?.message || `"${address.name}" removed from addresses.`,
            'Address Removed',
          );
        },
        error: () => {
          this.deletingId.set(null);
        },
      });
  }

  private syncDefaultSelection(list: Address[]): void {
    if (!list.length) {
      this.selectedAddressId.set(null);
      this.persistDefaultAddressId(null);
      return;
    }

    const currentId = this.selectedAddressId();
    const stillExists = currentId && list.some((item) => item._id === currentId);
    const resolvedId = stillExists ? currentId : list[0]._id;
    this.selectedAddressId.set(resolvedId);
    this.persistDefaultAddressId(resolvedId);
  }

  private readStoredDefaultAddressId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const value = localStorage.getItem(DEFAULT_ADDRESS_STORAGE_KEY);
      return value && value.trim() ? value.trim() : null;
    } catch {
      return null;
    }
  }

  private persistDefaultAddressId(addressId: string | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (addressId) {
        localStorage.setItem(DEFAULT_ADDRESS_STORAGE_KEY, addressId);
      } else {
        localStorage.removeItem(DEFAULT_ADDRESS_STORAGE_KEY);
      }
    } catch {
      // ignore storage quota errors
    }
  }
}
