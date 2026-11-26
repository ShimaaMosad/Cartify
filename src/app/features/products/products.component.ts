import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductsService } from '../../core/services/products/products.service';
import { WishlistService } from '../../core/services/wishlist/wishlist.service';
import { Product } from '../../core/models/products-data.interface';
import { ToastService } from '../../core/services/toast/toast.service';

@Component({
  selector: 'app-products',
  imports: [RouterLink],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css',
})
export class ProductsComponent implements OnInit {
  private readonly productsService = inject(ProductsService);
  readonly wishlistService = inject(WishlistService);
  private readonly toastr = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly products = signal<Product[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly activeSubCategoryId = signal<string | null>(null);
  readonly activeCategoryId = signal<string | null>(null);
  readonly activeBrandId = signal<string | null>(null);
  readonly wishlistBusyId = signal<string | null>(null);

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const subId = params.get('subcategory');
      const catId = params.get('category');
      const brandId = params.get('brand');

      this.activeSubCategoryId.set(subId);
      this.activeCategoryId.set(catId);
      this.activeBrandId.set(brandId);

      this.loadProducts(subId, catId, brandId);
    });
  }

  loadProducts(
    subcategoryId: string | null,
    categoryId: string | null,
    brandId: string | null,
  ): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.productsService
      .getAllProducts({
        subcategory: subcategoryId ?? undefined,
        category: categoryId ?? undefined,
        brand: brandId ?? undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.products.set(response.data ?? []);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('Could not load products. Please try again.');
          this.isLoading.set(false);
        },
      });
  }

  isWishlisted(productId: string): boolean {
    return this.wishlistService.isInWishlist(productId);
  }

  onToggleWishlist(product: Product): void {
    const id = product._id;
    this.wishlistBusyId.set(id);

    if (this.isWishlisted(id)) {
      this.wishlistService
        .removeProductFromWishlist(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.wishlistBusyId.set(null);
            this.toastr.success(
              res.message || `"${product.title}" removed from wishlist.`,
              'Removed',
            );
          },
          error: () => {
            this.wishlistBusyId.set(null);
          },
        });
    } else {
      this.wishlistService
        .addProductToWishlist(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.wishlistBusyId.set(null);
            this.toastr.success(
              res.message || `"${product.title}" added to wishlist.`,
              'Added to Wishlist',
            );
          },
          error: () => {
            this.wishlistBusyId.set(null);
          },
        });
    }
  }

  clearFilters(): void {
    this.router.navigate(['/shop']);
  }
}
