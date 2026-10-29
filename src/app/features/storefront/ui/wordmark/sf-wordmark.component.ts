import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SF_BRAND } from '../../storefront.config';

/**
 * Chữ thương hiệu kiểu serif cao, hẹp (giống logo "IMPERFECTO").
 * - size="sm": logo trên header
 * - size="xl": chữ khổng lồ tràn chiều ngang ở footer
 */
@Component({
  selector: 'sf-wordmark',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="'sf-wordmark sf-wordmark--' + size()">{{ text() }}</span>`,
  styles: [`
    :host { display: inline-block; line-height: 0; }
    :host(.sf-wordmark-host--fluid) { display: block; width: 100%; }

    .sf-wordmark {
      display: inline-block;
      font-family: var(--sf-font-display);
      font-variation-settings: 'opsz' 100;
      font-weight: 400;
      line-height: 0.9;
      letter-spacing: -0.02em;
      color: var(--sf-ink);
      text-transform: uppercase;
      white-space: nowrap;
    }

    .sf-wordmark--sm { font-size: 1.6rem; letter-spacing: -0.01em; }
    .sf-wordmark--md { font-size: clamp(2.4rem, 5vw, 3.6rem); }
    .sf-wordmark--lg { font-size: clamp(4rem, 12vw, 10rem); }
    .sf-wordmark--xl {
      display: block;
      width: 100%;
      font-size: 23.5vw;
      line-height: 0.78;
      letter-spacing: -0.035em;
      text-align: center;
    }
  `],
})
export class SfWordmarkComponent {
  readonly text = input(SF_BRAND.wordmark);
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('sm');
}

