import { Component, Input, OnChanges } from '@angular/core';
import { Legend } from 'src/app/types';

@Component({
  selector: 'app-legend',
  templateUrl: './legend.component.html',
  styleUrls: ['./legend.component.scss'],
})
export class LegendComponent implements OnChanges {
  @Input() legend?: Legend;

  gradient: string = '';

  ngOnChanges(): void {
    this.gradient = `linear-gradient(to right, ${this.legend?.colors?.join(
      ', '
    )})`;
  }
}
