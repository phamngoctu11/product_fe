import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject as injectToast } from '@angular/core';
import { ToastService } from '../../service/toast.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProductService } from '../../service/product.service';
import { ChatService } from '../../service/chat.service';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-page.component.html'
})
export class ProductPageComponent implements OnInit {
  private readonly toast = injectToast(ToastService);
  product: any = null;
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
    private productService: ProductService,
    private chatService: ChatService,
    public authService: AuthService
  ) {}

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

  getLabel(key: string): string {
    return this.attributeDictionary[key] || key;
  }

  askAboutProduct() {
    if (!this.authService.isLoggedIn()) {
      this.toast.notify("Vui lòng đăng nhập để chat với Admin về sản phẩm này!");
      return;
    }

    const productInfo = {
      id: this.product.id,
      name: this.product.product_name,
      price: this.product.price,
      imageUrl: this.product.image_url,
      tags: this.product.tags || '',
      variantsCount: this.product.variants ? this.product.variants.length : 0,
      variants: this.product.variants ? this.product.variants.map((v: any) => ({
        name: v.variantName,
        price: v.price,
        quantity: v.quantity
      })) : []
    };

    // Bắn tín hiệu sang Khung Chat (Đường dây nóng)
    this.chatService.triggerProductQuery(productInfo);
  }
}
