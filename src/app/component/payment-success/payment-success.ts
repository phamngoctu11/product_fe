import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-success.html',
})
export class PaymentSuccessComponent implements OnInit {
  isSuccess: boolean = false;
  message: string = 'Đang xử lý kết quả giao dịch...';
  orderId: string = '';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    // Đọc các tham số (queryParams) mà MoMo gắn trên thanh URL khi gọi về Frontend
    this.route.queryParams.subscribe(params => {
      const resultCode = params['resultCode'];
      this.orderId = params['orderId'];

      if (resultCode === '0') {
        this.isSuccess = true;
        this.message = 'Thanh toán thành công! Đơn hàng của bạn đang được xử lý.';
      } else {
        this.isSuccess = false;
        // Lấy lý do lỗi từ MoMo (nếu có)
        this.message = params['message'] || 'Thanh toán thất bại hoặc đã bị hủy!';
      }
    });
  }

  goHome() {
    // Điều hướng về trang chủ
    this.router.navigate(['/']);
  }
}
