import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CashOrderResponse,
  CheckoutSessionResponse,
  Order,
  ShippingAddress,
} from '../../models/orders.interface';

export interface UserOrdersResponse {
  data?: Order[];
  orders?: Order[];
  results?: number;
}

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly ordersUrl = `${environment.apiUrl}/api/v1/orders`;
  private readonly apiV2Url = `${environment.apiUrl}/api/v2/orders`;

  createCashOrderFromCart(
    cartId: string,
    shippingAddress: ShippingAddress,
  ): Observable<CashOrderResponse> {
    return this.http.post<CashOrderResponse>(`${this.ordersUrl}/${cartId}`, {
      shippingAddress,
    });
  }

  checkoutSession(
    cartId: string,
    shippingAddress: ShippingAddress,
    returnUrl?: string,
  ): Observable<CheckoutSessionResponse> {
    const origin = returnUrl ?? (typeof window !== 'undefined' ? window.location.origin : '');
    const query = origin ? `?url=${encodeURIComponent(origin)}` : '';
    return this.http.post<CheckoutSessionResponse>(
      `${this.ordersUrl}/checkout-session/${cartId}${query}`,
      { shippingAddress },
    );
  }

  getUserOrders(userId?: string): Observable<UserOrdersResponse | Order[]> {
    const endpoint = userId ? `${this.ordersUrl}/user/${userId}` : this.ordersUrl;
    return this.http.get<UserOrdersResponse | Order[]>(endpoint);
  }

  getAllOrdersV2(): Observable<UserOrdersResponse | Order[]> {
    return this.http.get<UserOrdersResponse | Order[]>(this.apiV2Url);
  }
}
