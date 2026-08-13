import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-info-page-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './info-page-shell.component.html',
})
export class InfoPageShellComponent {
  @Input({ required: true }) category = '';
  @Input({ required: true }) title = '';
  @Input({ required: true }) description = '';
  @Input() icon = 'bi-info-circle';

  readonly navigation = [
    { label: 'Hướng dẫn mua hàng', route: '/store/help/shopping-guide', icon: 'bi-bag-check' },
    { label: 'Kiểm tra đơn hàng', route: '/store/help/order-tracking', icon: 'bi-box-seam' },
    { label: 'Phương thức thanh toán', route: '/store/help/payment-methods', icon: 'bi-credit-card' },
    { label: 'Gửi yêu cầu hỗ trợ', route: '/store/help/contact-support', icon: 'bi-headset' },
    { label: 'Chính sách giao hàng', route: '/store/policies/shipping', icon: 'bi-truck' },
    { label: 'Đổi trả và hoàn tiền', route: '/store/policies/returns-refunds', icon: 'bi-arrow-repeat' },
    { label: 'Bảo hành sản phẩm', route: '/store/policies/warranty', icon: 'bi-shield-check' },
    { label: 'Bảo mật thông tin', route: '/store/policies/privacy', icon: 'bi-lock' },
  ];
}
