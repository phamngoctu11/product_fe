import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject as injectToast } from '@angular/core';
import { ToastService } from '../../../service/toast.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductService } from '../../../service/product.service';
import { AuthService } from '../../../service/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { CartService } from '../../../service/cart.service';
import { AddToCartModalComponent } from '../../storefront/product/add-to-cart-modal/add-to-cart-modal';
import { APP_DIALOG_SIZE } from '../../../config/dialog.config';
import { getApiErrorMessage } from '../../../model/api-response.model';
import { ViewStateComponent } from '../ui';
import { Product } from '../../../model/product.model';

@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ViewStateComponent],
  templateUrl: './product-page.component.html',
  styleUrl: './product-page.component.css',
})
export class ProductPageComponent implements OnInit {
  private readonly toast = injectToast(ToastService);
  product: Product | null = null;
  isLoading = true;

  // Từ điển dịch thuộc tính sang Tiếng Việt
  attributeDictionary: { [key: string]: string } = {
    'size': 'Kích cỡ', 'color': 'Màu sắc', 'material': 'Chất liệu', 'fit': 'Kiểu dáng',
    'ram': 'RAM', 'storage': 'ROM', 'chipset': 'Chipset', 'power': 'Công suất',
    'capacity': 'Dung tích', 'shade': 'Tone màu', 'volume': 'Thể tích',
    'skin_type': 'Loại da', 'flavor': 'Hương vị', 'weight': 'Trọng lượng', 'type': 'Phân loại'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    public authService: AuthService,
    private cartService: CartService,
    private dialog: MatDialog,
  ) {}

  goToStore(): void {
    this.router.navigateByUrl(this.authService.getHomeRoute());
  }

  ngOnInit() {
    // Đọc tham số :id từ URL (Ví dụ: /product/5 -> lấy số 5)
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadProductData(Number(id));
      }
    });
  }

  loadProductData(id: number) {
    this.isLoading = true;
    this.productService.getById(id).subscribe({
      next: (res) => {
        this.product = res;
        // Giải mã JSON thuộc tính của từng biến thể để hiển thị lên giao diện
        if (this.product.variants) {
          this.product.variants.forEach((v: any) => {
            if (v.attributes && typeof v.attributes === 'string') {
              v.parsedAttributes = JSON.parse(v.attributes);
            }
          });
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi tải sản phẩm:', err);
        this.isLoading = false;
      }
    });
  }

  openAddToCartModal() {
    if (!this.product) return;
    if (!this.product.variants || this.product.variants.length === 0) {
      this.toast.notify('Sản phẩm này hiện tại chưa có phân loại hàng!');
      return;
    }

    const dialogRef = this.dialog.open(AddToCartModalComponent, {
      ...APP_DIALOG_SIZE.addToCart,
      data: { product: this.product },
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((result: { variantId: number; quantity: number } | null) => {
      if (result) {
        this.cartService.addToCart(this.authService.getUserId(), result.variantId, result.quantity).subscribe({
          next: () => this.toast.notify('Đã thêm vào giỏ hàng thành công!'),
          error: (err) => this.toast.notify('Lỗi: ' + getApiErrorMessage(err, 'Không thể thêm vào giỏ hàng')),
        });
      }
    });
  }

  getLabel(key: string): string {
    return this.attributeDictionary[key] || key;
  }

  get isAcceptingOrders(): boolean {
    const status = this.product?.availabilityStatus;
    return !status || status === 'ACCEPTING_ORDERS';
  }

  get availabilityLabel(): string {
    const status = this.product?.availabilityStatus;
    if (status === 'PAUSED') return 'Tạm ngưng nhận đơn';
    if (status === 'DISCONTINUED') return 'Ngừng kinh doanh';
    return 'Đang nhận đơn';
  }
}
