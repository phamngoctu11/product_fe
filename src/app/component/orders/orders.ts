import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../service/order.service';
import { AuthService } from '../../service/auth.service';
import { Order } from '../../model/order.model';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule], // Cần thiết để dùng *ngIf, *ngFor, pipe...
  templateUrl: './orders.html',
})
export class Orders implements OnInit {
  orders: Order[] = [];
  userId!: number;

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const id = this.authService.getUserId();

    if (id !== null) {
      this.userId = id;
      this.loadMyOrders();
    } else {
      console.error('Không tìm thấy ID người dùng. Hãy đăng nhập lại!');
    }
  }
  loadMyOrders(): void {
    this.orderService.getOrdersByUserId(this.userId).subscribe({
      next: (data: Order[]) => {
        this.orders = data;
        console.log('Đã tải danh sách đơn hàng:', this.orders);
      },
      error: (err) => {
        console.error('Lỗi khi tải đơn hàng:', err);
      },
    });
  }
}
