import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Order } from '../../../model/order.model';
import { OrderService } from '../../../service/order.service';

@Component({
  selector: 'app-order-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './order-dialog.html',
})
export class OrderDialogComponent implements OnInit {
  orders: Order[] = [];
  isLoading = false;
  isLoadingMore = false;
  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
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
}
