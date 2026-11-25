import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Review, ReviewUser } from '../../core/models/reviews.interface';
import { ReviewsService } from '../../core/services/reviews/reviews.service';

@Component({
  selector: 'app-all-reviews',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './all-reviews.component.html',
})
export class AllReviewsComponent implements OnInit {
  private readonly reviewsService = inject(ReviewsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly allReviews = signal<Review[]>([]);
  readonly selectedReview = signal<Review | null>(null);
  readonly page = signal<number>(1);
  readonly totalPages = signal<number>(1);
  readonly totalResults = signal<number>(0);
  readonly isLoading = signal<boolean>(false);
  readonly inspectingId = signal<string | null>(null);
  readonly expandedReviewIds = signal<Record<string, boolean>>({});

  readonly maxPreviewLength = 180;

  ngOnInit(): void {
    this.loadPage(1);
  }

  loadPage(targetPage: number): void {
    if (targetPage < 1) return;

    this.isLoading.set(true);
    this.reviewsService
      .getAllReviews(targetPage)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.allReviews.set(res.data ?? []);
          this.page.set(res.metadata?.currentPage ?? targetPage);
          this.totalPages.set(res.metadata?.numberOfPages ?? 1);
          this.totalResults.set(res.results ?? res.data?.length ?? 0);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  inspectReview(reviewId: string): void {
    this.inspectingId.set(reviewId);
    this.reviewsService
      .getReviewById(reviewId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.selectedReview.set(res.data);
          this.inspectingId.set(null);
        },
        error: () => {
          this.inspectingId.set(null);
        },
      });
  }

  closeSelectedReview(): void {
    this.selectedReview.set(null);
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

  authorName(user: string | ReviewUser | null | undefined): string {
    if (user && typeof user === 'object' && user.name) {
      return user.name;
    }
    return 'Verified Buyer';
  }
}
