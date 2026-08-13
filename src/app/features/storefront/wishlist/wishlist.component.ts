import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { APP_DIALOG_SIZE } from '../../../config/dialog.config';
import { Product } from '../../../model/product.model';
import { getApiErrorMessage } from '../../../model/api-response.model';
import { AuthService } from '../../../service/auth.service';
import { CartService } from '../../../service/cart.service';
import { ToastService } from '../../../service/toast.service';
import { WishlistService } from '../../../service/wishlist.service';
import { AddToCartModalComponent } from '../product/add-to-cart-modal/add-to-cart-modal';
import { ProductDetailComponent } from '../../shared/product-detail-dialog/product-detail';
import {
  AppPaginationComponent,
  PageHeaderComponent,
  ProductCardComponent,
  ViewStateComponent,
} from '../../shared/ui';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    AppPaginationComponent,
    PageHeaderComponent,
    ProductCardComponent,
    ViewStateComponent,
  ],
  templateUrl: './wishlist.component.html',
  styleUrl: './wishlist.component.css',
})
export class WishlistComponent implements OnInit {
  products: Product[] = [];
  favoriteBusyProductIds = new Set<number>();
  isLoading = false;
  loadError = '';
  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
  totalElements = 0;
  pageSizeOptions = [10, 20, 50, 100];

  constructor(
    private readonly wishlistService: WishlistService,
    private readonly cartService: CartService,
    private readonly authService: AuthService,
    private readonly toast: ToastService,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(page: number = 0): void {
    this.isLoading = true;
    this.loadError = '';
    this.wishlistService.getMyWishlist(page, this.pageSize).subscribe({
      next: (response) => {
        this.products = response.content || [];
        this.currentPage = response.number ?? page;
        this.pageSize = response.size || this.pageSize;
        this.totalPages = response.totalPages || 0;
        this.totalElements = response.totalElements || 0;
        this.isLoading = false;
      },
      error: (err) => {
        this.loadError = getApiErrorMessage(err, 'Không thể tải danh sách yêu thích.');
        this.isLoading = false;
      },
    });
  }

  viewProduct(id: number | null | undefined): void {
    this.dialog.open(ProductDetailComponent, {
      ...APP_DIALOG_SIZE.product,
      panelClass: 'product-detail-dialog-panel',
      data: { id: id || null, availableTags: this.getAvailableTags(), isView: true },
      disableClose: false,
    });
  }

  openAddToCartModal(product: Product): void {
    const currentUserId = this.authService.getUserId();
    if (!currentUserId) {
      this.toast.notify('Vui lòng đăng nhập để mua hàng.');
      return;
    }
    if (!product.variants || product.variants.length === 0) {
      this.toast.notify('Sản phẩm này chưa có phân loại hàng.');
      return;
    }

    const dialogRef = this.dialog.open(AddToCartModalComponent, {
      ...APP_DIALOG_SIZE.addToCart,
      data: { product },
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((result: { variantId: number; quantity: number } | null) => {
      if (result) this.onAddToCart(currentUserId, result.variantId, result.quantity);
    });
  }

  onAddToCart(userId: string, variantId: number, quantity: number): void {
    this.cartService.addToCart(userId, variantId, quantity).subscribe({
      next: () => this.toast.notify('Đã thêm vào giỏ hàng thành công.'),
      error: (err) => this.toast.notify(getApiErrorMessage(err, 'Không thể thêm vào giỏ hàng.')),
    });
  }

  removeFavorite(product: Product): void {
    if (typeof product.id !== 'number') return;
    const productId = product.id;
    if (this.favoriteBusyProductIds.has(productId)) return;

    this.favoriteBusyProductIds.add(productId);
    this.wishlistService.remove(productId).subscribe({
      next: () => {
        this.products = this.products.filter((item) => item.id !== productId);
        this.totalElements = Math.max(0, this.totalElements - 1);
        this.favoriteBusyProductIds.delete(productId);
        this.toast.notify('Đã bỏ sản phẩm khỏi danh sách yêu thích.');
        if (this.products.length === 0 && this.currentPage > 0) {
          this.loadWishlist(this.currentPage - 1);
        }
      },
      error: (err) => {
        this.favoriteBusyProductIds.delete(productId);
        this.toast.notify(getApiErrorMessage(err, 'Không thể cập nhật yêu thích.'));
      },
    });
  }

  isFavoriteBusy(product: Product): boolean {
    return typeof product.id === 'number' && this.favoriteBusyProductIds.has(product.id);
  }

  getAvailableTags(): string[] {
    const tagsSet = new Set<string>();
    this.products.forEach((product) => {
      if (product.tags) {
        product.tags.split(',').forEach((tag) => {
          const normalized = tag.trim();
          if (normalized) tagsSet.add(normalized.toLowerCase());
        });
      }
    });
    return Array.from(tagsSet);
  }

  changePage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.loadWishlist(page);
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.loadWishlist(0);
  }
}
