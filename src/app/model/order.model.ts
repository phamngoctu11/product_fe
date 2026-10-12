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
  sourceType?: 'CATALOG' | 'CUSTOM' | string | null;
  description?: string | null;
  imageUrls?: string[];
  specSnapshot?: string | null;
  madeDaySnapshot?: number | null;
  productionDurationDays?: number | null;
  durationRuleVersion?: string | null;
  computedCompletionAt?: string | null;
  handmade?: boolean;
  productionStatus?: string | null;

  exportedQuantity?: number | null;
  receivedQuantity?: number | null;
  reviewed?: boolean;
  reviewId?: number | null;
}

export interface Order {
  id: number;
  version?: number;
  orderType?: 'CATALOG' | 'CUSTOM' | string | null;
  paymentStatus?: string | null;
  paymentMethodType?: string | null;
  productionStatus?: string | null;
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
  email?: string | null;
  guestSessionId?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  shippingAddress?: string | null;
  approvedById?: number | null;
  approvedByFullName?: string | null;
  customer?: OrderCustomerInfo | null;
  managerId?: number | null;
  managerName?: string | null;
  staffId?: number | null;
  staffName?: string | null;
}

export interface OrderCustomerInfo {
  guest: boolean;
  userId?: string | null;
  guestSessionId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
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

export interface ManagerOrderReviewSummary {
  orderId: number;
  orderVersion: number;
  orderType: 'CATALOG' | 'CUSTOM';
  customerName: string;
  guest: boolean;
  totalQuantity: number;
  finalPrice: number | null;
  paymentMethod: 'COD' | 'ONLINE' | string | null;
  status: string;
  createdAt: string;
}

export interface OrderAssignmentQueueItem {
  orderId: number;
  orderVersion: number;
  orderType: 'CATALOG' | 'CUSTOM';
  customerName: string;
  finalPrice: number | null;
  paymentMethod: string | null;
  status: string;
  createdAt: string;
}

export interface AvailableStaff {
  staffId: string;
  displayName: string;
  avatarUrl?: string | null;
  available: boolean;
}

export interface OrderAssignment {
  assignmentId: number;
  assignmentVersion: number;
  orderId: number;
  staffId: string;
  staffName: string;
  source: 'MANAGER' | 'SELF_CLAIM' | 'MIGRATION' | string;
  assignedBy?: string | null;
  assignedAt: string;
  status: 'ACTIVE' | 'RELEASED' | string;
}

export interface ManagerOrderReviewDetail {
  order: Order;
  decision?: 'APPROVED' | 'REJECTED' | null;
  managerApprovedAt?: string | null;
  managerRejectedAt?: string | null;
  confirmationDueAt?: string | null;
  activeAssignment?: OrderAssignment | null;
}

export interface ManagerReviewRequest {
  orderVersion: number;
  approved: boolean;
  reason?: string | null;
  staffId?: string | null;
}

export interface ManagerReviewResult {
  orderId: number;
  orderVersion: number;
  orderStatus: string;
  decision: 'APPROVED' | 'REJECTED';
  managerId: string;
  managerName: string;
  reviewedAt: string;
  confirmationDueAt?: string | null;
  rejectionReason?: string | null;
  assignment?: OrderAssignment | null;
}

export interface OrderAssignmentResult {
  orderId: number;
  orderVersion: number;
  orderStatus: string;
  assignment: OrderAssignment;
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

export interface ReorderItem {
  variantId: number | null;
  variantName: string;
  quantity: number;
  skipReason?: string | null;
}

export interface ReorderResponse {
  addedItemCount: number;
  skippedItemCount: number;
  addedItems: ReorderItem[];
  skippedItems: ReorderItem[];
}
