import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Cartify|Home',
    component: HomeComponent,
  },
  {
    path: 'brands',
    title: 'Cartify|Brands',
    loadComponent: () =>
      import('./features/brands/brands.component').then((c) => c.BrandsComponent),
  },
  {
    path: 'cart',
    title: 'Cartify|Cart',
    canActivate: [authGuard],
    loadComponent: () => import('./features/cart/cart.component').then((c) => c.CartComponent),
  },
  {
    path: 'catagories',
    title: 'Cartify|Catagories',
    loadComponent: () =>
      import('./features/catagories/catagories.component').then((c) => c.CategoriesComponent),
  },
  {
    path: 'wishlist',
    title: 'Cartify|Wishlist',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/wishlist/wishlist.component').then((c) => c.WishlistComponent),
  },
  {
    path: 'sub-catagories',
    title: 'Cartify|SubCatagories',
    loadComponent: () =>
      import('./features/sub-catagories/sub-catagories.component').then(
        (c) => c.SubCategoriesComponent,
      ),
  },
  {
    path: 'sub-catagories/:id',
    title: 'Cartify|SubCatagories',
    loadComponent: () =>
      import('./features/sub-catagories/sub-catagories.component').then(
        (c) => c.SubCategoriesComponent,
      ),
  },
  {
    path: 'addresses',
    title: 'Cartify|Addresses',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/address/address.component').then((c) => c.AddressesComponent),
  },
  {
    path: 'check-out',
    title: 'Cartify|CheckOut',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/check-out/check-out.component').then((c) => c.CheckoutComponent),
  },
  {
    path: 'orders',
    title: 'Cartify|Orders',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/orders/orders.component').then((c) => c.UserOrdersComponent),
  },
  {
    path: 'shop',
    title: 'Cartify|Products',
    loadComponent: () =>
      import('./features/products/products.component').then((c) => c.ProductsComponent),
  },
  {
    path: 'product-details/:id',
    title: 'Cartify|ProductDetails',
    loadComponent: () =>
      import('./features/product-details/product-details.component').then(
        (c) => c.ProductDetailsComponent,
      ),
  },
  {
    path: 'reviews',
    loadComponent: () =>
      import('./features/all-reviews/all-reviews.component').then((m) => m.AllReviewsComponent),
    title: 'All Reviews | Cartify',
  },
  {
    path: 'search',
    title: 'Cartify|Search',
    loadComponent: () =>
      import('./features/search/search.component').then((c) => c.SearchComponent),
  },
  {
    path: 'settings',
    title: 'Cartify|Settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/account-settings/account-settings.component').then(
        (c) => c.ProfileComponent,
      ),
  },
  {
    path: 'login',
    title: 'Cartify|Login',
    loadComponent: () => import('./features/login/login.component').then((c) => c.LoginComponent),
  },
  {
    path: 'register',
    title: 'Cartify|Register',
    loadComponent: () =>
      import('./features/register/register.component').then((c) => c.RegisterComponent),
  },
  {
    path: 'verify-code',
    title: 'Cartify|Verifycode',
    loadComponent: () =>
      import('./features/verify-code/verify-code.component').then((c) => c.VerifyCodeComponent),
  },
  {
    path: 'reset-password',
    title: 'Cartify|ResetPassword',
    loadComponent: () =>
      import('./features/reset-password/reset-password.component').then(
        (c) => c.ResetPasswordComponent,
      ),
  },
  {
    path: 'forget-password',
    title: 'Cartify|ForgetPassword',
    loadComponent: () =>
      import('./features/forget-password/forget-password.component').then(
        (c) => c.ForgetPasswordComponent,
      ),
  },
  {
    path: '**',
    title: 'Cartify|NotFound',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((c) => c.NotFoundComponent),
  },
];
