import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatSliderModule } from '@angular/material/slider';

/**
 * Modal Info Box
 * A component to be used within the modal body to express various states
 */
@Component({
  selector: 'sg-opacity-slider',
  standalone: true,
  imports: [MatSliderModule, MatCardModule],
  templateUrl: './opacity-slider.component.html',
  styleUrl: './opacity-slider.component.scss',
})
export class OpacitySliderComponent {
  /**
   * Title
   */
  @Input() title = 'Layer opacity';

  /**
   * Opacity Limits
   */
  @Input() minValue = 0;
  @Input() maxValue = 100;
  @Input() step = 1;
  /**
   * Iniiial value
   */
  @Input() value = 50;
  @Output() valueChange = new EventEmitter<number>();
}
