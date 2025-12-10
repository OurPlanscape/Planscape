import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface LegendEntry {
  value: number;
  label: string;
  color: string;
}

@Component({
  selector: 'app-mpat-legend',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mpat-legend.component.html',
  styleUrls: ['./mpat-legend.component.scss'],
})
export class MpatLegendComponent {
  @Input() title = 'Legend';
  @Input() entries: LegendEntry[] = [];
}
