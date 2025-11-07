import { Component, HostBinding, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export type ModalDialogVariant = 'success' | 'error' | 'pending' | 'alert';

/**
 * A component that can be used within the modal body as a confirmation dialog.
 * This component _is not_ another modal, just the formatted body with corresponding icon.
 *
 * To use specific modals for this use cases, check `Dialogs`
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
   * The variant of the dialog
   */
  @Input() infoType: ModalDialogVariant = 'alert';
  /**
   * Icon to display, if not one of the defaults for this variant
   */
  @Input() dialogIcon?: string | null;
  /**
   * The content of the headline
   */
  @Input() headline?: string | null = '';
  /**
   * The message content to display
   */
  @Input() message?: string | null = '';
  readonly IconByVariant: Record<ModalDialogVariant, string | null> = {
    success: 'check_circle',
    error: 'error',
    pending: 'pending_actions',
    alert: null,
  };

  // if there an icon specified, use the default for the dialog variant
  displayIcon() {
    if (!this.dialogIcon) {
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
