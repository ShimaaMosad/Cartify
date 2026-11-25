import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BrandsService } from '../../core/services/brands/brands.service';
import { Brand } from '../../core/models/brands.interface';

@Component({
  selector: 'app-brands',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './brands.component.html',
})
export class BrandsComponent implements OnInit {
  private readonly brandsService = inject(BrandsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly brands = signal<Brand[]>([]);
  readonly selectedBrand = signal<Brand | null>(null);
  readonly isLoadingDetails = signal<boolean>(false);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly totalResults = signal<number>(0);

  ngOnInit(): void {
    this.loadBrands();
  }

  loadBrands(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.brandsService
      .getAllBrands()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const items = response.data ?? [];
          this.brands.set(items);
          this.totalResults.set(response.results ?? items.length);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('Could not load brands. Please try again.');
          this.isLoading.set(false);
        },
      });
  }

  viewBrandDetails(brandId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.isLoadingDetails.set(true);

    this.brandsService
      .getSpecificBrand(brandId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.selectedBrand.set(res.data ?? null);
          this.isLoadingDetails.set(false);
        },
        error: () => {
          this.isLoadingDetails.set(false);
        },
      });
  }

  closeBrandDetails(): void {
    this.selectedBrand.set(null);
  }
}
