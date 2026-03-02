import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../service/order.service';
import { AuthService } from '../../service/auth.service';
import { UserService } from '../../service/user.service';
import { Order, OrderStatusHistory } from '../../model/order.model';
import { UserInforDTO } from '../../model/user.model';

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
    this.orderService.getOrdersByUserId(this.userId).subscribe({
      next: (data: Order[]) => {
        this.orders = data;
        this.activeOrders = data.filter(o => o.status === 'PENDING_WAREHOUSE' || o.status === 'SHIPPING');
        this.deliveredOrders = data.filter(o => o.status === 'DELIVERED');
        this.cancelledOrders = data.filter(o => o.status === 'CANCELLED');

        if (this.modalTitle.includes('giao')) {
          this.modalOrders = this.deliveredOrders;
        } else if (this.modalTitle.includes('hủy')) {
          this.modalOrders = this.cancelledOrders;
        }
      },
      error: (err) => console.error('Lỗi khi tải đơn hàng:', err),
    });
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
      this.modalTitle = '📦 Lịch sử đơn hàng đã giao';
    } else {
      this.modalOrders = this.cancelledOrders;
      this.modalTitle = '❌ Lịch sử đơn hàng đã hủy';
    }
  }

  getStatusName(status: string): string {
    const statusMap: { [key: string]: string } = {
      PENDING_WAREHOUSE: 'Đang xuất kho',
      SHIPPING: 'Đang giao',
      DELIVERED: 'Đã giao',
      CANCELLED: 'Đã hủy',
    };
    return statusMap[status] || status;
  }

  getNextStatus(currentStatus: string): string | null {
    if (currentStatus === 'PENDING_WAREHOUSE') return 'SHIPPING';
    if (currentStatus === 'SHIPPING') return 'DELIVERED';
    return null;
  }

  confirmUpdateStatus(orderId: number, nextStatus: string): void {
    if (window.confirm(`Bạn có chắc chắn muốn chuyển trạng thái: "${this.getStatusName(nextStatus)}" không?`)) {
      this.orderService.updateOrderStatus(orderId, nextStatus).subscribe({
        next: () => {
          alert('Cập nhật trạng thái thành công!');
          this.loadMyOrders();
        },
        error: (err) => alert('Lỗi: ' + (err.error || 'Không thể cập nhật trạng thái.'))
      });
    }
  }

  calculateExpectedDeduction(totalPrice: number): number {
    if (totalPrice < 1000000) return 1;
    if (totalPrice <= 5000000) return 2;
    if (totalPrice <= 10000000) return 3;
    return 5;
  }

  cancelOrder(order: Order): void {
    if (order.status !== 'PENDING_WAREHOUSE') {
      alert('Chỉ có thể hủy đơn hàng khi đang ở trạng thái Đang xuất kho!');
      return;
    }

    const currentRep = this.userInfo?.reputation ?? 'Đang tải...';
    const deduction = this.calculateExpectedDeduction(order.totalPrice);
    const reason = window.prompt('Vui lòng nhập lý do bạn muốn hủy đơn hàng:');

    if (reason === null) return;
    if (reason.trim() === '') {
      alert('Hủy đơn thất bại. Bạn bắt buộc phải nhập lý do hủy đơn!');
      return;
    }

    const confirmMsg = `⚠️ CẢNH BÁO HỦY ĐƠN ⚠️\n\nGiá trị đơn: ${order.totalPrice.toLocaleString()} đ\nTrừ uy tín: -${deduction} điểm\nĐiểm hiện tại: ${currentRep}\nLý do: ${reason}\n\nBạn có chắc chắn muốn hủy?`;

    if (window.confirm(confirmMsg)) {
      // Chỉ thay đổi dòng này để gọi API Cancel
      this.orderService.cancelOrder(order.id, reason).subscribe({
        next: () => {
          alert('Hủy đơn hàng thành công!');
          this.loadMyOrders();
          this.loadUserInfo();
        },
        error: (err) => alert('Không thể hủy đơn: ' + (err.error || err.message))
      });
    }
  }
  viewTimeline(orderId: number): void {
    this.selectedOrderId = orderId;
    this.selectedOrderHistory = [];
    this.isLoadingTimeline = true; // Bật cờ loading khi bắt đầu gọi API

    // Lấy thông tin đơn hàng gốc từ danh sách đã load (để lấy thời gian chốt đơn)
    const order = this.orders.find(o => o.id === orderId);

    this.orderService.getOrderHistory(orderId).subscribe({
      next: (data) => {
        // Tạo Bước 1: Mốc thời gian chốt đơn (Khởi tạo)
        const initialStep: OrderStatusHistory = {
          id: 0,
          oldstatus: '', // Trạng thái ban đầu nên không có oldstatus
          newstatus: 'PENDING_WAREHOUSE',
          updatetime: order?.startOrderTime || new Date().toISOString(),
          changer: 'Khách hàng' // Hoặc 'HỆ THỐNG'
        };

        // Gộp mốc Khởi tạo (Bước 1) vào đầu mảng lịch sử nhận từ Backend
        this.selectedOrderHistory = [initialStep, ...data];

        this.isLoadingTimeline = false; // Tắt cờ loading khi đã có dữ liệu
      },
      error: (err) => {
        alert('Không thể tải lịch sử đơn hàng: ' + err.message);
        this.isLoadingTimeline = false; // Lỗi cũng phải tắt loading
      }
    });
  }
}
