import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';
import { CartService } from '../../core/services/cart/cart.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './footer.component.html',
})
export class FooterComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);

  readonly isLoggedIn = computed<boolean>(() =>
    Boolean(this.authService.token() || this.authService.currentUser()),
  );

  onLogout(): void {
    this.authService.clearSession();
    this.cartService.resetCartState();

    if (typeof window !== 'undefined') {
      localStorage.removeItem('cartify_cart_id');
      sessionStorage.removeItem('cartify_token');
      sessionStorage.removeItem('cartify_user');
    }

    this.router.navigate(['/login']);
  }
}
