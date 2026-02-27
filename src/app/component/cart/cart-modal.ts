import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CartService } from '../../service/cart.service';
import { CartRes } from '../../model/cart.model';
import { forkJoin, Observable, of } from 'rxjs';

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
  currentUser: any;
  isOwner: boolean = false;

  // Mảng lưu ID các sản phẩm được chọn
  selectedProductIds: number[] = [];

  constructor(
    private cartService: CartService,
    public dialogRef: MatDialogRef<CartModalComponent>,
  ) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('user_id');
    this.isOwner = userStr === this.userId.toString();
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
        this.updateTempTotal(); // Tính toán lại tổng tiền lần đầu
      },
      error: (err) => {
        console.error('Lỗi khi tải giỏ hàng:', err);
        this.isLoading = false;
      },
    });
  }

  // Hàm xử lý khi check/uncheck vào ô checkbox
  toggleSelection(productId: number) {
    const index = this.selectedProductIds.indexOf(productId);
    if (index > -1) {
      this.selectedProductIds.splice(index, 1); // Bỏ chọn
    } else {
      this.selectedProductIds.push(productId); // Chọn
    }
    this.updateTempTotal(); // Cập nhật lại tổng tiền ngay lập tức
  }

  changeQuantity(index: number, delta: number) {
    const newValue = this.listCurQuan[index] + delta;
    if (newValue >= 1) {
      this.listCurQuan[index] = newValue;
      this.updateTempTotal();
    }
  }

  // Cập nhật lại logic tính tổng tiền
  updateTempTotal() {
    if (this.cartData && this.cartData.items) {
      if (this.selectedProductIds.length === 0) {
        // Nếu không có item nào được chọn, tính tổng TẤT CẢ theo yêu cầu
        this.cartData.totalPrice = this.cartData.items.reduce((total, item, i) => {
          return total + item.price * this.listCurQuan[i];
        }, 0);
      } else {
        // Nếu có chọn, CHỈ tính tổng các item được chọn
        this.cartData.totalPrice = this.cartData.items.reduce((total, item, i) => {
          if (this.selectedProductIds.includes(item.productId)) {
            return total + item.price * this.listCurQuan[i];
          }
          return total;
        }, 0);
      }
    }
  }

  private getUpdateRequests(): Observable<any>[] {
    const requests: Observable<any>[] = [];
    if (this.cartData?.items) {
      this.cartData.items.forEach((item: any, i: number) => {
        if (item.quantity !== this.listCurQuan[i]) {
          requests.push(
            this.cartService.updateQuantity(this.userId, item.productId, this.listCurQuan[i]),
          );
        }
      });
    }
    return requests;
  }

  approve() {
    if (!this.cartData?.user_id) return;
    this.isLoading = true;

    // Xác định những sản phẩm nào sẽ được thanh toán
    const productIdsToCheckout = this.selectedProductIds.length > 0
      ? this.selectedProductIds
      : this.cartData.items.map((item: any) => item.productId);

    const updates = this.getUpdateRequests();
    const performUpdate$: Observable<any> = updates.length > 0 ? forkJoin(updates) : of(null);

    performUpdate$.subscribe({
      next: () => {
        // Gửi danh sách ID sản phẩm qua API
        this.cartService.acceptCart(this.cartData!.user_id, productIdsToCheckout).subscribe({
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
        console.error('Chi tiết lỗi:', err);
        alert('Lỗi cập nhật số lượng: ' + (err.error?.message || err.message));
        this.isLoading = false;
      },
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
