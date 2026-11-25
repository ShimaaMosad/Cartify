import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { BrandResponse, BrandsResponse } from '../../models/brands.interface';

@Service()
export class BrandsService {
  private readonly http = inject(HttpClient);
  private readonly brandsUrl = `${environment.apiUrl}/api/v1/brands`;

  getAllBrands(limit?: number, keyword?: string): Observable<BrandsResponse> {
    let params = new HttpParams();

    if (limit !== undefined) {
      params = params.set('limit', limit);
    }

    if (keyword) {
      params = params.set('keyword', keyword);
    }

    return this.http.get<BrandsResponse>(this.brandsUrl, { params });
  }

  getSpecificBrand(brandId: string): Observable<BrandResponse> {
    return this.http.get<BrandResponse>(`${this.brandsUrl}/${brandId}`);
  }
}
