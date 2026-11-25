import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatagoriesService } from '../../core/services/catagories/catagories.service';
import { Category, Subcategory } from '../../core/models/gatagories.interface';

@Component({
  selector: 'app-sub-categories',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sub-catagories.component.html',
})
export class SubCategoriesComponent implements OnInit {
  private readonly catagoriesService = inject(CatagoriesService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly subCategories = signal<Subcategory[]>([]);
  readonly selectedCategory = signal<Category | null>(null);
  readonly activeSubCategoryDetails = signal<Subcategory | null>(null);
  readonly isLoadingDetails = signal<boolean>(false);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly totalResults = signal<number>(0);

  private activeCategoryId: string | null = null;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.activeCategoryId = params.get('id') ?? params.get('categoryId');
      this.activeSubCategoryDetails.set(null);
      this.loadData();
    });
  }

  loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    if (this.activeCategoryId) {
      this.catagoriesService
        .getSpecificCategory(this.activeCategoryId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => this.selectedCategory.set(res.data ?? null),
          error: () => this.selectedCategory.set(null),
        });
    } else {
      this.selectedCategory.set(null);
    }

    const subCategories$ = this.activeCategoryId
      ? this.catagoriesService.getAllSubCategoriesOnCategory(this.activeCategoryId)
      : this.catagoriesService.getAllSubCategories();

    subCategories$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const items = response.data ?? [];
        this.subCategories.set(items);
        this.totalResults.set(response.results ?? items.length);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load subcategories. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  viewSubCategoryDetails(subId: string, event: Event): void {
    event.stopPropagation();
    this.isLoadingDetails.set(true);

    this.catagoriesService
      .getSpecificSubCategory(subId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.activeSubCategoryDetails.set(res.data ?? null);
          this.isLoadingDetails.set(false);
        },
        error: () => {
          this.isLoadingDetails.set(false);
        },
      });
  }

  closeSubCategoryDetails(): void {
    this.activeSubCategoryDetails.set(null);
  }
}
