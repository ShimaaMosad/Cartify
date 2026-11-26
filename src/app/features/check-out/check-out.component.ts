import { Component, computed, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Address } from '../../core/models/address.interface';
import { CartService } from '../../core/services/cart/cart.service';
import { AddressesService } from '../../core/services/address/address.service';
import { ToastService } from '../../core/services/toast/toast.service';

const DEFAULT_ADDRESS_STORAGE_KEY = 'cartify_default_address_id';
const FREE_SHIPPING_THRESHOLD = 500;
const DEFAULT_SHIPPING_FEE = 50;

export interface ShippingAddressPayload {
  details: string;
  phone: string;
  city: string;
}

interface CheckoutSessionResponse {
  status?: string;
  session?: {
    url?: string;
  };
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe],
  templateUrl: './check-out.component.html',
})
export class CheckoutComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly addressesService = inject(AddressesService);
  readonly cartService = inject(CartService);
  private readonly toastr = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly apiBase = `${environment.apiUrl}/api/v1`;

  readonly addresses = this.addressesService.addresses;
  readonly isLoadingAddresses = this.addressesService.isLoading;

  readonly selectedAddressId = signal<string | null>(this.readStoredDefaultAddressId());
  readonly paymentMethod = signal<'cash' | 'card'>('cash');
  readonly isSubmitting = signal<boolean>(false);

  private lastAutoFilledAddressId: string | null = null;

  readonly activeAddress = computed<Address | null>(() => {
    const list = this.addresses();
    if (!list.length) return null;
    const targetId = this.selectedAddressId();
    return list.find((a) => a._id === targetId) ?? list[0];
  });

  readonly cartSummary = computed(() => {
    const discountTotal = this.cartService.totalAfterDiscount();
    const baseTotal = this.cartService.totalCartPrice();
    const effectiveTotal =
      typeof discountTotal === 'number' && discountTotal > 0 ? discountTotal : baseTotal;

    const isFreeShipping = effectiveTotal >= FREE_SHIPPING_THRESHOLD;
    const shippingFee = effectiveTotal > 0 && !isFreeShipping ? DEFAULT_SHIPPING_FEE : 0;
    const finalTotal = effectiveTotal + shippingFee;

    return {
      cartId: this.cartService.cartId() ?? '',
      totalCartPrice: baseTotal,
      totalAfterDiscount: discountTotal,
      effectiveTotal,
      isFreeShipping,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      shippingFee,
      finalTotal,
      itemsCount: this.cartService.numOfCartItems(),
      products: this.cartService.cartItems(),
    };
  });

  readonly shippingForm = this.fb.nonNullable.group({
    city: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    phone: ['', [Validators.required, Validators.pattern(/^01[0125][0-9]{8}$/)]],
    details: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(250)]],
  });

  constructor() {
    effect(() => {
      const addr = this.activeAddress();
      if (!addr) return;

      const isDifferentAddress = addr._id !== this.lastAutoFilledAddressId;
      if (isDifferentAddress || !this.shippingForm.dirty) {
        this.applyAddressToForm(addr);
      }
    });
  }

  ngOnInit(): void {
    const queryAddrId = this.route.snapshot.queryParamMap.get('addressId')?.trim() || null;
    if (queryAddrId) {
      this.selectedAddressId.set(queryAddrId);
      this.persistDefaultAddressId(queryAddrId);
    }

    const immediateAddr = this.activeAddress();
    if (immediateAddr) {
      this.applyAddressToForm(immediateAddr);
    }

    if (this.cartService.numOfCartItems() === 0 && !this.cartService.cartData()) {
      this.cartService
        .getLoggedUserCart()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ error: () => {} });
    }

    this.addressesService
      .getLoggedUserAddresses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res?.data) ? res.data : [];
          if (!list.length) return;

          const desiredId = this.selectedAddressId();
          const chosen = list.find((a) => a._id === desiredId) ?? list[0];
          if (chosen && (chosen._id !== this.lastAutoFilledAddressId || !this.shippingForm.dirty)) {
            this.applyAddressToForm(chosen);
          }
        },
      });
  }

  onSelectSavedAddress(address: Address): void {
    this.selectedAddressId.set(address._id);
    this.persistDefaultAddressId(address._id);
    this.applyAddressToForm(address);
    this.shippingForm.markAsPristine();
    this.toastr.info(`Shipping details loaded from "${address.name}".`, 'Address Selected');
  }

  onReapplyActiveAddress(): void {
    const addr = this.activeAddress();
    if (!addr) return;
    this.applyAddressToForm(addr);
    this.shippingForm.markAsPristine();
    this.toastr.info(`Restored "${addr.name}" shipping details.`, 'Address Applied');
  }

  onSelectPaymentMethod(method: 'cash' | 'card'): void {
    this.paymentMethod.set(method);
  }

  onPlaceOrder(): void {
    if (this.shippingForm.invalid) {
      this.shippingForm.markAllAsTouched();
      this.toastr.error('Please complete all required shipping fields.', 'Invalid Shipping Info');
      return;
    }

    const cartId = this.resolveCartId();
    if (!cartId) {
      this.toastr.error('Your cart is empty or missing a cart ID.', 'Checkout Unavailable');
      return;
    }

    const raw = this.shippingForm.getRawValue();
    const shippingAddress: ShippingAddressPayload = {
      details: raw.details.trim(),
      phone: raw.phone.trim(),
      city: raw.city.trim(),
    };

    this.isSubmitting.set(true);

    if (this.paymentMethod() === 'cash') {
      this.http
        .post(`${this.apiBase}/orders/${cartId}`, { shippingAddress })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.cartService
              .getLoggedUserCart()
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe();
            this.toastr.success('Cash order placed successfully!', 'Order Confirmed');
            this.router.navigate(['/orders']);
          },
          error: () => {
            this.isSubmitting.set(false);
          },
        });
      return;
    }

    const returnUrl =
      typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';

    this.http
      .post<CheckoutSessionResponse>(
        `${this.apiBase}/orders/checkout-session/${cartId}`,
        { shippingAddress },
        { params: returnUrl ? { url: returnUrl } : undefined },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          const sessionUrl = res?.session?.url;
          if (sessionUrl && typeof window !== 'undefined') {
            window.location.href = sessionUrl;
          } else {
            this.toastr.success('Card checkout session created.', 'Redirecting');
          }
        },
        error: () => {
          this.isSubmitting.set(false);
        },
      });
  }

  private applyAddressToForm(address: Address): void {
    this.lastAutoFilledAddressId = address._id;
    this.selectedAddressId.set(address._id);
    this.persistDefaultAddressId(address._id);
    this.shippingForm.patchValue({
      city: address.city ?? '',
      phone: address.phone ?? '',
      details: address.details ?? '',
    });
  }

  private resolveCartId(): string {
    if (this.cartSummary().cartId) return this.cartSummary().cartId;
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('cartify_cart_id')?.trim() || '';
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
