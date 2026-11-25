import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AddToCartRequest,
  ApplyCouponRequest,
  CartData,
  CartLineItem,
  CartResponse,
  UpdateCartQuantityRequest,
} from '../../models/cart.interface';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly cartUrl = `${environment.apiUrl}/api/v2/cart`;

  readonly cartData = signal<CartData | null>(null);
  readonly numOfCartItems = signal<number>(0);
  readonly cartId = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);

  readonly cartItems = computed<CartLineItem[]>(() => this.cartData()?.products ?? []);
  readonly totalCartPrice = computed<number>(() => this.cartData()?.totalCartPrice ?? 0);
  readonly totalAfterDiscount = computed<number | null>(
    () => this.cartData()?.totalCartPriceAfterDiscount ?? null,
  );

  readonly productIdsInCart = computed<Set<string>>(
    () => new Set(this.cartItems().map((item) => item.product?._id || item.product?.id || '')),
  );

  private syncFromResponse(res: CartResponse): void {
    this.numOfCartItems.set(res.numOfCartItems ?? 0);
    const dataObj = res.data as { _id?: string; cartId?: string } | null | undefined;
    const resolvedId = res.cartId ?? dataObj?.cartId ?? dataObj?._id ?? null;
    this.cartId.set(resolvedId);
    this.cartData.set(res.data ?? null);
  }

  resetCartState(): void {
    this.numOfCartItems.set(0);
    this.cartId.set(null);
    this.cartData.set(null);
  }

  getLoggedUserCart(): Observable<CartResponse> {
    this.isLoading.set(true);
    return this.http.get<CartResponse>(this.cartUrl).pipe(
      tap({
        next: (res) => {
          this.syncFromResponse(res);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      }),
    );
  }

  addProductToCart(productId: string): Observable<CartResponse> {
    const body: AddToCartRequest = { productId };
    return this.http
      .post<CartResponse>(this.cartUrl, body)
      .pipe(tap((res) => this.syncFromResponse(res)));
  }

  updateCartProductQuantity(productId: string, count: number): Observable<CartResponse> {
    const body: UpdateCartQuantityRequest = { count };
    return this.http
      .put<CartResponse>(`${this.cartUrl}/${productId}`, body)
      .pipe(tap((res) => this.syncFromResponse(res)));
  }

  removeProductFromCart(productId: string): Observable<CartResponse> {
    return this.http
      .delete<CartResponse>(`${this.cartUrl}/${productId}`)
      .pipe(tap((res) => this.syncFromResponse(res)));
  }

  clearUserCart(): Observable<CartResponse> {
    return this.http.delete<CartResponse>(this.cartUrl).pipe(
      tap((res) => {
        this.syncFromResponse(res);
        if (res.numOfCartItems === 0) {
          this.cartId.set(null);
        }
      }),
    );
  }

  applyCouponToCart(couponName: string): Observable<CartResponse> {
    const body: ApplyCouponRequest = { couponName };
    return this.http
      .put<CartResponse>(`${this.cartUrl}/applyCoupon`, body)
      .pipe(tap((res) => this.syncFromResponse(res)));
  }
}
