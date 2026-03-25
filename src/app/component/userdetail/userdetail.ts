import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // Thêm DatePipe
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http'; // BẮT BUỘC THÊM HTTP CLIENT
import { UserService } from '../../service/user.service';
import { UserCreDTO } from '../../model/user.model';

@Component({
  selector: 'app-userdetail',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './userdetail.html',
  providers: [DatePipe], // Khai báo DatePipe
})
export class Userdetail implements OnInit {
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
    avatar_url: '' // Khởi tạo trường ảnh
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

      this.http.post<{url: string}>('http://localhost:8080/api/upload/image', formData).subscribe({
        next: (res) => {
          this.uploadedAvatarUrl = res.url;
          this.currentUser.avatar_url = res.url; // Gán vào payload
          this.isUploadingAvatar = false;
        },
        error: (err) => {
          alert('Lỗi tải ảnh lên Cloudinary!');
          this.isUploadingAvatar = false;
        }
      });
    }
  }

  saveUser() {
    // 1. Tạo một bản sao của dữ liệu để không làm ảnh hưởng đến form đang hiển thị
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
          alert('Cập nhật user thành công!!');
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error(err);
          alert('Lỗi cập nhật: ' + (err.error?.message || 'Lỗi không xác định'));
        },
      });
    } else {
      this.userService.create(payload).subscribe({
        next: () => {
          alert('Tạo mới user thành công!!');
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error(err);
          alert('Lỗi tạo mới: ' + (err.error?.message || 'Lỗi không xác định'));
        },
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
