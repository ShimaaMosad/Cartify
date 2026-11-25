import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CatagoriesService } from '../../core/services/catagories/catagories.service';
import { Category } from '../../core/models/gatagories.interface';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './catagories.component.html',
})
export class CategoriesComponent implements OnInit {
  private readonly catagoriesService = inject(CatagoriesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly totalResults = signal<number>(0);

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.catagoriesService
      .getAllCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const items = response.data ?? [];
          this.categories.set(items);
          this.totalResults.set(response.results ?? items.length);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('Could not load categories. Please try again.');
          this.isLoading.set(false);
        },
      });
  }
}
