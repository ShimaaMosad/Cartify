import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CartLineItem } from '../../core/models/cart.interface';
import { CartService } from '../../core/services/cart/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './cart.component.html',
})
export class CartComponent implements OnInit {
  private readonly cartService = inject(CartService);
  private readonly toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = this.cartService.cartItems;
  readonly numOfItems = this.cartService.numOfCartItems;
  readonly totalPrice = this.cartService.totalCartPrice;
  readonly totalAfterDiscount = this.cartService.totalAfterDiscount;
  readonly isLoading = this.cartService.isLoading;

  readonly updatingId = signal<string | null>(null);
  readonly removingId = signal<string | null>(null);
  readonly isClearing = signal<boolean>(false);
  readonly isApplyingCoupon = signal<boolean>(false);
  couponCode = '';

  ngOnInit(): void {
    this.loadCart();
  }

  loadCart(): void {
    this.cartService
      .getLoggedUserCart()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => {} });
  }

  onUpdateQuantity(item: CartLineItem, nextCount: number): void {
    const productId = item.product._id || item.product.id || '';
    if (!productId) return;

    if (nextCount < 1) {
      this.onRemoveItem(item);
      return;
    }

    this.updatingId.set(productId);
    this.cartService
      .updateCartProductQuantity(productId, nextCount)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.updatingId.set(null);
          this.toastr.success(res.message || 'Quantity updated', 'Cart');
        },
        error: () => {
          this.updatingId.set(null);
        },
      });
  }

  onRemoveItem(item: CartLineItem): void {
    const productId = item.product._id || item.product.id || '';
    if (!productId) return;

    this.removingId.set(productId);
    this.cartService
      .removeProductFromCart(productId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.removingId.set(null);
          this.toastr.success(
            res.message || `"${item.product.title}" removed from cart`,
            'Removed',
          );
        },
        error: () => {
          this.removingId.set(null);
        },
      });
  }

  onClearCart(): void {
    this.isClearing.set(true);
    this.cartService
      .clearUserCart()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isClearing.set(false);
          this.couponCode = '';
          this.toastr.success(res.message || 'Cart cleared', 'Cart');
        },
        error: () => {
          this.isClearing.set(false);
        },
      });
  }

  onApplyCoupon(): void {
    const code = this.couponCode.trim();
    if (!code) return;

    this.isApplyingCoupon.set(true);
    this.cartService
      .applyCouponToCart(code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isApplyingCoupon.set(false);
          this.toastr.success(res.message || 'Coupon applied', 'Coupon');
        },
        error: () => {
          this.isApplyingCoupon.set(false);
        },
      });
  }
}
