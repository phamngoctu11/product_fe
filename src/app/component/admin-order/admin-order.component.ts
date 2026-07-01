import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject as injectActionDialog } from '@angular/core';
import { ActionDialogService } from '../../service/action-dialog.service';
import { inject as injectToast } from '@angular/core';
import { ToastService } from '../../service/toast.service';
import { FormsModule } from '@angular/forms';
import { Order, OrderListDTO } from '../../model/order.model';
import { UserResListDTO } from '../../model/user.model';
import { OrderService } from '../../service/order.service';
import { UserService } from '../../service/user.service';
import { getApiErrorMessage } from '../../model/api-response.model';
import { OrderDetailPopupComponent } from '../order-detail-popup/order-detail-popup.component';
import { AppPaginationComponent } from '../shared/app-pagination/app-pagination.component';

@Component({
  selector: 'app-admin-order',
  standalone: true,
  imports: [CommonModule, FormsModule, OrderDetailPopupComponent, AppPaginationComponent],
  templateUrl: './admin-order.component.html',
  styleUrls: ['../../app.css', './admin-order.component.css'],
})
export class AdminOrderComponent implements OnInit {
  private readonly actionDialog = injectActionDialog(ActionDialogService);
  private readonly toast = injectToast(ToastService);
  pendingOrders: OrderListDTO[] = [];
  staffs: UserResListDTO[] = [];
  selectedStaffByOrder: { [orderId: number]: number | null } = {};
  activeStatus: 'PENDING_KCS' | 'PENDING_APPROVAL' | null = null;
  isLoading = false;
  isLoadingMore = false;
  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
  totalElements = 0;
  pageSizeOptions = [10, 20, 50, 100];
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
    this.loadPendingOrders(0);
  }

  loadPendingOrders(page: number = 0): void {
    if (!this.activeStatus) return;

    this.isLoading = true;
    this.currentPage = page;
    this.orderService.getPendingOrders(this.activeStatus, this.currentPage, this.pageSize).subscribe({
      next: (res) => {
        this.pendingOrders = res.content || [];
        this.currentPage = res.number ?? page;
        this.pageSize = res.size || this.pageSize;
        this.totalPages = res.totalPages || 0;
        this.totalElements = res.totalElements || 0;
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
        this.toast.notify('Không thể tải thêm đơn hàng: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        this.isLoadingMore = false;
      },
    });
  }

  hasMoreOrders(): boolean {
    return this.currentPage + 1 < this.totalPages;
  }

  changePage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.loadPendingOrders(page);
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.loadPendingOrders(0);
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
      this.toast.notify('Không tìm thấy người duyệt đơn. Vui lòng đăng nhập lại.');
      return;
    }

    const staffId = this.selectedStaffByOrder[order.id] || undefined;
    const confirmMessage = staffId
      ? `Duyệt đơn hàng #${order.id} và gán cho staff đã chọn?`
      : `Duyệt đơn hàng #${order.id} không gán staff ngay?`;

    this.actionDialog.confirm({
      title: 'Duyệt đơn hàng',
      message: confirmMessage,
      confirmText: 'Duyệt đơn',
      icon: 'bi-check-circle-fill',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.isLoading = true;
      this.orderService.reviewOrder(order.id, true, '', this.userId!, staffId).subscribe({
      next: (message) => {
        this.toast.notify(message || 'Duyệt đơn hàng thành công!');
        this.loadPendingOrders();
      },
      error: (err) => {
        this.toast.notify('Lỗi: ' + getApiErrorMessage(err, 'Không thể duyệt đơn hàng.'));
        this.isLoading = false;
      },
      });
    });
  }

  rejectOrder(order: OrderListDTO): void {
    if (!this.userId) {
      this.toast.notify('Không tìm thấy người duyệt đơn. Vui lòng đăng nhập lại.');
      return;
    }

    this.actionDialog.prompt({
      title: 'Từ chối đơn hàng',
      message: `Nhập lý do từ chối đơn hàng #${order.id}. Nội dung này sẽ được gửi cho khách hàng.`,
      confirmText: 'Từ chối đơn',
      tone: 'danger',
      icon: 'bi-x-circle-fill',
      input: {
        label: 'Lý do từ chối',
        placeholder: 'Ví dụ: Sản phẩm hiện không đủ điều kiện xử lý...',
        required: true,
        minLength: 5,
        maxLength: 500,
      },
    }).subscribe((reason) => {
      if (reason === null) return;
      this.isLoading = true;
      this.orderService.reviewOrder(order.id, false, reason, this.userId!).subscribe({
      next: (message) => {
        this.toast.notify(message || 'Đã từ chối đơn hàng thành công!');
        this.loadPendingOrders();
      },
      error: (err) => {
        this.toast.notify('Lỗi: ' + getApiErrorMessage(err, 'Không thể từ chối đơn hàng.'));
        this.isLoading = false;
      },
      });
    });
  }

  assignStaff(order: OrderListDTO): void {
    const staffId = this.selectedStaffByOrder[order.id];
    if (!staffId) {
      this.toast.notify('Vui lòng chọn staff trước khi gán đơn.');
      return;
    }

    this.actionDialog.confirm({
      title: 'Gán nhân viên xử lý',
      message: `Gán đơn hàng #${order.id} cho nhân viên đã chọn?`,
      confirmText: 'Gán nhân viên',
      icon: 'bi-person-check-fill',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.isLoading = true;
      this.orderService.assignStaff(order.id, staffId).subscribe({
      next: (message) => {
        this.toast.notify(message || 'Gán staff thành công!');
        this.loadPendingOrders();
      },
      error: (err) => {
        this.toast.notify('Lỗi: ' + getApiErrorMessage(err, 'Không thể gán staff.'));
        this.isLoading = false;
      },
      });
    });
  }

  kcsCheck(order: OrderListDTO, isPassed: boolean): void {
    const action = isPassed ? 'duyệt KCS đạt' : 'trả về staff để xuất lại';
    const dialogData = {
      title: isPassed ? 'Xác nhận KCS đạt' : 'KCS không đạt',
      message: `Bạn có chắc muốn ${action} cho đơn hàng #${order.id}?`,
      confirmText: isPassed ? 'Duyệt KCS' : 'Trả về staff',
      tone: (isPassed ? 'primary' : 'warning') as 'primary' | 'warning',
      icon: isPassed ? 'bi-shield-check' : 'bi-shield-exclamation',
      input: isPassed ? undefined : {
        label: 'Lý do KCS không đạt',
        placeholder: 'Mô tả vấn đề cần staff kiểm tra lại...',
        required: false,
        maxLength: 500,
      },
    };

    const submitKcs = (cancelReason: string) => {
      this.isLoading = true;
      this.orderService.kcsCheck(order.id, isPassed, cancelReason).subscribe({
      next: (message) => {
        this.toast.notify(message);
        this.loadPendingOrders();
      },
      error: (err) => {
        this.toast.notify('Lỗi: ' + getApiErrorMessage(err, 'Không thể xử lý KCS.'));
        this.isLoading = false;
      },
      });
    };

    if (isPassed) {
      this.actionDialog.confirm(dialogData).subscribe((confirmed) => {
        if (confirmed) submitKcs('');
      });
      return;
    }

    this.actionDialog.prompt(dialogData).subscribe((reason) => {
      if (reason !== null) submitKcs(reason);
    });
  }
}
