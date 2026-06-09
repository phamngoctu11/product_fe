import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Order, OrderListDTO } from '../../model/order.model';
import { UserResListDTO } from '../../model/user.model';
import { OrderService } from '../../service/order.service';
import { UserService } from '../../service/user.service';
import { getApiErrorMessage } from '../../model/api-response.model';
import { OrderDetailPopupComponent } from '../order-detail-popup/order-detail-popup.component';

@Component({
  selector: 'app-admin-order',
  standalone: true,
  imports: [CommonModule, FormsModule, OrderDetailPopupComponent],
  templateUrl: './admin-order.component.html',
  styleUrl: './admin-order.component.css',
})
export class AdminOrderComponent implements OnInit {
  pendingOrders: OrderListDTO[] = [];
  staffs: UserResListDTO[] = [];
  selectedStaffByOrder: { [orderId: number]: number | null } = {};
  activeStatus: 'PENDING_KCS' | 'PENDING_APPROVAL' | null = null;
  isLoading = false;
  isLoadingMore = false;
  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
  userId: number | null = null;
  selectedOrderDetail: Order | null = null;
  isDetailLoading = false;
  detailError = '';

  constructor(
    private orderService: OrderService,
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    const storedUserId = localStorage.getItem('user_id');
    this.userId = storedUserId ? Number(storedUserId) : null;
    this.loadStaffs();
  }

  selectStatus(status: 'PENDING_KCS' | 'PENDING_APPROVAL'): void {
    if (this.activeStatus === status && this.pendingOrders.length > 0) return;

    this.activeStatus = status;
    this.loadPendingOrders();
  }

  loadPendingOrders(): void {
    if (!this.activeStatus) return;

    this.isLoading = true;
    this.currentPage = 0;
    this.orderService.getPendingOrders(this.activeStatus, this.currentPage, this.pageSize).subscribe({
      next: (res) => {
        this.pendingOrders = res.content || [];
        this.totalPages = res.totalPages || 0;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách đơn hàng', err);
        this.isLoading = false;
      },
    });
  }

  loadMorePendingOrders(): void {
    if (!this.activeStatus || this.isLoadingMore || this.currentPage + 1 >= this.totalPages) return;

    this.isLoadingMore = true;
    this.orderService.getPendingOrders(this.activeStatus, this.currentPage + 1, this.pageSize).subscribe({
      next: (res) => {
        this.pendingOrders = [...this.pendingOrders, ...(res.content || [])];
        this.currentPage = res.number ?? this.currentPage + 1;
        this.totalPages = res.totalPages || 0;
        this.isLoadingMore = false;
      },
      error: (err) => {
        alert('Không thể tải thêm đơn hàng: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        this.isLoadingMore = false;
      },
    });
  }

  hasMoreOrders(): boolean {
    return this.currentPage + 1 < this.totalPages;
  }

  openOrderDetail(order: OrderListDTO): void {
    this.selectedOrderDetail = null;
    this.detailError = '';
    this.isDetailLoading = true;

    this.orderService.getById(order.id).subscribe({
      next: (detail) => {
        this.selectedOrderDetail = {
          ...detail,
          staffName: detail.staffName || order.staffName || null,
          managerId: detail.managerId ?? detail.approvedById ?? null,
          managerName: detail.managerName || detail.approvedByFullName || null,
        };
        this.isDetailLoading = false;
      },
      error: (err) => {
        this.detailError = getApiErrorMessage(err, 'Không thể tải chi tiết đơn hàng.');
        this.isDetailLoading = false;
      },
    });
  }

  closeOrderDetail(): void {
    this.selectedOrderDetail = null;
    this.isDetailLoading = false;
    this.detailError = '';
  }

  getActivePanelTitle(): string {
    return this.activeStatus === 'PENDING_KCS' ? 'Đơn chờ KCS' : 'Đơn chờ duyệt';
  }

  loadStaffs(): void {
    this.userService.getAll(0, 100).subscribe({
      next: (page) => {
        this.staffs = (page.content || []).filter((user) => {
          const role = (user.role || '').toUpperCase();
          return role === 'STAFF' || role === 'ROLE_STAFF';
        });
      },
      error: (err) => console.error('Lỗi khi tải danh sách staff', err),
    });
  }

  approveOrder(order: OrderListDTO): void {
    if (!this.userId) {
      alert('Không tìm thấy người duyệt đơn. Vui lòng đăng nhập lại.');
      return;
    }

    const staffId = this.selectedStaffByOrder[order.id] || undefined;
    const confirmMessage = staffId
      ? `Duyệt đơn hàng #${order.id} và gán cho staff đã chọn?`
      : `Duyệt đơn hàng #${order.id} không gán staff ngay?`;

    if (!confirm(confirmMessage)) return;

    this.isLoading = true;
    this.orderService.reviewOrder(order.id, true, '', this.userId, staffId).subscribe({
      next: (message) => {
        alert(message || 'Duyệt đơn hàng thành công!');
        this.loadPendingOrders();
      },
      error: (err) => {
        alert('Lỗi: ' + getApiErrorMessage(err, 'Không thể duyệt đơn hàng.'));
        this.isLoading = false;
      },
    });
  }

  rejectOrder(order: OrderListDTO): void {
    if (!this.userId) {
      alert('Không tìm thấy người duyệt đơn. Vui lòng đăng nhập lại.');
      return;
    }

    const reason = prompt(`Nhập lý do TỪ CHỐI đơn hàng #${order.id}:`);
    if (reason === null) return;
    if (reason.trim() === '') {
      alert('Vui lòng nhập lý do từ chối để thông báo cho khách hàng!');
      return;
    }

    this.isLoading = true;
    this.orderService.reviewOrder(order.id, false, reason.trim(), this.userId).subscribe({
      next: (message) => {
        alert(message || 'Đã từ chối đơn hàng thành công!');
        this.loadPendingOrders();
      },
      error: (err) => {
        alert('Lỗi: ' + getApiErrorMessage(err, 'Không thể từ chối đơn hàng.'));
        this.isLoading = false;
      },
    });
  }

  assignStaff(order: OrderListDTO): void {
    const staffId = this.selectedStaffByOrder[order.id];
    if (!staffId) {
      alert('Vui lòng chọn staff trước khi gán đơn.');
      return;
    }

    if (!confirm(`Gán đơn hàng #${order.id} cho staff đã chọn?`)) return;

    this.isLoading = true;
    this.orderService.assignStaff(order.id, staffId).subscribe({
      next: (message) => {
        alert(message || 'Gán staff thành công!');
        this.loadPendingOrders();
      },
      error: (err) => {
        alert('Lỗi: ' + getApiErrorMessage(err, 'Không thể gán staff.'));
        this.isLoading = false;
      },
    });
  }

  kcsCheck(order: OrderListDTO, isPassed: boolean): void {
    const action = isPassed ? 'duyệt KCS đạt' : 'trả về staff để xuất lại';
    if (!confirm(`Bạn có chắc chắn muốn ${action} cho đơn hàng #${order.id}?`)) return;

    let cancelReason = '';
    if (!isPassed) {
      const reason = prompt(`Nhập lý do KCS không đạt cho đơn hàng #${order.id} (không bắt buộc):`);
      if (reason === null) return;
      cancelReason = reason.trim();
    }

    this.isLoading = true;
    this.orderService.kcsCheck(order.id, isPassed, cancelReason).subscribe({
      next: (message) => {
        alert(message);
        this.loadPendingOrders();
      },
      error: (err) => {
        alert('Lỗi: ' + getApiErrorMessage(err, 'Không thể xử lý KCS.'));
        this.isLoading = false;
      },
    });
  }
}