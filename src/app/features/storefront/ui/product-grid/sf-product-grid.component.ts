import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Product } from '../../../../model/product.model';
import { SfProductTileComponent } from '../product-tile/sf-product-tile.component';

/**
 * Lưới sản phẩm 3 cột (2 cột tablet, 1 cột mobile) + skeleton khi đang tải.
 * Khi danh sách rỗng, nội dung có thuộc tính [sfEmpty] sẽ được hiển thị.
 *
 * @example
 * <sf-product-grid [products]="items" [loading]="isLoading">
 *   <sf-state sfEmpty title="Không có sản phẩm" />
 * </sf-product-grid>
 */
@Component({
  selector: 'sf-product-grid',
  standalone: true,
  imports: [SfProductTileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="sf-grid" aria-busy="true" aria-label="Đang tải sản phẩm">
        @for (i of skeletons(); track i) {
          <div class="sf-grid__skeleton"></div>
        }
      </div>
    } @else if (products().length === 0) {
      <ng-content select="[sfEmpty]" />
    } @else {
      <div class="sf-grid">
        @for (product of products(); track product.id ?? $index; let i = $index) {
          <sf-product-tile
            class="sf-grid__item"
            [style.animation-delay.ms]="(i % 9) * 60"
            [product]="product"
            [showFavorite]="showFavorite()"
            [favorite]="isIn(favoriteIds(), product)"
            [favoriteBusy]="isIn(busyIds(), product)"
            (favoriteToggled)="favoriteToggled.emit($event)"
            (viewed)="viewed.emit($event)" />
        }
      </div>
    }
  `,
  styles: [`
    .sf-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }

    .sf-grid__item {
      animation: sf-fade-up 0.7s var(--sf-ease) both;
    }

    .sf-grid__skeleton {
      aspect-ratio: 421 / 400;
      background: linear-gradient(100deg, var(--sf-bg-elev) 30%, var(--sf-bg-soft) 50%, var(--sf-bg-elev) 70%);
      background-size: 300% 100%;
      animation: sf-shimmer 1.4s ease-in-out infinite;
    }

    @keyframes sf-shimmer {
      from { background-position: 100% 0; }
      to { background-position: 0 0; }
    }

    @media (max-width: 991.98px) {
      .sf-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 575.98px) {
      .sf-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class SfProductGridComponent {
  readonly products = input<Product[]>([]);
  readonly loading = input(false);
  readonly skeletonCount = input(6);
  readonly showFavorite = input(false);
  readonly favoriteIds = input<ReadonlySet<number>>(new Set());
  readonly busyIds = input<ReadonlySet<number>>(new Set());
  readonly favoriteToggled = output<Product>();
  readonly viewed = output<Product>();

  protected readonly skeletons = computed(() => Array.from({ length: this.skeletonCount() }, (_, i) => i));

  protected isIn(set: ReadonlySet<number>, product: Product): boolean {
    return typeof product.id === 'number' && set.has(product.id);
  }
}

