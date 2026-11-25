import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { distinctUntilChanged, map } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth/auth.service';
import { CartService } from '../../core/services/cart/cart.service';
import {
  getReviewAuthorId,
  getReviewAuthorName,
  ReviewsService,
} from '../../core/services/reviews/reviews.service';
import { Review } from '../../core/models/reviews.interface';

export interface ProductDetailItem {
  _id: string;
  id?: string;
  title: string;
  description: string;
  price: number;
  priceAfterDiscount?: number;
  imageCover: string;
  images?: string[];
  ratingsAverage?: number;
  ratingsQuantity?: number;
  quantity?: number;
  category?: { _id?: string; name?: string };
  brand?: { _id?: string; name?: string };
}

interface ProductSingleResponse {
  data?: ProductDetailItem;
}

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, ReactiveFormsModule],
  templateUrl: './product-details.component.html',
})
export class ProductDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  readonly reviewsService = inject(ReviewsService);
  private readonly toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly apiBase = `${environment.apiUrl}/api/v1`;

  readonly productId = signal<string>('');
  readonly product = signal<ProductDetailItem | null>(null);
  readonly isLoadingProduct = signal<boolean>(true);
  readonly productError = signal<string | null>(null);

  readonly selectedImage = signal<string>('');
  readonly isAddingToCart = signal<boolean>(false);
  readonly isTogglingWishlist = signal<boolean>(false);
  readonly wishlistIds = signal<Set<string>>(this.readInitialWishlist());

  readonly reviews = this.reviewsService.reviews;
  readonly isLoadingReviews = this.reviewsService.isLoading;
  readonly currentReviewPage = this.reviewsService.currentPage;
  readonly totalReviewPages = this.reviewsService.totalPages;
  readonly totalReviewResults = this.reviewsService.totalResults;
  readonly reviewPages = this.reviewsService.pagesArray;

  readonly isSubmittingReview = signal<boolean>(false);
  readonly deletingReviewId = signal<string | null>(null);
  readonly editingReviewId = signal<string | null>(null);
  readonly persistedOwnReviewIds = signal<Set<string>>(new Set());
  readonly expandedReviewIds = signal<Set<string>>(new Set());

  readonly relatedProducts = signal<ProductDetailItem[]>([]);
  readonly isLoadingRelated = signal<boolean>(false);
  readonly quickAddingId = signal<string | null>(null);

  readonly currentUserId = computed<string | null>(() => {
    return this.authService.currentUserId() || this.resolveCurrentUserIdFromStorage();
  });

  readonly currentUserName = computed<string | null>(() => {
    const authName = this.authService.currentUser()?.name?.trim();
    if (authName) return authName;
    return this.resolveCurrentUserNameFromStorage();
  });

  readonly userExistingReview = computed<Review | null>(() => {
    const list = this.reviews();
    const editId = this.editingReviewId();

    if (editId) {
      const foundByEditId = list.find((r) => r._id === editId);
      if (foundByEditId) return foundByEditId;
    }

    return list.find((rev) => this.isOwnReview(rev)) ?? null;
  });

  readonly isEditingExistingReview = computed<boolean>(() => Boolean(this.userExistingReview()));

  readonly galleryImages = computed<string[]>(() => {
    const item = this.product();
    if (!item) return [];
    const list = [item.imageCover, ...(item.images ?? [])].filter(Boolean);
    return Array.from(new Set(list));
  });

  readonly activeImage = computed<string>(() => {
    return this.selectedImage() || this.product()?.imageCover || '';
  });

  readonly isWishlisted = computed<boolean>(() => {
    const id = this.product()?._id || this.product()?.id || this.productId();
    return id ? this.wishlistIds().has(id) : false;
  });

  readonly effectivePrice = computed<number>(() => {
    const item = this.product();
    if (!item) return 0;
    if (
      typeof item.priceAfterDiscount === 'number' &&
      item.priceAfterDiscount > 0 &&
      item.priceAfterDiscount < item.price
    ) {
      return item.priceAfterDiscount;
    }
    return item.price;
  });

  readonly reviewForm = this.fb.nonNullable.group({
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    review: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(1000)]],
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')?.trim() ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => {
        this.productId.set(id);
        this.selectedImage.set('');
        this.editingReviewId.set(null);
        this.expandedReviewIds.set(new Set());
        this.reviewForm.reset({ rating: 5, review: '' });

        if (!id) {
          this.persistedOwnReviewIds.set(new Set());
          this.isLoadingProduct.set(false);
          this.product.set(null);
          this.relatedProducts.set([]);
          this.productError.set('Product identifier is missing.');
          return;
        }

        this.persistedOwnReviewIds.set(this.readSavedReviewIdsForProduct(id));
        this.loadProduct(id);
        this.loadReviewsPage(id, 1, true);
      });
  }

  getReviewerLabel(rev: Review): string {
    const name = getReviewAuthorName(rev.user);
    if (name) return name;
    if (this.isOwnReview(rev)) return this.currentUserName() || 'You';
    return 'Verified Buyer';
  }

  isOwnReview(rev: Review): boolean {
    if (!rev?._id) return false;

    if (this.persistedOwnReviewIds().has(rev._id) || this.editingReviewId() === rev._id) {
      return true;
    }

    const authorId = getReviewAuthorId(rev.user);
    const myId = this.currentUserId();
    if (myId && authorId && String(myId).trim() === String(authorId).trim()) {
      return true;
    }

    const authorName = (getReviewAuthorName(rev.user) || '').trim().toLowerCase();
    const myName = (this.currentUserName() || '').trim().toLowerCase();
    return Boolean(myName && authorName && myName === authorName);
  }

  onGoToReviewPage(page: number): void {
    const prodId = this.product()?._id || this.product()?.id || this.productId();
    if (!prodId) return;

    if (page < 1 || page > this.totalReviewPages() || page === this.currentReviewPage()) {
      return;
    }

    // false علشان متفرغش الفورم لو كان في review خاص بيك في صفحة تانية
    this.loadReviewsPage(prodId, page, false);
  }

  onStartEditReview(rev: Review): void {
    const prodId = this.product()?._id || this.product()?.id || this.productId();
    this.editingReviewId.set(rev._id);
    if (prodId) {
      this.saveOwnReviewIdForProduct(prodId, rev._id);
    }
    this.reviewForm.patchValue({
      rating: Number(rev.rating) || 5,
      review: rev.review ?? '',
    });
    this.reviewForm.markAsDirty();

    if (typeof document !== 'undefined') {
      document.getElementById('review-form-card')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }

  onCancelEditReview(): void {
    this.editingReviewId.set(null);
    this.reviewForm.reset({ rating: 5, review: '' });
  }

  onDeleteReview(rev: Review): void {
    const reviewId = rev._id;
    const prodId = this.product()?._id || this.product()?.id || this.productId();
    if (!reviewId) return;

    this.deletingReviewId.set(reviewId);
    this.reviewsService
      .deleteReview(reviewId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingReviewId.set(null);
          if (this.editingReviewId() === reviewId) {
            this.editingReviewId.set(null);
          }
          if (prodId) {
            this.removeSavedReviewIdForProduct(prodId, reviewId);
          }

          this.reviewForm.reset({ rating: 5, review: '' });
          this.toastr.success('Review deleted successfully.', 'Review Deleted');
          if (prodId) {
            this.loadReviewsPage(prodId, this.currentReviewPage(), true);
            this.loadProduct(prodId);
          }
        },
        error: () => {
          this.deletingReviewId.set(null);
        },
      });
  }

  selectImage(url: string): void {
    this.selectedImage.set(url);
  }

  toggleReviewExpansion(reviewId: string): void {
    const next = new Set(this.expandedReviewIds());
    if (next.has(reviewId)) {
      next.delete(reviewId);
    } else {
      next.add(reviewId);
    }
    this.expandedReviewIds.set(next);
  }

  isReviewExpanded(reviewId: string): boolean {
    return this.expandedReviewIds().has(reviewId);
  }

  onAddToCart(): void {
    const item = this.product();
    const id = item?._id || item?.id || this.productId();
    if (!id) return;

    this.isAddingToCart.set(true);
    this.cartService
      .addProductToCart(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isAddingToCart.set(false);
          this.toastr.success(
            res?.message || `"${item?.title ?? 'Product'}" added to cart.`,
            'Added to Cart',
          );
        },
        error: () => {
          this.isAddingToCart.set(false);
        },
      });
  }

  onQuickAddToCart(relatedItem: ProductDetailItem): void {
    const id = relatedItem._id || relatedItem.id || '';
    if (!id) return;

    this.quickAddingId.set(id);
    this.cartService
      .addProductToCart(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.quickAddingId.set(null);
          this.toastr.success(
            res?.message || `"${relatedItem.title}" added to cart.`,
            'Added to Cart',
          );
        },
        error: () => {
          this.quickAddingId.set(null);
        },
      });
  }

  onToggleWishlist(): void {
    const item = this.product();
    const id = item?._id || item?.id || this.productId();
    if (!id) return;

    this.isTogglingWishlist.set(true);
    const currentlyWishlisted = this.wishlistIds().has(id);

    const request$ = currentlyWishlisted
      ? this.http.delete(`${this.apiBase}/wishlist/${id}`)
      : this.http.post(`${this.apiBase}/wishlist`, { productId: id });

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isTogglingWishlist.set(false);
        const updated = new Set(this.wishlistIds());
        if (currentlyWishlisted) {
          updated.delete(id);
          this.toastr.info('Removed from wishlist.', 'Wishlist');
        } else {
          updated.add(id);
          this.toastr.success('Saved to wishlist.', 'Wishlist');
        }
        this.wishlistIds.set(updated);
        this.persistWishlist(updated);
      },
      error: () => {
        this.isTogglingWishlist.set(false);
      },
    });
  }

  onSubmitReview(): void {
    const prodId = this.product()?._id || this.product()?.id || this.productId();
    if (!prodId) return;

    if (this.reviewForm.invalid) {
      this.reviewForm.markAllAsTouched();
      return;
    }

    this.isSubmittingReview.set(true);
    const raw = this.reviewForm.getRawValue();
    const payload = {
      review: raw.review.trim(),
      rating: Number(raw.rating),
    };

    const existing = this.userExistingReview();

    if (existing) {
      this.reviewsService
        .updateReview(existing._id, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSubmittingReview.set(false);
            this.editingReviewId.set(existing._id);
            this.saveOwnReviewIdForProduct(prodId, existing._id);
            this.toastr.success('Your review has been updated.', 'Review Updated');
            this.loadReviewsPage(prodId, this.currentReviewPage(), false);
            this.loadProduct(prodId);
          },
          error: () => {
            this.isSubmittingReview.set(false);
          },
        });
      return;
    }

    this.reviewsService
      .createReviewForProduct(prodId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSubmittingReview.set(false);
          const createdId = res?.data?._id ?? null;
          if (createdId) {
            this.editingReviewId.set(createdId);
            this.saveOwnReviewIdForProduct(prodId, createdId);
          }
          this.toastr.success('Your review has been submitted.', 'Review Posted');
          this.loadReviewsPage(prodId, 1, false);
          this.loadProduct(prodId);
        },
        error: () => {
          this.isSubmittingReview.set(false);
        },
      });
  }

  private saveOwnReviewIdForProduct(productId: string, reviewId: string): void {
    if (!productId || !reviewId) return;
    const next = new Set(this.persistedOwnReviewIds());
    next.add(reviewId);
    this.persistedOwnReviewIds.set(next);

    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`cartify_user_reviews_${productId}`, JSON.stringify(Array.from(next)));
    } catch {
      // ignore storage quota errors
    }
  }

  private removeSavedReviewIdForProduct(productId: string, reviewId: string): void {
    if (!productId || !reviewId) return;
    const next = new Set(this.persistedOwnReviewIds());
    next.delete(reviewId);
    this.persistedOwnReviewIds.set(next);

    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`cartify_user_reviews_${productId}`, JSON.stringify(Array.from(next)));
    } catch {
      // ignore storage quota errors
    }
  }

  private readSavedReviewIdsForProduct(productId: string): Set<string> {
    if (typeof window === 'undefined' || !productId) return new Set();
    try {
      const raw = localStorage.getItem(`cartify_user_reviews_${productId}`);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
    } catch {
      return new Set();
    }
  }

  private loadProduct(id: string): void {
    this.isLoadingProduct.set(true);
    this.productError.set(null);

    this.http
      .get<ProductSingleResponse>(`${this.apiBase}/products/${id}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const item = res?.data ?? null;
          this.product.set(item);
          this.isLoadingProduct.set(false);

          if (!item) {
            this.productError.set('Product not found.');
            this.relatedProducts.set([]);
            return;
          }

          const categoryId = item.category?._id;
          if (categoryId) {
            this.loadRelatedProducts(categoryId, item._id || item.id || id);
          } else {
            this.relatedProducts.set([]);
          }
        },
        error: () => {
          this.isLoadingProduct.set(false);
          this.relatedProducts.set([]);
          this.productError.set('Unable to load product details.');
        },
      });
  }

  private loadRelatedProducts(categoryId: string, currentProductId: string): void {
    this.isLoadingRelated.set(true);

    this.http
      .get<{ data?: ProductDetailItem[] }>(`${this.apiBase}/products`, {
        params: { 'category[in]': categoryId, limit: '8' },
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res?.data) ? res.data : [];
          const filtered = list.filter((p) => (p._id || p.id) !== currentProductId).slice(0, 4);
          this.relatedProducts.set(filtered);
          this.isLoadingRelated.set(false);
        },
        error: () => {
          this.relatedProducts.set([]);
          this.isLoadingRelated.set(false);
        },
      });
  }

  private loadReviewsPage(productId: string, page: number, syncFormFromExisting: boolean): void {
    this.reviewsService
      .getReviewsForProduct(productId, page)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res?.data) ? res.data : [];
          const own = list.find((rev) => this.isOwnReview(rev));
          if (own) {
            this.saveOwnReviewIdForProduct(productId, own._id);
            if (!this.editingReviewId()) {
              this.editingReviewId.set(own._id);
            }
            if (syncFormFromExisting) {
              this.reviewForm.patchValue({
                rating: Number(own.rating) || 5,
                review: own.review ?? '',
              });
            }
          } else if (syncFormFromExisting && !this.editingReviewId()) {
            this.reviewForm.reset({ rating: 5, review: '' });
          }
        },
        error: () => {},
      });
  }

  private resolveCurrentUserIdFromStorage(): string | null {
    if (typeof window === 'undefined') return null;

    const storages = [window.localStorage, window.sessionStorage];
    const directKeys = ['userId', 'user_id', 'id', 'loggedUserId'];

    for (const st of storages) {
      for (const k of directKeys) {
        const val = st.getItem(k);
        if (val && val.trim()) return val.trim();
      }
    }

    const userObj = this.readUserStorageObject();
    if (userObj?._id || userObj?.id || userObj?.userId) {
      return String(userObj._id || userObj.id || userObj.userId).trim();
    }

    const token = this.readToken();
    if (token && token.split('.').length === 3) {
      try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        if (payload?.id || payload?._id || payload?.userId || payload?.sub) {
          return String(payload.id || payload._id || payload.userId || payload.sub).trim();
        }
      } catch {
        // ignore invalid JWT payload
      }
    }

    return null;
  }

  private resolveCurrentUserNameFromStorage(): string | null {
    if (typeof window === 'undefined') return null;
    const storages = [window.localStorage, window.sessionStorage];
    const nameKeys = ['userName', 'user_name', 'name', 'fullName'];

    for (const st of storages) {
      for (const k of nameKeys) {
        const direct = st.getItem(k);
        if (direct && direct.trim()) return direct.trim();
      }
    }

    const userObj = this.readUserStorageObject();
    if (userObj?.name && String(userObj.name).trim()) {
      return String(userObj.name).trim();
    }
    return null;
  }

  private readToken(): string | null {
    if (typeof window === 'undefined') return null;
    const storages = [window.localStorage, window.sessionStorage];
    const tokenKeys = ['cartify_token', 'token', 'userToken', 'authToken', 'accessToken', 'jwt'];

    for (const st of storages) {
      for (const k of tokenKeys) {
        const val = st.getItem(k);
        if (val && val.trim()) return val.trim();
      }
    }
    return null;
  }

  private readUserStorageObject(): {
    _id?: string;
    id?: string;
    userId?: string;
    name?: string;
  } | null {
    if (typeof window === 'undefined') return null;
    const storages = [window.localStorage, window.sessionStorage];
    const objKeys = ['cartify_user', 'user', 'currentUser', 'userData', 'loggedUser', 'profile'];

    for (const st of storages) {
      for (const key of objKeys) {
        const raw = st.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            return parsed.user && typeof parsed.user === 'object' ? parsed.user : parsed;
          }
        } catch {
          // ignore invalid JSON
        }
      }
    }
    return null;
  }

  private readInitialWishlist(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem('cartify_wishlist_ids');
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
    } catch {
      return new Set();
    }
  }

  private persistWishlist(ids: Set<string>): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('cartify_wishlist_ids', JSON.stringify(Array.from(ids)));
    } catch {
      // ignore storage quota errors
    }
  }
}
