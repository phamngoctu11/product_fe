export const APP_ROLE = {
  admin: 'ADMIN',
  manager: 'MANAGER',
  staff: 'STAFF',
  user: 'USER',
} as const;

export type AppRole = (typeof APP_ROLE)[keyof typeof APP_ROLE];

export const ROUTE_ACCESS = {
  management: [APP_ROLE.admin, APP_ROLE.manager],
  operations: [APP_ROLE.admin, APP_ROLE.manager, APP_ROLE.staff],
  staff: [APP_ROLE.staff],
  customer: [APP_ROLE.user],
} as const satisfies Record<string, readonly AppRole[]>;

export interface AppNavigationItem {
  label: string;
  route: string;
  icon: string;
  roles?: readonly AppRole[];
}

export const APP_NAVIGATION: readonly AppNavigationItem[] = [
  { label: 'Giỏ hàng', route: '/cart', icon: 'bi-bag-check-fill', roles: ROUTE_ACCESS.customer },
  { label: 'Bảng thống kê', route: '/admin-dashboard', icon: 'bi-bar-chart-line-fill', roles: ROUTE_ACCESS.management },
  { label: 'Quản lý chat', route: '/admin-chat', icon: 'bi-chat-square-dots-fill', roles: ROUTE_ACCESS.operations },
  { label: 'Hoa hồng tư vấn', route: '/commissions', icon: 'bi-cash-stack', roles: ROUTE_ACCESS.operations },
  { label: 'Quản lý sản phẩm', route: '/product', icon: 'bi-grid-fill' },
  { label: 'Quản lý người dùng', route: '/user', icon: 'bi-people-fill', roles: ROUTE_ACCESS.management },
  { label: 'Duyệt đơn hàng', route: '/admin-orders', icon: 'bi-clipboard2-check-fill', roles: ROUTE_ACCESS.management },
  { label: 'Cấu hình voucher', route: '/admin-vouchers', icon: 'bi-ticket-perforated-fill', roles: ROUTE_ACCESS.management },
  { label: 'Kho hàng', route: '/staff-orders', icon: 'bi-box-seam-fill', roles: ROUTE_ACCESS.staff },
  { label: 'Đơn hàng của tôi', route: '/orders', icon: 'bi-receipt-cutoff', roles: ROUTE_ACCESS.customer },
  { label: 'Yêu thích', route: '/wishlist', icon: 'bi-heart-fill', roles: ROUTE_ACCESS.customer },
  { label: 'Tư vấn sản phẩm', route: '/consultations', icon: 'bi-chat-heart-fill', roles: ROUTE_ACCESS.customer },
  { label: 'Hồ sơ cá nhân', route: '/myinfor', icon: 'bi-person-badge-fill' },
];
