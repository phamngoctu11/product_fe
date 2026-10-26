import type { ProductTypeField } from './custom-request.model';

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
  productTypeCode?: string | null;
  productTypeName?: string | null;
  productTypeVersion?: number | null;
  productTypeFields?: ProductTypeField[];
  fieldValues?: Record<string, unknown>;
  specSnapshot?: string | null;
  specVersion?: number;
  madeDaySnapshot?: number | null;
  productionDurationDays?: number | null;
  durationRuleVersion?: string | null;
  computedCompletionAt?: string | null;
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
  paymentStatus?: PaymentAttemptStatus | 'NOT_DUE' | string | null;
  paymentMethodType?: string | null;
  productionStatus?: string | null;
  productionStartedAt?: string | null;
  userId?: number | string | null;
  user_id?: number | string | null;
  customerName?: string;
  lastname?: string;
  items?: OrderItem[];
  orderItems?: OrderItem[];
  details?: OrderItem[];
  totalPrice: number;
  finalPrice: number | null;
  discountAmount?: number;
  voucherName?: string;
  startOrderTime: string;
  status: string;
  cancelReason: string | null;
  note: string | null;
  paymentMethod?: 'COD' | 'ONLINE' | string | null;
  email?: string | null;
  guestSessionId?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  shippingAddress?: string | null;
  approvedById?: string | number | null;
  approvedByFullName?: string | null;
  customer?: OrderCustomerInfo | null;
  managerId?: string | null;
  managerName?: string | null;
  staffId?: string | null;
  staffName?: string | null;
  confirmationDueAt?: string | null;
  currentAgreementVersion?: number | null;
  userVoucherId?: number | null;
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
  finalPrice: number | null;
  totalPrice?: number;
  status: string;
  startOrderTime: string;
  paymentMethod: string;
  paymentStatus?: PaymentAttemptStatus | 'NOT_DUE' | string | null;
  orderType?: 'CATALOG' | 'CUSTOM' | string | null;
  staffName?: string | null;
  version?: number;
}

