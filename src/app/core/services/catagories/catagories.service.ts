import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CategoriesResponse,
  CategoryResponse,
  SubCategoriesResponse,
  SubCategoryDetailsResponse,
} from '../../models/gatagories.interface';

@Injectable({
  providedIn: 'root',
})
export class CatagoriesService {
  private readonly http = inject(HttpClient);
  private readonly categoriesUrl = `${environment.apiUrl}/api/v1/categories`;
  private readonly subCategoriesUrl = `${environment.apiUrl}/api/v1/subcategories`;

  // --- Categories Endpoints ---
  getAllCategories(): Observable<CategoriesResponse> {
    return this.http.get<CategoriesResponse>(this.categoriesUrl);
  }

  getSpecificCategory(categoryId: string): Observable<CategoryResponse> {
    return this.http.get<CategoryResponse>(`${this.categoriesUrl}/${categoryId}`);
  }

  // --- SubCategories Endpoints ---
  getAllSubCategories(): Observable<SubCategoriesResponse> {
    return this.http.get<SubCategoriesResponse>(this.subCategoriesUrl);
  }

  getSpecificSubCategory(subCategoryId: string): Observable<SubCategoryDetailsResponse> {
    return this.http.get<SubCategoryDetailsResponse>(`${this.subCategoriesUrl}/${subCategoryId}`);
  }

  getAllSubCategoriesOnCategory(categoryId: string): Observable<SubCategoriesResponse> {
    return this.http.get<SubCategoriesResponse>(
      `${this.categoriesUrl}/${categoryId}/subcategories`,
    );
  }
}
