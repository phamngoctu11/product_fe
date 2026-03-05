import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { ThemeService } from '../../service/theme.service'; // Đổi đường dẫn cho đúng dự án của bạn

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './settings-modal.html',
})
export class SettingsModalComponent implements OnInit {
  selectedColor: string = '#f4f5f7';

  // Cung cấp sẵn vài màu đẹp (Màu pastel, Dark mode...)
  presetColors = [
    '#f4f5f7', // Xám nhạt (Mặc định)
    '#ffffff', // Trắng tinh
    '#e3f2fd', // Xanh dương nhạt
    '#fce4ec', // Hồng phấn
    '#e8f5e9', // Xanh lá nhạt
    '#fff3e0', // Cam nhạt
    '#212529'  // Đen (Dark Mode cơ bản)
  ];

  constructor(
    public dialogRef: MatDialogRef<SettingsModalComponent>,
    private themeService: ThemeService
  ) {}

  ngOnInit() {
    // Lấy màu hiện tại gán vào picker
    this.selectedColor = this.themeService.getCurrentColor();
  }

  // Khi người dùng chọn màu mới
  applyColor(color: string) {
    this.selectedColor = color;
    this.themeService.setThemeColor(color);
  }

  // Bấm nút khôi phục
  resetColor() {
    this.selectedColor = '#f4f5f7';
    this.themeService.resetTheme();
  }

  close() {
    this.dialogRef.close();
  }
}
