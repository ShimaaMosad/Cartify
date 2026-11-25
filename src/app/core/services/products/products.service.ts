import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductDetailsResponse, ProductsDataResponse } from '../../models/products-data.interface';
import { environment } from '../../../../environments/environment';

export interface ProductsFilterParams {
  subcategory?: string;
  category?: string;
  brand?: string;
  keyword?: string;
  sort?: string;
  page?: number;
  limit?: number;
  fields?: string;
  'price[gte]'?: number;
  'price[lte]'?: number;
  'category[in]'?: string[];
}

@Service()
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/products`;

  getAllProducts(filters?: ProductsFilterParams): Observable<ProductsDataResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.subcategory) {
        params = params.set('subcategory', filters.subcategory);
      }
      if (filters.category) {
        params = params.set('category', filters.category);
      }
      if (filters.brand) {
        params = params.set('brand', filters.brand);
      }
      if (filters.keyword) {
        params = params.set('keyword', filters.keyword);
      }
      if (filters.sort) {
        params = params.set('sort', filters.sort);
      }
      if (filters.page !== undefined) {
        params = params.set('page', filters.page);
      }
      if (filters.limit !== undefined) {
        params = params.set('limit', filters.limit);
      }
      if (filters.fields) {
        params = params.set('fields', filters.fields);
      }
      if (filters['price[gte]'] !== undefined) {
        params = params.set('price[gte]', filters['price[gte]']);
      }
      if (filters['price[lte]'] !== undefined) {
        params = params.set('price[lte]', filters['price[lte]']);
      }
      if (filters['category[in]']?.length) {
        for (const catId of filters['category[in]']) {
          params = params.append('category[in]', catId);
        }
      }
    }

    return this.http.get<ProductsDataResponse>(this.baseUrl, { params });
  }

  getSpecificProduct(productId: string): Observable<ProductDetailsResponse> {
    return this.http.get<ProductDetailsResponse>(`${this.baseUrl}/${productId}`);
  }
}
