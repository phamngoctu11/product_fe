export type ProductAvailabilityStatus = 'ACCEPTING_ORDERS' | 'PAUSED' | 'DISCONTINUED';

export interface Product {
  id?: number;
  product_name: string;
  price: number;
  madeDay?: number;
  tags?: string[];
  image_url?: string;
  variants?: ProductVariant[];
  availabilityStatus?: ProductAvailabilityStatus;
  productTypeId?: number | null;
  productTypeCode?: string | null;
  productTypeName?: string | null;
}


export interface ProductVariant {
  id?: number;
  variantName: string;
  price: number;
  attributes?: string;
  parsedAttributes?: any;
  image_url?: string;
}

export interface BestSellingProduct {
  productId: number;
  productName: string;
  soldQuantity: number;
  imageUrl?: string;
}

export interface PageResponse<T> {
  content: T[];
  number: number;
  size: number;
  totalPages: number;
  totalElements: number;
}
