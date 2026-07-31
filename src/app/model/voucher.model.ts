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

export interface VoucherCartOption {
  userVoucherId: number | null;
  templateId: number;
  source: 'WALLET' | 'REDEEMABLE' | string;
  template: VoucherTemplate;
  applicable: boolean;
  best: boolean;
  discountAmount: number;
  finalPrice: number;
  unavailableReason: string | null;
}

export interface CartVoucherOptions {
  subtotal: number;
  currentReputation: number;
  redeemableReputation: number;
  bestWalletVoucher: VoucherCartOption | null;
  bestRedeemableVoucher: VoucherCartOption | null;
  walletVouchers: VoucherCartOption[];
  redeemableVouchers: VoucherCartOption[];
}
