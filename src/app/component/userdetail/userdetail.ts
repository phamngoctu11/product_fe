import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // Thêm DatePipe
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
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
    gender: 'Nam',
    address: '',
    phone: '',
    birth: new Date(),
  };
  isEdit = false;
  isView = false;

  constructor(
    public dialogRef: MatDialogRef<Userdetail>,
    @Inject(MAT_DIALOG_DATA) public data: { id: number | null; action?: string },
    private userService: UserService,
    private datePipe: DatePipe, // Inject DatePipe
  ) {}

  ngOnInit() {
    if (this.data && this.data.action === 'view') {
      this.isView = true;
    }

    if (this.data && this.data.id) {
      // Chỉ bật isEdit khi KHÔNG PHẢI là chế độ view
      this.isEdit = !this.isView;

      this.userService.getById(this.data.id).subscribe((res: any) => {
        this.currentUser = { ...res };
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
      // Lưu ý: Ép kiểu any để qua mặt check type của Typescript tạm thời nếu DTO yêu cầu Date
      (payload.birth as any) = this.datePipe.transform(rawDate, 'dd/MM/yyyy');
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
          alert('Lỗi cập nhật: ' + err.error?.message || 'Lỗi không xác định');
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
          alert('Lỗi tạo mới: ' + err.error?.message || 'Lỗi không xác định');
        },
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
