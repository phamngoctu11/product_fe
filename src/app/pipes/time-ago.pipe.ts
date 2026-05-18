import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  standalone: true // Khai báo standalone để dễ dàng import
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: any): string {
    if (!value) return 'Vừa xong';

    const time = new Date(value).getTime();
    const now = new Date().getTime();
    const diff = Math.floor((now - time) / 1000); // Tính ra số giây chênh lệch

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
}
