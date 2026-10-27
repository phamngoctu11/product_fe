import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CustomRequestService } from '../../../service/custom-request.service';
import { CustomRequestDTO, CustomRequestStatus } from '../../../model/custom-request.model';
import { getApiErrorMessage } from '../../../model/api-response.model';
import { SfPageIntroComponent } from '../ui/page-intro/sf-page-intro.component';
import { SfButtonDirective } from '../ui/button/sf-button.directive';
import { ViewStateComponent } from '../../shared/ui';
import { ToastService } from '../../../service/toast.service';

type StatusFilter = CustomRequestStatus | 'ALL';

@Component({
  selector: 'app-custom-request-list',
  standalone: true,
  imports: [CommonModule, RouterModule, SfPageIntroComponent, SfButtonDirective, ViewStateComponent],
  template: `
    <div class="sf-container py-5">
      <sf-page-intro
        eyebrow="ĐẶT LÀM RIÊNG"
        title="Yêu cầu custom của tôi"
        subtitle="Lưu nhiều bản nháp, chọn một bản để gửi thành đơn. Đơn sẽ chờ quản lý duyệt khả năng làm.">
      </sf-page-intro>

      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div class="btn-group" role="group" aria-label="Lọc trạng thái">
          @for (f of filters; track f.value) {
            <button type="button" class="btn btn-sm"
              [class.btn-secondary]="statusFilter === f.value"
              [class.btn-outline-secondary]="statusFilter !== f.value"
              (click)="changeFilter(f.value)">{{ f.label }}</button>
          }
        </div>
        <button sfButton type="button" (click)="createNew()">+ Tạo yêu cầu custom</button>
      </div>

      <app-view-state
        [loading]="isLoading"
        [empty]="requests.length === 0"
        loadingText="Đang tải danh sách..."
        emptyTitle="Chưa có yêu cầu nào"
        emptyText="Bạn chưa có bản nháp hoặc yêu cầu custom nào."
        emptyIcon="bi-brush">
        <div class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Mô tả</th>
                <th>SL</th>
                <th>Ảnh</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
                <th class="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              @for (req of requests; track req.id) {
                <tr>
                  <td>#{{ req.id }}</td>
                  <td class="text-truncate" style="max-width: 280px;">{{ req.description }}</td>
                  <td>{{ req.quantity }}</td>
                  <td>{{ req.imageUrls.length || 0 }}</td>
                  <td>
                    @if (req.status === 'DRAFT') {
                      <span class="badge bg-secondary">Bản nháp</span>
                    } @else {
                      <span class="badge bg-warning text-dark">Đã gửi · chờ duyệt</span>
                    }
                  </td>
                  <td>{{ (req.submittedAt || req.updatedAt) | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td class="text-end text-nowrap">
                    @if (req.editable) {
                      <button class="btn btn-sm btn-outline-primary me-1" (click)="open(req)">Sửa / Gửi</button>
                      <button class="btn btn-sm btn-outline-danger" [disabled]="deletingId === req.id" (click)="remove(req)">
                        @if (deletingId === req.id) { <span class="spinner-border spinner-border-sm"></span> }
                        @else { <i class="bi bi-trash"></i> }
                      </button>
                    } @else {
                      <button class="btn btn-sm btn-outline-secondary me-1" (click)="open(req)">Xem</button>
                      @if (req.linkedOrderId) {
                        <a class="btn btn-sm btn-outline-primary" routerLink="/store/orders">Đơn #{{ req.linkedOrderId }}</a>
                      }
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-view-state>
    </div>
  `,
})
export class CustomRequestListComponent implements OnInit {
  requests: CustomRequestDTO[] = [];
  isLoading = false;
  deletingId: number | null = null;
  statusFilter: StatusFilter = 'ALL';

  readonly filters: { value: StatusFilter; label: string }[] = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'DRAFT', label: 'Bản nháp' },
    { value: 'SUBMITTED', label: 'Đã gửi' },
  ];

  constructor(
    private readonly customRequestService: CustomRequestService,
    private readonly router: Router,
    private readonly toast: ToastService,
  ) {}

  ngOnInit() {
    this.loadRequests();
  }

  changeFilter(value: StatusFilter) {
    this.statusFilter = value;
    this.loadRequests();
  }

  loadRequests() {
    this.isLoading = true;
    const status = this.statusFilter === 'ALL' ? undefined : this.statusFilter;
    this.customRequestService.list(status).subscribe({
      next: (page) => {
        this.requests = page?.content ?? [];
        this.isLoading = false;
      },
      error: (err) => {
        this.toast.notify(getApiErrorMessage(err, 'Không thể tải danh sách yêu cầu custom.'));
        this.isLoading = false;
      },
    });
  }

  createNew() {
    this.router.navigate(['/store/custom-requests', 'new']);
  }

  open(req: CustomRequestDTO) {
    this.router.navigate(['/store/custom-requests', req.id]);
  }

  remove(req: CustomRequestDTO) {
    if (!req.editable || !confirm(`Xóa bản nháp #${req.id}?`)) return;
    this.deletingId = req.id;
    this.customRequestService
      .delete(req.id, req.version, this.customRequestService.newIdempotencyKey())
      .subscribe({
        next: () => {
          this.deletingId = null;
          this.requests = this.requests.filter((r) => r.id !== req.id);
          this.toast.notify('Đã xóa bản nháp.');
        },
        error: (err) => {
          this.deletingId = null;
          this.toast.notify(getApiErrorMessage(err, 'Không thể xóa bản nháp.'));
          this.loadRequests();
        },
      });
  }
}
