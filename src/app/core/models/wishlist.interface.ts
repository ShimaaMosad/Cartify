export interface ProductSubcategory {
  _id: string;
  name: string;
  slug: string;
  category: string;
}

export interface ProductCategory {
  _id: string;
  name: string;
  slug: string;
  image: string;
}

export interface ProductBrand {
  _id: string;
  name: string;
  slug: string;
  image: string;
}

export interface WishlistProduct {
  _id: string;
  id: string;
  title: string;
  slug: string;
  description: string;
  quantity: number;
  sold: number;
  price: number;
  priceAfterDiscount?: number;
  images: string[];
  imageCover: string;
  availableColors?: string[];
  subcategory: ProductSubcategory[];
  category: ProductCategory;
  brand: ProductBrand;
  ratingsAverage: number;
  ratingsQuantity: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface WishlistResponse {
  status: string;
  count: number;
  data: WishlistProduct[];
}

export interface WishlistRequest {
  productId: string;
}

export interface WishlistActionResponse {
  status: string;
  message: string;
  data: WishlistProduct[] | string[];
}
