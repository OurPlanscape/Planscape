import { Component, HostBinding, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export type ModalDialogVariant = 'success' | 'error' | 'pending' | 'alert';

/**
 * Modal Info Box
 * A component to be used within the modal body to express various states
 */
@Component({
  selector: 'sg-modal-confirmation-dialog',
  standalone: true,
  imports: [NgIf, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './modal-confirmation-dialog.component.html',
  styleUrl: './modal-confirmation-dialog.component.scss',
})
export class ModalConfirmationDialogComponent {
  /**
   * The status
   */
  @Input() infoType: ModalDialogVariant = 'alert';

  /**
   * The status
   */
  @Input() dialogIcon?: string | null;
  /**
   * Headline
   */
  @Input() headline?: string | null = '';
  /**
   * Message
   */
  @Input() message?: string | null = '';
  readonly IconByVariant: Record<ModalDialogVariant, string | null> = {
    success: 'check_circle',
    error: 'error',
    pending: 'pending_actions',
    alert: null,
  };

  displayIcon() {
    if (!this.dialogIcon) {
      // if there isn't one specified, use the default
      return this.IconByVariant[this.infoType];
    }
    return this.dialogIcon;
  }

  @HostBinding('class.success')
  get isInfo() {
    return this.infoType === 'success';
  }
  @HostBinding('class.error')
  get isError() {
    return this.infoType === 'error';
  }
  @HostBinding('class.pending')
  get isWarning() {
    return this.infoType === 'pending';
  }
  @HostBinding('class.alert')
  get isComplete() {
    return this.infoType === 'alert';
  }
}
