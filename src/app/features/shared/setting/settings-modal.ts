import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { ThemeService } from '../../../service/theme.service'; // Đổi đường dẫn cho đúng dự án của bạn

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './settings-modal.html',
  styleUrl: './settings-modal.css',
})
export class SettingsModalComponent implements OnInit {
  selectedColor = '#25211b';

  presetColors = [
    { color: '#25211b', label: 'ClayArt (mặc định)' },
    { color: '#383127', label: 'Nâu đất' },
    { color: '#17140f', label: 'Đen ấm' },
    { color: '#fcf7ec', label: 'Kem sáng' },
    { color: '#e9e1d3', label: 'Cát nhạt' },
    { color: '#e3f2fd', label: 'Xanh nhạt' },
    { color: '#fce4ec', label: 'Hồng nhạt' },
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
    this.selectedColor = '#25211b';
    this.themeService.resetTheme();
  }

  close() {
    this.dialogRef.close();
  }
}
