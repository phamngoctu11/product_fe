import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Order, OrderListDTO } from '../../../model/order.model';
import { OrderService } from '../../../service/order.service';
import { getApiErrorMessage } from '../../../model/api-response.model';
import { OrderDetailPopupComponent } from '../../order-detail-popup/order-detail-popup.component';
import {
  AppPaginationComponent,
  OrderSummaryCardComponent,
  ViewStateComponent,
} from '../../shared';

@Component({
  selector: 'app-order-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    OrderDetailPopupComponent,
    AppPaginationComponent,
    OrderSummaryCardComponent,
    ViewStateComponent,
  ],
  templateUrl: './order-dialog.html',
  styleUrl: './order-dialog.css',
})
export class OrderDialogComponent implements OnInit {
  orders: OrderListDTO[] = [];
  isLoading = false;
  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
  totalElements = 0;
  pageSizeOptions = [10, 20, 50, 100];
  selectedOrderDetail: Order | null = null;
  isDetailLoading = false;
  detailError = '';
  constructor(
    @Inject(MAT_DIALOG_DATA) public userId: string,
    private orderService: OrderService,
  ) {}
  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(pageNumber: number = 0): void {
    this.isLoading = true;
    this.currentPage = pageNumber;
    this.orderService.getOrdersByUserId(this.userId, this.currentPage, this.pageSize).subscribe((page) => {
      this.orders = page.content || [];
      this.currentPage = page.number ?? pageNumber;
      this.pageSize = page.size || this.pageSize;
      this.totalPages = page.totalPages || 0;
      this.totalElements = page.totalElements || 0;
      this.isLoading = false;
    });
  }

  changePage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.loadOrders(page);
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.loadOrders(0);
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
