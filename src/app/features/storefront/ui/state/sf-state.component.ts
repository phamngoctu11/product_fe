import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SfButtonDirective } from '../button/sf-button.directive';

/**
 * Thông báo trạng thái tối giản: trống / lỗi.
 * (Trạng thái loading của lưới sản phẩm do sf-product-grid tự hiển thị skeleton.)
 */
@Component({
  selector: 'sf-state',
  standalone: true,
  imports: [SfButtonDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sf-state" role="status">
      <i class="bi sf-state__icon" [class]="icon()" aria-hidden="true"></i>
      <h2 class="sf-state__title">{{ title() }}</h2>
      @if (text()) {
        <p class="sf-state__text">{{ text() }}</p>
      }
      @if (actionLabel()) {
        <button type="button" sfButton="outline" (click)="action.emit()">{{ actionLabel() }}</button>
      }
    </div>
  `,
  styles: [`
    .sf-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.9rem;
      padding: clamp(48px, 8vw, 96px) 1.5rem;
      border: 1px solid var(--sf-line);
      text-align: center;
    }

    .sf-state__icon { font-size: 2rem; color: var(--sf-muted); }

    .sf-state__title {
      margin: 0;
      font-size: clamp(1.4rem, 2.4vw, 2rem);
      font-weight: 200;
      letter-spacing: -0.03em;
      text-transform: uppercase;
    }

    .sf-state__text {
      max-width: 460px;
      margin: 0 0 0.6rem;
      color: var(--sf-ink-soft);
    }
  `],
})
export class SfStateComponent {
  readonly title = input.required<string>();
  readonly text = input('');
  readonly icon = input('bi-search');
  readonly actionLabel = input('');
  readonly action = output<void>();
}

