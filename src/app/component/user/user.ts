import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserResListDTO } from '../../model/user.model';
import { UserService } from '../../service/user.service';
import { CartRes } from '../../model/cart.model';
import { CartModalComponent } from '../cart/cart-modal';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Userdetail } from '../userdetail/userdetail';
import { FormsModule } from '@angular/forms';
// Điều chỉnh đường dẫn file cho đúng

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule],
  templateUrl: './user.html',
})
export class UserComponent implements OnInit {
  users: UserResListDTO[] = [];
  filteredUsers: UserResListDTO[] = [];
  cartData?: CartRes;
  searchTerm: string = '';

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    this.userService.getAll().subscribe((data) => {
      this.users = [...data];
      this.filteredUsers = [...data];
    });
  }

  // Hàm mở Dialog cho cả Thêm mới (id = null) và Cập nhật (id có giá trị)
  openUserDialog(id: number | null = null) {
    const dialogRef = this.dialog.open(Userdetail, {
      width: '700px',
      data: { id: id, action: 'edit' },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadUsers(); // Load lại sẽ tự động reset cả bảng và ô tìm kiếm (nếu muốn giữ nguyên ô tìm kiếm thì gọi thêm this.filterUsers() ở loadUsers)
      }
    });
  }
  filterUsers() {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      // Nếu không nhập gì, hiển thị lại toàn bộ
      this.filteredUsers = [...this.users];
      return;
    }

    const term = this.searchTerm.toLowerCase().trim();

    // Lọc danh sách: kiểm tra xem Họ + Tên có chứa từ khóa không
    this.filteredUsers = this.users.filter((u) => {
      const fullName = `${u.lastname} ${u.firstname}`.toLowerCase();
      return fullName.includes(term);
    });
  }
  viewUser(id: number) {
    this.dialog.open(Userdetail, {
      width: '700px',
      data: { id: id, action: 'view' },
      disableClose: false,
    });
  }
  deleteUser(id: number) {
    if (confirm('Bạn có chắc muốn xóa người dùng này?')) {
      this.userService.delete(id).subscribe(() => {
        this.loadUsers();
      });
    }
  }

  openCartModal(userId: number) {
    this.dialog.open(CartModalComponent, {
      width: '300px',
      data: userId,
    });
  }
}
