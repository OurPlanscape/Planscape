import { Component, HostBinding, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export type ModalAlertVariant =
  | 'info'
  | 'error'
  | 'banner'
  | 'warning'
  | 'inProgress'
  | 'complete';

/**
 * Modal Info Box
 * A component to be used within the modal body to express various states
 */
@Component({
  selector: 'sg-modal-info',
  standalone: true,
  imports: [NgIf, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './modal-info.component.html',
  styleUrl: './modal-info.component.scss',
})
export class ModalInfoComponent {
  /**
   * The status
   */
  @Input() infoType: ModalAlertVariant = 'info';

  /**
   * The status
   */
  @Input() leadingIcon?: string | null;

  /**
   * Message
   */
  @Input() message?: string | null = '';

  @HostBinding('class.in-progress')
  get isInProgress() {
    return this.infoType === 'inProgress';
  }
  @HostBinding('class.info')
  get isInfo() {
    return this.infoType === 'info';
  }
  @HostBinding('class.banner')
  get isBanner() {
    return this.infoType === 'banner';
  }
  @HostBinding('class.error')
  get isError() {
    return this.infoType === 'error';
  }
  @HostBinding('class.warning')
  get isWarning() {
    return this.infoType === 'warning';
  }
  @HostBinding('class.complete')
  get isComplete() {
    return this.infoType === 'complete';
  }
}
