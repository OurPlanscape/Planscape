import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatSliderModule, MatSliderDragEvent } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
/**
 * Modal Info Box
 * A component to be used within the modal body to express various states
 */
@Component({
  selector: 'sg-opacity-slider',
  standalone: true,
  imports: [
    MatSliderModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
  ],
  templateUrl: './opacity-slider.component.html',
  styleUrl: './opacity-slider.component.scss',
})
export class OpacitySliderComponent {
  /**
   * Title
   */
  @Input() title = 'Layer opacity';

  /**
   * Lowest value setting of slider
   */
  @Input() minValue = 0;
  /**
   * Highest value setting for slider
   */
  @Input() maxValue = 100;
  /**
   * Increment of each value setting
   */
  @Input() step = 1;
  /**
   * Initial value
   */
  @Input() sliderValue = 50;
  /**
   * Bubbles up the live value of the slider
   */
  @Output() valueChange = new EventEmitter<number>();
  /**
   * Sends the number value when dragging is started
   */
  @Output() dragStart = new EventEmitter<number>();
  /**
   * Sends a single number value when dragging is ended
   */
  @Output() dragEnd = new EventEmitter<number>();

  onSliderChange(): void {
    this.valueChange.emit(this.sliderValue);
  }

  onDragStart(e: MatSliderDragEvent) {
    this.dragStart.emit(e.value);
  }

  onDragEnd(e: MatSliderDragEvent) {
    this.dragEnd.emit(e.value);
  }
}
