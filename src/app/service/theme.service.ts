import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_KEY = 'app_custom_theme_color';
  private readonly DEFAULT_COLOR = '#f4f5f7';
  private readonly DEFAULT_PRIMARY = '#6366f1';

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    this.loadSavedTheme();
  }

  setThemeColor(color: string) {
    this.applyTheme(color);
    localStorage.setItem(this.THEME_KEY, color);
  }

  loadSavedTheme() {
    this.applyTheme(localStorage.getItem(this.THEME_KEY) || this.DEFAULT_COLOR);
  }

  resetTheme() {
    localStorage.removeItem(this.THEME_KEY);
    this.applyTheme(this.DEFAULT_COLOR);
  }

  getCurrentColor(): string {
    return localStorage.getItem(this.THEME_KEY) || this.DEFAULT_COLOR;
  }

  private applyTheme(color: string) {
    const root = this.document.documentElement;
    const isDark = this.isDarkColor(color);
    const primary = isDark ? this.DEFAULT_PRIMARY : this.getAccentColor(color);
    const primaryRgb = this.hexToRgb(primary);

    root.dataset['appTheme'] = isDark ? 'dark' : 'light';
    root.style.setProperty('--app-theme-color', isDark ? '#000000' : color);
    root.style.setProperty('--app-theme-primary', primary);
    root.style.setProperty('--app-theme-primary-rgb', primaryRgb);
    root.style.setProperty('--bs-primary', primary);
    root.style.setProperty('--bs-primary-rgb', primaryRgb);
    root.style.setProperty('--bs-link-color', primary);
    root.style.setProperty('--bs-link-hover-color', primary);
  }

  private getAccentColor(color: string): string {
    const normalized = color.toLowerCase();
    if (normalized === this.DEFAULT_COLOR || normalized === '#ffffff') {
      return this.DEFAULT_PRIMARY;
    }

    const rgb = this.hexToRgbTuple(color);
    if (!rgb) return this.DEFAULT_PRIMARY;

    const [r, g, b] = rgb;
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance < 0.35 ? color : this.darken(color, 38);
  }

  private isDarkColor(color: string): boolean {
    const rgb = this.hexToRgbTuple(color);
    if (!rgb) return false;

    const [r, g, b] = rgb;
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance < 0.25;
  }

  private darken(color: string, amount: number): string {
    const rgb = this.hexToRgbTuple(color);
    if (!rgb) return this.DEFAULT_PRIMARY;
    return `#${rgb.map((value) => Math.max(0, value - amount).toString(16).padStart(2, '0')).join('')}`;
  }

  private hexToRgb(color: string): string {
    const rgb = this.hexToRgbTuple(color);
    return rgb ? rgb.join(', ') : '13, 110, 253';
  }

  private hexToRgbTuple(color: string): [number, number, number] | null {
    const hex = color.replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ];
  }
}
