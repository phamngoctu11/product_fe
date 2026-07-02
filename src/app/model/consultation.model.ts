export type ConsultationStatus =
  | 'WAITING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'CLOSED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface ConsultationCreateRequest {
  productId: number;
  firstMessage: string;
}

export interface ConsultationRequest {
  id: number;
  userId: string;
  customerName: string;
  productId: number;
  productName: string;
  productImageUrl?: string | null;
  status: ConsultationStatus;
  assignedStaffId?: number | null;
  assignedStaffName?: string | null;
  assignedByManagerId?: number | null;
  assignedByManagerName?: string | null;
  createdAt: string;
  assignedAt?: string | null;
  claimedAt?: string | null;
  lastMessageAt?: string | null;
}
