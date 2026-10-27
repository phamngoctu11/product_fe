import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActionDialogService } from '../../../service/action-dialog.service';
import { ToastService } from '../../../service/toast.service';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../../../service/cart.service';
import { AuthService } from '../../../service/auth.service';
import { ProductService } from '../../../service/product.service';
import { WishlistService } from '../../../service/wishlist.service';
import { ProductDetailComponent } from '../../shared/product-detail-dialog/product-detail';
import { AddToCartModalComponent } from './add-to-cart-modal/add-to-cart-modal';
import { Product } from '../../../model/product.model';
import { debounceTime, Observable, Subject, Subscription } from 'rxjs';
import { getApiErrorMessage } from '../../../model/api-response.model';
import { AppPaginationComponent } from '../../shared/ui';
import { APP_DIALOG_SIZE } from '../../../config/dialog.config';
import { HeroSectionComponent } from '../home/hero-section/hero-section.component';
import { SfProductGridComponent } from '../ui/product-grid/sf-product-grid.component';
import { SfStateComponent } from '../ui/state/sf-state.component';
import { SfWordmarkComponent } from '../ui/wordmark/sf-wordmark.component';
import { ProductTypeOption } from '../../../model/custom-request.model';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [
    HeroSectionComponent,
    SfProductGridComponent,
    SfStateComponent,
    SfWordmarkComponent,
    FormsModule,
    CommonModule,
    MatDialogModule,
    AppPaginationComponent,
  ],
  templateUrl: './product.html',
  styleUrl: './product.css',
})
export class ProductComponent implements OnInit, OnDestroy {
  productTypes: ProductTypeOption[] = [];
  selectedProductTypeIds = new Set<number>();
  productTypesLoaded = false;
  showAllProductTypes = false;
  readonly productTypePreviewCount = 6;

  get visibleProductTypes(): ProductTypeOption[] {
    return this.showAllProductTypes
      ? this.productTypes
      : this.productTypes.slice(0, this.productTypePreviewCount);
  }

  get allProductTypesSelected(): boolean {
    return this.productTypes.length === 0 || this.selectedProductTypeIds.size === this.productTypes.length;
  }

  toggleAllProductTypes(): void {
    this.selectedProductTypeIds = this.allProductTypesSelected
      ? new Set<number>()
      : new Set(this.productTypes.map((type) => type.id));
    this.getAll(0, this.pageSize);
  }

  toggleProductType(typeId: number): void {
    const selected = new Set(this.selectedProductTypeIds);
    if (selected.has(typeId)) selected.delete(typeId);
    else selected.add(typeId);
    this.selectedProductTypeIds = selected;
    this.getAll(0, this.pageSize);
  }

  onPriceChange(value: number | string | null): void {
    const nextPrice = value === null || value === '' ? null : Number(value);
    this.searchPrice = nextPrice !== null && Number.isFinite(nextPrice) && nextPrice > 0 ? nextPrice : null;
    this.filterProducts();
  }

  private readonly actionDialog = inject(ActionDialogService);
  private readonly toast = inject(ToastService);
  plist: Product[] = [];
  filteredProducts: Product[] = [];

  searchTerm: string = '';
  searchPrice: number | null = null;
  currentUserId: any;
  isAdmin: boolean = false;
  isStaff: boolean = false;
  canPurchase = false;
  canUseWishlist = false;
  favoriteProductIds = new Set<number>();
  favoriteBusyProductIds = new Set<number>();

  currentPage: number = 0;
  pageSize: number = 10;
  totalPages: number = 0;
  totalElements: number = 0;
  pageSizeOptions = [10, 20, 50, 100];
  isLoading = false;
  loadError = '';

  private readonly subscriptions = new Subscription();
  private readonly filterChanges = new Subject<void>();

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private productService: ProductService,
    private wishlistService: WishlistService,
    private dialog: MatDialog,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getUserId();
    this.isAdmin = false;
    this.isStaff = false;
    this.canPurchase = !this.authService.isLoggedIn() || this.authService.isCustomer();
    this.canUseWishlist = !!this.currentUserId && this.authService.isCustomer();
    this.subscriptions.add(this.route.queryParamMap.subscribe((params) => {
      this.searchTerm = params.get('keyword') || '';
      this.searchPrice = null;
      if (this.productTypesLoaded) {
        const routeTypeIds = [
          ...params.getAll('productTypeIds').flatMap((value) => value.split(',')),
          ...(params.get('productTypeId') ? [params.get('productTypeId')!] : []),
        ].map(Number).filter((id) => Number.isInteger(id) && id > 0);
        this.selectedProductTypeIds = routeTypeIds.length
          ? new Set(routeTypeIds.filter((id) => this.productTypes.some((type) => type.id === id)))
          : new Set(this.productTypes.map((type) => type.id));
        this.getAll(0, this.pageSize);
      }
    }));

