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
  active?: boolean;
  expiryDate: string;
  isActive?: boolean
}
export type VoucherTemplateRequest = Omit<VoucherTemplate, 'id'> & { id?: number };

export interface UserVoucher {
  id: number;
  template: VoucherTemplate;
  used: boolean;
  redeemDate: string;
  usedDate: string | null;
  expiryDate: string;
}
