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
  { label: 'Bảng thống kê', route: '/management/admin-dashboard', icon: 'bi-bar-chart-line-fill', roles: ROUTE_ACCESS.management },
  { label: 'Quản lý chat', route: '/management/admin-chat', icon: 'bi-chat-square-dots-fill', roles: ROUTE_ACCESS.operations },
  { label: 'Hoa hồng tư vấn', route: '/management/commissions', icon: 'bi-cash-stack', roles: ROUTE_ACCESS.operations },
  { label: 'Quản lý sản phẩm', route: '/management/product', icon: 'bi-grid-fill', roles: ROUTE_ACCESS.operations },
  { label: 'Quản lý người dùng', route: '/management/user', icon: 'bi-people-fill', roles: ROUTE_ACCESS.management },
  { label: 'Duyệt đơn hàng', route: '/management/admin-orders', icon: 'bi-clipboard2-check-fill', roles: ROUTE_ACCESS.management },
  { label: 'Cấu hình voucher', route: '/management/admin-vouchers', icon: 'bi-ticket-perforated-fill', roles: ROUTE_ACCESS.management },
  { label: 'Kho hàng', route: '/management/staff-orders', icon: 'bi-box-seam-fill', roles: ROUTE_ACCESS.staff },
  { label: 'Hồ sơ cá nhân', route: '/management/myinfor', icon: 'bi-person-badge-fill', roles: ROUTE_ACCESS.operations },
];