    this.subscriptions.add(this.productService.getProductTypes().subscribe({
      next: (types) => {
        this.productTypes = types.filter((type) => type.active !== false);
        this.productTypesLoaded = true;
        const params = this.route.snapshot.queryParamMap;
        const routeTypeIds = [
          ...params.getAll('productTypeIds').flatMap((value) => value.split(',')),
          ...(params.get('productTypeId') ? [params.get('productTypeId')!] : []),
        ].map(Number).filter((id) => Number.isInteger(id) && id > 0);
        this.selectedProductTypeIds = routeTypeIds.length
          ? new Set(routeTypeIds.filter((id) => this.productTypes.some((type) => type.id === id)))
          : new Set(this.productTypes.map((type) => type.id));
        this.getAll(0, this.pageSize);
      },
      error: () => {
        this.productTypes = [];
        this.productTypesLoaded = true;
        this.getAll(0, this.pageSize);
      },
    }));

    this.subscriptions.add(this.filterChanges.pipe(debounceTime(300)).subscribe(() => {
      this.getAll(0, this.pageSize);
    }));

    this.subscriptions.add(this.cartService.checkoutSuccess$.subscribe(() => {
      this.getAll(this.currentPage, this.pageSize);
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  getAll(page: number = 0, size: number = 10) {
    if (this.productTypesLoaded && this.productTypes.length > 0 && this.selectedProductTypeIds.size === 0) {
      this.plist = [];
      this.filteredProducts = [];
      this.currentPage = 0;
      this.totalPages = 0;
      this.totalElements = 0;
      this.isLoading = false;
      this.loadError = '';
      return;
    }

    this.isLoading = true;
    this.loadError = '';
    this.productService.getAll(page, size, {
      keyword: this.searchTerm.trim(),
      maxPrice: this.searchPrice,
      productTypeIds: this.selectedProductTypeIds.size < this.productTypes.length
        ? [...this.selectedProductTypeIds]
        : undefined,
    }).subscribe({
      next: (res: any) => {
        this.plist = res.content || [];
        this.filteredProducts = [...this.plist];
        this.currentPage = res.number || 0;
        this.pageSize = res.size || 10;
        this.totalPages = res.totalPages || 0;
        this.totalElements = res.totalElements || 0;
        if (this.canUseWishlist) this.loadFavoriteStatusesForProducts(this.plist);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi khi lấy danh sách sản phẩm:', err);
        this.loadError = getApiErrorMessage(err, 'Không thể tải danh sách sản phẩm.');
        this.isLoading = false;
      },
    });
  }

  filterProducts() {
    this.filterChanges.next();
  }

  clearFilters(): void {
    this.searchPrice = null;
    this.selectedProductTypeIds = new Set(this.productTypes.map((type) => type.id));
    this.router.navigate(['/store/product']);
  }

  // HÀM MỚI: XEM CHI TIẾT SẢN PHẨM (READ-ONLY)
  viewProduct(id: number | null | undefined) {
    const dialogRef = this.dialog.open(ProductDetailComponent, {
      ...APP_DIALOG_SIZE.product,
      panelClass: 'product-detail-dialog-panel',
      data: { id: id || null, availableTags: [], isView: true, allowPurchase: this.canPurchase },
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.action === 'buy' && result.product) {
        this.openAddToCartModal(result.product);
      }
    });
  }

  // Cập nhật hàm openProductDialog
  openProductDialog(id: number | null | undefined = null) {
    if (!this.isAdmin && !(this.isStaff && id)) {
      this.toast.notify('Bạn không có quyền thực hiện chức năng này!');
      return;
    }
    const dialogRef = this.dialog.open(ProductDetailComponent, {
      ...APP_DIALOG_SIZE.product,
      panelClass: 'product-detail-dialog-panel',
      data: {
        id: id || null,
        availableTags: [],
        isView: false,
        staffMode: this.isStaff && !this.isAdmin,
      },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.getAll(this.currentPage, this.pageSize);
    });
  }

  openAddToCartModal(product: Product) {
    if (!this.canPurchase) { this.toast.notify('Chỉ tài khoản user mới có quyền mua hàng.'); return; }
    if (product.availabilityStatus === 'PAUSED' || product.availabilityStatus === 'DISCONTINUED') {
      this.toast.notify('Sản phẩm hiện đang tạm ngưng hoặc ngừng kinh doanh.');
      return;
    }
    if (!product.variants || product.variants.length === 0) { this.toast.notify('Sản phẩm này hiện tại chưa có phân loại hàng!'); return; }

    const dialogRef = this.dialog.open(AddToCartModalComponent, {
      ...APP_DIALOG_SIZE.addToCart,
      data: { product: product },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((result: { variantId: number, quantity: number } | null) => {
      if (result) this.onAddToCart(result.variantId, result.quantity);
    });
  }

  onAddToCart(variantId: number, quantity: number) {
    this.cartService.addToCart(this.currentUserId, variantId, quantity).subscribe({
      next: () => this.toast.notify('Đã thêm vào giỏ hàng thành công!'),
      error: (err) => this.toast.notify('Lỗi: ' + getApiErrorMessage(err, 'Không thể thêm'))
    });
  }

  loadFavoriteStatusesForProducts(products: Product[]): void {
    const productIds = products
      .map((product) => product.id)
      .filter((id): id is number => typeof id === 'number');

    if (productIds.length === 0) {
      this.favoriteProductIds.clear();
      return;
    }

    this.wishlistService.existsBatch(productIds).subscribe({
      next: (statusByProductId) => {
        this.favoriteProductIds = new Set(
          Object.entries(statusByProductId)
            .filter(([, isFavorite]) => isFavorite)
            .map(([productId]) => Number(productId))
            .filter((productId) => Number.isFinite(productId))
        );
      },
      error: () => {
        this.favoriteProductIds.clear();
      },
    });
  }

  isFavorite(product: Product): boolean {
    return typeof product.id === 'number' && this.favoriteProductIds.has(product.id);
  }

  isFavoriteBusy(product: Product): boolean {
    return typeof product.id === 'number' && this.favoriteBusyProductIds.has(product.id);
  }

  toggleFavorite(product: Product): void {
    if (!this.canUseWishlist || typeof product.id !== 'number') {
      this.toast.notify('Vui lòng đăng nhập bằng tài khoản user để sử dụng yêu thích.');
      return;
    }

    const productId = product.id;
    if (this.favoriteBusyProductIds.has(productId)) return;

    const wasFavorite = this.favoriteProductIds.has(productId);
    this.favoriteBusyProductIds.add(productId);
    const request: Observable<unknown> = wasFavorite
      ? this.wishlistService.remove(productId)
      : this.wishlistService.add(productId);

    request.subscribe({
      next: () => {
        if (wasFavorite) {
          this.favoriteProductIds.delete(productId);
          this.toast.notify('Đã bỏ sản phẩm khỏi danh sách yêu thích.');
        } else {
          this.favoriteProductIds.add(productId);
          this.toast.notify('Đã thêm sản phẩm vào danh sách yêu thích.');
        }
        this.favoriteBusyProductIds.delete(productId);
      },
      error: (err: any) => {
        this.favoriteBusyProductIds.delete(productId);
        this.toast.notify(getApiErrorMessage(err, 'Không thể cập nhật yêu thích.'));
      },
    });
  }

  delete(item: Product) {
    if (!this.isAdmin) return;
    if (!item.id) return;
    const productId = item.id;
    this.actionDialog.confirm({
      title: 'Xóa sản phẩm',
      message: `Bạn có chắc muốn xóa sản phẩm “${item.product_name}”?`,
      confirmText: 'Xóa sản phẩm',
      tone: 'danger',
      icon: 'bi-trash3-fill',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.productService.delete(productId).subscribe({
        next: () => this.getAll(this.currentPage, this.pageSize),
        error: () => this.toast.notify('Lỗi khi xóa!')
      });
    });
  }

  changePage(newPage: number) {
    if (newPage >= 0 && newPage < this.totalPages) this.getAll(newPage, this.pageSize);
  }

  changePageSize(size: number) {
    this.pageSize = size;
    this.getAll(0, this.pageSize);
  }
}
