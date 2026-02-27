import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { ProductService } from '../../../service/product.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './product-detail.html',
})
export class ProductDetailComponent implements OnInit {
  productForm: FormGroup = new FormGroup({
    id: new FormControl(0),
    product_name: new FormControl('', [Validators.required, Validators.minLength(5)]),
    quantity: new FormControl(1, [Validators.required, Validators.min(1)]),
    price: new FormControl(0, [Validators.required, Validators.min(0)]),
  });

  isEdit = false;

  constructor(
    public dialogRef: MatDialogRef<ProductDetailComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id: number | null },
    private productService: ProductService
  ) {}

  ngOnInit() {
    // Nếu có ID truyền vào, tức là đang ở chế độ Cập nhật
    if (this.data && this.data.id) {
      this.isEdit = true;
      this.productService.getById(this.data.id).subscribe((res: any) => {
        this.productForm.patchValue(res);
      });
    }
  }

  save() {
    if (this.productForm.invalid) return;

    const payload = this.productForm.value;
    const request = this.isEdit
      ? this.productService.update(payload.id, payload)
      : this.productService.create(payload);

    request.subscribe({
      next: () => {
        alert(this.isEdit ? 'Cập nhật sản phẩm thành công!' : 'Thêm sản phẩm thành công!');
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error(err);
        alert('Đã xảy ra lỗi!');
      }
    });
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}
