import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Khối mở đầu trang: tiêu đề mảnh cỡ lớn + mô tả + vùng hành động (ng-content).
 * Dùng cho trang Cửa hàng, Danh mục, Câu chuyện...
 *
 * @example
 * <sf-page-intro title="Cửa hàng độc bản" subtitle="...">
 *   <sf-chip-group ... />
 * </sf-page-intro>
 */
@Component({
  selector: 'sf-page-intro',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sf-intro sf-reveal" [class.sf-intro--left]="align() === 'left'">
      @if (eyebrow()) {
        <p class="sf-eyebrow sf-intro__eyebrow">{{ eyebrow() }}</p>
      }
      <h1 class="sf-display" [class.sf-display--md]="size() === 'md'" [class.sf-display--sm]="size() === 'sm'">
        {{ title() }}
      </h1>
      @if (subtitle()) {
        <p class="sf-intro__subtitle">{{ subtitle() }}</p>
      }
      <div class="sf-intro__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: [`
    .sf-intro {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.4rem;
      max-width: 920px;
      margin: 0 auto;
      text-align: center;
    }

    .sf-intro--left {
      align-items: flex-start;
      margin: 0;
      text-align: left;
    }

    .sf-intro__eyebrow { margin: 0; }

    .sf-intro__subtitle {
      max-width: 800px;
      margin: 0;
      color: var(--sf-ink-soft);
      font-size: 1.02rem;
      line-height: 1.45;
    }

    .sf-intro__actions:empty { display: none; }

    .sf-intro__actions {
      display: flex;
      flex-direction: column;
      align-items: inherit;
      gap: 1.6rem;
      margin-top: 0.6rem;
    }
  `],
})
export class SfPageIntroComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly eyebrow = input<string>('');
  readonly align = input<'center' | 'left'>('center');
  readonly size = input<'lg' | 'md' | 'sm'>('lg');
}

