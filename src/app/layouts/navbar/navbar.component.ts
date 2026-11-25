import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';
import { ThemeService } from '../../core/services/theme/theme.service';
import { WishlistService } from '../../core/services/wishlist/wishlist.service';
import { CartService } from '../../core/services/cart/cart.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  readonly themeService = inject(ThemeService);
  readonly wishlistService = inject(WishlistService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly cartService = inject(CartService);

  readonly isDrawerOpen = signal<boolean>(false);
  readonly isCategoriesPanelOpen = signal<boolean>(false);

  readonly isLoggedIn = computed(() => !!this.authService.token());
  readonly userName = computed(() => this.authService.currentUser()?.name || 'Account');
  readonly wishlistCount = this.wishlistService.count;
  readonly cartCount = this.cartService.numOfCartItems;

  constructor() {
    effect(() => {
      if (this.isLoggedIn()) {
        this.wishlistService
          .getLoggedUserWishlist()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ error: () => {} });
        this.cartService
          .getLoggedUserCart()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ error: () => {} });
      } else {
        this.wishlistService.wishlistItems.set([]);
        this.cartService.resetCartState();
      }
    });
  }

  openDrawer(): void {
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.isCategoriesPanelOpen.set(false);
  }

  openCategoriesPanel(): void {
    this.isCategoriesPanelOpen.set(true);
  }

  closeCategoriesPanel(): void {
    this.isCategoriesPanelOpen.set(false);
  }

  onSearch(query: string): void {
    const trimmed = query.trim();
    if (!trimmed) {
      this.router.navigate(['/search']);
      return;
    }

    this.router.navigate(['/search'], {
      queryParams: { q: trimmed },
    });
  }

  onDrawerSearch(query: string): void {
    this.onSearch(query);
    this.closeDrawer();
  }

  onSignOut(): void {
    this.authService.clearSession();
    this.closeDrawer();
    this.router.navigate(['/login']);
  }
}
