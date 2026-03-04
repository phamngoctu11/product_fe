export interface VoucherTemplate {
  id: number;
  code: string;
  name: string;
  description: string;
  pointCost: number;
  minOrderValue: number;
  discountPercent: number;
  maxDiscountAmount: number;
  quantity: number;
  expiryDate: string;
  active: boolean;
}
export interface UserVoucher {
  id: number;
  template: VoucherTemplate;
  used: boolean;
  redeemDate: string;
  usedDate: string | null;
  expiryDate: string;
}
