import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject as injectActionDialog } from '@angular/core';
import { ActionDialogService } from '../../service/action-dialog.service';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { Userdetail } from '../userdetail/userdetail';
import { CartModalComponent } from '../cart/cart-modal';
import { UserResListDTO } from '../../model/user.model';
import { CartRes } from '../../model/cart.model';

import { UserService } from '../../service/user.service';
import { AuthService } from '../../service/auth.service';
import { AppPaginationComponent, PageHeaderComponent, ViewStateComponent } from '../shared';
import { APP_DIALOG_SIZE } from '../../config/dialog.config';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    FormsModule,
    AppPaginationComponent,
    PageHeaderComponent,
    ViewStateComponent,
  ],
  templateUrl: './user.html',
  styleUrl: './user.css',
})
export class UserComponent implements OnInit {
  private readonly actionDialog = injectActionDialog(ActionDialogService);
  users: UserResListDTO[] = [];
  filteredUsers: UserResListDTO[] = [];
  cartData?: CartRes;
  searchTerm: string = '';
  currentPage: number = 0;
  pageSize: number = 10;
  totalElements: number = 0;
  totalPages: number = 0;
  pageSizeOptions = [10, 20, 50, 100];
  isAdmin: boolean = false;
  readonly roleOptions = [
    { value: 'ADMIN', label: 'Quản trị' },
    { value: 'MANAGER', label: 'Quản lý' },
    { value: 'STAFF', label: 'Nhân viên' },
    { value: 'USER', label: 'Khách hàng' },
  ];
  roleFilters: Record<string, boolean> = {
    ADMIN: false,
    MANAGER: false,
    STAFF: false,
    USER: false,
  };

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.loadUsers(this.currentPage, this.pageSize);
  }

  loadUsers(page: number, size: number) {
    this.userService.getAll(page, size, this.getSelectedRoles()).subscribe({
      next: (data) => {
        this.users = data.content;
        this.filterUsers();

        this.totalElements = data.totalElements;
        this.totalPages = data.totalPages;
        this.pageSize = data.size || size;
        this.currentPage = data.number;
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách User:', err);
      }
    });
  }

  openUserDialog(id: string | null = null) {
    const dialogRef = this.dialog.open(Userdetail, {
      ...APP_DIALOG_SIZE.userForm,
      data: { id: id, action: 'edit' },
      disableClose: true,
    });


    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadUsers(this.currentPage, this.pageSize);
      }
    });
  }

  filterUsers() {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredUsers = [...this.users];
      return;
    }

    const term = this.searchTerm.toLowerCase().trim();
    this.filteredUsers = this.users.filter((u) => {
      const fullName = `${u.lastname} ${u.firstname}`.toLowerCase();
      return fullName.includes(term);
    });
  }

  onRoleFilterChange(): void {
    this.loadUsers(0, this.pageSize);
  }

  clearRoleFilters(): void {
    Object.keys(this.roleFilters).forEach((role) => this.roleFilters[role] = false);
    this.loadUsers(0, this.pageSize);
  }

  hasRoleFilters(): boolean {
    return this.getSelectedRoles().length > 0;
  }

  private getSelectedRoles(): string[] {
    return this.roleOptions
      .filter((role) => this.roleFilters[role.value])
      .map((role) => role.value);
  }

  changePage(page: number) {
    if (page < 0 || page >= this.totalPages) return;
    this.loadUsers(page, this.pageSize);
  }

  changePageSize(size: number) {
    this.pageSize = size;
    this.loadUsers(0, this.pageSize);
  }

  viewUser(id: string) {
    this.dialog.open(Userdetail, {
      ...APP_DIALOG_SIZE.userForm,
      data: { id: id, action: 'view' },
      disableClose: false,
    });
  }

  deleteUser(id: string) {
    this.actionDialog.confirm({
      title: 'Xóa người dùng',
      message: 'Người dùng sẽ bị xóa khỏi hệ thống. Bạn có chắc muốn tiếp tục?',
      confirmText: 'Xóa người dùng',
      tone: 'danger',
      icon: 'bi-person-x-fill',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.userService.delete(id).subscribe(() => {
        this.loadUsers(this.currentPage, this.pageSize);
      });
    });
  }

  openCartModal(userId: string) {
    this.dialog.open(CartModalComponent, {
      ...APP_DIALOG_SIZE.cartPreview,
      data: userId,
    });
  }
}
