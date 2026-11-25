export interface ShippingAddress {
  details: string;
  phone: string;
  city: string;
  postalCode?: string;
}

export interface OrderProductSummary {
  _id: string;
  id?: string;
  title: string;
  imageCover?: string;
  category?: {
    _id?: string;
    name?: string;
  };
  brand?: {
    _id?: string;
    name?: string;
  };
}

export interface OrderLineItem {
  _id?: string;
  count: number;
  price: number;
  product: OrderProductSummary;
}

export interface OrderUserSummary {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface Order {
  _id: string;
  id?: number | string;
  user?: OrderUserSummary | string;
  cartItems: OrderLineItem[];
  shippingAddress?: ShippingAddress;
  taxPrice?: number;
  shippingPrice?: number;
  totalOrderPrice: number;
  paymentMethodType?: 'cash' | 'card' | string;
  isPaid: boolean;
  paidAt?: string;
  isDelivered: boolean;
  deliveredAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CashOrderResponse {
  status?: string;
  message?: string;
  data?: Order;
}

export interface CheckoutSessionPayload {
  url?: string;
  success_url?: string;
  cancel_url?: string;
}

export interface CheckoutSessionResponse {
  status?: string;
  message?: string;
  url?: string;
  session?: CheckoutSessionPayload;
}

export interface UserOrdersResponse {
  status?: string;
  results?: number;
  data?: Order[];
  orders?: Order[];
}
