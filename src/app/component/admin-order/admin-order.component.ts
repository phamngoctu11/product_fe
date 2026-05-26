import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../service/order.service';
import { getApiErrorMessage } from '../../model/api-response.model';

@Component({
  selector: 'app-admin-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-order.component.html',
  styleUrl: './admin-order.component.css',
})
export class AdminOrderComponent implements OnInit {
  pendingOrders: any[] = [];
  isLoading = false;
  userId: number | null = null;

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    const storedUserId = localStorage.getItem('user_id');
    this.userId = storedUserId ? Number(storedUserId) : null;

    this.loadPendingOrders();
  }

  loadPendingOrders(): void {
    this.isLoading = true;
    this.orderService.getPendingOrders().subscribe({
      next: (res) => {
        this.pendingOrders = res;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Loi khi tai danh sach don hang', err);
        this.isLoading = false;
      },
    });
  }

  approveOrder(order: any): void {
    if (!this.userId) {
      alert('Khong tim thay nguoi duyet don. Vui long dang nhap lai.');
      return;
    }

    if (confirm(`Ban co chac chan muon DUYET don hang #${order.id} khong?`)) {
      this.isLoading = true;
      this.orderService.reviewOrder(order.id, true, '', this.userId).subscribe({
        next: () => {
          alert('Duyet don hang thanh cong!');
          this.loadPendingOrders();
        },
        error: (err) => {
          alert('Loi: ' + getApiErrorMessage(err, 'Khong the thuc hien thao tac.'));
          this.isLoading = false;
        },
      });
    }
  }

  rejectOrder(orderId: number): void {
    if (!this.userId) {
      alert('Khong tim thay nguoi duyet don. Vui long dang nhap lai.');
      return;
    }

    const reason = prompt(`Nhap ly do TU CHOI don hang #${orderId}:`);

    if (reason !== null) {
      if (reason.trim() === '') {
        alert('Vui long nhap ly do tu choi de thong bao cho khach hang!');
        return;
      }

      this.isLoading = true;
      this.orderService.reviewOrder(orderId, false, reason.trim(), this.userId).subscribe({
        next: () => {
          alert('Da tu choi don hang thanh cong!');
          this.loadPendingOrders();
        },
        error: (err) => {
          alert('Loi: ' + getApiErrorMessage(err, 'Khong the thuc hien thao tac.'));
          this.isLoading = false;
        },
      });
    }
  }
}
