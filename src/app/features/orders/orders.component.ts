import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { Order } from '../../core/models/orders.interface';
import { OrdersService } from '../../core/services/orders/orders.service';
import { CartService } from '../../core/services/cart/cart.service';
import { ToastService } from '../../core/services/toast/toast.service';

export type OrderPaymentFilter = 'all' | 'paid' | 'unpaid';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './orders.component.html',
})
export class UserOrdersComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);
  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly orders = signal<Order[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly paymentFilter = signal<OrderPaymentFilter>('all');
  readonly reorderingOrderId = signal<string | number | null>(null);

  readonly filteredOrders = computed<Order[]>(() => {
    const filter = this.paymentFilter();
    const list = this.orders();

    if (filter === 'paid') {
      return list.filter((order) => Boolean(order.isPaid));
    }
    if (filter === 'unpaid') {
      return list.filter((order) => !order.isPaid);
    }
    return list;
  });

  readonly totalOrdersCount = computed<number>(() => this.orders().length);
  readonly paidOrdersCount = computed<number>(
    () => this.orders().filter((order) => Boolean(order.isPaid)).length,
  );

  ngOnInit(): void {
    this.loadOrders();
  }

  setFilter(filter: OrderPaymentFilter): void {
    this.paymentFilter.set(filter);
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.ordersService
      .getUserOrders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
              ? res.data
              : Array.isArray(res?.orders)
                ? res.orders
                : [];
          this.orders.set(list);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.toastr.error('Could not load your order history.', 'Orders Error');
        },
      });
  }

  onReorder(order: Order): void {
    const orderKey = order._id ?? order.id ?? null;
    const items = order.cartItems ?? [];

    if (!items.length) {
      this.toastr.info('This order has no items to reorder.', 'Reorder');
      return;
    }

    this.reorderingOrderId.set(orderKey);

    const requests = items
      .map((item) => {
        const productId = item.product?._id ?? item.product?.id ?? '';
        if (!productId) return null;

        return this.cartService.addProductToCart(productId).pipe(catchError(() => of(null)));
      })
      .filter((req) => req !== null);

    if (!requests.length) {
      this.reorderingOrderId.set(null);
      this.toastr.error('Unable to match products from this order.', 'Reorder Error');
      return;
    }

    forkJoin(requests)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.reorderingOrderId.set(null)),
      )
      .subscribe(() => {
        this.cartService.getLoggedUserCart().subscribe({ error: () => {} });
        this.toastr.success('Order items added to your cart.', 'Cart Updated');
        this.router.navigate(['/cart']);
      });
  }
}
