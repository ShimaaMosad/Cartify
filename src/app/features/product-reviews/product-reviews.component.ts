import { Component, computed, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CreateReviewRequest, Review } from '../../core/models/reviews.interface';
import { getReviewAuthorId, ReviewsService } from '../../core/services/reviews/reviews.service';
import { AuthService } from '../../core/services/auth/auth.service';

@Component({
  selector: 'app-product-reviews',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, RouterLink],
  templateUrl: './product-reviews.component.html',
})
export class ProductReviewsComponent {
  readonly productId = input.required<string>();

  private readonly reviewsService = inject(ReviewsService);
  private readonly authService = inject(AuthService);
  private readonly toastr = inject(ToastrService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly reviews = this.reviewsService.reviews;
  readonly isLoading = this.reviewsService.isLoading;
  readonly currentPage = this.reviewsService.currentPage;
  readonly totalPages = this.reviewsService.totalPages;
  readonly totalResults = this.reviewsService.totalResults;
  readonly hasMorePages = this.reviewsService.hasMorePages;

  readonly isSubmitting = signal<boolean>(false);
  readonly deletingId = signal<string | null>(null);
  readonly hoverRating = signal<number>(0);
  readonly expandedReviewIds = signal<Record<string, boolean>>({});

  readonly maxPreviewLength = 220;

  private readonly currentUser = computed(() => {
    const raw = this.authService.currentUser() as
      | {
          _id?: string;
          id?: string;
          name?: string;
          role?: string;
          user?: { _id?: string; id?: string; name?: string; role?: string };
        }
      | null
      | undefined;
    return raw?.user ?? raw ?? null;
  });

  readonly currentUserId = computed<string | null>(() => {
    const u = this.currentUser();
    const directId = u?._id ?? u?.id ?? null;
    if (directId) return directId;

    if (typeof window !== 'undefined') {
      const token =
        localStorage.getItem('userToken') ??
        localStorage.getItem('token') ??
        sessionStorage.getItem('userToken') ??
        sessionStorage.getItem('token');
      if (token && token.split('.').length === 3) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload?.id ?? payload?._id ?? payload?.sub ?? null;
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  readonly isAdmin = computed<boolean>(() => {
    return this.currentUser()?.role?.toLowerCase() === 'admin';
  });

  readonly userReview = computed<Review | null>(() => {
    const uid = this.currentUserId();
    const userName = this.currentUser()?.name?.trim().toLowerCase();

    return (
      this.reviews().find((item) => {
        if (uid && getReviewAuthorId(item.user) === uid) return true;
        if (
          userName &&
          typeof item.user === 'object' &&
          item.user?.name?.trim().toLowerCase() === userName
        ) {
          return true;
        }
        return false;
      }) ?? null
    );
  });

  readonly reviewForm = this.fb.nonNullable.group({
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    review: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(1000)]],
  });

  constructor() {
    effect(() => {
      const id = this.productId();
      if (id) {
        this.hoverRating.set(0);
        this.expandedReviewIds.set({});
        this.reviewForm.reset({ rating: 5, review: '' });
        this.loadReviews(id, 1);
      }
    });

    effect(() => {
      const existing = this.userReview();
      if (existing) {
        this.reviewForm.setValue(
          {
            rating: existing.rating,
            review: existing.review,
          },
          { emitEvent: false },
        );
      } else {
        this.reviewForm.reset({ rating: 5, review: '' }, { emitEvent: false });
      }
    });
  }

  loadReviews(productId: string, page: number): void {
    this.reviewsService
      .getReviewsForProduct(productId, page)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => {} });
  }

  setRating(stars: number): void {
    this.reviewForm.controls.rating.setValue(stars);
    this.reviewForm.controls.rating.markAsTouched();
  }

  focusEdit(item: Review): void {
    this.reviewForm.setValue({
      rating: item.rating,
      review: item.review,
    });
  }

  isLongReview(text: string): boolean {
    return (text?.length ?? 0) > this.maxPreviewLength;
  }

  isExpanded(reviewId: string): boolean {
    return !!this.expandedReviewIds()[reviewId];
  }

  toggleExpand(reviewId: string): void {
    this.expandedReviewIds.update((map) => ({
      ...map,
      [reviewId]: !map[reviewId],
    }));
  }

  displayReviewText(item: Review): string {
    const text = item.review ?? '';
    if (this.isExpanded(item._id) || text.length <= this.maxPreviewLength) {
      return text;
    }
    return text.slice(0, this.maxPreviewLength).trimEnd() + '...';
  }

  onSubmit(): void {
    if (this.reviewForm.invalid) {
      this.reviewForm.markAllAsTouched();
      return;
    }

    const { review, rating } = this.reviewForm.getRawValue();
    const payload: CreateReviewRequest = {
      review: review.trim(),
      rating: Number(rating),
    };

    const existingId = this.userReview()?._id ?? null;
    this.isSubmitting.set(true);

    if (existingId) {
      this.reviewsService
        .updateReview(existingId, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.loadReviews(this.productId(), this.currentPage());
            this.toastr.success('Review updated successfully.', 'Review Updated');
          },
          error: () => {
            this.isSubmitting.set(false);
          },
        });
      return;
    }

    this.reviewsService
      .createReviewForProduct(this.productId(), payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.reviewForm.reset({ rating: 5, review: '' });
          this.loadReviews(this.productId(), 1);
          this.toastr.success('Review added successfully.', 'Review Added');
        },
        error: () => {
          this.isSubmitting.set(false);
        },
      });
  }

  onDelete(item: Review): void {
    this.deletingId.set(item._id);
    this.reviewsService
      .deleteReview(item._id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingId.set(null);
          if (this.userReview()?._id === item._id || this.isOwner(item)) {
            this.reviewForm.reset({ rating: 5, review: '' });
          }
          this.toastr.success('Review deleted.', 'Deleted');
        },
        error: () => {
          this.deletingId.set(null);
        },
      });
  }

  isOwner(item: Review): boolean {
    const authorId = getReviewAuthorId(item.user);
    const currentId = this.currentUserId();
    if (authorId && currentId && authorId === currentId) {
      return true;
    }
    const userName = this.currentUser()?.name?.trim().toLowerCase();
    if (
      userName &&
      typeof item.user === 'object' &&
      item.user?.name?.trim().toLowerCase() === userName
    ) {
      return true;
    }
    return false;
  }

  canEdit(item: Review): boolean {
    return this.isOwner(item);
  }

  canDelete(item: Review): boolean {
    return this.isOwner(item) || this.isAdmin();
  }

  authorName(item: Review): string {
    if (typeof item.user === 'object' && item.user?.name) {
      return item.user.name;
    }
    if (this.isOwner(item) && this.currentUser()?.name) {
      return this.currentUser()!.name!;
    }
    return 'Verified Buyer';
  }
}
