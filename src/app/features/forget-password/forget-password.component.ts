import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth/auth.service';

@Component({
  selector: 'app-forget-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forget-password.component.html',
})
export class ForgetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastr = inject(ToastrService);

  readonly isSubmitting = signal<boolean>(false);

  readonly forgetForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  isEmailInvalid(): boolean {
    const control = this.forgetForm.get('email');
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.forgetForm.invalid) {
      this.forgetForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const { email } = this.forgetForm.getRawValue();

    this.authService
      .forgetPassword({ email })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          sessionStorage.setItem('cartify_reset_email', email);

          this.toastr.success(response.message || 'Reset code sent to your email!', 'Code Sent');

          setTimeout(() => {
            this.router.navigate(['/verify-code']);
          }, 800);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const msg =
            err?.error?.message ||
            err?.error?.errors?.[0]?.msg ||
            'We could not find an account with that email.';
          this.toastr.error(msg, 'Request Failed');
        },
      });
  }
}
