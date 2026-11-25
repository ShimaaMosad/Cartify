import { Service } from '@angular/core';
import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';

import { isPlatformBrowser, DOCUMENT } from '@angular/common';
@Service()
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly storageKey = 'cartify-theme';

  readonly isDark = signal<boolean>(this.getInitialTheme());

  constructor() {
    effect(() => {
      const dark = this.isDark();
      if (!this.isBrowser) return;

      this.document.documentElement.classList.toggle('dark', dark);

      try {
        window.localStorage.setItem(this.storageKey, dark ? 'dark' : 'light');
      } catch {
        // تجاهل لو التخزين غير متاح
      }
    });
  }

  toggleTheme(): void {
    this.isDark.update((v) => !v);
  }

  private getInitialTheme(): boolean {
    if (!this.isBrowser) return false;

    try {
      const saved = window.localStorage.getItem(this.storageKey);
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
    } catch {
      // تجاهل
    }

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
}
