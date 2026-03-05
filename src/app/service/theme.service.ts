import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'app_custom_theme_color';
  // Màu mặc định của trang web (thường là màu xám nhạt hoặc trắng)
  private readonly DEFAULT_COLOR = '#f4f5f7';

  constructor(@Inject(DOCUMENT) private document: Document) {
    // Tự động load màu đã lưu khi ứng dụng vừa chạy lên
    this.loadSavedTheme();
  }

  // Hàm đổi màu và lưu vào máy
  setThemeColor(color: string) {
    this.document.body.style.backgroundColor = color;
    localStorage.setItem(this.THEME_KEY, color);
  }

  // Hàm load màu từ máy
  loadSavedTheme() {
    const savedColor = localStorage.getItem(this.THEME_KEY);
    if (savedColor) {
      this.document.body.style.backgroundColor = savedColor;
    } else {
      this.document.body.style.backgroundColor = this.DEFAULT_COLOR;
    }
  }

  // Khôi phục mặc định
  resetTheme() {
    this.document.body.style.backgroundColor = this.DEFAULT_COLOR;
    localStorage.removeItem(this.THEME_KEY);
  }

  // Lấy màu hiện tại để hiển thị lên UI cài đặt
  getCurrentColor(): string {
    return localStorage.getItem(this.THEME_KEY) || this.DEFAULT_COLOR;
  }
}
