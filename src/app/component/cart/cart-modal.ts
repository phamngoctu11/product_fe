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
  listCurQuan: number[] = []; // Mảng lưu số lượng tạm thời trên giao diện
  public cartData?: CartRes;
  public userId = inject(MAT_DIALOG_DATA);
  currentUser: any; // Thông tin người đăng nhập (id, role, ...)
  isOwner: boolean = false;
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
          // Gán giá trị ban đầu từ Backend vào mảng tạm
          this.listCurQuan = this.cartData.items.map((item: any) => item.quantity);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi khi tải giỏ hàng:', err);
        this.isLoading = false;
      },
    });
  }

  // Hàm thay đổi số lượng trên UI
  changeQuantity(index: number, delta: number) {
    const newValue = this.listCurQuan[index] + delta;
    if (newValue >= 1) {
      this.listCurQuan[index] = newValue;
      this.updateTempTotal();
    }
  }

  updateTempTotal() {
    if (this.cartData && this.cartData.items) {
      this.cartData.totalPrice = this.cartData.items.reduce((total, item, i) => {
        return total + item.price * this.listCurQuan[i];
      }, 0);
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

    const updates = this.getUpdateRequests();
    const performUpdate$: Observable<any> = updates.length > 0 ? forkJoin(updates) : of(null);

    performUpdate$.subscribe({
      next: () => {
        this.cartService.acceptCart(this.cartData!.user_id).subscribe({
          next: () => {
            alert('Thanh toán thành công!');
            this.isLoading = false;
            this.dialogRef.close(true);
          },
          error: (err: any) => {
            // Xác định kiểu err là any
            alert('Lỗi thanh toán: ' + (err.error?.message || err.message));
            this.isLoading = false;
          },
        });
      },
      error: (err: any) => {
        console.error('Chi tiết lỗi:', err); // Xem ở Console (F12) để biết lỗi từ đâu
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
