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
import { Router } from '@angular/router';
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
  imports: [CommonModule, MatDialogModule, FormsModule, CartItemRowComponent, CartPaymentPanelComponent, ViewStateComponent],
  templateUrl: './cart-modal.html',
  styleUrl: './cart-modal.css',
})
export class CartModalComponent implements OnInit {
  private readonly actionDialog = inject(ActionDialogService);
  private readonly toast = inject(ToastService);
  authService = inject(AuthService);
  isLoading = false;
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
  isLoadingVouchers = false;
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
        console.error('Lá»—i khi táº£i giá» hÃ ng:', err);
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
    const productName = this.getCartItemName(item) || `sáº£n pháº©m ID: ${itemId}`;

    this.actionDialog.confirm({
      title: 'XÃ³a khá»i giá» hÃ ng',
      message: `Báº¡n cÃ³ cháº¯c muá»‘n xÃ³a ${productName} khá»i giá» hÃ ng?`,
      confirmText: 'XÃ³a sáº£n pháº©m',
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
        this.toast.notify('KhÃ´ng thá»ƒ xÃ³a sáº£n pháº©m khá»i giá» hÃ ng: ' + getApiErrorMessage(err, 'Vui lÃ²ng thá»­ láº¡i.'));
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
    this.tempDiscountAmount = 0;

    if (this.selectedVoucherId !== 0) {
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

  private recalculateVoucherOption(option: VoucherCartOption): VoucherCartOption {
    const applicable = this.tempTotalPrice >= option.template.minOrderValue;
    const discountAmount = applicable ? this.calculateVoucherDiscount(option) : 0;
    return {
      ...option,
      applicable,
      best: false,
      discountAmount,
      finalPrice: Math.max(0, this.tempTotalPrice - discountAmount),
      unavailableReason: applicable
        ? null
        : `Cáº§n thÃªm ${Math.ceil(option.template.minOrderValue - this.tempTotalPrice).toLocaleString('vi-VN')}Ä‘ Ä‘á»ƒ Ã¡p dá»¥ng voucher nÃ y.`,
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
        this.toast.notify('ÄÃ£ Ä‘á»•i vÃ  Ã¡p dá»¥ng voucher cho giá» hÃ ng.');
        this.redeemingTemplateIds.delete(option.templateId);
      },
      error: (err) => {
        this.toast.notify(getApiErrorMessage(err, 'KhÃ´ng thá»ƒ Ä‘á»•i voucher nÃ y.'));
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

  approve(paymentMethod: string) {
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
      this.toast.notify('Vui lÃ²ng chá»n Ã­t nháº¥t 1 sáº£n pháº©m Ä‘á»ƒ thanh toÃ¡n!');
      return;
    }

    this.isLoading = true;

    const updates = this.getUpdateRequests(new Set(productIdsToCheckout));
    const performUpdate$: Observable<any> = updates.length > 0 ? forkJoin(updates) : of(null);

    performUpdate$.subscribe({
      next: () => {
        this.cartService.acceptCart(
          this.userId,
          productIdsToCheckout,
          this.selectedVoucherId,
          paymentMethod,
          this.note,
          this.createCheckoutIdempotencyKey(paymentMethod),
        ).subscribe({
          next: (res: any) => {
            if (res && res.status === 'REDIRECT' && res.payUrl) {
              this.toast.notify(res.message || 'Äang xá»­ lÃ½ thanh toÃ¡n online...');
              this.showOnlinePayment(res);
            } else {
              // Xá»­ lÃ½ luá»“ng COD nhÆ° bÃ¬nh thÆ°á»ng
              this.toast.notify(res?.message || 'Äáº·t hÃ ng thÃ nh cÃ´ng.');
              this.cartService.notifyCheckoutSuccess();
              this.closeCart(undefined, false);
              this.router.navigate(['/store/orders']);
            }
          },
          error: (err: any) => {
            this.isLoading = false;
            this.checkoutErrorMessage = getApiErrorMessage(
              err,
              'KhÃ´ng thá»ƒ táº¡o Ä‘Æ¡n hÃ ng. Vui lÃ²ng kiá»ƒm tra láº¡i giá» hÃ ng.',
            );
            this.toast.notify(this.checkoutErrorMessage);
          },
        });
      },
      error: (err: any) => {
        this.toast.notify('Lá»—i cáº­p nháº­t sá»‘ lÆ°á»£ng: ' + getApiErrorMessage(err, 'KhÃ´ng thá»ƒ cáº­p nháº­t sá»‘ lÆ°á»£ng.'));
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
          variantIds: variantIdsToCheckout,
        }, this.createCheckoutIdempotencyKey('COD')).subscribe({
          next: (response) => {
            this.isLoading = false;
            this.guestCheckoutResponse = response;
            this.selectedProductIds = [];
            this.toast.notify(response.message || 'Đặt hàng thành công. Đơn đang chờ shop duyệt.');
            this.cartService.notifyCheckoutSuccess();
            this.loadCart();
          },
          error: (err) => {
            this.isLoading = false;
            this.checkoutErrorMessage = getApiErrorMessage(err, 'Không thể tạo đơn guest. Vui lòng kiểm tra lại thông tin và giỏ hàng.');
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
      this.toast.notify('KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u QR thanh toÃ¡n tá»« MoMo.');
      return;
    }

    try {
      this.paymentQrDataUrl = await QRCode.toDataURL(qrSource, {
        width: 240,
        margin: 1,
        errorCorrectionLevel: 'M',
      });
    } catch (error) {
      console.error('Lá»—i khi táº¡o QR thanh toÃ¡n:', error);
      this.paymentQrDataUrl = '';
      this.toast.notify('KhÃ´ng thá»ƒ táº¡o mÃ£ QR thanh toÃ¡n. Báº¡n cÃ³ thá»ƒ má»Ÿ trang thanh toÃ¡n báº±ng nÃºt bÃªn dÆ°á»›i.');
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
        title: 'LÆ°u thay Ä‘á»•i giá» hÃ ng',
        message: 'Báº¡n Ä‘Ã£ thay Ä‘á»•i sá»‘ lÆ°á»£ng sáº£n pháº©m. Báº¡n cÃ³ muá»‘n lÆ°u trÆ°á»›c khi Ä‘Ã³ng giá» hÃ ng khÃ´ng?',
        confirmText: 'LÆ°u vÃ  Ä‘Ã³ng',
        cancelText: 'ÄÃ³ng khÃ´ng lÆ°u',
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
            this.toast.notify('KhÃ´ng thá»ƒ lÆ°u thay Ä‘á»•i giá» hÃ ng: ' + getApiErrorMessage(err, 'Vui lÃ²ng thá»­ láº¡i.'));
          },
        });
      });
      return;
    }

    this.closeCart();
  }
}
