import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SigninRequest } from '../../core/models/auth.interface';
import { AuthService } from '../../core/services/auth/auth.service';
import { ToastService } from '../../core/services/toast/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastr = inject(ToastService);

  readonly showPassword = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  isFieldInvalid(field: 'email' | 'password'): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const payload: SigninRequest = this.loginForm.getRawValue();

    this.authService
      .signIn(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          if (response.token) {
            localStorage.setItem('cartify_token', response.token);
          }
          if (response.user) {
            localStorage.setItem('cartify_user', JSON.stringify(response.user));
          }

          const userName = response.user?.name ? `, ${response.user.name}` : '';
          this.toastr.success(`Welcome back${userName}!`, 'Signed In');
          this.router.navigate(['/shop']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const msg =
            err?.error?.message ||
            err?.error?.errors?.[0]?.msg ||
            'Incorrect email or password. Please try again.';
          this.toastr.error(msg, 'Sign In Failed');
        },
      });
  }
}
