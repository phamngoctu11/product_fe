import { DecimalPipe } from '@angular/common';
import { Component, Input } from '@angular/core';

export type MetricTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './metric-card.component.html',
  styleUrl: './metric-card.component.css',
})
export class MetricCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value = 0;
  @Input() hint = '';
  @Input() icon = '';
  @Input() suffix = '';
  @Input() digits = '1.0-0';
  @Input() tone: MetricTone = 'neutral';
}
