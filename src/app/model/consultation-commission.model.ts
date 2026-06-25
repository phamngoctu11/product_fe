export type CommissionPeriod = 'DAY' | 'WEEK' | 'MONTH';
export type CommissionStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface CommissionQuery {
  period?: CommissionPeriod;
  from?: string;
  to?: string;
}

export interface CommissionDetailQuery extends CommissionQuery {
  status?: CommissionStatus;
  page?: number;
  size?: number;
}

export interface StaffCommissionSummary {
  staffId: number;
  staffName: string;
  avatarUrl?: string | null;
  periodStart: string;
  periodEnd: string;
  confirmedCommissionAmount: number;
  confirmedRevenueAmount: number;
  confirmedOrderCount: number;
  confirmedAttributionCount: number;
  pendingCommissionAmount: number;
  pendingRevenueAmount: number;
  pendingOrderCount: number;
  pendingAttributionCount: number;
  cancelledAttributionCount: number;
}

export interface StaffCommissionDetail {
  attributionId: number;
  staffId: number;
  staffName: string;
  customerId: number;
  customerName: string;
  orderId: number;
  orderItemId: number;
  productId: number;
  productName: string;
  productVariantId: number;
  productVariantName: string;
  consultationRequestId: number;
  consultationCreatedAt: string;
  consultationAcceptedAt: string | null;
  firstStaffReplyAt: string | null;
  orderCreatedAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  orderedQuantity: number;
  exportedQuantity?: number | null;
  receivedQuantity: number;
  itemAmount: number;
  bonusPercent: number;
  bonusAmount: number;
  status: CommissionStatus;
  reviewed: boolean;
}
