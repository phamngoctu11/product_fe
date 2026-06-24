import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject as injectActionDialog } from '@angular/core';
import { ActionDialogService } from '../../service/action-dialog.service';
import { inject as injectToast } from '@angular/core';
import { ToastService } from '../../service/toast.service';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CartService } from '../../service/cart.service';
import { CartPaymentData, CartRes } from '../../model/cart.model';
import { forkJoin, Observable, of } from 'rxjs';
import { VoucherService } from '../../service/voucher.service';
import { UserVoucher } from '../../model/voucher.model';
import { getApiErrorMessage } from '../../model/api-response.model';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-cart-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule],
  templateUrl: './cart-modal.html',
  styleUrls: ['../../app.css', './cart-modal.css'],
})
export class CartModalComponent implements OnInit {
  private readonly actionDialog = injectActionDialog(ActionDialogService);
  private readonly toast = injectToast(ToastService);
  isLoading = false;
  deletingProductIds: number[] = [];
  listCurQuan: number[] = [];
  public cartData?: CartRes;
  public userId = inject(MAT_DIALOG_DATA);
  isOwner: boolean = false;
  selectedProductIds: number[] = [];
  note:any;
  myWallet: UserVoucher[] = [];
  selectedVoucherId: number = 0;
  tempTotalPrice: number = 0;
  tempDiscountAmount: number = 0;
  tempFinalPrice: number = 0;
  onlinePaymentData?: CartPaymentData;
  paymentQrDataUrl: string = '';
  isGeneratingPaymentQr = false;

  constructor(
    private cartService: CartService,
    private voucherService: VoucherService,
    public dialogRef: MatDialogRef<CartModalComponent>,
  ) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('user_id');
    this.isOwner = userStr === this.userId.toString();
    this.loadCart();
    if (this.isOwner) {
      this.loadWallet();
    }
  }

  loadWallet() {
    this.voucherService.getMyWallet(this.userId).subscribe({
      next: (data) => this.myWallet = data,
      error: (err) => console.error('Lỗi tải ví:', err)
    });
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
      },
      error: (err) => {
        console.error('Lỗi khi tải giỏ hàng:', err);
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

    this.tempDiscountAmount = 0;

    if (this.selectedVoucherId !== 0) {
      const voucher = this.myWallet.find(v => v.id === this.selectedVoucherId);

      if (voucher) {
        if (this.tempTotalPrice < voucher.template.minOrderValue) {
          this.selectedVoucherId = 0;
        } else {
          if (voucher.template.discountPercent > 0) {
            let discount = (this.tempTotalPrice * voucher.template.discountPercent) / 100;
            if (voucher.template.maxDiscountAmount > 0 && discount > voucher.template.maxDiscountAmount) {
              discount = voucher.template.maxDiscountAmount;
            }
            this.tempDiscountAmount = discount;
          } else {
            this.tempDiscountAmount = voucher.template.maxDiscountAmount;
          }
        }
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

  private getUpdateRequests(): Observable<any>[] {
    const requests: Observable<any>[] = [];
    if (this.cartData?.items) {
      this.cartData.items.forEach((item: any, i: number) => {
        if (item.quantity !== this.listCurQuan[i]) {
          requests.push(this.cartService.updateQuantity(this.userId, this.getCartItemId(item), this.listCurQuan[i]));
        }
      });
    }
    return requests;
  }

  approve(paymentMethod: string) {
    if (!this.cartData?.user_id) return;
    this.onlinePaymentData = undefined;
    this.paymentQrDataUrl = '';

    const productIdsToCheckout = this.selectedProductIds.length > 0
      ? this.selectedProductIds
      : this.cartData.items.map((item: any) => this.getCartItemId(item));

    if (productIdsToCheckout.length === 0) {
      this.toast.notify('Vui lòng chọn ít nhất 1 sản phẩm để thanh toán!');
      return;
    }

    this.isLoading = true;
    let voucherIdToPass = this.selectedVoucherId !== 0 ? this.selectedVoucherId : undefined;

    const updates = this.getUpdateRequests();
    const performUpdate$: Observable<any> = updates.length > 0 ? forkJoin(updates) : of(null);

    performUpdate$.subscribe({
      next: () => {
        // Gọi đúng tên hàm, đúng thứ tự tham số.
        this.cartService.acceptCart(this.cartData!.user_id, productIdsToCheckout, voucherIdToPass, paymentMethod,this.note).subscribe({
          next: (res: any) => {
            if (res.status === 'REDIRECT' && paymentMethod === 'ONLINE') {
              this.showOnlinePayment(res);
            } else {
              this.toast.notify(res.message || 'Thanh toán thành công!');
              this.cartService.notifyCheckoutSuccess();
              this.isLoading = false;
              this.dialogRef.close(true);
            }
          },
          error: (err: any) => {
            const errorMsg = getApiErrorMessage(err, 'Không thể thanh toán.');
            this.toast.notify('Lỗi thanh toán: ' + errorMsg);
            this.isLoading = false;
          },
        });
      },
      error: (err: any) => {
        this.toast.notify('Lỗi cập nhật số lượng: ' + getApiErrorMessage(err, 'Không thể cập nhật số lượng.'));
        this.isLoading = false;
      }
    });
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
      this.toast.notify('Không tìm thấy dữ liệu QR thanh toán từ MoMo.');
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
          this.dialogRef.close();
          return;
        }
        this.isLoading = true;
        forkJoin(updates).subscribe({
          next: () => {
            this.isLoading = false;
            this.dialogRef.close(true);
          },
          error: () => {
            this.isLoading = false;
            this.dialogRef.close();
          },
        });
      });
      return;
    }
    this.dialogRef.close();
  }
}
