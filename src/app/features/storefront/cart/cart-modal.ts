import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionDialogService } from '../../../service/action-dialog.service';
import { ToastService } from '../../../service/toast.service';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CartService } from '../../../service/cart.service';
import { CartPaymentData, CartRes, CheckoutResponse } from '../../../model/cart.model';
import { forkJoin, Observable, of } from 'rxjs';
import { VoucherService } from '../../../service/voucher.service';
import { CartVoucherOptions, VoucherCartOption } from '../../../model/voucher.model';
import { getApiErrorMessage } from '../../../model/api-response.model';
import * as QRCode from 'qrcode';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../service/auth.service';
import { CartItemRowComponent } from './cart-item-row/cart-item-row.component';
import { CartPaymentPanelComponent } from './cart-payment-panel/cart-payment-panel.component';
import { ViewStateComponent } from '../../shared/ui';

type WalletVoucherGroup = VoucherCartOption & {
  quantity: number;
  voucherIds: number[];
};

@Component({
  selector: 'app-cart-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule, RouterLink, CartItemRowComponent, CartPaymentPanelComponent, ViewStateComponent],
  templateUrl: './cart-modal.html',
  styleUrl: './cart-modal.css',
})
export class CartModalComponent implements OnInit {
  private readonly actionDialog = inject(ActionDialogService);
  private readonly toast = inject(ToastService);
  authService = inject(AuthService);
  isLoading = false;
  cartLoadError = false;
  router = inject(Router);
  deletingProductIds: number[] = [];
  listCurQuan: number[] = [];
  public cartData?: CartRes;
  private readonly dialogUserId = inject<string | null>(MAT_DIALOG_DATA, { optional: true });
  private readonly dialogRef = inject<MatDialogRef<CartModalComponent> | null>(MatDialogRef, { optional: true });
  public userId = '';
  isOwner: boolean = false;
  isCustomerCart = false;
  isGuestCart = false;
  selectedProductIds: number[] = [];
  note:any;
  selectedVoucherId: number = 0;
  tempTotalPrice: number = 0;
  tempDiscountAmount: number = 0;
  tempFinalPrice: number = 0;
  voucherOptions?: CartVoucherOptions;
  groupedWalletVouchers: WalletVoucherGroup[] = [];
  guestVoucherOptions: VoucherCartOption[] = [];
  private readonly rejectedGuestVoucherCodes = new Set<string>();
  selectedGuestVoucherCode = '';
  isLoadingVouchers = false;
  isLoadingGuestVouchers = false;
  redeemingTemplateIds = new Set<number>();
  onlinePaymentData?: CartPaymentData;
  paymentQrDataUrl: string = '';
  isGeneratingPaymentQr = false;
  checkoutErrorMessage = '';
  guestCheckoutSubmitted = false;
  guestCheckoutResponse?: CheckoutResponse;
  guestCheckoutForm = {
    customerName: '',
    phone: '',
    email: '',
    shippingAddress: '',
  };

  constructor(
    private cartService: CartService,
    private voucherService: VoucherService,
  ) {}

  ngOnInit(): void {
    const userStr = this.authService.getUserId();
    this.isCustomerCart = this.authService.isCustomer();
    this.isGuestCart = !this.isCustomerCart;

    if (this.authService.isLoggedIn() && !this.isCustomerCart) {
      this.toast.notify('Tài khoản quản trị/nhân viên không sử dụng giỏ hàng mua sắm.');
      this.router.navigate([this.authService.getHomeRoute()]);
      return;
    }

    if (this.isCustomerCart) {
      const targetUserId = this.dialogUserId || userStr;
      if (!targetUserId) {
        this.toast.notify('Vui lòng đăng nhập để xem giỏ hàng.');
        this.router.navigate(['/login']);
        return;
      }

      this.userId = targetUserId.toString();
      this.isOwner = userStr === this.userId;
    } else {
      this.userId = '';
      this.isOwner = true;
    }

    this.loadCart();
  }

