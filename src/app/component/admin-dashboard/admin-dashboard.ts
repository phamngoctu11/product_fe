import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { DashboardService } from '../../service/dashboard.service';
import { BestSellingProduct } from '../../model/product.model';
import { ProductService } from '../../service/product.service';

type BestSellingPeriod = 'day' | 'week' | 'month';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  pendingWH: number;
  pendingAP: number;
  pendingPM: number;
  pendingKCS: number;
  warehouseAssigned:number;
  shippingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
}

interface StatusSummary {
  key: keyof DashboardStats;
  label: string;
  description: string;
  icon: string;
  bgClass: string;
  textClass: string;
  badgeClass: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['../../app.css', './admin-dashboard.css'],
})
export class AdminDashboard implements OnInit {
  private readonly emptyStats: DashboardStats = {
    totalRevenue: 0,
    totalOrders: 0,
    pendingWH: 0,
    pendingAP: 0,
    pendingPM: 0,
    pendingKCS: 0,
    shippingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    warehouseAssigned: 0,
  };

  stats: DashboardStats = { ...this.emptyStats };

  readonly pendingStatuses: StatusSummary[] = [
    {
      key: 'pendingPM',
      label: 'Chờ thanh toán',
      description: 'Đơn online đang chờ khách thanh toán',
      icon: 'bi-credit-card',
      bgClass: 'bg-warning bg-opacity-10',
      textClass: 'text-warning',
      badgeClass: 'bg-warning text-dark',
    },
    {
      key: 'pendingAP',
      label: 'Chờ duyệt',
      description: 'Đơn đang chờ admin hoặc manager duyệt',
      icon: 'bi-clipboard-check',
      bgClass: 'bg-primary bg-opacity-10',
      textClass: 'text-primary',
      badgeClass: 'bg-primary text-white',
    },
    {
      key: 'pendingWH',
      label: 'Chờ kho',
      description: 'Đơn đang chờ kho tiếp nhận',
      icon: 'bi-box-seam',
      bgClass: 'bg-info bg-opacity-10',
      textClass: 'text-info',
      badgeClass: 'bg-info text-dark',
    },
     {
      key: 'warehouseAssigned',
      label: 'Đang xuất kho',
      description: 'Đơn hàng đã được giao cho kho',
      icon: 'bi-box-seam',
      bgClass: 'bg-warning bg-opacity-10',
      textClass: 'text-warning',
      badgeClass: 'bg-warning text-dark',
    },
    {
      key: 'pendingKCS',
      label: 'Chờ KCS',
      description: 'Đơn đang chờ kiểm tra chất lượng',
      icon: 'bi-shield-check',
      bgClass: 'bg-secondary bg-opacity-10',
      textClass: 'text-secondary',
      badgeClass: 'bg-secondary text-white',
    },
  ];

  readonly operationStatuses: StatusSummary[] = [
    ...this.pendingStatuses,
    {
      key: 'shippingOrders',
      label: 'Đang giao',
      description: 'Đơn hàng đang trên đường giao',
      icon: 'bi-truck',
      bgClass: 'bg-info bg-opacity-10',
      textClass: 'text-info',
      badgeClass: 'bg-info text-dark',
    },
    {
      key: 'deliveredOrders',
      label: 'Giao thành công',
      description: 'Khách đã xác nhận nhận hàng',
      icon: 'bi-check-circle',
      bgClass: 'bg-success bg-opacity-10',
      textClass: 'text-success',
      badgeClass: 'bg-success text-white',
    },
    {
      key: 'cancelledOrders',
      label: 'Đã hủy',
      description: 'Đơn bị từ chối hoặc khách hủy',
      icon: 'bi-x-circle',
      bgClass: 'bg-danger bg-opacity-10',
      textClass: 'text-danger',
      badgeClass: 'bg-danger text-white',
    },
  ];

  isLoading = true;
  isLoadingBestSelling = true;
  bestSellingProducts: BestSellingProduct[] = [];
  bestSellingError = '';
  bestSellingPeriod: BestSellingPeriod = 'day';
  bestSellingPeriods = [
    { value: 'day' as const, label: 'Ngày' },
    { value: 'week' as const, label: 'Tuần' },
    { value: 'month' as const, label: 'Tháng' },
  ];

