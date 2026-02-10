import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CartService } from '../../service/cart.service';
import { AuthService } from '../../service/auth.service';
import { NaPipe } from '../../pipes/na-pipe';
import { ProductService } from '../../service/product.service';
@Component({
  selector: 'app-product',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule, NaPipe],
  templateUrl: './product.html',
})
export class Product implements OnInit {
  http = inject(HttpClient);
  plist: any[] = [];
  addQuan: number[] = [];
  productForm: FormGroup = new FormGroup({
    id: new FormControl(0),
    product_name: new FormControl('', [Validators.required, Validators.minLength(5)]),
    quantity: new FormControl(1, [Validators.required, Validators.min(1)]),
    price: new FormControl(0, Validators.required),
  });
  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private productService: ProductService,
  ) {}
  currentUserId: any;
  search_id = signal<number>(0);
  pObj: any = {
    id: null,
    product_name: '',
    quantity: '',
    price: '',
  };
  ngOnInit(): void {
    this.currentUserId = this.authService.getUserId();
    this.getAll();
  }
  getAll() {
    this.productService.getAll().subscribe((res: any) => {
      this.plist = res;
      this.addQuan = new Array(res.length).fill(1);
    });
  }
  onAddToCart(productId: number, index: number) {
    const quantity = this.addQuan[index];
    if (!quantity || quantity <= 0) {
      alert('Vui lòng nhập số lượng hợp lệ!');
      return;
    }
    if (this.currentUserId !== null) {
      this.cartService.addToCart(this.currentUserId, productId, quantity).subscribe({
        next: (res: any) => {
          alert('Thông báo: ' + (res.message || res));
          this.addQuan[index] = 1;
        },
        error: (err) => {
          alert('Lỗi: ' + (err.error?.message || 'Không thể thêm vào giỏ'));
        },
      });
    } else {
      alert('Cảnh báo: Bạn cần đăng nhập!');
    }
  }
  create() {
    debugger;
    this.productService.create(this.productForm.value).subscribe({
      next: (res) => {
        this.getAll();
        this.resetForm();
      },
      error: (err) => {
        alert('Error');
      },
    });
  }
  onSearch() {
    this.http.get('http://localhost:8080/api/products/' + this.search_id()).subscribe({
      next: (res: any) => {
        this.plist = res;
      },
      error: (error) => {
        alert('Error' + error);
      },
    });
  }
  update() {
    debugger;
    this.productService.update(this.productForm.value.id, this.productForm.value).subscribe({
      next: () => {
        this.getAll();
        this.resetForm();
      },
      error: (error) => {
        alert('Error');
      },
    });
  }
  onEdit(item: any) {
    this.productForm.patchValue(item);
  }
  delete(item: any) {
    if (confirm('Xác nhận xóa sản phẩm?')) {
      this.productService.delete(item.id).subscribe({
        next: () => {
          this.getAll();
        },
        error: (error) => {
          alert('Error');
        },
      });
    }
  }
  private resetForm() {
    this.productForm.reset();
  }
}
