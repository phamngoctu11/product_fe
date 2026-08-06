export type ProductReviewStatus = 'VISIBLE' | 'HIDDEN';

export interface ProductReviewRequest {
  rating?: number | null;
  comment?: string | null;
  imageUrls?: string[];
}

export interface ProductReview {
  id: number;
  orderId: number;
  orderItemId: number;
  productId: number;
  variantId: number;
  productName: string;
  variantName: string;
  rating?: number | null;
  comment?: string | null;
  imageUrls: string[];
  userId: string;
  username: string;
  userDisplayName?: string | null;
  userAvatarUrl?: string | null;
  status: ProductReviewStatus;
  verifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReviewSummary {
  productId?: number | null;
  variantId?: number | null;
  reviewCount: number;
  ratingCount: number;
  averageRating: number;
  fiveStarCount: number;
  fourStarCount: number;
  threeStarCount: number;
  twoStarCount: number;
  oneStarCount: number;
}
