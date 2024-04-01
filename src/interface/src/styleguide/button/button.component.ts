import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'ghost' | 'text' | 'error' | 'positive';

@Component({
  selector: 'sg-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  /**
   * The variant used for the button.
   *
   */
  @Input() variant: ButtonVariant = 'ghost';

  @Output() click = new EventEmitter();
}
