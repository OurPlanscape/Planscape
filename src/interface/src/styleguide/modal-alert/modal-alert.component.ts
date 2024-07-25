import { Component, HostBinding, Input } from '@angular/core';
import { NgIf, NgSwitch } from '@angular/common';

export type ModalAlertVariant = 'info' | 'error' | 'warning' | 'inProgress';

/**
 * Modal Alert Component
 * A component to be used within the modal component to show details
 */
@Component({
  selector: 'sg-modal-alert',
  standalone: true,
  imports: [NgIf, NgSwitch],
  templateUrl: './modal-alert.component.html',
  styleUrl: './modal-alert.component.scss',
})
export class ModalAlertComponent {
  /**
   * The status
   */
  @Input() type: ModalAlertVariant = 'info';
  /**
   * Message
   */
  @Input() message?: string | null = '';

  @HostBinding('class.in-progress')
  get isInProgress() {
    return this.type === 'inProgress';
  }
}
