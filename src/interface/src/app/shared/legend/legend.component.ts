import { Component, Input } from '@angular/core';
import { Legend } from 'src/app/types';

@Component({
  selector: 'app-legend',
  templateUrl: './legend.component.html',
  styleUrls: ['./legend.component.scss'],
})
export class LegendComponent {
  @Input() legend?: Legend;
  @Input() vertical?: boolean;
  @Input() hideTitles?: boolean;
  @Input() hideOutline?: boolean;
}
