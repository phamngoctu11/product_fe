import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../service/dashboard.service'; // Chỉnh lại đường dẫn cho đúng
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective], // 🚨 Bắt buộc import BaseChartDirective
  templateUrl: './admin-dashboard.html'// (Tùy chọn)
})
export class AdminDashboard implements OnInit {

  // Biến lưu trữ dữ liệu thống kê
  stats: any = {
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    shippingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0
  };

  isLoading = true;

  // =========================================
  // CẤU HÌNH BIỂU ĐỒ TRÒN (PIE CHART)
  // =========================================
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'right',
      }
    }
  };

  // Dữ liệu sẽ được nhét vào biểu đồ sau khi gọi API thành công
  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: [ 'Chờ duyệt (Kho)', 'Đang giao', 'Đã giao thành công', 'Bị Hủy' ],
    datasets: [ {
      data: [0, 0, 0, 0], // Dữ liệu mặc định
      backgroundColor: ['#ffc107', '#0dcaf0', '#198754', '#dc3545'], // Màu sắc cho từng phần
      hoverBackgroundColor: ['#e0a800', '#31d2f2', '#157347', '#c82333']
    } ]
  };

  public pieChartType: ChartType = 'pie';

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats() {
    this.dashboardService.getDashboardStats().subscribe({
      next: (res) => {
        console.log('>>> Dữ liệu Backend trả về:', res);
        this.stats = res;

        // Cập nhật dữ liệu cho Biểu đồ
        this.pieChartData.datasets[0].data = [
          res.pendingOrders,
          res.shippingOrders,
          res.deliveredOrders,
          res.cancelledOrders
        ];

        // Ép Angular/Chart.js vẽ lại biểu đồ
        this.pieChartData = { ...this.pieChartData };
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi khi tải thống kê:', err);
        this.isLoading = false;
      }
    });
  }
}
