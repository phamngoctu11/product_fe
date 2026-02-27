import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../service/user.service';
import { UserInforDTO } from '../../model/user.model';
// 1. Thêm các import cần thiết
import { MatDialog, MatDialogModule } from '@angular/material/dialog'; // Điều chỉnh đường dẫn cho đúng
import { CartModalComponent } from '../cart/cart-modal';

@Component({
  selector: 'app-myinfor',
  standalone: true,
  // 2. Thêm MatDialogModule vào imports
  imports: [CommonModule, MatDialogModule],
  templateUrl: './myinfor.html',
})
export class Myinfor implements OnInit {
  userInfo?: UserInforDTO;
  isLoading = true;
  errorMessage = '';

  // 3. Inject MatDialog vào constructor
  constructor(
    private userService: UserService,
    private dialog: MatDialog,
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

  // 4. Thêm hàm mở Modal
  openCart() {
    const userIdStr = localStorage.getItem('user_id');
    if (userIdStr) {
      this.dialog.open(CartModalComponent, {
        data: Number(userIdStr), // Truyền userId vào MAT_DIALOG_DATA
        width: '800px',
        autoFocus: false,
      });
    }
  }
}