  loadCart() {
    this.isLoading = true;
    this.cartLoadError = false;
    this.cartService.getCartByUserId(this.userId).subscribe({
      next: (res) => {
        this.cartData = res;
        if (this.cartData && this.cartData.items) {
          this.listCurQuan = this.cartData.items.map((item: any) => item.quantity);
        }
        this.isLoading = false;
        this.calculateInvoice();
        this.loadVoucherOptions();
      },
      error: (err) => {
        console.error('Lỗi khi tải giỏ hàng:', err);
        this.cartLoadError = true;
        this.isLoading = false;
      }
    });
  }

  getCartItemId(item: any): number {
    return Number(item?.variantId || item?.productId || 0);
  }

  getCartItemName(item: any): string {
    return item?.variantName || item?.productName || '';
  }

  toggleSelection(productId: number) {
    const index = this.selectedProductIds.indexOf(productId);
    if (index > -1) {
      this.selectedProductIds.splice(index, 1);
    } else {
      this.selectedProductIds.push(productId);
    }
    this.calculateInvoice();
  }

  changeQuantity(index: number, delta: number) {
    const newValue = this.listCurQuan[index] + delta;
    if (newValue >= 1) {
      this.listCurQuan[index] = newValue;
      this.calculateInvoice();
    }
  }

