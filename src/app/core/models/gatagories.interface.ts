export interface CategoriesMetadata {
  currentPage: number;
  numberOfPages: number;
  limit: number;
  nextPage?: number;
}

// --- Categories Interfaces ---
export interface Category {
  _id: string;
  name: string;
  slug: string;
  image: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface CategoriesResponse {
  results?: number;
  metadata?: CategoriesMetadata;
  data: Category[];
}

export interface CategoryResponse {
  data: Category;
}

// --- SubCategories Interfaces ---
export interface Subcategory {
  _id: string;
  name: string;
  slug: string;
  category: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface SubCategoriesResponse {
  results?: number;
  metadata?: CategoriesMetadata;
  data: Subcategory[];
}

export interface SubCategoryDetailsResponse {
  data: Subcategory;
}
