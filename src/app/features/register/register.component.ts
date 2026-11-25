import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SignupRequest } from '../../core/models/auth.interface';
import { AuthService } from '../../core/services/auth/auth.service';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const rePassword = group.get('rePassword')?.value;
  if (!password || !rePassword) return null;
  return password === rePassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastr = inject(ToastrService);

  readonly showPassword = signal<boolean>(false);
  readonly showRePassword = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);

  readonly registerForm = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^01[0125][0-9]{8}$/)]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/),
        ],
      ],
      rePassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  toggleRePasswordVisibility(): void {
    this.showRePassword.update((v) => !v);
  }

  isFieldInvalid(field: 'name' | 'email' | 'phone' | 'password' | 'rePassword'): boolean {
    const control = this.registerForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const payload: SignupRequest = this.registerForm.getRawValue();

    this.authService
      .signUp(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);

          if (response.token) {
            localStorage.setItem('cartify_token', response.token);
          }

          this.toastr.success(
            'Your account is ready! Redirecting to sign in...',
            'Account Created',
          );

          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 900);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const msg =
            err?.error?.message ||
            err?.error?.errors?.[0]?.msg ||
            'Could not create account. Please check your details.';
          this.toastr.error(msg, 'Registration Failed');
        },
      });
  }
}
