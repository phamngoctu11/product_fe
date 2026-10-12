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
          @if (product().variants?.length) {
            <span>{{ product().variants?.length }} phân loại</span>
          }
        </p>
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

  protected readonly isAccepting = computed(() => {
    const p = this.product();
    if (p.variants && p.variants.length > 0) {
      return p.variants.some(v => v.quantity > 0);
    }
    return (p.quantity || 0) > 0;
  });
  protected readonly availabilityLabel = computed(() => 'Hết hàng');

  onTileClick(event: Event) {
    event.preventDefault();
    this.viewed.emit(this.product());
  }
}

