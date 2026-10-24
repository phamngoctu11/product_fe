export type OrderStatus =
  | 'ORDER_PENDING'
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

export type ProductionCheckpointStage = 'INITIAL_SHAPE' | 'FINAL_PRODUCT';

export type ProductionCheckpointStatus = 'PENDING_REVIEW' | 'PASSED' | 'REWORK_REQUIRED';

export type ProductionDecisionType = 'PASS' | 'REWORK_REQUIRED';

export type OrderItemProductionStatus =
  | 'NOT_REQUIRED'
  | 'WAITING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'INITIAL_IN_PROGRESS'
  | 'FINAL_IN_PROGRESS'
  | 'FINAL_WAITING_QC'
  | 'FINAL_REWORK_REQUIRED'
  | 'READY';

export interface ProductionCheckpointImageDTO {
  id?: number;
  imageUrl: string;
  publicId?: string;
  displayOrder?: number;
  createdAt?: string;
}

export interface ProductionDecisionDTO {
  id?: number;
  decisionType: ProductionDecisionType;
  reason?: string;
  decidedById?: string;
  decidedByName?: string;
  decidedAt?: string;
}

export interface OrderItemAssignmentDTO {
  id: number;
  orderItemId: number;
  assignedStaffId: string;
  assignedStaffName?: string;
  assignedById?: string;
  assignedByName?: string;
  assignedAt: string;
  updatedAt?: string;
  version: number;
}

export interface ProductionCheckpointDTO {
  id: number;
  orderItemId: number;
  stage: ProductionCheckpointStage;
  status: ProductionCheckpointStatus;
  attemptNumber: number;
  note?: string;
  managerReviewRequired: boolean;
  submittedById?: string;
  submittedByName?: string;
  submittedAt: string;
  images: ProductionCheckpointImageDTO[];
  decision?: ProductionDecisionDTO;
  version: number;
}

export interface OrderItemProductionDTO {
  orderItemId: number;
  productName: string;
  variantName?: string;
  quantity: number;
  productionDurationDays?: number;
  computedCompletionAt?: string;
  productionStatus: OrderItemProductionStatus;
  assignment?: OrderItemAssignmentDTO;
  checkpoints: ProductionCheckpointDTO[];
}

export interface SubmitProductionCheckpointRequest {
  orderVersion: number;
  stage: ProductionCheckpointStage;
  imageUrls: string[];
  note?: string;
}

export interface ReviewProductionCheckpointRequest {
  checkpointVersion: number;
  decision: ProductionDecisionType;
  reason?: string;
}

export interface ReviewProductionCheckpointResultDTO {
  checkpoint: ProductionCheckpointDTO;
  orderId: number;
  orderVersion: number;
  orderStatus: OrderStatus;
  itemProductionStatus: OrderItemProductionStatus;
  remainingOrderItemIds: number[];
  assignmentReleased: boolean;
}
