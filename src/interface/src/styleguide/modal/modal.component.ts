import {
  Component,
  HostBinding,
  Inject,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { NgIf, CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import {
  MatDialog,
  MatDialogModule,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { ButtonComponent, ButtonVariant } from '../button/button.component';

@Component({
  selector: 'sg-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    MatDialogModule,
    ButtonComponent,
    MatIconModule,
    MatDividerModule,
    MatMenuModule,
    MatProgressSpinnerModule, // make separate component for the progress thingy?
  ],
})
export class ModalComponent {
  /**
   * Show or hide the modal
   */
  @Input() showModal = false;
  /**
   * Text at the top of the dialog
   */
  @Input() title: string = 'Here is a title';
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
   * Whether or not to show the close button in the header
   */
  @Input() scrollableContent? = false;
  /**
   * Whether or not to show the tooltip button in the header
   */
  @Input() showClose? = true;
  /**
   * Whether or not to show the header at all
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

  @Output() canceledClose = new EventEmitter<any>();
  @Output() doneClose = new EventEmitter<any>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { name: string },
    public dialogRef: MatDialogRef<ModalComponent>,
    private dialog: MatDialog
  ) {}

  openDialog() {
    this.dialogRef = this.dialog.open(ModalComponent, {
      data: {
        title: this.title,
        showClose: true,
      },
    });
    this.dialogRef.afterClosed().subscribe((result) => {});
  }

  dialogClosed(event: any) {}

  handleCancel(): void {
    this.dialogRef.close();
    this.canceledClose.emit(); // should this just emit something different?
  }

  handleDone(): void {
    this.dialogRef.close();
    this.doneClose.emit();
  }

  @HostBinding('class.large')
  get isSmall() {
    return this.width === 'large';
  }
}
