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
  productTypeId: number | null;
}

@Component({
  selector: 'app-management-products',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, PageHeaderComponent, ViewStateComponent],
  templateUrl: './management-products.component.html',
  styleUrl: './management-products.component.css',
})
export class ManagementProductsComponent implements OnInit {
  products: Product[] = [];
  categories: ProductCategory[] = [];
  selectedCategory: ProductCategory | null = null;
  private productTypeNames = new Map<number, string>();
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
    this.productService.getProductTypes().subscribe({
      next: (types) => {
        this.productTypeNames = new Map(types.map((type) => [Number(type.id), type.name]));
        this.categories = this.buildCategories(this.products);
      },
      error: () => undefined,
    });
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
    if (!product.id || !this.authService.isAdmin()) return;

    this.actionDialog.confirm({
      title: 'Xóa sản phẩm',
      message: `Bạn có chắc muốn xóa sản phẩm “${product.product_name}”?`,
      confirmText: 'Xóa sản phẩm',
      tone: 'danger',
      icon: 'bi-trash3-fill',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.productService.delete(product.id!).subscribe({
        next: () => {
          this.toast.notify('Đã xóa sản phẩm.');
          this.loadProducts();
        },
        error: (error) => this.toast.notify(getApiErrorMessage(error, 'Không thể xóa sản phẩm.')),
      });
    });
  }

  get canManageCatalog(): boolean {
    return this.authService.isManager();
  }

  get canCreateOrDelete(): boolean {
    return this.authService.isAdmin();
  }

  availabilityLabel(status?: string | null): string {
    switch ((status || 'ACCEPTING_ORDERS').toUpperCase()) {
      case 'PAUSED': return 'Tạm ngưng nhận đơn';
      case 'DISCONTINUED': return 'Ngừng kinh doanh';
      case 'ACCEPTING_ORDERS': return 'Đang nhận đơn';
      default: return 'Trạng thái chưa xác định';
    }
  }

  private openProductDialog(id: number | null | undefined, isView: boolean): void {
    if (!isView && !this.authService.isManager()) {
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
        allowPurchase: false,
        staffMode: false,
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
    const categories = new Map<string, ProductCategory>();
    for (const product of products) {
      const productTypeId = Number(product.productTypeId);
      const hasProductTypeId = Number.isInteger(productTypeId) && productTypeId > 0;
      const productTypeName = (hasProductTypeId ? this.productTypeNames.get(productTypeId) : '')
        || product.productTypeName?.trim()
        || '';
      const key = hasProductTypeId
        ? `id:${productTypeId}`
        : productTypeName
          ? `name:${this.normalize(productTypeName)}`
          : 'unassigned';

      if (!categories.has(key)) {
        categories.set(key, {
          key,
          label: productTypeName || (hasProductTypeId ? `Loại sản phẩm #${productTypeId}` : 'Chưa gán loại sản phẩm'),
          icon: 'bi-tag-fill',
          productTypeId: hasProductTypeId ? productTypeId : null,
        });
      }
    }

    return [...categories.values()].sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  }

  private productCountFor(products: Product[], category: ProductCategory): number {
    return products.filter((product) => this.belongsToCategory(product, category)).length;
  }

  private belongsToCategory(product: Product, category: ProductCategory): boolean {
    if (category.key === 'unassigned') {
      return !product.productTypeId && !product.productTypeName?.trim();
    }
    if (category.productTypeId !== null) {
      return Number(product.productTypeId) === category.productTypeId;
    }
    return `name:${this.normalize(product.productTypeName || '')}` === category.key;
  }

  private productTags(product: Product): string[] {
    return product.tags || [];
  }

  private normalize(value: string): string {
    return value.toLocaleLowerCase('vi').replace(/^#/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

}