export interface OrderCancellationResult {
  orderId: number;
  orderVersion: number;
  status: string;
  cancellationSource: string;
  reason: string;
  reputationPenalty: number;
  voucherRestored: boolean;
  assignmentReleased: boolean;
  cancelledAt: string;
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
  paymentStatus?: PaymentAttemptStatus | 'NOT_DUE' | string | null;
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

// ==========================================
// PHẦN 12: BÀN GIAO VẬN CHUYỂN, XÁC NHẬN NHẬN HÀNG, REORDER
// ==========================================

export type OrderType = 'CATALOG' | 'CUSTOM' | string;
export type OrderStatus =
  | 'PENDING_APPROVAL'
  | 'PENDING_ASSIGNMENT'
  | 'DISCUSSING'
  | 'WAITING_STAFF_CONFIRMATION'
  | 'ORDER_ACCEPTED'
  | 'ORDER_CREATING'
  | 'READY_TO_SHIP'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CANCELLED'
  | string;

export interface ShippingHandoverItemRequest {
  orderItemId: number;
  exportedQuantity: number;
}

export interface ShippingHandoverRequest {
  orderVersion: number;
  items: ShippingHandoverItemRequest[];
  handoverNote?: string;
}

export interface ShippingHandoverItemDTO {
  orderItemId: number;
  orderedQuantity: number;
  exportedQuantity: number;
}

export interface ShippingHandoverResponse {
  orderId: number;
  orderVersion: number;
  status: OrderStatus | string;
  shippingStartedAt: string;
  expectedShippingDays: number;
  expectedDeliveryAt: string;
  items: ShippingHandoverItemDTO[];
}

export interface ReceiptItemDTO {
  orderItemId: number;
  variantId?: number | null;
  productName: string;
  variantName?: string | null;
  orderedQuantity: number;
  exportedQuantity?: number | null;
  receivedQuantity?: number | null;
}

export interface ReceiptViewDTO {
  orderId: number;
  orderVersion: number;
  orderType: OrderType | string;
  status: OrderStatus | string;
  shippingStartedAt?: string | null;
  expectedShippingDays: number;
  expectedDeliveryAt?: string | null;
  deliveredAt?: string | null;
  canConfirmReceipt: boolean;
  dataWarning?: string | null;
  items: ReceiptItemDTO[];
}

export interface ItemCheckRequest {
  orderItemId: number;
  receivedQuantity: number;
}

export interface ReceiptConfirmRequest {
  orderVersion: number;
  receivedItems: ItemCheckRequest[];
  acceptMismatch?: boolean;
  note?: string | null;
}

export interface ReceiptMismatchDTO {
  orderItemId: number;
  variantId?: number | null;
  productName?: string | null;
  variantName?: string | null;
  orderedQuantity: number;
  exportedQuantity: number;
  receivedQuantity: number;
}

export interface ReceiptConfirmResponse {
  orderId: number;
  orderVersion: number;
  status: OrderStatus | string;
  matched: boolean;
  completed: boolean;
  mismatchAccepted: boolean;
  confirmedAt?: string;
  message?: string;
  mismatches?: ReceiptMismatchDTO[];
}

export interface ReorderItemDTO {
  orderItemId?: number | null;
  variantId?: number | null;
  variantName?: string | null;
  quantity: number;
  skipReason?: string | null;
}

export interface ReorderResponseDTO {
  orderType: OrderType | string;
  customDraftId?: number | null;
  addedItemCount: number;
  skippedItemCount: number;
  addedItems: ReorderItemDTO[];
  skippedItems: ReorderItemDTO[];
}

export type ReorderResponse = ReorderResponseDTO;
export type ReorderItem = ReorderItemDTO;

export type OrderAgreementStatus = 'DRAFT' | 'USER_SUBMITTED' | 'CHANGES_REQUESTED' | 'STAFF_CONFIRMED' | string;
export type OrderAgreementDecision = 'CONFIRM' | 'REQUEST_CHANGES';

export interface OrderAgreement {
  id: number | null;
  orderId: number;
  orderVersion: number;
  orderType: 'CATALOG' | 'CUSTOM' | string;
  orderStatus: string;
  agreementVersion: number | null;
  agreementStatus: OrderAgreementStatus | null;
  status?: OrderAgreementStatus | null;
  itemSnapshot: string | null;
  subtotal: number | null;
  discountAmount: number | null;
  finalPrice: number | null;
  userVoucherId?: number | null;
  submittedBy?: string | null;
  submittedAt?: string | null;
  confirmedBy?: string | null;
  confirmedAt?: string | null;
  decisionReason?: string | null;
  rejectionReason?: string | null;
  confirmationDueAt?: string | null;
}

export interface SubmitOrderAgreementRequest {
  orderVersion: number;
  description?: string | null;
  imageUrls?: string[] | null;
  quantity?: number | null;
  unitPrice?: number | null;
  productionDurationDays?: number | null;
  paymentMethod?: 'COD' | 'ONLINE' | null;
  userVoucherId?: number | null;
  note?: string | null;
}

export interface OrderAgreementDecisionRequest {
  orderVersion: number;
  agreementVersion: number;
  decision: OrderAgreementDecision;
  reason?: string | null;
}

export interface OrderChatThread {
  id: number;
  orderId: number;
  ownerUserId: string;
  assignedStaffId: string;
  createdAt: string;
}

export interface OrderChatMessage {
  id: string;
  orderId: number;
  chatThreadId: number;
  senderId: string;
  senderRole: string;
  senderName: string;
  content: string;
  timestamp: string;
  messageType?: string;
}

export interface SendOrderChatMessageRequest {
  orderId: number;
  content: string;
}

export interface CustomOrderItemSnapshot {
  description?: string | null;
  imageUrls?: string[] | null;
  quantity?: number | null;
  unitPrice?: number | null;
  productionDurationDays?: number | null;
  note?: string | null;
}

export interface CatalogOrderItemSnapshot {
  orderItemId: number;
  productName: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  productionDurationDays?: number | null;
}

export type PaymentAttemptStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';

export interface PaymentAttempt {
  attemptId: number;
  orderId: number;
  orderVersion: number;
  provider: 'SEPAY' | string;
  paymentCode: string;
  expectedAmount: number;
  status: PaymentAttemptStatus;
  openedAt: string;
  dueAt: string;
  paidAt?: string | null;
  bankCode?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  transferContent?: string | null;
  qrUrl?: string | null;
}

export interface ItemDeadline {
  orderItemId: number;
  productionDurationDays: number;
  computedCompletionAt: string;
}

export interface StartProductionResult {
  orderId: number;
  orderVersion: number;
  status: string;
  productionStartedAt: string;
  itemDeadlines: ItemDeadline[];
}

export type ChangeRequestStatus = 'PENDING_REVIEW' | 'APPLIED' | 'REJECTED';
export type ChangeRequestDecision = 'ACCEPT' | 'REJECT';

export interface OrderChangeRequest {
  id: number;
  version: number;
  orderId: number;
  orderVersion: number;
  orderItemId: number;
  productName?: string | null;
  variantName?: string | null;
  ownerId: string;
  assignedStaffId: string;
  baseAgreementVersion: number;
  baseSpecVersion: number;
  baseSpecSnapshot?: string | null;
  proposedSpecSnapshot: string;
  requestReason: string;
  status: ChangeRequestStatus;
  createdAt: string;
  decidedBy?: string | null;
  decidedAt?: string | null;
  decisionReason?: string | null;
  appliedVersion?: number | null;
  appliedSpecSnapshot?: string | null;
  currentSpecVersion: number;
  currentSpecSnapshot?: string | null;
  itemProductionStatus?: string | null;
}

export interface CreateOrderChangeRequest {
  orderVersion: number;
  orderItemId: number;
  baseSpecVersion: number;
  proposedDescription: string;
  fieldValues: Record<string, unknown>;
  reason: string;
}

export interface DecideOrderChangeRequest {
  orderVersion: number;
  changeRequestVersion: number;
  decision: ChangeRequestDecision;
  reason?: string | null;
}
