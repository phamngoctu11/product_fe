import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Product } from '../../../../model/product.model';

/** Product card used by the storefront catalog. */
@Component({
  selector: 'sf-product-tile',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="sf-tile">
      <button
        class="sf-tile__view"
        type="button"
        (click)="viewed.emit(product())"
        [attr.aria-label]="'Xem ' + product().product_name">
        <span class="sf-tile__media">
          @if (product().image_url) {
            <img [src]="product().image_url" [alt]="product().product_name" loading="lazy" decoding="async">
          } @else {
            <span class="sf-tile__placeholder" aria-hidden="true"><i class="bi bi-flower1"></i></span>
          }
        </span>

        @if (!isAccepting()) {
          <span class="sf-tag sf-tag--warn sf-tile__status">{{ availabilityLabel() }}</span>
        }

        <span class="sf-tile__caption">
          <span class="sf-tile__name">{{ product().product_name }}</span>
          @if (product().productTypeName) {
            <span class="sf-tile__type">{{ product().productTypeName }}</span>
          }
          <span class="sf-tile__meta">
            <span class="sf-mono">{{ product().price | number: '1.0-0' }} ₫</span>
            @if (product().madeDay) {
              <span>~{{ product().madeDay }} ngày làm</span>
            } @else if (product().variants?.length) {
              <span>{{ product().variants?.length }} phân loại</span>
            }
          </span>
        </span>
      </button>

      @if (showFavorite()) {
        <button
          type="button"
          class="sf-tile__fav"
          [class.is-active]="favorite()"
          [disabled]="favoriteBusy()"
          [attr.aria-label]="favorite() ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'"
          [attr.aria-pressed]="favorite()"
          (click)="favoriteToggled.emit(product())">
          <i class="bi" [class.bi-heart-fill]="favorite()" [class.bi-heart]="!favorite()" aria-hidden="true"></i>
        </button>
      }

      <button
        type="button"
        class="sf-tile__buy-btn"
        [disabled]="!isAccepting()"
        (click)="buy.emit(product())"
        [attr.aria-label]="'Chọn mua ' + product().product_name"
        [title]="isAccepting() ? 'Chọn mua sản phẩm' : availabilityLabel()">
        <i class="bi bi-bag-plus" aria-hidden="true"></i>
        <span>{{ isAccepting() ? 'Chọn mua' : availabilityLabel() }}</span>
      </button>
    </article>
  `,
  styles: [`
    :host { position: relative; display: block; min-width: 0; }

    .sf-tile {
      position: relative;
      display: flex;
      min-width: 0;
      height: 100%;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid var(--sf-line);
      border-radius: var(--clay-radius-md, 9px);
      background: var(--sf-bg-elev);
      color: var(--sf-ink);
      transition: border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
    }

    .sf-tile:hover {
      transform: translateY(-3px);
      border-color: var(--sf-line-strong);
      box-shadow: var(--clay-shadow-md);
    }

    .sf-tile__view {
      position: relative;
      display: flex;
      flex: 1;
      min-width: 0;
      flex-direction: column;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      text-align: left;
      cursor: pointer;
    }

    .sf-tile__media {
      display: block;
      aspect-ratio: 4 / 3;
      overflow: hidden;
      background: var(--sf-bg-soft);
    }

    .sf-tile__media img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 400ms var(--sf-ease);
    }

    .sf-tile__placeholder {
      display: grid;
      width: 100%;
      height: 100%;
      place-items: center;
      background: radial-gradient(circle at 30% 25%, rgb(240 233 220 / 8%), transparent 60%), var(--sf-bg-soft);
      color: var(--sf-muted);
      font-size: 2.6rem;
    }

    .sf-tile__caption {
      display: block;
      min-width: 0;
      padding: 1rem 1rem 0.65rem;
    }

    .sf-tile__name {
      display: -webkit-box;
      overflow: hidden;
      margin: 0 0 0.35rem;
      color: var(--sf-ink);
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.25;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .sf-tile__type {
      display: inline-flex;
      max-width: 100%;
      overflow: hidden;
      margin: 0 0 .45rem;
      padding: .2rem .45rem;
      border: 1px solid var(--sf-line);
      border-radius: 3px;
      color: var(--sf-ink-soft);
      font-size: .68rem;
      font-weight: 650;
      letter-spacing: .035em;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sf-tile__meta {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 0.3rem 0.75rem;
      margin: 0;
      color: var(--sf-ink-soft);
      font-size: 0.78rem;
    }

    .sf-tile__meta .sf-mono { color: var(--sf-accent); font-size: 0.95rem; font-weight: 700; }

    .sf-tile__status {
      position: absolute;
      top: 0.8rem;
      right: 0.8rem;
      z-index: 1;
    }

    .sf-tile:hover .sf-tile__media img,
    .sf-tile__view:focus-visible .sf-tile__media img { transform: scale(1.045); }

    .sf-tile__fav {
      position: absolute;
      top: 0.7rem;
      left: 0.7rem;
      z-index: 2;
      display: grid;
      width: 40px;
      height: 40px;
      place-items: center;
      border: 1px solid rgb(240 233 220 / 26%);
      border-radius: 50%;
      background: rgb(27 24 19 / 84%);
      color: var(--sf-ink);
      cursor: pointer;
      transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
    }

    .sf-tile__fav:hover { border-color: var(--sf-accent); color: var(--sf-accent); }
    .sf-tile__fav.is-active { border-color: var(--sf-danger); color: var(--sf-danger); }
    .sf-tile__fav:disabled { opacity: 0.6; cursor: progress; }

    .sf-tile__buy-btn {
      display: inline-flex;
      min-height: 42px;
      width: calc(100% - 2rem);
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin: 0 1rem 1rem;
      padding: 0.55rem 0.9rem;
      border: 1px solid var(--sf-accent);
      border-radius: var(--clay-radius-sm, 5px);
      background: var(--sf-accent);
      color: var(--sf-accent-ink);
      font-family: var(--sf-font-sans);
      font-size: 0.82rem;
      font-weight: 650;
      letter-spacing: 0.035em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background 180ms ease, border-color 180ms ease, color 180ms ease;
    }

    .sf-tile__buy-btn:hover:not(:disabled) {
      border-color: var(--sf-accent-hover);
      background: var(--sf-accent-hover);
    }

    .sf-tile__buy-btn:disabled {
      border-color: var(--sf-line);
      background: transparent;
      color: var(--sf-ink-soft);
      cursor: not-allowed;
    }

    @media (max-width: 420px) {
      .sf-tile__caption { padding: 0.75rem 0.75rem 0.5rem; }
      .sf-tile__name { font-size: 0.9rem; }
      .sf-tile__meta { font-size: 0.7rem; }
      .sf-tile__buy-btn { width: calc(100% - 1.5rem); margin: 0 0.75rem 0.75rem; }
    }

    @media (prefers-reduced-motion: reduce) {
      .sf-tile, .sf-tile__media img { transition: none; }
    }
  `],
})
export class SfProductTileComponent {
  readonly product = input.required<Product>();
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
}
