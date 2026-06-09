export interface OrderItem {
  id?: number;
  orderItemId?: number;
  variantId?: number;
  productVariantId?: number;
  productId: number;
  productName: string;
  variantName?: string;
  attributes?: string;
  quantity: number;
  price: number;
  image_url?: string;
  imageUrl?: string;

  exportedQuantity?: number | null;
  receivedQuantity?: number | null;
}

export interface Order {
  id: number;
  userId?: number;
  user_id?: number;
  customerName?: string;
  lastname?: string;
  items?: OrderItem[];
  orderItems?: OrderItem[];
  details?: OrderItem[];
  totalPrice: number;
  finalPrice: number;
  discountAmount?: number;
  voucherName?: string;
  startOrderTime: string;
  endOrderTime: string | null;
  status: string;
  cancelReason: string | null;
  note: string | null;
  paymentMethod?: string;
  approvedById?: number | null;
  approvedByFullName?: string | null;
  managerId?: number | null;
  managerName?: string | null;
  staffId?: number | null;
  staffName?: string | null;
}
export interface OrderListDTO {
  id: number;
  customerName: string;
  finalPrice: number;
  status: string;
  startOrderTime: string;
  paymentMethod: string;
  staffName?: string | null;
}

export interface OrderStatusHistory {
  id: number;
  oldstatus: string;
  newstatus: string;
  updatetime: string;
  changerId?: number;
}

export interface ItemCheckRequest {
  variantId: number;
  quantity: number;
}

export interface ReceiptConfirmRequest {
  receivedItems: ItemCheckRequest[];
  acceptMismatch: boolean;
}

export interface ReceiptComplaintRequest {
  receivedItems: ItemCheckRequest[];
  note?: string;
}

export interface ReceiptMismatchDTO {
  variantId: number;
  variantName: string;
  orderedQuantity: number;
  exportedQuantity: number;
  receivedQuantity: number;
}

export interface ReceiptConfirmResponse {
  matched: boolean;
  confirmed: boolean;
  message: string;
  mismatches: ReceiptMismatchDTO[];
}


