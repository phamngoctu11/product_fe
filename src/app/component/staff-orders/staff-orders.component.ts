import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Order, OrderItem, OrderListDTO } from '../../model/order.model';
import { getApiErrorMessage } from '../../model/api-response.model';
import { OrderService } from '../../service/order.service';

@Component({
  selector: 'app-staff-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-orders.component.html',
})
export class StaffOrdersComponent implements OnInit {
  warehousePendingOrders: OrderListDTO[] = [];
  myOrders: OrderListDTO[] = [];
  activeTab: 'pending' | 'mine' = 'pending';

  isLoading = false;
  isLoadingMorePending = false;
  isLoadingMoreMine = false;
  pendingPage = 0;
  minePage = 0;
  pageSize = 20;
  pendingTotalPages = 0;
  mineTotalPages = 0;

  selectedOrder: Order | null = null;
  detailLoading = false;
  exportingOrderId: number | null = null;
  exportQuantities: { [orderId: number]: { [variantId: number]: number } } = {};

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.pendingPage = 0;
    this.minePage = 0;
    this.orderService.getWarehousePendingOrders(this.pendingPage, this.pageSize).subscribe({
      next: (page) => {
        this.warehousePendingOrders = page.content || [];
        this.pendingTotalPages = page.totalPages || 0;
        this.loadMyOrders();
      },
      error: (err) => {
        alert('Không thể tải hàng đợi kho: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        this.isLoading = false;
      },
    });
  }

  loadMyOrders(): void {
    this.orderService.getMyStaffOrders(this.minePage, this.pageSize).subscribe({
      next: (page) => {
        this.myOrders = page.content || [];
        this.mineTotalPages = page.totalPages || 0;
        this.isLoading = false;
      },
      error: (err) => {
        alert('Không thể tải đơn phụ trách: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        this.isLoading = false;
      },
    });
  }

  loadMorePendingOrders(): void {
    if (this.isLoadingMorePending || this.pendingPage + 1 >= this.pendingTotalPages) return;

    this.isLoadingMorePending = true;
    this.orderService.getWarehousePendingOrders(this.pendingPage + 1, this.pageSize).subscribe({
      next: (page) => {
        this.warehousePendingOrders = [...this.warehousePendingOrders, ...(page.content || [])];
        this.pendingPage = page.number ?? this.pendingPage + 1;
        this.pendingTotalPages = page.totalPages || 0;
        this.isLoadingMorePending = false;
      },
      error: (err) => {
        alert('Không thể tải thêm đơn chờ nhận: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        this.isLoadingMorePending = false;
      },
    });
  }

  loadMoreMyOrders(): void {
    if (this.isLoadingMoreMine || this.minePage + 1 >= this.mineTotalPages) return;

    this.isLoadingMoreMine = true;
    this.orderService.getMyStaffOrders(this.minePage + 1, this.pageSize).subscribe({
      next: (page) => {
        this.myOrders = [...this.myOrders, ...(page.content || [])];
        this.minePage = page.number ?? this.minePage + 1;
        this.mineTotalPages = page.totalPages || 0;
        this.isLoadingMoreMine = false;
      },
      error: (err) => {
        alert('Không thể tải thêm đơn phụ trách: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        this.isLoadingMoreMine = false;
      },
    });
  }

  hasMorePendingOrders(): boolean {
    return this.pendingPage + 1 < this.pendingTotalPages;
  }

  hasMoreMyOrders(): boolean {
    return this.minePage + 1 < this.mineTotalPages;
  }

  claimOrder(order: OrderListDTO): void {
    if (!confirm(`Bạn muốn nhận xử lý đơn hàng #${order.id}?`)) return;

    this.isLoading = true;
    this.orderService.claimWarehouseOrder(order.id).subscribe({
      next: (message) => {
        alert(message);
        this.activeTab = 'mine';
        this.loadData();
      },
      error: (err) => {
        alert('Không thể nhận đơn: ' + getApiErrorMessage(err, 'Đơn có thể đã được staff khác nhận.'));
        this.isLoading = false;
      },
    });
  }

  openOrderDetail(order: OrderListDTO): void {
    this.selectedOrder = null;
    this.detailLoading = true;
    this.orderService.getById(order.id).subscribe({
      next: (detail) => {
        this.selectedOrder = {
          ...detail,
          staffName: detail.staffName || order.staffName || null,
        };
        this.initExportQuantitiesForOrder(detail);
        this.detailLoading = false;
      },
      error: (err) => {
        alert('Không thể tải chi tiết đơn hàng: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        this.detailLoading = false;
      },
    });
  }

  closeOrderDetail(): void {
    this.selectedOrder = null;
    this.detailLoading = false;
  }

  exportSelectedOrder(): void {
    if (!this.selectedOrder) return;
    this.exportOrder(this.selectedOrder);
  }

  exportOrder(order: Order): void {
    const items = order.items || [];
    const payload = items.map((item) => ({
      variantId: this.getVariantId(item),
      quantity: this.getExportQuantity(order.id, item),
    }));

    if (items.length === 0) {
      alert('Đơn hàng chưa có danh sách variant để xuất kho.');
      return;
    }

    if (payload.some((item) => !item.variantId)) {
      alert('Không thể xuất kho vì dữ liệu variant thiếu variantId.');
      return;
    }

    if (payload.some((item) => item.quantity < 0)) {
      alert('Số lượng xuất kho không được âm.');
      return;
    }

    if (!confirm(`Xác nhận xuất kho đơn hàng #${order.id}?`)) return;

    this.exportingOrderId = order.id;
    this.orderService.exportWarehouseOrder(order.id, payload as { variantId: number; quantity: number }[]).subscribe({
      next: (message) => {
        alert(message);
        this.exportingOrderId = null;
        this.closeOrderDetail();
        this.loadData();
      },
      error: (err) => {
        alert('Không thể xuất kho: ' + getApiErrorMessage(err, 'Vui lòng kiểm tra lại số lượng.'));
        this.exportingOrderId = null;
      },
    });
  }

  getVariantId(item: OrderItem): number {
    return Number(item.variantId || item.productVariantId || 0);
  }

  getVariantLabel(item: OrderItem): string {
    if (item.variantName) return item.variantName;
    const variantId = this.getVariantId(item);
    return variantId ? `Variant #${variantId}` : 'Chưa có variantId';
  }

  getItemImage(item: OrderItem): string {
    return item.image_url || item.imageUrl || '';
  }

  getExportQuantity(orderId: number, item: OrderItem): number {
    const variantId = this.getVariantId(item);
    return Number(this.exportQuantities[orderId]?.[variantId] ?? item.exportedQuantity ?? item.quantity ?? 0);
  }

  setExportQuantity(orderId: number, item: OrderItem, value: number): void {
    const variantId = this.getVariantId(item);
    if (!this.exportQuantities[orderId]) this.exportQuantities[orderId] = {};
    this.exportQuantities[orderId][variantId] = Number(value || 0);
  }

  canExport(order: Order | null): boolean {
    return !!order && order.status === 'WAREHOUSE_ASSIGNED' && (order.items?.length || 0) > 0;
  }

  private initExportQuantitiesForOrder(order: Order): void {
    if (!this.exportQuantities[order.id]) this.exportQuantities[order.id] = {};
    (order.items || []).forEach((item) => {
      const variantId = this.getVariantId(item);
      if (variantId && this.exportQuantities[order.id][variantId] === undefined) {
        this.exportQuantities[order.id][variantId] = Number(item.exportedQuantity ?? item.quantity ?? 0);
      }
    });
  }
}
