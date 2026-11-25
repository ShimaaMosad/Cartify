export interface CartEntityRef {
  _id: string;
  id?: string;
  name: string;
  slug?: string;
  image?: string;
}

export interface CartProductSummary {
  _id: string;
  id?: string;
  title: string;
  slug?: string;
  imageCover: string;
  ratingsAverage?: number;
  category: CartEntityRef;
  brand: CartEntityRef;
}

export interface CartLineItem {
  _id: string;
  count: number;
  price: number;
  product: CartProductSummary;
}

export interface CartData {
  _id: string;
  id?: string;
  cartOwner?: string;
  products: CartLineItem[];
  totalCartPrice: number;
  totalCartPriceAfterDiscount?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartResponse {
  status?: string;
  message?: string;
  numOfCartItems: number;
  cartId?: string | null;
  data: CartData | null;
}

export interface AddToCartRequest {
  productId: string;
}

export interface UpdateCartQuantityRequest {
  count: number;
}

export interface ApplyCouponRequest {
  couponName: string;
}
