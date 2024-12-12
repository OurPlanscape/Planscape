import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import { OpacitySliderComponent } from 'src/styleguide';

@Component({
  standalone: true,
  template:
    '<sg-opacity-slider class="opacity-slider" title="Project area opacity" (valueChange)="handleOpacityChange($event)"></sg-opacity-slider>',
  styleUrls: ['./opacity-control.component.scss'],
  imports: [CommonModule, OpacitySliderComponent],
  encapsulation: ViewEncapsulation.None,
})
export class OpacityControlTemplateComponent {
  /**
   * Bubbles up the live value of the slider
   */
  @Output() valueChange = new EventEmitter<number>();

  handleOpacityChange(opacity: number) {
    this.valueChange.emit(opacity);
  }
}
