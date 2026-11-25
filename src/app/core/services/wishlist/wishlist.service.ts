import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  WishlistActionResponse,
  WishlistProduct,
  WishlistRequest,
  WishlistResponse,
} from '../../models/wishlist.interface';

function isWishlistProductArray(data: WishlistProduct[] | string[]): data is WishlistProduct[] {
  return Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null;
}

@Injectable({
  providedIn: 'root',
})
export class WishlistService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/wishlist`;

  readonly wishlistItems = signal<WishlistProduct[]>([]);
  readonly isLoading = signal<boolean>(false);

  readonly wishlistIds = computed<Set<string>>(
    () => new Set(this.wishlistItems().map((item) => item._id || item.id)),
  );

  readonly count = computed<number>(() => this.wishlistItems().length);

  isInWishlist(productId: string): boolean {
    return this.wishlistIds().has(productId);
  }

  getLoggedUserWishlist(): Observable<WishlistResponse> {
    this.isLoading.set(true);
    return this.http.get<WishlistResponse>(this.baseUrl).pipe(
      tap({
        next: (res) => {
          this.wishlistItems.set(res.data ?? []);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      }),
    );
  }

  addProductToWishlist(productId: string): Observable<WishlistActionResponse> {
    const body: WishlistRequest = { productId };
    return this.http.post<WishlistActionResponse>(this.baseUrl, body).pipe(
      tap((res) => {
        if (isWishlistProductArray(res.data)) {
          this.wishlistItems.set(res.data);
        } else {
          this.getLoggedUserWishlist().subscribe();
        }
      }),
    );
  }

  removeProductFromWishlist(productId: string): Observable<WishlistActionResponse> {
    return this.http.delete<WishlistActionResponse>(`${this.baseUrl}/${productId}`).pipe(
      tap((res) => {
        if (isWishlistProductArray(res.data)) {
          this.wishlistItems.set(res.data);
        } else {
          this.wishlistItems.update((items) =>
            items.filter((item) => item._id !== productId && item.id !== productId),
          );
        }
      }),
    );
  }
}
