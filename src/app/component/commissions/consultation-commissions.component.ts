import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { getApiErrorMessage } from '../../model/api-response.model';
import {
  CommissionDetailQuery,
  CommissionPeriod,
  CommissionStatus,
  StaffCommissionDetail,
  StaffCommissionSummary,
} from '../../model/consultation-commission.model';
import { AuthService } from '../../service/auth.service';
import { ConsultationCommissionService } from '../../service/consultation-commission.service';
import { ActionDialogService } from '../../service/action-dialog.service';
import { ToastService } from '../../service/toast.service';
import { AppPaginationComponent } from '../shared/app-pagination/app-pagination.component';

@Component({
  selector: 'app-consultation-commissions',
  standalone: true,
  imports: [CommonModule, FormsModule, AppPaginationComponent],
  templateUrl: './consultation-commissions.component.html',
  styleUrls: ['../../app.css', './consultation-commissions.component.css'],
})
export class ConsultationCommissionsComponent implements OnInit {
  readonly periods: { value: CommissionPeriod; label: string }[] = [
    { value: 'DAY', label: 'Ngày' },
    { value: 'WEEK', label: 'Tuần' },
    { value: 'MONTH', label: 'Tháng' },
  ];

  readonly statuses: { value: CommissionStatus; label: string; icon: string }[] = [
    { value: 'CONFIRMED', label: 'Đã chốt', icon: 'bi-check-circle-fill' },
    { value: 'PENDING', label: 'Đang chờ', icon: 'bi-hourglass-split' },
    { value: 'CANCELLED', label: 'Đã hủy', icon: 'bi-x-circle-fill' },
  ];

  readonly maxPageSize = 100;
  readonly pageSizeOptions = [10, 20, 50, 100];

  period: CommissionPeriod = 'MONTH';
  status: CommissionStatus = 'CONFIRMED';
  from = '';
  to = '';
  pageSize = 20;

  summary: StaffCommissionSummary | null = null;
  staffSummaries: StaffCommissionSummary[] = [];
  selectedStaff: StaffCommissionSummary | null = null;
  details: StaffCommissionDetail[] = [];

  staffPage = 0;
  staffTotalPages = 0;
  staffTotalElements = 0;
  detailPage = 0;
  detailTotalPages = 0;
  detailTotalElements = 0;

  isLoadingSummary = false;
  isLoadingDetails = false;
  isLoadingStaffs = false;
  isLoadingMoreStaffs = false;
  isLoadingMoreDetails = false;
  isRebuilding = false;
  isDetailOpen = false;

