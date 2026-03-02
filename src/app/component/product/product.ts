import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CartService } from '../../service/cart.service';
import { AuthService } from '../../service/auth.service';
import { ProductService } from '../../service/product.service';
import { NaPipe } from '../../pipes/na-pipe';
import { ProductDetailComponent } from './productdetail/product-detail';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule, NaPipe, MatDialogModule],
  templateUrl: './product.html',
})
export class Product implements OnInit {
  plist: any[] = [];
  filteredProducts: any[] = [];
  addQuan: number[] = [];
  searchTerm: string = '';
  currentUserId: any;

  // --- THÊM CÁC BIẾN QUẢN LÝ PHÂN TRANG ---
  currentPage: number = 0;
  pageSize: number = 10;
  totalPages: number = 0;
  totalElements: number = 0;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private productService: ProductService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getUserId();
    // Gọi hàm getAll với trang mặc định là 0
    this.getAll(this.currentPage, this.pageSize);
  }

  // --- CẬP NHẬT HÀM GET ALL ĐỂ NHẬN PHÂN TRANG ---
  getAll(page: number = 0, size: number = 10) {
    this.productService.getAll(page, size).subscribe({
      next: (res: any) => {
        // Backend trả về Object PageResponse, mảng sản phẩm nằm trong thuộc tính 'content'
        const productsArray = res.content || [];

        this.plist = productsArray;
        // Đã hết lỗi 'res is not iterable' vì productsArray chắc chắn là mảng
        this.filteredProducts = [...productsArray];
        this.addQuan = new Array(productsArray.length).fill(1);

        // Lưu lại thông số phân trang từ Backend để dùng cho HTML
        this.currentPage = res.number || 0;
        this.pageSize = res.size || 10;
        this.totalPages = res.totalPages || 0;
        this.totalElements = res.totalElements || 0;
      },
      error: (err) => {
        console.error('Lỗi khi lấy danh sách sản phẩm:', err);
      }
    });
  }

  openProductDialog(id: number | null = null) {
    const dialogRef = this.dialog.open(ProductDetailComponent, {
      width: '600px',
      data: { id: id },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Tải lại danh sách ở trang hiện tại sau khi thêm/sửa
        this.getAll(this.currentPage, this.pageSize);
      }
    });
  }

  delete(item: any) {
    if (confirm('Xác nhận xóa sản phẩm?')) {
      this.productService.delete(item.id).subscribe({
        // Tải lại đúng trang hiện tại sau khi xóa
        next: () => this.getAll(this.currentPage, this.pageSize),
        error: () => alert('Lỗi khi xóa!')
      });
    }
  }

  filterProducts() {
    if (!this.searchTerm.trim()) {
      this.filteredProducts = [...this.plist];
      return;
    }
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredProducts = this.plist.filter(p =>
      p.product_name?.toLowerCase().includes(term)
    );
  }

  onAddToCart(productId: number, index: number) {
    const quantity = this.addQuan[index];
    if (this.currentUserId && quantity > 0) {
      this.cartService.addToCart(this.currentUserId, productId, quantity).subscribe({
        next: (res: any) => alert('Đã thêm vào giỏ hàng!'),
        error: (err) => alert('Lỗi: ' + (err.error?.message || 'Không thể thêm'))
      });
    } else {
      alert('Vui lòng đăng nhập!');
    }
  }

  changePage(newPage: number) {
    if (newPage >= 0 && newPage < this.totalPages) {
      this.getAll(newPage, this.pageSize);
    }
  }
}