  removeItem(itemId: number) {
    if (!this.isOwner || this.isDeleting(itemId)) return;

    const item = this.cartData?.items.find((cartItem) => this.getCartItemId(cartItem) === itemId);
    const productName = this.getCartItemName(item) || `sản phẩm ID: ${itemId}`;

    this.actionDialog.confirm({
      title: 'Xóa khỏi giỏ hàng',
      message: `Bạn có chắc muốn xóa ${productName} khỏi giỏ hàng?`,
      confirmText: 'Xóa sản phẩm',
      tone: 'danger',
      icon: 'bi-cart-x-fill',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.deletingProductIds.push(itemId);
      this.cartService.removeFromCart(this.userId, itemId).subscribe({
      next: () => {
        if (this.cartData?.items) {
          const removedIndex = this.cartData.items.findIndex((cartItem) => this.getCartItemId(cartItem) === itemId);
          this.cartData.items = this.cartData.items.filter((cartItem) => this.getCartItemId(cartItem) !== itemId);

          if (removedIndex > -1) {
            this.listCurQuan.splice(removedIndex, 1);
          }
        }

        this.selectedProductIds = this.selectedProductIds.filter((id) => id !== itemId);
        this.deletingProductIds = this.deletingProductIds.filter((id) => id !== itemId);
        this.calculateInvoice();
      },
      error: (err) => {
        this.deletingProductIds = this.deletingProductIds.filter((id) => id !== itemId);
        this.toast.notify('Không thể xóa sản phẩm khỏi giỏ hàng: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
      },
      });
    });
  }

  isDeleting(productId: number): boolean {
    return this.deletingProductIds.includes(productId);
  }

  calculateInvoice() {
    if (!this.cartData || !this.cartData.items) return;

    if (this.selectedProductIds.length === 0) {
      this.tempTotalPrice = this.cartData.items.reduce((total, item, i) => total + item.price * this.listCurQuan[i], 0);
    } else {
      this.tempTotalPrice = this.cartData.items.reduce((total, item, i) => {
        return this.selectedProductIds.includes(this.getCartItemId(item)) ? total + item.price * this.listCurQuan[i] : total;
      }, 0);
    }

    this.refreshVoucherOptionsForSubtotal();
    this.refreshGuestVoucherOptionsForSubtotal();
    this.tempDiscountAmount = 0;

    if (this.isGuestCart) {
      const selectedGuestVoucher = this.getSelectedGuestVoucherOption();

      if (this.selectedGuestVoucherCode && (!selectedGuestVoucher || !selectedGuestVoucher.applicable)) {
        this.selectedGuestVoucherCode = '';
      } else if (selectedGuestVoucher?.applicable) {
        this.tempDiscountAmount = selectedGuestVoucher.discountAmount;
      }
    } else if (this.selectedVoucherId !== 0) {
      const selectedVoucher = this.getSelectedWalletOption();

      if (!selectedVoucher || !selectedVoucher.applicable) {
        this.selectedVoucherId = 0;
      } else {
        this.tempDiscountAmount = selectedVoucher.discountAmount;
      }
    }

    if (this.tempDiscountAmount > this.tempTotalPrice) {
      this.tempDiscountAmount = this.tempTotalPrice;
    }

    this.tempFinalPrice = this.tempTotalPrice - this.tempDiscountAmount;
  }

  onVoucherChange() {
    this.calculateInvoice();
  }

  loadVoucherOptions(force: boolean = false) {
    if (this.isGuestCart) {
      this.loadGuestVoucherOptions(force);
      return;
    }

    if (!this.isCustomerCart || !this.isOwner || this.tempTotalPrice <= 0) {
      this.voucherOptions = undefined;
      this.groupedWalletVouchers = [];
      this.selectedVoucherId = 0;
      return;
    }
    if (!force && this.voucherOptions) {
      return;
    }

    this.isLoadingVouchers = true;
    this.voucherService.getCartOptions(this.tempTotalPrice).subscribe({
      next: (options) => {
        this.voucherOptions = options;
        this.calculateInvoice();
        this.isLoadingVouchers = false;
      },
      error: () => {
        this.voucherOptions = undefined;
        this.groupedWalletVouchers = [];
        this.isLoadingVouchers = false;
      },
    });
  }

  private loadGuestVoucherOptions(force: boolean = false): void {
    if (!this.isGuestCart || this.tempTotalPrice <= 0) {
      this.guestVoucherOptions = [];
      this.selectedGuestVoucherCode = '';
      return;
    }
    if (!force && this.guestVoucherOptions.length > 0) {
      return;
    }

    this.isLoadingGuestVouchers = true;
    this.voucherService.getGuestVouchers(this.tempTotalPrice).subscribe({
      next: (options) => {
        this.guestVoucherOptions = (options || [])
          .map((option) => this.applyGuestVoucherRestriction(this.recalculateVoucherOption(option)));
        this.markBestVoucher(this.guestVoucherOptions);
        this.calculateInvoice();
        this.isLoadingGuestVouchers = false;
      },
      error: () => {
        this.guestVoucherOptions = [];
        this.selectedGuestVoucherCode = '';
        this.isLoadingGuestVouchers = false;
      },
    });
  }

  private refreshVoucherOptionsForSubtotal(): void {
    if (!this.voucherOptions) return;

    const walletVouchers = (this.voucherOptions.walletVouchers || [])
      .map((option) => this.recalculateVoucherOption(option));
    const ownedTemplateIds = new Set(walletVouchers.map((option) => option.templateId));
    const redeemableVouchers = (this.voucherOptions.redeemableVouchers || [])
      .filter((option) => !ownedTemplateIds.has(option.templateId))
      .map((option) => this.recalculateVoucherOption(option));

    const bestWalletVoucher = this.markBestVoucher(walletVouchers);
    const bestRedeemableVoucher = this.markBestVoucher(redeemableVouchers);

    this.voucherOptions = {
      ...this.voucherOptions,
      subtotal: this.tempTotalPrice,
      bestWalletVoucher,
      bestRedeemableVoucher,
      walletVouchers,
      redeemableVouchers,
    };
    this.groupedWalletVouchers = this.groupWalletVouchers(walletVouchers);
  }

  private refreshGuestVoucherOptionsForSubtotal(): void {
    if (!this.guestVoucherOptions.length) return;

    this.guestVoucherOptions = this.guestVoucherOptions
      .map((option) => this.applyGuestVoucherRestriction(this.recalculateVoucherOption(option)));
    this.markBestVoucher(this.guestVoucherOptions);
  }

  private recalculateVoucherOption(option: VoucherCartOption): VoucherCartOption {
    const blockedByPriorUsage = !!option.unavailableReason?.startsWith('Voucher này đã');
    const applicable = !blockedByPriorUsage && this.tempTotalPrice >= option.template.minOrderValue;
    const discountAmount = applicable ? this.calculateVoucherDiscount(option) : 0;
    return {
      ...option,
      applicable,
      best: false,
      discountAmount,
      finalPrice: Math.max(0, this.tempTotalPrice - discountAmount),
      unavailableReason: blockedByPriorUsage
        ? option.unavailableReason
        : applicable
          ? null
          : `Cần thêm ${Math.ceil(option.template.minOrderValue - this.tempTotalPrice).toLocaleString('vi-VN')}đ để áp dụng voucher này.`,
    };
  }

  private calculateVoucherDiscount(option: VoucherCartOption): number {
    const template = option.template;
    if (template.discountPercent <= 0) {
      return Math.min(this.tempTotalPrice, template.maxDiscountAmount);
    }

    let discountAmount = (this.tempTotalPrice * template.discountPercent) / 100;
    if (template.maxDiscountAmount > 0 && discountAmount > template.maxDiscountAmount) {
      discountAmount = template.maxDiscountAmount;
    }
    return Math.min(this.tempTotalPrice, discountAmount);
  }

  private groupWalletVouchers(options: VoucherCartOption[]): WalletVoucherGroup[] {
    const grouped = new Map<number, WalletVoucherGroup>();

    for (const option of options) {
      const existing = grouped.get(option.templateId);
      if (!existing) {
        grouped.set(option.templateId, {
          ...option,
          quantity: 1,
          voucherIds: option.userVoucherId ? [option.userVoucherId] : [],
        });
        continue;
      }

      existing.quantity += 1;
      if (option.userVoucherId) {
        existing.voucherIds.push(option.userVoucherId);
      }
      existing.best = existing.best || option.best;
      if (!existing.userVoucherId && option.userVoucherId) {
        existing.userVoucherId = option.userVoucherId;
      }
    }

    return Array.from(grouped.values());
  }

  private markBestVoucher(options: VoucherCartOption[]): VoucherCartOption | null {
    const bestOption = options
      .filter((option) => option.applicable)
      .sort((left, right) => {
        const discountDiff = right.discountAmount - left.discountAmount;
        if (discountDiff !== 0) return discountDiff;
        return right.template.minOrderValue - left.template.minOrderValue;
      })[0] || null;

    if (!bestOption) return null;

    const bestKey = `${bestOption.source}-${bestOption.userVoucherId ?? bestOption.templateId}`;
    options.forEach((option) => {
      option.best = `${option.source}-${option.userVoucherId ?? option.templateId}` === bestKey;
    });

    return bestOption;
  }

  getSelectedWalletOption(): VoucherCartOption | null {
    return this.voucherOptions?.walletVouchers?.find((option) => option.userVoucherId === this.selectedVoucherId) || null;
  }

  selectWalletVoucher(option: VoucherCartOption) {
    if (!option.userVoucherId || !option.applicable) {
      if (option.unavailableReason) this.toast.notify(option.unavailableReason);
      return;
    }
    this.selectedVoucherId = this.selectedVoucherId === option.userVoucherId ? 0 : option.userVoucherId;
    this.calculateInvoice();
  }

  isWalletGroupSelected(group: WalletVoucherGroup): boolean {
    return this.selectedVoucherId !== 0 && group.voucherIds.includes(this.selectedVoucherId);
  }

  selectWalletVoucherGroup(group: WalletVoucherGroup) {
    if (!group.userVoucherId || !group.applicable) {
      if (group.unavailableReason) this.toast.notify(group.unavailableReason);
      return;
    }
    this.selectedVoucherId = this.isWalletGroupSelected(group) ? 0 : group.userVoucherId;
    this.calculateInvoice();
  }

  private applyGuestVoucherRestriction(option: VoucherCartOption): VoucherCartOption {
    const code = (option.template.code || '').trim().toUpperCase();
    if (!this.rejectedGuestVoucherCodes.has(code)) return option;

    return {
      ...option,
      applicable: false,
      best: false,
      discountAmount: 0,
      finalPrice: this.tempTotalPrice,
      unavailableReason: 'Voucher này đã được dùng với phiên, email hoặc số điện thoại của bạn.',
    };
  }

  getSelectedGuestVoucherOption(): VoucherCartOption | null {
    const selectedCode = this.selectedGuestVoucherCode.trim().toUpperCase();
    if (!selectedCode) return null;
    return this.guestVoucherOptions.find((option) =>
      (option.template.code || '').trim().toUpperCase() === selectedCode
    ) || null;
  }

  getBestGuestVoucherOption(): VoucherCartOption | null {
    return this.guestVoucherOptions.find((option) => option.best && option.applicable) || null;
  }

  isGuestVoucherSelected(option: VoucherCartOption): boolean {
    const selectedCode = this.selectedGuestVoucherCode.trim().toUpperCase();
    const optionCode = (option.template.code || '').trim().toUpperCase();
    return !!selectedCode && selectedCode === optionCode;
  }

  selectGuestVoucher(option: VoucherCartOption): void {
    if (!option.applicable) {
      if (option.unavailableReason) this.toast.notify(option.unavailableReason);
      return;
    }

    const code = (option.template.code || '').trim();
    if (!code) return;

    this.selectedGuestVoucherCode = this.isGuestVoucherSelected(option) ? '' : code;
    this.calculateInvoice();
  }

  applyBestGuestVoucher(): void {
    const bestVoucher = this.getBestGuestVoucherOption();
    if (bestVoucher) {
      this.selectGuestVoucher(bestVoucher);
    }
  }

  applyBestWalletVoucher() {
    const bestVoucher = this.voucherOptions?.bestWalletVoucher;
    if (bestVoucher) {
      this.selectWalletVoucher(bestVoucher);
    }
  }

  isRedeeming(templateId: number): boolean {
    return this.redeemingTemplateIds.has(templateId);
  }

  redeemAndUse(option: VoucherCartOption) {
    if (!option.templateId || !option.applicable || this.isRedeeming(option.templateId)) {
      if (option.unavailableReason) this.toast.notify(option.unavailableReason);
      return;
    }

    this.redeemingTemplateIds.add(option.templateId);
    this.voucherService.redeemVoucher(option.templateId).subscribe({
      next: (userVoucher) => {
        this.selectedVoucherId = userVoucher.id;
        this.loadVoucherOptions(true);
        this.toast.notify('Đã đổi và áp dụng voucher cho giỏ hàng.');
        this.redeemingTemplateIds.delete(option.templateId);
      },
      error: (err) => {
        this.toast.notify(getApiErrorMessage(err, 'Không thể đổi voucher này.'));
        this.redeemingTemplateIds.delete(option.templateId);
      },
    });
  }

  private getUpdateRequests(variantIdsToSync?: Set<number>): Observable<any>[] {
    const requests: Observable<any>[] = [];
    if (this.cartData?.items) {
      this.cartData.items.forEach((item: any, i: number) => {
        const itemId = this.getCartItemId(item);
        if (variantIdsToSync && !variantIdsToSync.has(itemId)) {
          return;
        }
        if (item.quantity !== this.listCurQuan[i]) {
          requests.push(this.cartService.updateQuantity(this.userId, itemId, this.listCurQuan[i]));
        }
      });
    }
    return requests;
  }

  private createCheckoutIdempotencyKey(paymentMethod: string): string {
    const randomPart = globalThis.crypto?.randomUUID?.()
      ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ownerKey = this.isGuestCart ? 'guest' : this.userId;
    return `checkout-${ownerKey}-${paymentMethod.toLowerCase()}-${randomPart}`;
  }

  approve(paymentMethod: 'COD' | 'ONLINE') {
    if (!this.isCustomerCart) {
      this.submitGuestCheckout();
      return;
    }
    if (!this.cartData?.user_id) return;
    this.onlinePaymentData = undefined;
    this.paymentQrDataUrl = '';
    this.checkoutErrorMessage = '';

    const productIdsToCheckout = this.selectedProductIds.length > 0
      ? this.selectedProductIds
      : this.cartData.items.map((item: any) => this.getCartItemId(item));

    if (productIdsToCheckout.length === 0) {
      this.toast.notify('Vui lòng chọn ít nhất 1 sản phẩm để thanh toán!');
      return;
    }

    this.isLoading = true;

    const updates = this.getUpdateRequests(new Set(productIdsToCheckout));
    const performUpdate$: Observable<any> = updates.length > 0 ? forkJoin(updates) : of(null);

    performUpdate$.subscribe({
      next: () => {
        this.cartService.checkout({
          variantIds: productIdsToCheckout,
          userVoucherId: this.selectedVoucherId || undefined,
          paymentMethod,
          note: typeof this.note === 'string' && this.note.trim() ? this.note.trim() : undefined,
        }, this.createCheckoutIdempotencyKey(paymentMethod)).subscribe({
          next: (res: any) => {
            if (res && res.status === 'REDIRECT' && res.payUrl) {
              this.toast.notify(res.message || 'Đang xử lý thanh toán online...');
              this.showOnlinePayment(res);
            } else {
              // Xử lý luồng COD như bình thường
              this.toast.notify(res?.message || 'Đặt hàng thành công.');
              this.cartService.notifyCheckoutSuccess();
              this.closeCart(undefined, false);
              this.router.navigate(['/store/orders']);
            }
          },
          error: (err: any) => {
            this.isLoading = false;
            this.checkoutErrorMessage = getApiErrorMessage(
              err,
              'Không thể tạo đơn hàng. Vui lòng kiểm tra lại giỏ hàng.',
            );
            this.toast.notify(this.checkoutErrorMessage);
          },
        });
      },
      error: (err: any) => {
        this.toast.notify('Lỗi cập nhật số lượng: ' + getApiErrorMessage(err, 'Không thể cập nhật số lượng.'));
        this.isLoading = false;
      }
    });
  }

  submitGuestCheckout(): void {
    this.guestCheckoutSubmitted = true;
    this.checkoutErrorMessage = '';
    this.guestCheckoutResponse = undefined;

    if (!this.isGuestCheckoutFormValid()) {
      this.toast.notify('Vui lòng điền đầy đủ thông tin nhận hàng hợp lệ.');
      return;
    }

    const variantIdsToCheckout = this.getVariantIdsToCheckout();
    if (variantIdsToCheckout.length === 0) {
      this.toast.notify('Vui lòng chọn ít nhất 1 sản phẩm để thanh toán!');
      return;
    }

    this.isLoading = true;
    const updates = this.getUpdateRequests(new Set(variantIdsToCheckout));
    const performUpdate$: Observable<any> = updates.length > 0 ? forkJoin(updates) : of(null);

    performUpdate$.subscribe({
      next: () => {
        this.cartService.guestCheckout({
          customerName: this.guestCheckoutForm.customerName.trim(),
          phone: this.guestCheckoutForm.phone.trim(),
          email: this.guestCheckoutForm.email.trim(),
          shippingAddress: this.guestCheckoutForm.shippingAddress.trim(),
          note: typeof this.note === 'string' && this.note.trim() ? this.note.trim() : undefined,
          voucherCode: this.selectedGuestVoucherCode.trim() || undefined,
          variantIds: variantIdsToCheckout,
        }, this.createCheckoutIdempotencyKey('COD')).subscribe({
          next: (response) => {
            this.isLoading = false;
            this.guestCheckoutResponse = response;
            this.selectedProductIds = [];
            this.selectedGuestVoucherCode = '';
            this.guestVoucherOptions = [];
            this.toast.notify(response.message || 'Đặt hàng thành công. Đơn đang chờ shop duyệt.');
            this.cartService.notifyCheckoutSuccess();
            this.loadCart();
          },
          error: (err) => {
            this.isLoading = false;
            this.checkoutErrorMessage = getApiErrorMessage(err, 'Không thể tạo đơn guest. Vui lòng kiểm tra lại thông tin và giỏ hàng.');
            if (this.selectedGuestVoucherCode) {
              if (err?.status === 409) {
                this.rejectedGuestVoucherCodes.add(this.selectedGuestVoucherCode.trim().toUpperCase());
              }
              this.selectedGuestVoucherCode = '';
              this.loadVoucherOptions(true);
            }
            this.toast.notify(this.checkoutErrorMessage);
          },
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.checkoutErrorMessage = getApiErrorMessage(err, 'Không thể cập nhật số lượng trước khi đặt hàng.');
        this.toast.notify(this.checkoutErrorMessage);
      },
    });
  }

  isGuestCheckoutFormValid(): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^[0-9+().\-\s]{8,30}$/;
    return !!this.guestCheckoutForm.customerName.trim()
      && phonePattern.test(this.guestCheckoutForm.phone.trim())
      && emailPattern.test(this.guestCheckoutForm.email.trim())
      && !!this.guestCheckoutForm.shippingAddress.trim();
  }

  private getVariantIdsToCheckout(): number[] {
    if (!this.cartData?.items?.length) {
      return [];
    }
    return this.selectedProductIds.length > 0
      ? [...this.selectedProductIds]
      : this.cartData.items.map((item: any) => this.getCartItemId(item));
  }
openModal(data:any){
this.closeCart(data);
}
  async showOnlinePayment(paymentData: CartPaymentData) {
    this.onlinePaymentData = paymentData;
    this.isLoading = false;
    this.isGeneratingPaymentQr = true;
    this.cartService.notifyCheckoutSuccess();
    this.loadCart();

    const qrSource = paymentData.qrCodeUrl || paymentData.payUrl || paymentData.url || '';

    if (!qrSource) {
      this.paymentQrDataUrl = '';
      this.isGeneratingPaymentQr = false;
      this.toast.notify('Không tìm thấy dữ liệu QR thanh toán.');
      return;
    }

    try {
      this.paymentQrDataUrl = await QRCode.toDataURL(qrSource, {
        width: 240,
        margin: 1,
        errorCorrectionLevel: 'M',
      });
    } catch (error) {
      console.error('Lỗi khi tạo QR thanh toán:', error);
      this.paymentQrDataUrl = '';
      this.toast.notify('Không thể tạo mã QR thanh toán. Bạn có thể mở trang thanh toán bằng nút bên dưới.');
    } finally {
      this.isGeneratingPaymentQr = false;
    }
  }

  getPaymentUrl(): string {
    return this.onlinePaymentData?.payUrl || this.onlinePaymentData?.url || '';
  }

  openPaymentUrl() {
    const paymentUrl = this.getPaymentUrl();
    if (paymentUrl) {
      window.open(paymentUrl, '_blank', 'noopener,noreferrer');
    }
  }

  openDeeplink() {
    if (this.onlinePaymentData?.deeplink) {
      window.location.href = this.onlinePaymentData.deeplink;
    }
  }

  private closeCart(result?: any, navigateBack: boolean = true): void {
    if (this.dialogRef) {
      this.dialogRef.close(result);
      return;
    }
    if (navigateBack) {
      this.router.navigate(['/store/product']);
    }
  }

  onClose(): void {
    const updates = this.getUpdateRequests();
    if (updates.length > 0) {
      this.actionDialog.confirm({
        title: 'Lưu thay đổi giỏ hàng',
        message: 'Bạn đã thay đổi số lượng sản phẩm. Bạn có muốn lưu trước khi đóng giỏ hàng không?',
        confirmText: 'Lưu và đóng',
        cancelText: 'Đóng không lưu',
        tone: 'warning',
        icon: 'bi-floppy-fill',
      }).subscribe((confirmed) => {
        if (!confirmed) {
          this.closeCart();
          return;
        }

        this.isLoading = true;
        forkJoin(updates).subscribe({
          next: () => {
            this.isLoading = false;
            this.closeCart(true);
          },
          error: (err) => {
            this.isLoading = false;
            this.toast.notify('Không thể lưu thay đổi giỏ hàng: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
          },
        });
      });
      return;
    }

    this.closeCart();
  }
}
