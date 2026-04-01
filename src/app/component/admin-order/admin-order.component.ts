import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../service/order.service';

@Component({
  selector: 'app-admin-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-order.component.html',
})
export class AdminOrderComponent implements OnInit {
  pendingOrders: any[] = [];
  isLoading = false;
  adminLastName = ''; // Sẽ lấy từ LocalStorage

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    // Giả sử bạn lưu thông tin user đăng nhập trong localStorage
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.adminLastName = user.lastname || 'Admin'; // Lấy last name hoặc để mặc định

    this.loadPendingOrders();
  }

  loadPendingOrders(): void {
    this.isLoading = true;
    this.orderService.getPendingOrders().subscribe({
      next: (res) => {
        this.pendingOrders = res;
        console.log(res);

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách đơn hàng', err);
        this.isLoading = false;
      }
    });
  }

  approveOrder(order: any): void {
    if (confirm(`Bạn có chắc chắn muốn DUYỆT đơn hàng #${order.id} không?`)) {
      this.isLoading = true;
      this.orderService.reviewOrder(order.id, true, '', order.lastname).subscribe({
        next: (msg) => {
          alert(msg);
          this.loadPendingOrders(); // Tải lại danh sách
        },
        error: (err) => {
          alert('Lỗi: ' + (err.error || err.message));
          this.isLoading = false;
        }
      });
    }
  }

  rejectOrder(orderId: number): void {
    const reason = prompt(`Nhập lý do TỪ CHỐI đơn hàng #${orderId}:`);

    if (reason !== null) {
      if (reason.trim() === '') {
        alert('Vui lòng nhập lý do từ chối để thông báo cho khách hàng!');
        return;
      }

      this.isLoading = true;
      this.orderService.reviewOrder(orderId, false, reason.trim(), this.adminLastName).subscribe({
        next: (msg) => {
          alert('Đã từ chối đơn hàng thành công!');
          this.loadPendingOrders();
        },
        error: (err) => {
          alert('Lỗi: ' + (err.error || err.message));
          this.isLoading = false;
        }
      });
    }
  }
}
