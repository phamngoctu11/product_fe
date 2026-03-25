import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CartService } from '../../service/cart.service';
import { AuthService } from '../../service/auth.service';
import { ProductService } from '../../service/product.service';
import { ProductDetailComponent } from './productdetail/product-detail';
import { AddToCartModalComponent } from './add-to-cart-modal/add-to-cart-modal';
import { Product } from '../../model/product.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './product.html',
})
export class ProductComponent implements OnInit, OnDestroy {
  plist: Product[] = [];
  filteredProducts: Product[] = [];

  searchTerm: string = '';
  searchPrice: number | null = null;
  currentUserId: any;
  isAdmin: boolean = false;

  currentPage: number = 0;
  pageSize: number = 10;
  totalPages: number = 0;
  totalElements: number = 0;

  private cartSubscription!: Subscription;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private productService: ProductService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getUserId();
    this.isAdmin = this.authService.isAdmin();
    this.getAll(this.currentPage, this.pageSize);

    this.cartSubscription = this.cartService.checkoutSuccess$.subscribe(() => {
      this.getAll(this.currentPage, this.pageSize);
    });
  }

  ngOnDestroy(): void {
    if (this.cartSubscription) this.cartSubscription.unsubscribe();
  }

  getAll(page: number = 0, size: number = 10) {
    this.productService.getAll(page, size).subscribe({
      next: (res: any) => {
        this.plist = res.content || [];
        this.filteredProducts = [...this.plist];
        this.currentPage = res.number || 0;
        this.pageSize = res.size || 10;
        this.totalPages = res.totalPages || 0;
        this.filterProducts();
      },
      error: (err) => console.error('Lỗi khi lấy danh sách sản phẩm:', err)
    });
  }

  filterProducts() {
    let tempArray = [...this.plist];
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      if (term.startsWith('#')) {
        tempArray = tempArray.filter(p => p.tags?.toLowerCase().includes(term));
      } else {
        tempArray = tempArray.filter(p => p.product_name?.toLowerCase().includes(term));
      }
    }
    if (this.searchPrice !== null && this.searchPrice > 0) {
      tempArray = tempArray.filter(p => p.price <= this.searchPrice!);
    }
    this.filteredProducts = tempArray;
  }

  getAvailableTags(): string[] {
    const tagsSet = new Set<string>();
    ['#quanao', '#giay', '#dienthoai', '#giadung', '#mypham', '#thucpham'].forEach(t => tagsSet.add(t));
    this.plist.forEach(p => {
      if (p.tags) p.tags.split(',').forEach(t => { if (t.trim()) tagsSet.add(t.trim().toLowerCase()); });
    });
    return Array.from(tagsSet);
  }

  // HÀM MỚI: XEM CHI TIẾT SẢN PHẨM (READ-ONLY)
  viewProduct(id: number | null | undefined) {
    this.dialog.open(ProductDetailComponent, {
      width: '800px',
      data: { id: id || null, availableTags: this.getAvailableTags(), isView: true },
      disableClose: false,
      maxHeight: '90vh'
    });
  }

  // Cập nhật hàm openProductDialog
  openProductDialog(id: number | null | undefined = null) {
    if (!this.isAdmin) { alert('Bạn không có quyền thực hiện chức năng này!'); return; }
    const dialogRef = this.dialog.open(ProductDetailComponent, {
      width: '800px',
      data: { id: id || null, availableTags: this.getAvailableTags(), isView: false },
      disableClose: true,
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.getAll(this.currentPage, this.pageSize);
    });
  }

  openAddToCartModal(product: Product) {
    if (!this.currentUserId) { alert('Vui lòng đăng nhập để mua hàng!'); return; }
    if (!product.variants || product.variants.length === 0) { alert('Sản phẩm này hiện tại chưa có phân loại hàng!'); return; }

    const dialogRef = this.dialog.open(AddToCartModalComponent, {
      width: '650px',
      data: { product: product },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((result: { variantId: number, quantity: number } | null) => {
      if (result) this.onAddToCart(result.variantId, result.quantity);
    });
  }

  onAddToCart(variantId: number, quantity: number) {
    this.cartService.addToCart(this.currentUserId, variantId, quantity).subscribe({
      next: () => alert('Đã thêm vào giỏ hàng thành công!'),
      error: (err) => alert('Lỗi: ' + (err.error?.message || 'Không thể thêm'))
    });
  }

  delete(item: Product) {
    if (!this.isAdmin) return;
    if (item.id && confirm('Xác nhận xóa sản phẩm?')) {
      this.productService.delete(item.id).subscribe({
        next: () => this.getAll(this.currentPage, this.pageSize),
        error: () => alert('Lỗi khi xóa!')
      });
    }
  }

  changePage(newPage: number) {
    if (newPage >= 0 && newPage < this.totalPages) this.getAll(newPage, this.pageSize);
  }
}
