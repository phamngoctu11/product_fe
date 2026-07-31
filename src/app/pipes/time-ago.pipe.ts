import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  standalone: true
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: any): string {
    if (!value) return 'Vừa xong';

    const time = this.parseTime(value);
    if (!Number.isFinite(time)) return 'Vừa xong';

    const now = Date.now();
    const diff = Math.max(0, Math.floor((now - time) / 1000));

    if (diff < 60) return 'Vừa xong';

    const minutes = Math.floor(diff / 60);
    if (minutes < 60) return `${minutes} phút trước`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} tháng trước`;

    return `${Math.floor(months / 12)} năm trước`;
  }

  private parseTime(value: any): number {
    if (typeof value === 'string' && this.isIsoWithoutTimezone(value)) {
      return new Date(`${value}Z`).getTime();
    }

    return new Date(value).getTime();
  }

  private isIsoWithoutTimezone(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value);
  }
}
