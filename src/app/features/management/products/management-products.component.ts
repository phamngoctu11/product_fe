import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Product } from '../../../model/product.model';
import { getApiErrorMessage } from '../../../model/api-response.model';
import { ProductService } from '../../../service/product.service';
import { AuthService } from '../../../service/auth.service';
import { ToastService } from '../../../service/toast.service';
import { ActionDialogService } from '../../../service/action-dialog.service';
import { APP_DIALOG_SIZE } from '../../../config/dialog.config';
import { PageHeaderComponent, ViewStateComponent } from '../../shared/ui';
import { ProductDetailComponent } from '../../shared/product-detail-dialog/product-detail';

interface ProductCategory {
  key: string;
  label: string;
  icon: string;
  aliases: string[];
}

@Component({
  selector: 'app-management-products',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, PageHeaderComponent, ViewStateComponent],
  templateUrl: './management-products.component.html',
  styleUrl: './management-products.component.css',
})
export class ManagementProductsComponent implements OnInit {
  private readonly seededCategories: ProductCategory[] = [
    { key: 'quan', label: 'Quần', icon: 'bi-person-standing', aliases: ['quan', 'quần', 'pants', 'jeans'] },
    { key: 'ao', label: 'Áo', icon: 'bi-person-arms-up', aliases: ['ao', 'áo', 'shirt', 'top'] },
    { key: 'vong-tay', label: 'Vòng tay', icon: 'bi-circle', aliases: ['vongtay', 'vòng tay', 'bracelet'] },
    { key: 'vong-co', label: 'Vòng cổ', icon: 'bi-gem', aliases: ['vongco', 'vòng cổ', 'necklace'] },
    { key: 'nhan', label: 'Nhẫn', icon: 'bi-record-circle', aliases: ['nhan', 'nhẫn', 'ring'] },
    { key: 'bong-tai', label: 'Bông tai', icon: 'bi-stars', aliases: ['bongtai', 'bông tai', 'earring'] },
    { key: 'tui-xach', label: 'Túi xách', icon: 'bi-handbag', aliases: ['tuixach', 'túi xách', 'bag'] },
    { key: 'giay-dep', label: 'Giày dép', icon: 'bi-bag', aliases: ['giay', 'giày', 'dep', 'dép', 'shoe'] },
  ];

  products: Product[] = [];
  categories: ProductCategory[] = [];
  selectedCategory: ProductCategory | null = null;
  searchTerm = '';
  isLoading = false;
  loadError = '';

  constructor(
    private readonly productService: ProductService,
    private readonly authService: AuthService,
    private readonly toast: ToastService,
    private readonly actionDialog: ActionDialogService,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  get visibleProducts(): Product[] {
    if (!this.selectedCategory) return [];
    const keyword = this.normalize(this.searchTerm);
    return this.products.filter((product) =>
      this.belongsToCategory(product, this.selectedCategory!)
      && (!keyword || this.normalize(product.product_name).includes(keyword))
    );
  }

  loadProducts(): void {
    this.isLoading = true;
    this.loadError = '';
    this.productService.getAll(0, 500).subscribe({
      next: (page) => {
        this.products = page.content || [];
        this.categories = this.buildCategories(this.products);
        this.isLoading = false;
      },
      error: (error) => {
        this.loadError = getApiErrorMessage(error, 'Không thể tải danh mục sản phẩm.');
        this.isLoading = false;
      },
    });
  }

  selectCategory(category: ProductCategory): void {
    this.selectedCategory = category;
    this.searchTerm = '';
  }

  closeCategory(): void {
    this.selectedCategory = null;
    this.searchTerm = '';
  }

  openProduct(product: Product): void {
    this.openProductDialog(product.id, true);
  }

  addProduct(): void {
    this.openProductDialog(null, false);
  }

  editProduct(product: Product, event?: Event): void {
    event?.stopPropagation();
    this.openProductDialog(product.id, false);
  }

  deleteProduct(product: Product, event?: Event): void {
    event?.stopPropagation();
    const userId = this.authService.getUserId();
    if (!product.id || !userId || !this.authService.isAdmin()) return;

    this.actionDialog.confirm({
      title: 'Xóa sản phẩm',
      message: `Bạn có chắc muốn xóa sản phẩm “${product.product_name}”?`,
      confirmText: 'Xóa sản phẩm',
      tone: 'danger',
      icon: 'bi-trash3-fill',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.productService.delete(product.id!, userId).subscribe({
        next: () => {
          this.toast.notify('Đã xóa sản phẩm.');
          this.loadProducts();
        },
        error: (error) => this.toast.notify(getApiErrorMessage(error, 'Không thể xóa sản phẩm.')),
      });
    });
  }

  get canCreateOrDelete(): boolean {
    return this.authService.isAdmin();
  }

  private openProductDialog(id: number | null | undefined, isView: boolean): void {
    const isStaffMode = this.authService.isStaff() && !this.authService.isAdmin();
    if (!isView && !this.authService.isAdmin() && !(isStaffMode && id)) {
      this.toast.notify('Bạn không có quyền thực hiện chức năng này.');
      return;
    }

    const dialogRef = this.dialog.open(ProductDetailComponent, {
      ...APP_DIALOG_SIZE.product,
      panelClass: 'product-detail-dialog-panel',
      data: {
        id: id || null,
        availableTags: this.availableTags(),
        isView,
        staffMode: isStaffMode,
      },
      disableClose: !isView,
    });

    dialogRef.afterClosed().subscribe((changed) => {
      if (changed) this.loadProducts();
    });
  }

  private availableTags(): string[] {
    const tags = new Set<string>();
    this.products.forEach((product) => this.productTags(product).forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort((a, b) => a.localeCompare(b, 'vi'));
  }

  productCount(category: ProductCategory): number {
    return this.products.filter((product) => this.belongsToCategory(product, category)).length;
  }

  private buildCategories(products: Product[]): ProductCategory[] {
    const categories = [...this.seededCategories];
    const knownAliases = new Set(categories.flatMap((category) => category.aliases.map((alias) => this.normalize(alias))));

    for (const product of products) {
      for (const rawTag of this.productTags(product)) {
        const normalizedTag = this.normalize(rawTag);
        if (!normalizedTag || knownAliases.has(normalizedTag)) continue;
        categories.push({
          key: normalizedTag.replace(/\s+/g, '-'),
          label: this.toDisplayLabel(rawTag),
          icon: 'bi-tags',
          aliases: [rawTag],
        });
        knownAliases.add(normalizedTag);
      }
    }

    return categories.filter((category) => this.productCountFor(products, category) > 0);
  }

  private productCountFor(products: Product[], category: ProductCategory): number {
    return products.filter((product) => this.belongsToCategory(product, category)).length;
  }

  private belongsToCategory(product: Product, category: ProductCategory): boolean {
    const searchableValues = [...this.productTags(product), product.product_name].map((value) => this.normalize(value));
    return category.aliases.some((alias) => {
      const normalizedAlias = this.normalize(alias);
      return searchableValues.some((value) => value === normalizedAlias || value.includes(normalizedAlias));
    });
  }

  private productTags(product: Product): string[] {
    return (product.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);
  }

  private normalize(value: string): string {
    return value.toLocaleLowerCase('vi').replace(/^#/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  private toDisplayLabel(tag: string): string {
    const cleanTag = tag.replace(/^#/, '').trim();
    return cleanTag ? cleanTag.charAt(0).toLocaleUpperCase('vi') + cleanTag.slice(1) : 'Khác';
  }
}
