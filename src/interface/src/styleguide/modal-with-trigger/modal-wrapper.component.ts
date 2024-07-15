import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ModalComponent } from '../modal/modal.component';
import { ButtonVariant } from '../button/button.component';

@Component({
  selector: 'sg-modal-wrapper',
  template: ` <button (click)="openModal()">Open Modal</button> `,
})
export class ModalWrapperComponent {
  /**
   * Text at the top of the dialog
   */
  @Input() title: string = 'Default Title';
  /**
   * Show or hide the modal
   */
  @Input() showModal = false;
  /**
   * Set horizontal size of the modal
   */
  @Input() width: 'regular' | 'large' = 'regular';
  /**
   * Optional Material icon name at left of header
   */
  @Input() leadingIcon?: string | null;
  /**
   * Optional alternative text for the right-most bottom button
   */
  @Input() primaryButtonText?: string = 'Done';
  /**
   * Optional alternative style variant for the right-most bottom button
   */
  @Input() primaryButtonVariant: ButtonVariant = 'primary';
  /**
   * Show/hide left-most bottom button
   */
  @Input() hasSecondaryButton = true;
  /**
   * Optional alternative text for the left-most bottom button
   */
  @Input() secondaryButtonText?: string = 'Cancel';
  /**
   * Optional alternative style variant for the left-most bottom button
   */
  @Input() secondaryButtonVariant: ButtonVariant = 'ghost';
  /**
   * Whether or not the projected content has a scroll bar
   */
  @Input() scrollableContent? = false;
  /**
   * Whether or not to show the close button in the header
   */
  @Input() showClose? = true;
  /**
   * Whether or not to show the tooltip button in the header
   */
  @Input() showToolTip? = false;
  /**
   * Whether or not to show the header at all
   */
  @Input() hasHeader? = true;
  /**
   * Whether or not to show the footer at all
   */
  @Input() hasFooter? = true;
  /**
   * A potential list of progress items
   */
  @Input() progressItems?: any[];
  /**
   * Whether or not to use default padding for the projected content
   */
  @Input() padBody? = true;

  @Input() toolTipContent = 'Here is some tooltip content';
  @Output() openedEvent = new EventEmitter<any>();

  @Output() closedEvent = new EventEmitter<any>();

  constructor(public dialog: MatDialog) {}

  openModal() {
    const dialogRef = this.dialog.open(ModalComponent, {
      data: {
        title: this.title,
        showClose: this.showClose,
        hasFooter: this.hasFooter,
        hasHeader: this.hasHeader,
      },
    });
    this.openedEvent.emit();

    dialogRef.afterClosed().subscribe((result) => {
      this.closedEvent.emit();
    });
  }
}