  public orderStatusChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          padding: 16,
        },
      },
    },
  };

  public orderStatusChartData: ChartData<'doughnut', number[], string | string[]> = {
    labels: [
      'Chờ thanh toán',
      'Chờ duyệt',
      'Chờ kho',
      'Chờ KCS',
      'Đang xuất kho',
      'Đang giao',
      'Đã giao',
      'Đã hủy',
    ],
    datasets: [
      {
        data: [0, 0, 0,0, 0, 0, 0, 0],
        backgroundColor: [
          '#f59e0b',
          '#2563eb',
          '#06b6d4',
          '#64748b',
          '#f97316',
          '#0ea5e9',
          '#16a34a',
          '#dc2626',
        ],
        hoverBackgroundColor: [
          '#d97706',
          '#1d4ed8',
          '#0891b2',
          '#475569',
          '#f97316',
          '#0284c7',
          '#15803d',
          '#b91c1c',
        ],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  public orderStatusChartType: 'doughnut' = 'doughnut';

  constructor(
    private dashboardService: DashboardService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadBestSellingProducts();
  }

  get pendingProcessingOrders(): number {
    return (
      this.stats.pendingWH +
      this.stats.pendingAP +
      this.stats.pendingPM +
      this.stats.pendingKCS +
      this.stats.warehouseAssigned
    );
  }

  getStatusValue(key: keyof DashboardStats): number {
    return Number(this.stats[key] ?? 0);
  }

  getPercent(value: number): number {
    return this.stats.totalOrders ? (value / this.stats.totalOrders) * 100 : 0;
  }

  loadStats(): void {
    this.dashboardService.getDashboardStats().subscribe({
      next: (res) => {
        this.stats = this.normalizeStats(res);
        this.updateOrderStatusChart();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi khi tải thống kê:', err);
        this.isLoading = false;
      },
    });
  }

  loadBestSellingProducts(period: BestSellingPeriod = this.bestSellingPeriod): void {
    this.bestSellingPeriod = period;
    this.isLoadingBestSelling = true;
    this.bestSellingError = '';

    this.productService.getBestSelling(this.bestSellingPeriod, 0, 5).subscribe({
      next: (res) => {
        this.bestSellingProducts = res || [];
        this.isLoadingBestSelling = false;
      },
      error: (err) => {
        console.error('Lỗi khi tải sản phẩm bán chạy:', err);
        this.bestSellingError = 'Không thể tải danh sách sản phẩm bán chạy.';
        this.isLoadingBestSelling = false;
      },
    });
  }

  changeBestSellingPeriod(period: BestSellingPeriod): void {
    if (this.bestSellingPeriod === period && !this.bestSellingError) return;
    this.loadBestSellingProducts(period);
  }

  private normalizeStats(res: Partial<DashboardStats> | null | undefined): DashboardStats {
    const source = res ?? {};

    return {
      totalRevenue: Number(source.totalRevenue ?? 0),
      totalOrders: Number(source.totalOrders ?? 0),
      pendingWH: Number(source.pendingWH ?? 0),
      pendingAP: Number(source.pendingAP ?? 0),
      pendingPM: Number(source.pendingPM ?? 0),
      pendingKCS: Number(source.pendingKCS ?? 0),
      warehouseAssigned: Number(source.warehouseAssigned ?? 0),
      shippingOrders: Number(source.shippingOrders ?? 0),
      deliveredOrders: Number(source.deliveredOrders ?? 0),
      cancelledOrders: Number(source.cancelledOrders ?? 0),
    };
  }

  private updateOrderStatusChart(): void {
    this.orderStatusChartData = {
      ...this.orderStatusChartData,
      datasets: [
        {
          ...this.orderStatusChartData.datasets[0],
          data: [
            this.stats.pendingPM,
            this.stats.pendingAP,
            this.stats.pendingWH,
            this.stats.pendingKCS,
            this.stats.warehouseAssigned,
            this.stats.shippingOrders,
            this.stats.deliveredOrders,
            this.stats.cancelledOrders,

          ],
        },
      ],
    };
  }
}
