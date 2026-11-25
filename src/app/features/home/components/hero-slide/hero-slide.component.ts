import { Component, computed, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { RouterLink } from '@angular/router';
import { ProductsService } from '../../../../core/services/products/products.service';
import { CatagoriesService } from '../../../../core/services/catagories/catagories.service';

export interface HeroSlide {
  id: string;
  categoryId?: string;
  title: string;
  description: string;
  image: string;
  targetRoute: string;
  productsCount?: number;
}

@Component({
  selector: 'app-hero-slide',
  standalone: true,
  imports: [RouterLink],
  styleUrl: './hero-slide.component.css',
  templateUrl: './hero-slide.component.html',
})
export class HeroSlideComponent implements OnInit, OnDestroy {
  private readonly productsService = inject(ProductsService);
  private readonly catagoriesService = inject(CatagoriesService);
  private readonly destroyRef = inject(DestroyRef);

  private timerId: number | null = null;
  private touchStartX: number | null = null;

  readonly slides = signal<HeroSlide[]>([]);
  readonly activeIndex = signal<number>(0);
  readonly isPaused = signal<boolean>(false);
  readonly realProductsCount = signal<number | null>(null);
  readonly realCategoriesCount = signal<number | null>(null);
  readonly firstCategoryName = signal<string>('');

  readonly currentSlide = computed<HeroSlide | null>(() => {
    const list = this.slides();
    if (!list.length) return null;
    const safeIndex = Math.min(this.activeIndex(), list.length - 1);
    return list[safeIndex] ?? null;
  });

  ngOnInit(): void {
    this.loadRealStoreData();
    this.startAutoPlay();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  nextSlide(): void {
    const total = this.slides().length;
    if (total <= 1) return;
    this.activeIndex.update((current) => (current + 1) % total);
  }

  prevSlide(): void {
    const total = this.slides().length;
    if (total <= 1) return;
    this.activeIndex.update((current) => (current - 1 + total) % total);
  }

  goToSlide(index: number): void {
    const total = this.slides().length;
    if (index >= 0 && index < total) {
      this.activeIndex.set(index);
    }
  }

  setPaused(paused: boolean): void {
    this.isPaused.set(paused);
  }

  onTouchStart(event: TouchEvent): void {
    const firstTouch = event.touches[0];
    if (firstTouch) {
      this.touchStartX = firstTouch.clientX;
    }
  }

  onTouchEnd(event: TouchEvent): void {
    const changedTouch = event.changedTouches[0];
    if (this.touchStartX === null || !changedTouch) return;

    const deltaX = changedTouch.clientX - this.touchStartX;
    this.touchStartX = null;

    if (Math.abs(deltaX) > 45) {
      if (deltaX < 0) {
        this.nextSlide();
      } else {
        this.prevSlide();
      }
    }
  }

  private startAutoPlay(): void {
    this.stopAutoPlay();
    this.timerId = window.setInterval(() => {
      if (!this.isPaused()) {
        this.nextSlide();
      }
    }, 5000);
  }

  private stopAutoPlay(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private loadRealStoreData(): void {
    forkJoin({
      categoriesRes: this.catagoriesService.getAllCategories().pipe(catchError(() => of(null))),
      productsRes: this.productsService
        .getAllProducts({ limit: 100 })
        .pipe(catchError(() => of(null))),
    })
      .pipe(
        switchMap(({ categoriesRes, productsRes }) => {
          const categories = Array.isArray(categoriesRes?.data) ? categoriesRes.data : [];
          const allProducts = Array.isArray(productsRes?.data) ? productsRes.data : [];

          if (categories.length > 0) {
            this.realCategoriesCount.set(categories.length);
            const firstCat = categories[0] as unknown as Record<string, unknown> | undefined;
            if (firstCat?.['name']) {
              this.firstCategoryName.set(String(firstCat['name']));
            }
          }

          const allMeta = productsRes as unknown as { results?: number; total?: number } | null;
          const apiTotalResults =
            typeof allMeta?.results === 'number'
              ? allMeta.results
              : typeof allMeta?.total === 'number'
                ? allMeta.total
                : undefined;

          if (typeof apiTotalResults === 'number') {
            this.realProductsCount.set(apiTotalResults);
          } else if (allProducts.length > 0) {
            this.realProductsCount.set(allProducts.length);
          }

          if (!categories.length) {
            return of([]);
          }

          // Check each category so we only include categories that have real products
          const checks = categories.map((rawCat) => {
            const cat = rawCat as unknown as Record<string, unknown>;
            const catId = String(cat['_id'] ?? cat['id'] ?? '').trim();
            const catName = String(cat['name'] ?? '').trim();
            const catImage = String(cat['image'] ?? '').trim();

            if (!catId || !catName) {
              return of(null);
            }

            return this.productsService.getAllProducts({ category: catId, limit: 100 }).pipe(
              map((catProdRes) => {
                const catProducts = Array.isArray(catProdRes?.data) ? catProdRes.data : [];
                if (catProducts.length === 0) {
                  return null;
                }

                const meta = catProdRes as unknown as { results?: number; total?: number } | null;
                const categoryCount =
                  typeof meta?.results === 'number'
                    ? meta.results
                    : typeof meta?.total === 'number'
                      ? meta.total
                      : catProducts.length;

                const firstProd = catProducts[0] as unknown as Record<string, unknown> | undefined;
                const prodImage = String(
                  firstProd?.['imageCover'] ?? firstProd?.['image'] ?? '',
                ).trim();
                const prodTitle = String(firstProd?.['title'] ?? firstProd?.['name'] ?? '').trim();
                const finalImage = prodImage || catImage;

                if (!finalImage) {
                  return null;
                }

                const slide: HeroSlide = {
                  id: catId,
                  categoryId: catId,
                  title: catName,
                  description: prodTitle
                    ? `${catName} — ${prodTitle}`
                    : `Browse ${catName} on Cartify`,
                  image: finalImage,
                  targetRoute: '/shop',
                  productsCount: categoryCount,
                };

                return slide;
              }),
              catchError(() => of(null)),
            );
          });

          return forkJoin(checks).pipe(
            map((results) => {
              const nonEmptySlides = results.filter((s): s is HeroSlide => s !== null);
              if (nonEmptySlides.length > 0) {
                return nonEmptySlides.slice(0, 4);
              }

              const fallbackSlides: HeroSlide[] = [];
              for (const rawProd of allProducts) {
                const prod = rawProd as unknown as Record<string, unknown>;
                const prodId = String(prod['_id'] ?? prod['id'] ?? '').trim();
                const prodTitle = String(prod['title'] ?? prod['name'] ?? '').trim();
                const prodImage = String(prod['imageCover'] ?? prod['image'] ?? '').trim();
                if (!prodTitle || !prodImage) continue;

                fallbackSlides.push({
                  id: prodId || prodTitle,
                  title: prodTitle,
                  description: 'Available now in Cartify',
                  image: prodImage,
                  targetRoute: prodId ? `/product-details/${prodId}` : '/shop',
                });

                if (fallbackSlides.length === 4) break;
              }
              return fallbackSlides;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((builtSlides) => {
        this.slides.set(builtSlides);
        this.activeIndex.set(0);
      });
  }
}
