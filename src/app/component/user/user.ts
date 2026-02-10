import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserResDTO, UserCreDTO } from '../../model/user.model';
import { UserService } from '../../service/user.service';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../service/cart.service';
import { CartRes } from '../../model/cart.model';
import { CartModalComponent } from '../cart/cart-modal';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [FormsModule, CommonModule, MatDialogModule],
  templateUrl: './user.html',
})
export class UserComponent implements OnInit {
  users: UserResDTO[] = [];
  selectedUserId: number | null = null;
  currentUser: UserCreDTO = { username: '', password: '', role: '' };
  isEdit = false;
  cartData?: CartRes;
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
    });
  }
  saveUser() {
    if (this.isEdit && this.currentUser.id) {
      this.userService.update(this.currentUser.id, this.currentUser).subscribe(() => {
        alert('Cập nhật user thành công!!');
        this.loadUsers();
        this.resetForm();
      });
    }
    {
      this.userService.create(this.currentUser).subscribe(() => {
        alert('Tạo mới user thành công!!');
        this.loadUsers();
        this.resetForm();
      });
    }
  }
  onRoleChange(event: any) {
    const selectedRole = event.target.value;
    if (selectedRole) {
      this.currentUser.role = selectedRole;
    } else {
      this.currentUser.role = '';
    }
  }
  editUser(user: UserResDTO) {
    this.isEdit = true;
    this.currentUser = { ...user };
  }
  deleteUser(id: number) {
    if (
      confirm('Bạn có chắc muốn xóa người dùng này? Thao tác này sẽ xóa cả giỏ hàng liên quan.')
    ) {
      this.userService.delete(id).subscribe(() => {
        this.loadUsers();
        if (this.cartData?.user_id === id) this.cartData = undefined;
      });
    }
  }
  openCartModal(userId: number) {
    this.dialog.open(CartModalComponent, {
      width: '300px',
      data: userId,
    });
  }
  resetForm() {
    this.currentUser = { username: '', password: '' };
    this.isEdit = false;
  }
}
