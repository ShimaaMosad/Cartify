import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ProductsService } from '../../core/services/products/products.service';
import { WishlistService } from '../../core/services/wishlist/wishlist.service';
import { SearchStateService } from '../../core/services/search/search.service';
import { Product } from '../../core/models/products-data.interface';

@Component({
  selector: 'app-search',
  imports: [RouterLink],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css',
})
export class SearchComponent implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly wishlistService = inject(WishlistService);
  private readonly searchState = inject(SearchStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly popularTags = ['Fashion', 'Electronics', 'Beauty', 'Shoes', 'Accessories'];

  readonly allProducts = signal<Product[]>([]);
  readonly searchQuery = this.searchState.query;
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly hasSearched = signal<boolean>(false);
  readonly wishlistBusyId = signal<string | null>(null);

  readonly filteredProducts = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.allProducts();

    if (!q) {
      return list;
    }

    return list.filter((product) => {
      const title = (product.title ?? '').toLowerCase();
      const category = (product.category?.name ?? '').toLowerCase();
      const brand = (product.brand?.name ?? '').toLowerCase();
      return title.includes(q) || category.includes(q) || brand.includes(q);
    });
  });

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const q = params.get('q') ?? '';
      this.searchState.setQuery(q);
      this.hasSearched.set(true);
      if (this.allProducts().length === 0) {
        this.fetchProducts();
      }
    });
  }

  applyQuickTag(tag: string): void {
    this.searchState.setQuery(tag);
    this.hasSearched.set(true);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: tag },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    if (this.allProducts().length === 0) {
      this.fetchProducts();
    }
  }

  clearSearch(): void {
    this.searchState.clearQuery();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  retrySearch(): void {
    this.fetchProducts();
  }

  isWishlisted(productId: string | undefined): boolean {
    if (!productId) return false;
    return this.wishlistService.wishlistItems().some((item) => (item._id || item.id) === productId);
  }

  onToggleWishlist(product: Product): void {
    const productId = product._id || product.id;
    if (!productId || this.wishlistBusyId()) return;

    this.wishlistBusyId.set(productId);
    const request$ = this.isWishlisted(productId)
      ? this.wishlistService.removeProductFromWishlist(productId)
      : this.wishlistService.addProductToWishlist(productId);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.wishlistBusyId.set(null)),
      )
      .subscribe({ error: () => {} });
  }

  private fetchProducts(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.productsService
      .getAllProducts()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (res) => {
          const items = Array.isArray(res?.data) ? res.data : [];
          this.allProducts.set(items);
        },
        error: () => {
          this.errorMessage.set('Could not load products right now. Please try again.');
        },
      });
  }
}
