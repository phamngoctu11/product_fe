import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UserService } from '../../service/user.service';
import { AuthService } from '../../service/auth.service';
import { UserInforDTO } from '../../model/user.model';
import { CartModalComponent } from '../cart/cart-modal';
import { Userdetail } from '../userdetail/userdetail';
import { PageHeaderComponent, ViewStateComponent } from '../shared';
import { APP_DIALOG_SIZE } from '../../config/dialog.config';

@Component({
  selector: 'app-myinfor',
  standalone: true,
  imports: [CommonModule, MatDialogModule, PageHeaderComponent, ViewStateComponent],
  templateUrl: './myinfor.html',
})
export class Myinfor implements OnInit {
  userInfo?: UserInforDTO;
  isLoading = true;
  errorMessage = '';

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadMyInfo();
  }

  loadMyInfo() {
    this.userService.getInfor().subscribe({
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

  startEditing(): void {
    const dialogRef = this.dialog.open(Userdetail, {
      data: { id: null, action: 'self-edit' },
      ...APP_DIALOG_SIZE.profile,
    });
    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) this.loadMyInfo();
    });
  }

  openCart() {
    // Lấy ID từ Token thay vì LocalStorage
    const userId = this.authService.getUserId();

    if (userId) {
      // Ép kiểu nếu hệ thống giỏ hàng cũ bắt buộc ID là số, nhưng với Keycloak ID là chuỗi UUID.
      // Dựa theo code cũ của bạn đang map number, hãy đảm bảo Backend giỏ hàng chấp nhận UUID chuỗi.
      this.dialog.open(CartModalComponent, {
        data: userId,
        ...APP_DIALOG_SIZE.cart,
        autoFocus: false
      });
    }
  }
}
