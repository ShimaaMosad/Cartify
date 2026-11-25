import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { WishlistProduct } from '../../core/models/wishlist.interface';
import { CartService } from '../../core/services/cart/cart.service';
import { WishlistService } from '../../core/services/wishlist/wishlist.service';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './wishlist.component.html',
})
export class WishlistComponent implements OnInit {
  private readonly wishlistService = inject(WishlistService);
  private readonly cartService = inject(CartService);
  private readonly toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = this.wishlistService.wishlistItems;
  readonly isLoading = this.wishlistService.isLoading;
  readonly removingId = signal<string | null>(null);
  readonly addingToCartId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(): void {
    this.wishlistService
      .getLoggedUserWishlist()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  onAddToCart(product: WishlistProduct): void {
    const id = product._id || product.id;
    if (!id) return;

    this.addingToCartId.set(id);
    this.cartService
      .addProductToCart(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.addingToCartId.set(null);
          this.toastr.success(res?.message || `"${product.title}" added to cart.`, 'Added to Cart');
        },
        error: () => {
          this.addingToCartId.set(null);
        },
      });
  }

  onRemove(product: WishlistProduct): void {
    const id = product._id || product.id;
    this.removingId.set(id);

    this.wishlistService
      .removeProductFromWishlist(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.removingId.set(null);
          this.toastr.success(
            res.message || `"${product.title}" removed from wishlist.`,
            'Removed',
          );
        },
        error: () => {
          this.removingId.set(null);
        },
      });
  }

  getDiscountPercentage(item: WishlistProduct): number | null {
    if (!item.priceAfterDiscount || item.priceAfterDiscount >= item.price) {
      return null;
    }
    return Math.round(((item.price - item.priceAfterDiscount) / item.price) * 100);
  }
}
