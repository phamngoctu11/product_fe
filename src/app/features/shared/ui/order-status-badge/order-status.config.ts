export interface OrderStatusPresentation {
  label: string;
  icon: string;
  tone: 'warning' | 'info' | 'primary' | 'success' | 'danger' | 'secondary';
}

export const ORDER_STATUS_PRESENTATION: Readonly<Record<string, OrderStatusPresentation>> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', icon: 'bi-credit-card', tone: 'warning' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', icon: 'bi-hourglass-split', tone: 'warning' },
  PENDING_WAREHOUSE: { label: 'Chờ kho', icon: 'bi-box-seam', tone: 'warning' },
  WAREHOUSE_ASSIGNED: { label: 'Đã nhận kho', icon: 'bi-person-check', tone: 'primary' },
  PENDING_KCS: { label: 'Chờ KCS', icon: 'bi-shield-check', tone: 'info' },
  SHIPPING: { label: 'Đang giao', icon: 'bi-truck', tone: 'primary' },
  DELIVERED: { label: 'Đã giao', icon: 'bi-check-circle', tone: 'success' },
  CANCELLED: { label: 'Đã hủy', icon: 'bi-x-circle', tone: 'danger' },
};

export const DEFAULT_ORDER_STATUS_PRESENTATION: OrderStatusPresentation = {
  label: 'Không xác định',
  icon: 'bi-info-circle',
  tone: 'secondary',
};
