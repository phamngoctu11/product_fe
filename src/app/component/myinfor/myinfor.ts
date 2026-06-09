import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http'; // 1. BẮT BUỘC IMPORT HTTPCLIENT
import { map } from 'rxjs/operators';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UserService } from '../../service/user.service';
import { UserInforDTO } from '../../model/user.model';
import { CartModalComponent } from '../cart/cart-modal';
import { ApiResponse, unwrapApiResponse } from '../../model/api-response.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-myinfor',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './myinfor.html',
})
export class Myinfor implements OnInit {
  userInfo?: UserInforDTO;
  isLoading = true;
  isUploadingAvatar: boolean = false;
  errorMessage = '';

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private http: HttpClient // 2. BẮT BUỘC INJECT VÀO CONSTRUCTOR
  ) {}

  ngOnInit(): void {
    this.loadMyInfo();
  }

  loadMyInfo() {
    const userIdStr = localStorage.getItem('user_id');
    if (!userIdStr) {
      this.errorMessage = 'Không tìm thấy thông tin đăng nhập. Vui lòng đăng nhập lại.';
      this.isLoading = false;
      return;
    }

    const userId = Number(userIdStr);

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

    // 3. Bổ sung điều kiện kiểm tra this.userInfo để TypeScript không báo lỗi
    if (file && this.userInfo) {
      this.isUploadingAvatar = true;
      const formData = new FormData();
      formData.append('file', file);

      // Gọi API tải ảnh lên Cloudinary
      this.http
        .post<ApiResponse<{ url: string }> | { url: string }>(`${environment.apiUrl}/upload/image`, formData)
        .pipe(map(unwrapApiResponse))
        .subscribe({
        next: (res) => {
          // Cập nhật URL ảnh trên giao diện
          this.userInfo!.avatar_url = res.url;
          this.isUploadingAvatar = false;

          // Tự động lưu xuống Database bằng ID của user hiện tại
          this.userService.update(this.userInfo!.id, this.userInfo!).subscribe({
              next: () => {
                  alert('Cập nhật ảnh đại diện thành công!');
                  // Cập nhật localStorage để thanh Navbar có thể lấy ảnh mới ngay lập tức
                  localStorage.setItem('user_avatar', res.url);
              },
              error: () => alert('Lỗi khi lưu thông tin user xuống hệ thống!')
          });
        },
        error: (err) => {
          alert('Lỗi tải ảnh lên Cloudinary!');
          this.isUploadingAvatar = false;
        }
      });
    }
  }

  openCart() {
    const userIdStr = localStorage.getItem('user_id');
    if (userIdStr) {
      this.dialog.open(CartModalComponent, {
        data: Number(userIdStr),
        width: '900px',
        maxWidth: 'calc(100vw - 48px)',
        maxHeight: '78vh',
        autoFocus: false
      });
    }
  }
}
