import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateReviewRequest,
  Review,
  ReviewResponse,
  ReviewsResponse,
  ReviewUser,
} from '../../models/reviews.interface';

export function getReviewAuthorId(user: string | ReviewUser | null | undefined): string | null {
  if (!user) return null;
  if (typeof user === 'string') return user;
  return user._id ?? (user as { id?: string }).id ?? null;
}

export function getReviewAuthorName(user: string | ReviewUser | null | undefined): string | null {
  if (!user || typeof user === 'string') return null;
  return user.name ?? null;
}

@Injectable({
  providedIn: 'root',
})
export class ReviewsService {
  private readonly http = inject(HttpClient);
  private readonly productsUrl = `${environment.apiUrl}/api/v1/products`;
  private readonly reviewsUrl = `${environment.apiUrl}/api/v1/reviews`;

  readonly reviews = signal<Review[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly currentPage = signal<number>(1);
  readonly totalPages = signal<number>(1);
  readonly totalResults = signal<number>(0);

  readonly pagesArray = computed<number[]>(() => {
    const count = Math.max(1, this.totalPages());
    return Array.from({ length: count }, (_, idx) => idx + 1);
  });

  readonly hasMorePages = computed<boolean>(() => this.currentPage() < this.totalPages());

  createReviewForProduct(productId: string, body: CreateReviewRequest): Observable<ReviewResponse> {
    const payload: CreateReviewRequest = {
      review: body.review.trim(),
      rating: Number(body.rating),
    };

    return this.http.post<ReviewResponse>(`${this.productsUrl}/${productId}/reviews`, payload).pipe(
      tap((res) => {
        if (res?.data) {
          this.reviews.update((list) => {
            const withoutDup = list.filter((r) => r._id !== res.data._id);
            return [res.data, ...withoutDup];
          });
          this.totalResults.update((c) => c + 1);
        }
      }),
    );
  }
  getReviewsForProduct(productId: string, page = 1): Observable<ReviewsResponse> {
    this.isLoading.set(true);
    this.currentPage.set(page);

    return this.http
      .get<ReviewsResponse>(`${this.productsUrl}/${productId}/reviews`, {
        params: { page: String(page) },
      })
      .pipe(
        tap({
          next: (res) => {
            const list = Array.isArray(res?.data) ? res.data : [];
            this.reviews.set(list);
            this.totalResults.set(res?.results ?? list.length);
            this.currentPage.set(res?.metadata?.currentPage ?? page);
            this.totalPages.set(res?.metadata?.numberOfPages ?? 1);
            this.isLoading.set(false);
          },
          error: () => {
            this.isLoading.set(false);
          },
        }),
      );
  }

  getAllReviews(page: number = 1): Observable<ReviewsResponse> {
    return this.http.get<ReviewsResponse>(this.reviewsUrl, {
      params: { page: String(page) },
    });
  }

  getReviewById(reviewId: string): Observable<ReviewResponse> {
    return this.http.get<ReviewResponse>(`${this.reviewsUrl}/${reviewId}`);
  }

  updateReview(reviewId: string, body: CreateReviewRequest): Observable<ReviewResponse> {
    const payload: CreateReviewRequest = {
      review: body.review.trim(),
      rating: Number(body.rating),
    };

    return this.http.put<ReviewResponse>(`${this.reviewsUrl}/${reviewId}`, payload).pipe(
      tap((res) => {
        if (res?.data) {
          this.reviews.update((list) =>
            list.map((item) => (item._id === reviewId ? { ...item, ...res.data } : item)),
          );
        }
      }),
    );
  }

  deleteReview(reviewId: string): Observable<void> {
    return this.http.delete<void>(`${this.reviewsUrl}/${reviewId}`).pipe(
      tap(() => {
        this.reviews.update((list) => list.filter((item) => item._id !== reviewId));
        this.totalResults.update((c) => Math.max(0, c - 1));
      }),
    );
  }
}
