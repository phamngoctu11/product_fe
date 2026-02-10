import {
  Component,
  Input,
  OnInit,
  Output,
  EventEmitter,
  Inject,
  inject,
  NgModule,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../service/cart.service';
import { CartRes } from '../../model/cart.model';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { UserResDTO } from '../../model/user.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cart-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule],
  templateUrl: './cart-modal.html',
})
export class CartModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  isLoading = false;
  listCurQuan: number[] = [];
  public cartData: any;
  public userId = inject(MAT_DIALOG_DATA);
  constructor(
    private cartService: CartService,
    public dialogRef: MatDialogRef<CartModalComponent>,
  ) {}
  ngOnInit(): void {
    this.loadCart();
  }

  loadCart() {
    this.isLoading = true; // Bật trạng thái loading
    this.cartService.getCartByUserId(this.userId).subscribe({
      next: (res) => {
        this.cartData = res;
        if (this.cartData && this.cartData.items) {
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
  approve() {
    if (!this.cartData?.user_id) return;
    this.cartService.acceptCart(this.cartData.user_id).subscribe({
      next: (res) => {
        alert('Thanh toán thành công!');
        this.loadCart();
      },
      error: (err) => alert('Lỗi: ' + err.error),
    });
  }
  onClose(): void {
    this.dialogRef.close();
  }
}
