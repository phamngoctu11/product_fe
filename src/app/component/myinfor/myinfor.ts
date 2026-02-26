import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../service/user.service'; // Điều chỉnh lại đường dẫn cho đúng
import { UserInforDTO } from '../../model/user.model'; // Điều chỉnh lại đường dẫn cho đúng

@Component({
  selector: 'app-myinfor',
  standalone: true,
  imports: [CommonModule], // Cần CommonModule để dùng DatePipe và @if/@else
  templateUrl: './myinfor.html',
})
export class Myinfor implements OnInit {
  userInfo?: UserInforDTO;
  isLoading = true;
  errorMessage = '';

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadMyInfo();
  }

  loadMyInfo() {
    // Lấy user_id từ localStorage (bạn có thể thay đổi tùy theo cách bạn lưu trữ khi login)
    const userIdStr = localStorage.getItem('user_id');

    if (!userIdStr) {
      this.errorMessage = 'Không tìm thấy thông tin đăng nhập. Vui lòng đăng nhập lại.';
      this.isLoading = false;
      return;
    }

    const userId = Number(userIdStr);

    // Gọi API lấy thông tin chi tiết
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
}
