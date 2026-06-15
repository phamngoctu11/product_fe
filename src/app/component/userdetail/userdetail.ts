import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // Thêm DatePipe
import { inject as injectToast } from '@angular/core';
import { ToastService } from '../../service/toast.service';
import { FormsModule, NgForm } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http'; // BẮT BUỘC THÊM HTTP CLIENT
import { map } from 'rxjs/operators';
import { UserService } from '../../service/user.service';
import { UserCreDTO } from '../../model/user.model';
import { ApiResponse, getApiErrorMessage, unwrapApiResponse } from '../../model/api-response.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-userdetail',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './userdetail.html',
  styleUrl: './userdetail.css',
  providers: [DatePipe], // Khai báo DatePipe
})
export class Userdetail implements OnInit {
  private readonly toast = injectToast(ToastService);
  currentUser: UserCreDTO = {
    firstname: '',
    lastname: '',
    username: '',
    password: '',
    role: 'USER',
    gender: 'male', // Sửa 'Nam' thành 'male' để khớp với option value HTML
    address: '',
    phone: '',
    birth: new Date(),
    avatar_url: '',
    email:''
  };
  isEdit = false;
  isView = false;
  isUploadingAvatar: boolean = false;
  uploadedAvatarUrl: string = '';

  constructor(
    public dialogRef: MatDialogRef<Userdetail>,
    @Inject(MAT_DIALOG_DATA) public data: { id: number | null; action?: string },
    private userService: UserService,
    private datePipe: DatePipe, // Inject DatePipe
    private http: HttpClient    // Inject HttpClient
  ) {}

  ngOnInit() {
    if (this.data && this.data.action === 'view') {
      this.isView = true;
    }

    if (this.data && this.data.id) {
      this.isEdit = !this.isView;

      this.userService.getById(this.data.id).subscribe((res: any) => {
        this.currentUser = { ...res };
        this.uploadedAvatarUrl = res.avatar_url || ''; // Lấy ảnh cũ đổ ra UI
      });
    }
  }

  // HÀM UPLOAD ẢNH CHO ADMIN SỬ DỤNG
  onAvatarSelected(event: any) {
    if (this.isView) return; // Không cho up ảnh nếu đang chế độ "Xem"
    const file: File = event.target.files[0];
    if (file) {
      this.isUploadingAvatar = true;
      const formData = new FormData();
      formData.append('file', file);

      this.http
        .post<ApiResponse<{ url: string }> | { url: string }>(`${environment.apiUrl}/upload/image`, formData)
        .pipe(map(unwrapApiResponse))
        .subscribe({
        next: (res) => {
          this.uploadedAvatarUrl = res.url;
          this.currentUser.avatar_url = res.url; // Gán vào payload
          this.isUploadingAvatar = false;
        },
        error: (err) => {
          this.toast.notify('Lỗi tải ảnh lên Cloudinary!');
          this.isUploadingAvatar = false;
        }
      });
    }
  }

  saveUser(form?: NgForm) {
    if (form?.invalid) {
      form.control.markAllAsTouched();
      this.toast.notify('Vui lòng kiểm tra lại các trường bắt buộc trước khi lưu.');
      return;
    }

    const payload = { ...this.currentUser };

    // 2. Format lại ngày sinh sang dd/MM/yyyy trước khi gửi
    if (payload.birth) {
      // Input date trả về string yyyy-MM-dd, ta convert lại
      const rawDate = new Date(payload.birth);
      // Chuyển sang format dd/MM/yyyy
      (payload.birth as any) = this.datePipe.transform(rawDate, 'yyyy-MM-dd');
    }

    // 3. Gửi payload đã format đi
    if (this.isEdit && payload.id) {
      this.userService.update(payload.id, payload).subscribe({
        next: () => {
          this.toast.notify('Cập nhật user thành công!!');
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error(err);
          this.toast.notify('Lỗi cập nhật: ' + getApiErrorMessage(err, 'Lỗi không xác định'));
        },
      });
    } else {
      this.userService.create(payload).subscribe({
        next: () => {
          this.toast.notify('Tạo mới user thành công!!');
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error(err);
          this.toast.notify('Lỗi tạo mới: ' + getApiErrorMessage(err, 'Lỗi không xác định'));
        },
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
