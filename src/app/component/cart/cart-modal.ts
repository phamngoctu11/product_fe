import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CartService } from '../../service/cart.service';
import { CartRes } from '../../model/cart.model';
import { forkJoin, Observable, of } from 'rxjs';
import { VoucherService } from '../../service/voucher.service';
import { UserVoucher } from '../../model/voucher.model';

@Component({
  selector: 'app-cart-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule],
  templateUrl: './cart-modal.html',
})
export class CartModalComponent implements OnInit {
  isLoading = false;
  listCurQuan: number[] = [];
  public cartData?: CartRes;
  public userId = inject(MAT_DIALOG_DATA);
  isOwner: boolean = false;
  selectedProductIds: number[] = [];

  // VOUCHER WALLET
  myWallet: UserVoucher[] = [];

  // BEST PRACTICE: Khai báo cực ngắn gọn, số 0 đại diện cho việc chưa chọn mã
  selectedVoucherId: number = 0;

  tempTotalPrice: number = 0;
  tempDiscountAmount: number = 0;
  tempFinalPrice: number = 0;

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

  // HÀM TÍNH TOÁN (Xử lý mọi nghiệp vụ)
  calculateInvoice() {
    if (!this.cartData || !this.cartData.items) return;

    // 1. TÍNH TỔNG TIỀN GỐC
    if (this.selectedProductIds.length === 0) {
      this.tempTotalPrice = this.cartData.items.reduce((total, item, i) => total + item.price * this.listCurQuan[i], 0);
    } else {
      this.tempTotalPrice = this.cartData.items.reduce((total, item, i) => {
        return this.selectedProductIds.includes(item.productId) ? total + item.price * this.listCurQuan[i] : total;
      }, 0);
    }

    // 2. TÍNH TIỀN GIẢM GIÁ
    this.tempDiscountAmount = 0; // LUÔN RESET VỀ 0 ĐẦU TIÊN

    if (this.selectedVoucherId !== 0) {
      const voucher = this.myWallet.find(v => v.id === this.selectedVoucherId);

      if (voucher) {
        if (this.tempTotalPrice < voucher.template.minOrderValue) {
          this.selectedVoucherId = 0; // Ép về 0 (Gỡ thẻ) nếu khách giảm số lượng làm không đủ điều kiện
        } else {
          // Xử lý giảm theo %
          if (voucher.template.discountPercent > 0) {
            let discount = (this.tempTotalPrice * voucher.template.discountPercent) / 100;
            if (voucher.template.maxDiscountAmount > 0 && discount > voucher.template.maxDiscountAmount) {
              discount = voucher.template.maxDiscountAmount;
            }
            this.tempDiscountAmount = discount;
          } else {
            // Xử lý giảm thẳng tiền mặt
            this.tempDiscountAmount = voucher.template.maxDiscountAmount;
          }
        }
      }
    }

    // Đảm bảo không giảm âm tiền
    if (this.tempDiscountAmount > this.tempTotalPrice) {
      this.tempDiscountAmount = this.tempTotalPrice;
    }

    // 3. TÍNH TIỀN THỰC TRẢ
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
          requests.push(this.cartService.updateQuantity(this.userId, item.productId, this.listCurQuan[i]));
        }
      });
    }
    return requests;
  }

  approve() {
    if (!this.cartData?.user_id) return;
    this.isLoading = true;

    const productIdsToCheckout = this.selectedProductIds.length > 0
      ? this.selectedProductIds
      : this.cartData.items.map((item: any) => item.productId);

    // CHỈ TRUYỀN ID XUỐNG API (Nếu = 0 thì truyền undefined để BE bỏ qua logic tính voucher)
    let voucherIdToPass = this.selectedVoucherId !== 0 ? this.selectedVoucherId : undefined;

    const updates = this.getUpdateRequests();
    const performUpdate$: Observable<any> = updates.length > 0 ? forkJoin(updates) : of(null);

    performUpdate$.subscribe({
      next: () => {
        this.cartService.acceptCart(this.cartData!.user_id, productIdsToCheckout, voucherIdToPass).subscribe({
          next: () => {
            alert('Thanh toán thành công!');
            this.isLoading = false;
            this.dialogRef.close(true);
          },
          error: (err: any) => {
            alert('Lỗi thanh toán: ' + (err.error?.message || err.message || err.error));
            this.isLoading = false;
          },
        });
      },
      error: (err: any) => {
        alert('Lỗi cập nhật số lượng: ' + (err.error?.message || err.message));
        this.isLoading = false;
      }
    });
  }

  onClose(): void {
    const updates = this.getUpdateRequests();
    if (updates.length > 0) {
      if (confirm('Bạn có thay đổi số lượng, bạn có muốn lưu lại trước khi thoát không?')) {
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
        return;
      }
    }
    this.dialogRef.close();
  }
}
