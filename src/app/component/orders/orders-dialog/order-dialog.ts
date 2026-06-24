import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Order, OrderListDTO } from '../../../model/order.model';
import { OrderService } from '../../../service/order.service';
import { getApiErrorMessage } from '../../../model/api-response.model';
import { OrderDetailPopupComponent } from '../../order-detail-popup/order-detail-popup.component';

@Component({
  selector: 'app-order-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, OrderDetailPopupComponent],
  templateUrl: './order-dialog.html',
  styleUrls: ['../../../app.css', './order-dialog.css'],
})
export class OrderDialogComponent implements OnInit {
  orders: OrderListDTO[] = [];
  isLoading = false;
  isLoadingMore = false;
  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
  selectedOrderDetail: Order | null = null;
  isDetailLoading = false;
  detailError = '';
  constructor(
    @Inject(MAT_DIALOG_DATA) public userId: number,
    private orderService: OrderService,
  ) {}
  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.currentPage = 0;
    this.orderService.getOrdersByUserId(this.userId, this.currentPage, this.pageSize).subscribe((page) => {
      this.orders = page.content || [];
      this.totalPages = page.totalPages || 0;
      this.isLoading = false;
    });
  }

  loadMoreOrders(): void {
    if (this.isLoadingMore || this.currentPage + 1 >= this.totalPages) return;

    this.isLoadingMore = true;
    this.orderService.getOrdersByUserId(this.userId, this.currentPage + 1, this.pageSize).subscribe((page) => {
      this.orders = [...this.orders, ...(page.content || [])];
      this.currentPage = page.number ?? this.currentPage + 1;
      this.totalPages = page.totalPages || 0;
      this.isLoadingMore = false;
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
        };
        this.isDetailLoading = false;
      },
      error: (err) => {
        this.detailError = getApiErrorMessage(err, 'Khong the tai chi tiet don hang.');
        this.isDetailLoading = false;
      },
    });
  }

  closeOrderDetail(): void {
    this.selectedOrderDetail = null;
    this.isDetailLoading = false;
    this.detailError = '';
  }

}

