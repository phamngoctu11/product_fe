import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { Product, ProductVariant } from '../../../model/product.model';

@Component({
  selector: 'app-add-to-cart-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './add-to-cart-modal.html',
  styleUrls: ['../../../app.css', './add-to-cart-modal.css'],
})
export class AddToCartModalComponent implements OnInit {
  product: Product;
  selectedVariant: ProductVariant | null = null;
  quantity: number = 1;

  filteredVariants: ProductVariant[] = [];
  availableFilters: { [key: string]: string[] } = {};
  activeFilters: { [key: string]: string[] } = {};

  attributeDictionary: { [key: string]: string } = {
    'size': 'Kích cỡ', 'color': 'Màu sắc', 'material': 'Chất liệu', 'fit': 'Kiểu dáng',
    'ram': 'RAM', 'storage': 'Bộ nhớ (ROM)', 'chipset': 'Vi xử lý', 'power': 'Công suất',
    'capacity': 'Dung tích', 'shade': 'Mã màu', 'volume': 'Thể tích',
    'skin_type': 'Loại da', 'flavor': 'Hương vị', 'weight': 'Trọng lượng',
    'dimensions': 'Kích thước', 'type': 'Phân loại'
  };

  constructor(
    public dialogRef: MatDialogRef<AddToCartModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { product: Product }
  ) {
    this.product = data.product;
  }

  ngOnInit(): void {
    if (this.product.variants) {
      this.product.variants.forEach(v => {
        try { v.parsedAttributes = v.attributes ? JSON.parse(v.attributes) : {}; }
        catch (e) { v.parsedAttributes = {}; }
      });
      this.filteredVariants = [...this.product.variants];
      this.extractFilters();
    }
  }

  // ========================================================
  // HÀM XỬ LÝ ẢNH THÔNG MINH (Ưu tiên Biến thể -> Sản phẩm gốc)
  // ========================================================
 getDisplayImage(): string | null {
    if (this.selectedVariant && this.selectedVariant.image_url && this.selectedVariant.image_url.trim() !== '') {
      return this.selectedVariant.image_url;
    }
    if (this.product && this.product.image_url && this.product.image_url.trim() !== '') {
      return this.product.image_url;
    }
    return null;
  }

  extractFilters() {
    this.product.variants?.forEach(v => {
      const attrs = v.parsedAttributes;
      for (const key in attrs) {
        if (!this.availableFilters[key]) {
          this.availableFilters[key] = [];
          this.activeFilters[key] = [];
        }
        if (!this.availableFilters[key].includes(attrs[key])) {
          this.availableFilters[key].push(attrs[key]);
        }
      }
    });
  }

  toggleFilter(key: string, value: string, event: any) {
    if (event.target.checked) this.activeFilters[key].push(value);
    else this.activeFilters[key] = this.activeFilters[key].filter(v => v !== value);
    this.applyFilters();
  }

  applyFilters() {
    const hasActiveFilters = Object.values(this.activeFilters).some(arr => arr.length > 0);
    if (!hasActiveFilters) {
      this.filteredVariants = [...(this.product.variants || [])];
      return;
    }
    this.filteredVariants = (this.product.variants || []).filter(v => {
      const attrs = v.parsedAttributes;
      for (const key in this.activeFilters) {
        if (this.activeFilters[key].length > 0 && !this.activeFilters[key].includes(attrs[key])) {
          return false;
        }
      }
      return true;
    });
    if (this.selectedVariant && !this.filteredVariants.find(v => v.id === this.selectedVariant?.id)) {
      this.selectedVariant = null;
    }
  }

  getObjectKeys(obj: any): string[] { return obj ? Object.keys(obj) : []; }
  getLabel(key: string): string { return this.attributeDictionary[key] || key; }

  selectVariant(variant: ProductVariant) {
    if (variant.quantity > 0) {
      this.selectedVariant = variant;
      this.quantity = 1;
    }
  }

  onConfirm() {
    if (this.selectedVariant && this.selectedVariant.id && this.quantity > 0) {
      this.dialogRef.close({ variantId: this.selectedVariant.id, quantity: this.quantity });
    }
  }

  onCancel() { this.dialogRef.close(null); }
}
