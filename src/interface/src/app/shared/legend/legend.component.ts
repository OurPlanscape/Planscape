import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-legend',
  templateUrl: './legend.component.html',
  styleUrls: ['./legend.component.scss']
})
export class LegendComponent {
  @Input() legend: Legend = { labels: [], colors: [] };
}

export type Legend = {
  labels: string[];
  colors: string[];
}
