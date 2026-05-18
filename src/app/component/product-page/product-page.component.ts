import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  product: any = null;
  isLoading = true;

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
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi tải sản phẩm:', err);
        this.isLoading = false;
      }
    });
  }

  askAboutProduct() {
    if (!this.authService.isLoggedIn()) {
      alert("Vui lòng đăng nhập để chat với Admin về sản phẩm này!");
      return;
    }

    const productInfo = {
      id: this.product.id,
      name: this.product.product_name,
      price: this.product.price,
      imageUrl: this.product.image_url
    };

    // Bắn tín hiệu sang Khung Chat (Đường dây nóng)
    this.chatService.triggerProductQuery(productInfo);
  }
}
