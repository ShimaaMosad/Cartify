import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './account-settings.component.html',
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);
  private readonly toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isUpdatingProfile = signal<boolean>(false);
  readonly isUpdatingPassword = signal<boolean>(false);

  readonly profileForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.pattern(/^01[0125][0-9]{8}$/)]],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required, Validators.minLength(6)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rePassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.profileForm.patchValue({
        name: user.name ?? '',
        email: user.email ?? '',
      });
    }
  }

  onSaveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isUpdatingProfile.set(true);
    const raw = this.profileForm.getRawValue();

    this.authService
      .updateUserData({
        name: raw.name.trim(),
        email: raw.email.trim(),
        ...(raw.phone.trim() ? { phone: raw.phone.trim() } : {}),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isUpdatingProfile.set(false);
          if ('user' in res && res.user) {
            this.toastr.success('Profile details updated.', 'Account Updated');
          } else {
            this.toastr.error('Could not update profile details.', 'Update Failed');
          }
        },
        error: () => {
          this.isUpdatingProfile.set(false);
        },
      });
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const raw = this.passwordForm.getRawValue();
    if (raw.password !== raw.rePassword) {
      this.toastr.error('New password and confirmation do not match.', 'Mismatch');
      return;
    }

    this.isUpdatingPassword.set(true);
    this.authService
      .updatePassword({
        currentPassword: raw.currentPassword,
        password: raw.password,
        rePassword: raw.rePassword,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isUpdatingPassword.set(false);
          this.passwordForm.reset({ currentPassword: '', password: '', rePassword: '' });
          this.toastr.success('Password updated successfully.', 'Security');
        },
        error: () => {
          this.isUpdatingPassword.set(false);
        },
      });
  }
}
