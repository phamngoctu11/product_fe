import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SfButtonDirective } from '../button/sf-button.directive';

export interface SfChipItem {
  value: string;
  label: string;
}

/**
 * Nhóm nút dạng viền mảnh để lọc nhanh (VD: danh mục sản phẩm).
 * `active` là value đang chọn; bấm lại chip đang chọn sẽ phát ra `null` nếu `toggleable`.
 */
@Component({
  selector: 'sf-chip-group',
  standalone: true,
  imports: [SfButtonDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="sf-chips" [attr.aria-label]="ariaLabel()">
      @for (item of items(); track item.value) {
        <button
          type="button"
          sfButton="outline"
          [class.is-active]="item.value === active()"
          [attr.aria-pressed]="item.value === active()"
          (click)="select(item.value)">
          {{ item.label }}
        </button>
      }
    </nav>
  `,
  styles: [`
    .sf-chips {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-start;
      gap: 0.55rem;
    }

    @media (max-width: 575.98px) {
      .sf-chips { gap: 0.6rem; }
    }
  `],
})
export class SfChipGroupComponent {
  readonly items = input.required<SfChipItem[]>();
  readonly active = input<string | null>(null);
  readonly toggleable = input(true);
  readonly ariaLabel = input('Bộ lọc');
  readonly selected = output<string | null>();

  select(value: string): void {
    const isSame = value === this.active();
    this.selected.emit(isSame && this.toggleable() ? null : value);
  }
}

