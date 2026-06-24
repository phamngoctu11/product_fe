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

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule],
  templateUrl: './user.html',
  styleUrls: ['../../app.css'],
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
  isAdmin: boolean = false;

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
    this.userService.getAll(page, size).subscribe({
      next: (data) => {
        this.users = data.content;
        this.filteredUsers = [...data.content];

        this.totalElements = data.totalElements;
        this.totalPages = data.totalPages;
        this.currentPage = data.number;
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách User:', err);
      }
    });
  }

  openUserDialog(id: number | null = null) {
    const dialogRef = this.dialog.open(Userdetail, {
      width: '820px',
      maxWidth: 'calc(100vw - 48px)',
      maxHeight: '78vh',
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

  viewUser(id: number) {
    this.dialog.open(Userdetail, {
      width: '820px',
      maxWidth: 'calc(100vw - 48px)',
      maxHeight: '78vh',
      data: { id: id, action: 'view' },
      disableClose: false,
    });
  }

  deleteUser(id: number) {
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

  openCartModal(userId: number) {
    this.dialog.open(CartModalComponent, {
      width: '300px',
      data: userId,
    });
  }
}
