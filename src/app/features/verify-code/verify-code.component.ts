import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';
import { ToastService } from '../../core/services/toast/toast.service';

@Component({
  selector: 'app-verify-code',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './verify-code.component.html',
})
export class VerifyCodeComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastr = inject(ToastService);

  readonly isSubmitting = signal<boolean>(false);

  readonly verifyForm = this.fb.nonNullable.group({
    resetCode: ['', [Validators.required, Validators.minLength(4)]],
  });

  isCodeInvalid(): boolean {
    const control = this.verifyForm.get('resetCode');
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.verifyForm.invalid) {
      this.verifyForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const resetCode = this.verifyForm.getRawValue().resetCode.trim();

    this.authService
      .verifyCode({ resetCode })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toastr.success('Code verified! You can now set a new password.', 'Code Verified');
          this.router.navigate(['/reset-password']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const msg =
            err?.error?.message ||
            err?.error?.errors?.[0]?.msg ||
            'Invalid or expired reset code. Please try again.';
          this.toastr.error(msg, 'Verification Failed');
        },
      });
  }
}
