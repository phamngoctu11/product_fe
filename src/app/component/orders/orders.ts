import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../service/order.service';
import { AuthService } from '../../service/auth.service';
import { UserService } from '../../service/user.service';
import { Order, OrderStatusHistory } from '../../model/order.model';
import { UserInforDTO } from '../../model/user.model';
import { getApiErrorMessage } from '../../model/api-response.model';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.html',
})
export class Orders implements OnInit {
  orders: Order[] = [];
  activeOrders: Order[] = [];
  deliveredOrders: Order[] = [];
  cancelledOrders: Order[] = [];
  selectedOrderHistory: OrderStatusHistory[] = [];
  selectedOrderId: number | null = null;
  isLoadingTimeline: boolean = false;
  modalOrders: Order[] = [];
  modalTitle: string = '';
  isLoadingOrders = false;
  isLoadingMoreOrders = false;
  currentPage = 0;
  pageSize = 20;
  totalPages = 0;

  userId!: number;
  userInfo?: UserInforDTO;

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    const id = this.authService.getUserId();
    if (id !== null) {
      this.userId = id;
      this.loadMyOrders();
      this.loadUserInfo();
    } else {
      console.error('Không tìm thấy ID người dùng. Hãy đăng nhập lại!');
    }
  }

  loadMyOrders(): void {
    this.isLoadingOrders = true;
    this.currentPage = 0;
    this.orderService.getOrdersByUserId(this.userId, this.currentPage, this.pageSize).subscribe({
      next: (page) => {
        this.orders = page.content || [];
        this.totalPages = page.totalPages || 0;
        this.applyOrderBuckets();
        this.isLoadingOrders = false;
      },
      error: (err) => {
        console.error('Lỗi khi tải đơn hàng:', err);
        this.isLoadingOrders = false;
      },
    });
  }

  loadMoreOrders(): void {
    if (this.isLoadingMoreOrders || this.currentPage + 1 >= this.totalPages) return;

    this.isLoadingMoreOrders = true;
    this.orderService.getOrdersByUserId(this.userId, this.currentPage + 1, this.pageSize).subscribe({
      next: (page) => {
        this.orders = [...this.orders, ...(page.content || [])];
        this.currentPage = page.number ?? this.currentPage + 1;
        this.totalPages = page.totalPages || 0;
        this.applyOrderBuckets();
        this.isLoadingMoreOrders = false;
      },
      error: (err) => {
        alert('Không thể tải thêm đơn hàng: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        this.isLoadingMoreOrders = false;
      },
    });
  }

  hasMoreOrders(): boolean {
    return this.currentPage + 1 < this.totalPages;
  }

  private applyOrderBuckets(): void {
    this.activeOrders = this.orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
    this.deliveredOrders = this.orders.filter(o => o.status === 'DELIVERED');
    this.cancelledOrders = this.orders.filter(o => o.status === 'CANCELLED');

    if (this.modalTitle.includes('giao')) {
      this.modalOrders = this.deliveredOrders;
    } else if (this.modalTitle.includes('hủy')) {
      this.modalOrders = this.cancelledOrders;
    }
  }
  loadUserInfo(): void {
    this.userService.getById(this.userId).subscribe({
      next: (res: any) => this.userInfo = res,
      error: (err) => console.error('Lỗi tải thông tin cá nhân', err)
    });
  }

  openHistoryModal(type: 'DELIVERED' | 'CANCELLED'): void {
    if (type === 'DELIVERED') {
      this.modalOrders = this.deliveredOrders;
      this.modalTitle = 'Lịch sử đơn hàng đã giao';
    } else {
      this.modalOrders = this.cancelledOrders;
      this.modalTitle = 'Lịch sử đơn hàng đã hủy';
    }
  }

  getStatusName(status: string): string {
    const statusMap: { [key: string]: string } = {
      PENDING_APPROVAL: 'Chờ duyệt',
      PENDING_WAREHOUSE: 'Chờ kho nhận',
      WAREHOUSE_ASSIGNED: 'Kho đang xử lý',
      PENDING_KCS: 'Chờ KCS',
      SHIPPING: 'Đang giao',
      DELIVERED: 'Đã giao',
      CANCELLED: 'Đã hủy',
    };
    return statusMap[status] || status;
  }

  getStatusBadgeClass(status: string): string {
    const statusClassMap: { [key: string]: string } = {
      PENDING_APPROVAL: 'order-status-pending-approval',
      PENDING_WAREHOUSE: 'order-status-warehouse',
      WAREHOUSE_ASSIGNED: 'order-status-warehouse',
      PENDING_KCS: 'order-status-shipping',
      SHIPPING: 'order-status-shipping',
      DELIVERED: 'order-status-delivered',
      CANCELLED: 'order-status-cancelled',
    };

    return statusClassMap[status] || 'order-status-default';
  }

  getStatusIcon(status: string): string {
    const statusIconMap: { [key: string]: string } = {
      PENDING_APPROVAL: 'bi-hourglass-split',
      PENDING_WAREHOUSE: 'bi-box-seam',
      WAREHOUSE_ASSIGNED: 'bi-person-check',
      PENDING_KCS: 'bi-clipboard-check',
      SHIPPING: 'bi-truck',
      DELIVERED: 'bi-check-circle-fill',
      CANCELLED: 'bi-x-circle',
    };

    return statusIconMap[status] || 'bi-info-circle';
  }

  getNextStatus(currentStatus: string): string | null {
    if (currentStatus === 'SHIPPING') return 'DELIVERED';
    return null;
  }

  confirmUpdateStatus(orderId: number, nextStatus: string): void {
    if (nextStatus !== 'DELIVERED') return;

    if (window.confirm('Bạn xác nhận đã nhận được đơn hàng này?')) {
      this.orderService.confirmReceipt(orderId).subscribe({
        next: () => {
          alert('Xác nhận nhận hàng thành công!');
          this.loadMyOrders();
        },
        error: (err) => alert('Lỗi: ' + getApiErrorMessage(err, 'Không thể xác nhận nhận hàng.'))
      });
    }
  }
  calculateExpectedDeduction(totalPrice: number): number {
    if (totalPrice < 1000000) return 1;
    if (totalPrice <= 5000000) return 2;
    if (totalPrice <= 10000000) return 3;
    return 5;
  }

  getOrderItems(order: Order): any[] {
    return order.items || order.orderItems || order.details || [];
  }

  getOrderTotalPrice(order: Order): number {
    return Number(order.totalPrice || 0);
  }

  getOrderDiscountAmount(order: Order): number {
    return Number(order.discountAmount || 0);
  }

  getOrderFinalPrice(order: Order): number {
    const finalPrice = Number(order.finalPrice);
    if (!Number.isNaN(finalPrice) && finalPrice > 0) return finalPrice;

    return Math.max(this.getOrderTotalPrice(order) - this.getOrderDiscountAmount(order), 0);
  }

  isOrderApproved(order: Order): boolean {
    return order.status !== 'PENDING_APPROVAL' || !!order.approvedById || !!order.approvedByFullName;
  }

  canCancelOrder(order: Order): boolean {
    return order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && !this.isOrderApproved(order);
  }

  cancelOrder(order: Order): void {
    if (!this.canCancelOrder(order)) {
      alert('Đơn hàng đã được manager duyệt nên không thể hủy.');
      return;
    }

    const currentRep = this.userInfo?.reputation ?? 'Đang tải...';
    const orderTotalPrice = this.getOrderTotalPrice(order);
    const deduction = this.calculateExpectedDeduction(orderTotalPrice);
    const reason = window.prompt('Vui lòng nhập lý do bạn muốn hủy đơn hàng:');

    if (reason === null) return;
    if (reason.trim() === '') {
      alert('Hủy đơn thất bại. Bạn bắt buộc phải nhập lý do hủy đơn!');
      return;
    }

    const confirmMsg = `CẢNH BÁO HỦY ĐƠN\n\nGiá trị đơn: ${orderTotalPrice.toLocaleString()} đ\nTrừ uy tín: -${deduction} điểm\nĐiểm hiện tại: ${currentRep}\nLý do: ${reason}\n\nBạn có chắc chắn muốn hủy?`;

    if (window.confirm(confirmMsg)) {
      // Gọi API hủy đơn.
      this.orderService.cancelOrder(order.id, reason).subscribe({
        next: () => {
          alert('Hủy đơn hàng thành công!');
          this.loadMyOrders();
          this.loadUserInfo();
        },
        error: (err) => alert('Không thể hủy đơn: ' + getApiErrorMessage(err, 'Không thể hủy đơn.'))
      });
    }
  }
  viewTimeline(orderId: number): void {
    this.selectedOrderId = orderId;
    this.selectedOrderHistory = [];
    this.isLoadingTimeline = true;

    const order = this.orders.find(o => o.id === orderId);

    this.orderService.getOrderHistory(orderId).subscribe({
      next: (data) => {
        const initialStep: OrderStatusHistory = {
          id: 0,
          oldstatus: '',
          newstatus: 'PENDING_APPROVAL',
          updatetime: order?.startOrderTime || new Date().toISOString(),
          changerId: 1
        };

        this.selectedOrderHistory = [initialStep, ...data];

        this.isLoadingTimeline = false;
      },
      error: (err) => {
        alert('Không thể tải lịch sử đơn hàng: ' + getApiErrorMessage(err, 'Không thể tải lịch sử đơn hàng.'));
        this.isLoadingTimeline = false;
      }
    });
  }
}


