import { FrontendConstants } from 'src/app/types';
import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-opacity-slider',
  templateUrl: './opacity-slider.component.html',
  styleUrls: ['./opacity-slider.component.scss'],
})
export class OpacitySliderComponent implements OnInit, OnChanges {
  @Input() opacity: number | null | undefined = FrontendConstants.MAP_DATA_LAYER_OPACITY;
  @Input() label: string | null = "";
  @Output() change = new EventEmitter<number>();

  opacityPercentage: number = FrontendConstants.MAP_DATA_LAYER_OPACITY * 100;

  constructor() {}

  ngOnInit(): void {}

  ngOnChanges(): void {
    if (this.opacity !== undefined && this.opacity !== null) {
      this.opacityPercentage = this.opacity * 100;
    }
  }

  onChange(value: number | null): void {
    if (value != null) this.change.emit(value / 100);
  }
}
