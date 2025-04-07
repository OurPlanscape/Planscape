import { FrontendConstants } from 'src/app/types';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
} from '@angular/core';

@Component({
  selector: 'app-opacity-slider',
  templateUrl: './opacity-slider.component.html',
  styleUrls: ['./opacity-slider.component.scss'],
})
export class OpacitySliderComponent implements OnChanges {
  @Input() opacity: number | null | undefined =
    FrontendConstants.LEAFLET_MAP_DATA_LAYER_OPACITY;
  @Input() label: string | null = '';
  @Output() changeOpacity = new EventEmitter<number>();

  opacityPercentage: number =
    FrontendConstants.LEAFLET_MAP_DATA_LAYER_OPACITY * 100;

  ngOnChanges(): void {
    if (this.opacity !== undefined && this.opacity !== null) {
      this.opacityPercentage = this.opacity * 100;
    }
  }

  onChange(value: number | null): void {
    if (value != null) this.changeOpacity.emit(value / 100);
  }
}
