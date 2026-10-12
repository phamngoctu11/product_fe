import { Directive, computed, input } from '@angular/core';

export type SfButtonVariant = 'outline' | 'light' | 'dark' | 'ghost' | 'link';
export type SfButtonSize = 'sm' | 'md' | 'lg';

/**
 * Nút bấm chuẩn của storefront. Dùng được cho cả <button> và <a>.
 *
 * @example
 * <a sfButton="dark" routerLink="/store/product">Xem tất cả</a>
 * <button sfButton="light" size="lg" [block]="true">Thêm vào giỏ</button>
 */
@Directive({
  selector: 'button[sfButton], a[sfButton]',
  standalone: true,
  host: {
    '[class]': 'classes()',
  },
})
export class SfButtonDirective {
  /** Biến thể hiển thị; để trống sẽ dùng `outline`. */
  readonly sfButton = input<SfButtonVariant | ''>('');
  readonly size = input<SfButtonSize>('md');
  readonly block = input(false);

  protected readonly classes = computed(() => {
    const variant = this.sfButton() || 'outline';
    return [
      'sf-btn',
      `sf-btn--${variant}`,
      `sf-btn--${this.size()}`,
      this.block() ? 'sf-btn--block' : '',
    ].filter(Boolean).join(' ');
  });
}