  constructor(
    public readonly authService: AuthService,
    private readonly commissionService: ConsultationCommissionService,
    private readonly actionDialog: ActionDialogService,
    private readonly toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  get isAdminView(): boolean {
    return this.authService.isAdmin();
  }

  get canViewCommission(): boolean {
    return this.authService.isAdmin() || this.authService.isStaff();
  }

  get activeSummary(): StaffCommissionSummary | null {
    return this.isAdminView ? this.selectedStaff : this.summary;
  }

  get currentPeriodLabel(): string {
    const summary = this.activeSummary;
    if (summary?.periodStart && summary?.periodEnd) {
      return `${this.formatDateOnly(summary.periodStart)} - ${this.formatDateOnly(summary.periodEnd)}`;
    }

    return this.periods.find((item) => item.value === this.period)?.label || 'Tháng';
  }

  get totalConfirmedCommission(): number {
    return this.staffSummaries.reduce((total, item) => total + Number(item.confirmedCommissionAmount || 0), 0);
  }

  get totalPendingCommission(): number {
    return this.staffSummaries.reduce((total, item) => total + Number(item.pendingCommissionAmount || 0), 0);
  }

  get totalConfirmedRevenue(): number {
    return this.staffSummaries.reduce((total, item) => total + Number(item.confirmedRevenueAmount || 0), 0);
  }

  get totalConfirmedOrders(): number {
    return this.staffSummaries.reduce((total, item) => total + Number(item.confirmedOrderCount || 0), 0);
  }

  loadData(): void {
    if (!this.canViewCommission) return;

    this.closeDetail();
    if (this.isAdminView) {
      this.loadStaffSummaries(0);
      return;
    }

    this.loadMySummary();
  }

  changePeriod(period: CommissionPeriod): void {
    if (this.period === period) return;
    this.period = period;
    this.loadData();
  }

  changeStatus(status: CommissionStatus): void {
    if (this.status === status) return;
    this.status = status;
    if (this.isDetailOpen) this.loadDetails(0);
  }

  applyDateFilter(): void {
    this.loadData();
  }

  clearDateFilter(): void {
    this.from = '';
    this.to = '';
    this.loadData();
  }

  selectStaff(staff: StaffCommissionSummary): void {
    this.selectedStaff = staff;
    this.openDetail();
  }

  openMyDetails(): void {
    if (!this.summary) return;
    this.selectedStaff = this.summary;
    this.openDetail();
  }

  openDetail(): void {
    this.isDetailOpen = true;
    this.details = [];
    this.detailPage = 0;
    this.detailTotalPages = 0;
    this.detailTotalElements = 0;
    this.loadDetails(0);
  }

  closeDetail(): void {
    this.isDetailOpen = false;
    this.selectedStaff = null;
    this.details = [];
    this.detailPage = 0;
    this.detailTotalPages = 0;
    this.detailTotalElements = 0;
    this.isLoadingDetails = false;
    this.isLoadingMoreDetails = false;
  }

  loadMoreStaffs(): void {
    if (this.isLoadingMoreStaffs || this.staffPage + 1 >= this.staffTotalPages) return;

    this.isLoadingMoreStaffs = true;
    this.commissionService.getStaffSummaries({
      ...this.baseQuery(),
      page: this.staffPage + 1,
      size: this.safePageSize(),
    }).subscribe({
      next: (page) => {
        this.staffSummaries = [...this.staffSummaries, ...(page.content || [])];
        this.staffPage = page.number ?? this.staffPage + 1;
        this.staffTotalPages = page.totalPages || 0;
        this.isLoadingMoreStaffs = false;
      },
      error: (err) => {
        this.toast.error('Khong the tai them danh sach staff: ' + getApiErrorMessage(err, 'Vui long thu lai.'));
        this.isLoadingMoreStaffs = false;
      },
    });
  }

  loadMoreDetails(): void {
    if (!this.isDetailOpen || this.isLoadingMoreDetails || this.detailPage + 1 >= this.detailTotalPages) return;

    this.isLoadingMoreDetails = true;
    this.detailsRequest(this.detailPage + 1).subscribe({
      next: (page) => {
        this.details = [...this.details, ...(page.content || [])];
        this.detailPage = page.number ?? this.detailPage + 1;
        this.detailTotalPages = page.totalPages || 0;
        this.isLoadingMoreDetails = false;
      },
      error: (err) => {
        this.toast.error('Khong the tai them chi tiet hoa hong: ' + getApiErrorMessage(err, 'Vui long thu lai.'));
        this.isLoadingMoreDetails = false;
      },
    });
  }

  rebuildSummaries(): void {
    if (!this.isAdminView || this.isRebuilding) return;

    this.actionDialog.confirm({
      title: 'Dong bo thong ke hoa hong',
      message: 'Rebuild summary se refresh du lieu Mongo theo ky dang loc. Ban muon tiep tuc?',
      confirmText: 'Rebuild summary',
      tone: 'warning',
      icon: 'bi-arrow-repeat',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.isRebuilding = true;
      this.commissionService.rebuildSummaries(this.baseQuery()).subscribe({
        next: (count) => {
          this.toast.success(`Da rebuild ${count || 0} ngay-staff.`);
          this.isRebuilding = false;
          this.loadData();
        },
        error: (err) => {
          this.toast.error('Khong the rebuild summary: ' + getApiErrorMessage(err, 'Vui long thu lai.'));
          this.isRebuilding = false;
        },
      });
    });
  }

  hasMoreStaffs(): boolean {
    return this.staffPage + 1 < this.staffTotalPages;
  }

  hasMoreDetails(): boolean {
    return this.detailPage + 1 < this.detailTotalPages;
  }

  changeStaffPage(page: number): void {
    if (page < 0 || page >= this.staffTotalPages) return;
    this.loadStaffSummaries(page);
  }

  changeDetailPage(page: number): void {
    if (page < 0 || page >= this.detailTotalPages) return;
    this.loadDetails(page);
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    if (this.isAdminView) {
      this.loadStaffSummaries(0);
    }
    if (this.isDetailOpen) {
      this.loadDetails(0);
    }
  }

  getStatusLabel(status: CommissionStatus | string): string {
    return this.statuses.find((item) => item.value === status)?.label || status || 'N/A';
  }

  getStatusClass(status: CommissionStatus | string): string {
    if (status === 'CONFIRMED') return 'text-bg-success';
    if (status === 'PENDING') return 'text-bg-warning';
    if (status === 'CANCELLED') return 'text-bg-danger';
    return 'text-bg-secondary';
  }

  getInitials(name: string | null | undefined): string {
    const parts = (name || 'S').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'S';
    return parts.slice(-2).map((part) => part[0]?.toUpperCase()).join('');
  }

  formatDateOnly(value: string | null | undefined): string {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('vi-VN');
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  getExportedQuantity(item: StaffCommissionDetail): number {
    return Number(item.exportedQuantity ?? item.orderedQuantity ?? 0);
  }

  trackStaff(_: number, item: StaffCommissionSummary): number {
    return item.staffId;
  }

  trackDetail(_: number, item: StaffCommissionDetail): number {
    return item.attributionId;
  }

  private loadMySummary(): void {
    this.isLoadingSummary = true;
    this.commissionService.getMySummary(this.baseQuery()).subscribe({
      next: (summary) => {
        this.summary = summary;
        this.isLoadingSummary = false;
      },
      error: (err) => {
        this.toast.error('Khong the tai thong ke hoa hong: ' + getApiErrorMessage(err, 'Vui long thu lai.'));
        this.summary = null;
        this.isLoadingSummary = false;
      },
    });
  }

  private loadStaffSummaries(pageNumber: number = 0): void {
    this.isLoadingStaffs = true;
    this.staffPage = pageNumber;

    this.commissionService.getStaffSummaries({
      ...this.baseQuery(),
      page: this.staffPage,
      size: this.safePageSize(),
    }).subscribe({
      next: (page) => {
        this.staffSummaries = page.content || [];
        this.staffPage = page.number ?? pageNumber;
        this.staffTotalPages = page.totalPages || 0;
        this.staffTotalElements = page.totalElements || 0;
        this.isLoadingStaffs = false;
      },
      error: (err) => {
        this.toast.error('Khong the tai danh sach hoa hong staff: ' + getApiErrorMessage(err, 'Vui long thu lai.'));
        this.staffSummaries = [];
        this.staffTotalElements = 0;
        this.isLoadingStaffs = false;
      },
    });
  }

  private loadDetails(pageNumber: number): void {
    if (this.isAdminView && !this.selectedStaff) return;

    this.isLoadingDetails = true;
    this.detailsRequest(pageNumber).subscribe({
      next: (page) => {
        this.details = page.content || [];
        this.detailPage = page.number ?? pageNumber;
        this.detailTotalPages = page.totalPages || 0;
        this.detailTotalElements = page.totalElements || 0;
        this.isLoadingDetails = false;
      },
      error: (err) => {
        this.toast.error('Khong the tai chi tiet hoa hong: ' + getApiErrorMessage(err, 'Vui long thu lai.'));
        this.details = [];
        this.detailTotalElements = 0;
        this.isLoadingDetails = false;
      },
    });
  }

  private detailsRequest(pageNumber: number) {
    if (this.isAdminView && this.selectedStaff) {
      return this.commissionService.getStaffDetails(this.selectedStaff.staffId, this.detailQuery(pageNumber));
    }

    return this.commissionService.getMyDetails(this.detailQuery(pageNumber));
  }

  private baseQuery() {
    return {
      period: this.period,
      from: this.from || undefined,
      to: this.to || undefined,
    };
  }

  private detailQuery(page: number): CommissionDetailQuery {
    return {
      ...this.baseQuery(),
      status: this.status,
      page,
      size: this.safePageSize(),
    };
  }

  private safePageSize(): number {
    return Math.min(Math.max(Number(this.pageSize) || 20, 1), this.maxPageSize);
  }
}
