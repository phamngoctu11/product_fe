/**
 * Cấu hình nội dung dùng chung cho toàn bộ storefront.
 * Đổi tên thương hiệu, menu, danh mục... tại đây thay vì sửa từng component.
 */

export interface SfNavLink {
  label: string;
  path: string;
  exact?: boolean;
  queryParams?: Record<string, string>;
}

export interface SfCategory {
  /** Giá trị dùng trên URL: /store/product?category=gom-su */
  slug: string;
  label: string;
  /** Từ khoá (hashtag) gửi lên API tìm kiếm sản phẩm */
  keyword: string;
  description: string;
}

export interface SfFooterColumn {
  title: string;
  links: SfNavLink[];
}

export const SF_BRAND = {
  name: 'ClayArt',
  wordmark: 'CLAYART',
  tagline: 'Thủ công tinh tế · Làm theo đơn riêng',
  credit: '@CLAYART.STUDIO',
  email: 'support@clayart.vn',
};

export const SF_IMAGE_BASE = 'images/storefront';

export const SF_NAV_LINKS: SfNavLink[] = [
  { label: 'Cửa hàng', path: '/store/product' },
  { label: 'Về chúng tôi', path: '/store/about' },
  { label: 'Đặt làm riêng', path: '/store/custom-requests' },
  { label: 'Liên hệ', path: '/store/help/contact-support' },
];

export const SF_CATEGORIES: SfCategory[] = [
  {
    slug: 'tuong-dat-set',
    label: 'Tượng đất sét',
    keyword: '#clayart',
    description: 'Những bức tượng nhỏ nặn tay, mỗi nét đều mang dấu vân tay của người làm.',
  },
  {
    slug: 'qua-tang',
    label: 'Quà tặng',
    keyword: '#quatang',
    description: 'Món quà độc bản cho người thương — không có hai sản phẩm nào giống nhau.',
  },
  {
    slug: 'moc-khoa',
    label: 'Móc khoá',
    keyword: '#mockhoa',
    description: 'Phụ kiện nhỏ xinh theo bạn mọi nơi, được tạo hình theo yêu cầu.',
  },
  {
    slug: 'gom-su',
    label: 'Gốm sứ',
    keyword: '#gomsu',
    description: 'Đồ gốm thủ công với lớp men không hoàn hảo — và chính vì thế mà đẹp.',
  },
];

export const SF_FOOTER_COLUMNS: SfFooterColumn[] = [
  {
    title: 'ClayArt',
    links: [
      { label: 'Về chúng tôi', path: '/store/about' },
      { label: 'Liên hệ', path: '/store/help/contact-support' },
      { label: 'Hướng dẫn mua hàng', path: '/store/help/shopping-guide' },
      { label: 'Tra cứu đơn hàng', path: '/store/help/order-tracking' },
      { label: 'Thanh toán', path: '/store/help/payment-methods' },
    ],
  },
  {
    title: 'Cửa hàng',
    links: SF_CATEGORIES.map((category) => ({
      label: category.label,
      path: '/store/product',
      queryParams: { category: category.slug },
    })),
  },
  {
    title: 'Chính sách',
    links: [
      { label: 'Giao hàng', path: '/store/policies/shipping' },
      { label: 'Đổi trả & hoàn tiền', path: '/store/policies/returns-refunds' },
      { label: 'Bảo hành', path: '/store/policies/warranty' },
      { label: 'Bảo mật', path: '/store/policies/privacy' },
    ],
  },
];

export function findCategory(slug: string | null | undefined): SfCategory | undefined {
  return slug ? SF_CATEGORIES.find((category) => category.slug === slug) : undefined;
}

export function sfImage(fileName: string): string {
  return `${SF_IMAGE_BASE}/${fileName}`;
}

