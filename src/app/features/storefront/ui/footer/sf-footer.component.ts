import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SF_BRAND, SF_FOOTER_COLUMNS } from '../../storefront.config';
import { SfWordmarkComponent } from '../wordmark/sf-wordmark.component';

@Component({
  selector: 'sf-footer',
  standalone: true,
  imports: [RouterLink, SfWordmarkComponent],
  templateUrl: './sf-footer.component.html',
  styleUrl: './sf-footer.component.css'
})
export class SfFooterComponent {
  brand = SF_BRAND;
  footer = { description: 'Tác phẩm thủ công.',
  links: [{title: 'ClayArt',
  items: SF_FOOTER_COLUMNS[0].links},
  {title: 'Cửa hàng',
  items: SF_FOOTER_COLUMNS[1].links}],
  socials: [{name: 'Instagram', url: '#'},
  {name: 'Facebook', url: '#'}],
  copyrightYear: 2026 };
}


