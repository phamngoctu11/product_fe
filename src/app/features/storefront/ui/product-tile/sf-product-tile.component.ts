import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../../../model/product.model';

/**
 * Ô sản phẩm dạng ảnh lớn (grid 3 cột như template).
 * Tên + giá hiện khi hover (luôn hiện trên thiết bị cảm ứng).
 */
@Component({
  selector: 'sf-product-tile',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="sf-tile" href="javascript:void(0)" (click)="onTileClick($event)" [attr.aria-label]="'Xem ' + product().product_name">
      <div class="sf-tile__media">
        @if (product().image_url) {
          <img [src]="product().image_url" [alt]="product().product_name" loading="lazy" decoding="async">
        } @else {
          <div class="sf-tile__placeholder" aria-hidden="true">
            <i class="bi bi-flower1"></i>
          </div>
        }
      </div>

      @if (!isAccepting()) {
        <span class="sf-tag sf-tag--warn sf-tile__status">{{ availabilityLabel() }}</span>
      }

      <div class="sf-tile__caption">
        <h3 class="sf-tile__name">{{ product().product_name }}</h3>
        <p class="sf-tile__meta">
          <span class="sf-mono">{{ product().price | number: '1.0-0' }} ₫</span>
          @if (product().madeDay) {
            <span>~{{ product().madeDay }} ngày làm</span>
          } @else if (product().variants?.length) {
            <span>{{ product().variants?.length }} phân loại</span>
          }
        </p>
        <button
          type="button"
          class="sf-tile__buy-btn"
          [disabled]="!isAccepting()"
          (click)="onBuyClick($event)"
          [attr.aria-label]="'Chọn mua ' + product().product_name"
          [title]="isAccepting() ? 'Chọn mua sản phẩm' : availabilityLabel()">
          <i class="bi bi-bag-plus me-1"></i>
          <span>{{ isAccepting() ? 'Chọn mua' : availabilityLabel() }}</span>
        </button>
      </div>
    </a>

    @if (showFavorite()) {
      <button
        type="button"
        class="sf-tile__fav"
        [class.is-active]="favorite()"
        [disabled]="favoriteBusy()"
        [attr.aria-label]="favorite() ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'"
        (click)="favoriteToggled.emit(product())">
        <i class="bi" [class.bi-heart-fill]="favorite()" [class.bi-heart]="!favorite()"></i>
      </button>
    }
  `,
  styles: [`
    :host { position: relative; display: block; }

    .sf-tile {
      position: relative;
      display: block;
      overflow: hidden;
      color: var(--sf-ink);
      text-decoration: none;
      background: var(--sf-bg-elev);
    }

    .sf-tile__media {
      aspect-ratio: 421 / 400;
      overflow: hidden;
    }

    .sf-tile__media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 1.1s var(--sf-ease), filter 0.6s ease;
    }

    .sf-tile__placeholder {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      background:
        radial-gradient(circle at 30% 25%, rgba(236, 229, 216, 0.08), transparent 60%),
        var(--sf-bg-soft);
      color: var(--sf-muted);
      font-size: 2.6rem;
    }

    .sf-tile__caption {
      padding: 1.25rem 0.5rem;
      background: transparent;
    }

    .sf-tile__name {
      margin: 0 0 0.35rem;
      font-size: 1.15rem;
      font-weight: 300;
      line-height: 1.2;
      letter-spacing: -0.02em;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      color: var(--sf-ink);
    }

    .sf-tile__meta {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      margin: 0;
      font-size: 0.85rem;
      color: var(--sf-ink-soft);
    }

    .sf-tile__status {
      position: absolute;
      top: 0.9rem;
      left: 0.9rem;
    }

    .sf-tile:hover .sf-tile__media img,
    .sf-tile:focus-visible .sf-tile__media img {
      transform: scale(1.045);
    }

    .sf-tile:focus-visible {
      outline: 1px solid var(--sf-ink);
      outline-offset: 4px;
    }

    .sf-tile__fav {
      position: absolute;
      top: 0.8rem;
      right: 0.8rem;
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border: 0;
      background: rgba(23, 20, 15, 0.7);
      color: var(--sf-ink);
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease;
    }

    .sf-tile__fav:hover { background: var(--sf-bg-deep); }
    .sf-tile__fav.is-active { color: var(--sf-danger); }
    .sf-tile__fav:disabled { opacity: 0.6; cursor: progress; }

    .sf-tile__buy-btn {
      margin-top: 0.85rem;
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.6rem 1rem;
      border: 1px solid var(--sf-line-strong);
      background: transparent;
      color: var(--sf-ink);
      font-family: var(--sf-font-sans);
      font-size: 0.82rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      transition: all 0.25s var(--sf-ease);
    }

    .sf-tile__buy-btn:hover:not(:disabled) {
      background: var(--sf-ink);
      color: var(--sf-bg);
      border-color: var(--sf-ink);
    }

    .sf-tile__buy-btn:disabled {
      opacity: 0.45;
      border-color: var(--sf-line);
      color: var(--sf-muted);
      cursor: not-allowed;
    }
  `],
})
export class SfProductTileComponent {
  readonly product = input.required<Product>();
  /** Đường dẫn khi bấm vào ô; mặc định tới trang chi tiết storefront. */
  readonly linkBase = input('/store/product');
  readonly showFavorite = input(false);
  readonly favorite = input(false);
  readonly favoriteBusy = input(false);
  readonly favoriteToggled = output<Product>();
  readonly viewed = output<Product>();
  readonly buy = output<Product>();

  protected readonly isAccepting = computed(() => {
    const status = this.product().availabilityStatus;
    return !status || status === 'ACCEPTING_ORDERS';
  });
  protected readonly availabilityLabel = computed(() => {
    const status = this.product().availabilityStatus;
    if (status === 'PAUSED') return 'Tạm ngưng nhận đơn';
    if (status === 'DISCONTINUED') return 'Ngừng kinh doanh';
    return 'Đang nhận đơn';
  });

  onTileClick(event: Event) {
    event.preventDefault();
    this.viewed.emit(this.product());
  }

  onBuyClick(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (this.isAccepting()) {
      this.buy.emit(this.product());
    }
  }
}

