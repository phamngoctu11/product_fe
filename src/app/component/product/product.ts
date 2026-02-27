import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CartService } from '../../service/cart.service';
import { AuthService } from '../../service/auth.service';
import { ProductService } from '../../service/product.service';
import { NaPipe } from '../../pipes/na-pipe'; // Import component vừa tạo
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

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private productService: ProductService,
    private dialog: MatDialog // Thêm MatDialog vào constructor
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getUserId();
    this.getAll();
  }

  getAll() {
    this.productService.getAll().subscribe((res: any) => {
      this.plist = res;
      this.filteredProducts = [...res];
      this.addQuan = new Array(res.length).fill(1);
    });
  }

  // Hàm mở Dialog để Thêm hoặc Sửa
  openProductDialog(id: number | null = null) {
    const dialogRef = this.dialog.open(ProductDetailComponent, {
      width: '600px',
      data: { id: id },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.getAll(); // Tải lại danh sách nếu có thay đổi
      }
    });
  }

  delete(item: any) {
    if (confirm('Xác nhận xóa sản phẩm?')) {
      this.productService.delete(item.id).subscribe({
        next: () => this.getAll(),
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
}
