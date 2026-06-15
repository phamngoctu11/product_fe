export interface Product {
  id?: number;
  product_name: string;
  price: number;
  tags?: string;
  quantity?: number;
  image_url?: string; // DUY NHẤT 1 KIỂU
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id?: number;
  variantName: string;
  price: number;
  quantity: number;
  attributes?: string;
  parsedAttributes?: any;
  image_url?: string; // DUY NHẤT 1 KIỂU
  restockQuantity?: number;
}

export interface StockImportRequest {
  quantity: number;
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

