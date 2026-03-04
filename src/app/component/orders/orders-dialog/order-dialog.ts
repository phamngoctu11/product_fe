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
  constructor(
    @Inject(MAT_DIALOG_DATA) public userId: number,
    private orderService: OrderService,
  ) {}
  ngOnInit(): void {
    this.orderService.getOrdersByUserId(this.userId).subscribe((data) => (this.orders = data));
  }
}
