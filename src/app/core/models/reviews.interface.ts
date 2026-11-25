export interface CreateReviewRequest {
  review: string;
  rating: number;
}

export interface ReviewUser {
  _id: string;
  name: string;
  role?: string;
}

export interface Review {
  _id: string;
  review: string;
  rating: number;
  product: string;
  user: string | ReviewUser;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface ReviewsResponse {
  results: number;
  metadata: {
    currentPage: number;
    numberOfPages: number;
    limit: number;
    nextPage?: number;
  };
  data: Review[];
}

export interface ReviewResponse {
  data: Review;
}
