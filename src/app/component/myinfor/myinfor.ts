import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject as injectToast } from '@angular/core';
import { ToastService } from '../../service/toast.service';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UserService } from '../../service/user.service';
import { AuthService } from '../../service/auth.service'; // Đã thêm AuthService
import { UserInforDTO } from '../../model/user.model';
import { CartModalComponent } from '../cart/cart-modal';
import { ApiResponse, unwrapApiResponse } from '../../model/api-response.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-myinfor',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './myinfor.html',
  styleUrls: ['../../app.css'],
})
export class Myinfor implements OnInit {
  private readonly toast = injectToast(ToastService);
  userInfo?: UserInforDTO;
  isLoading = true;
  isUploadingAvatar: boolean = false;
  errorMessage = '';

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private http: HttpClient,
    private authService: AuthService // Inject AuthService
  ) {}

  ngOnInit(): void {
    this.loadMyInfo();
  }

  loadMyInfo() {
    // Lấy ID từ Token thay vì LocalStorage
    const userId = this.authService.getUserId();

    if (!userId) {
      this.errorMessage = 'Không tìm thấy thông tin đăng nhập. Vui lòng đăng nhập lại.';
      this.isLoading = false;
      return;
    }

    this.userService.getById(userId).subscribe({
      next: (res: any) => {
        this.userInfo = res;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Lỗi khi tải thông tin cá nhân. Vui lòng thử lại sau.';
        this.isLoading = false;
      },
    });
  }

  onAvatarSelected(event: any) {
    const file: File = event.target.files[0];
    if (file && this.userInfo) {
      this.isUploadingAvatar = true;
      const formData = new FormData();
      formData.append('file', file);

      this.http
        .post<ApiResponse<{ url: string }> | { url: string }>(`${environment.apiUrl}/upload/image`, formData)
        .pipe(map(unwrapApiResponse))
        .subscribe({
        next: (res) => {
          this.userInfo!.avatar_url = res.url;
          this.isUploadingAvatar = false;

          this.userService.update(this.userInfo!.id, this.userInfo!).subscribe({
              next: () => {
                  this.toast.notify('Cập nhật ảnh đại diện thành công!');
                  localStorage.setItem('user_avatar', res.url);
              },
              error: () => this.toast.notify('Lỗi khi lưu thông tin user xuống hệ thống!')
          });
        },
        error: (err) => {
          this.toast.notify('Lỗi tải ảnh lên Cloudinary!');
          this.isUploadingAvatar = false;
        }
      });
    }
  }

  openCart() {
    // Lấy ID từ Token thay vì LocalStorage
    const userId = this.authService.getUserId();

    if (userId) {
      // Ép kiểu nếu hệ thống giỏ hàng cũ bắt buộc ID là số, nhưng với Keycloak ID là chuỗi UUID.
      // Dựa theo code cũ của bạn đang map number, hãy đảm bảo Backend giỏ hàng chấp nhận UUID chuỗi.
      this.dialog.open(CartModalComponent, {
        data: userId,
        width: '900px',
        maxWidth: 'calc(100vw - 48px)',
        maxHeight: '78vh',
        autoFocus: false
      });
    }
  }
}
