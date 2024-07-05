import { Component, Inject, Input, Output, EventEmitter } from '@angular/core';
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
  @Input() title: string = 'Here is a title';
  @Input() width: string = 'medium'; // TODO: use types here
  @Input() leadingIcon?: string | null;
  @Input() primaryButtonText?: string = 'Done';
  @Input() primaryButtonVariant: ButtonVariant = 'primary';
  @Input() hasSecondaryButton = true;
  @Input() secondaryButtonText?: string = 'Cancel';
  @Input() secondaryButtonVariant: ButtonVariant = 'ghost';
  @Input() scrollableContent? = false;
  @Input() showClose? = true;
  @Input() showToolTip? = false;
  @Input() hasHeader? = true;
  @Input() hasFooter? = true;
  @Input() progressItems?: any[];

  @Input() toolTipContent = 'Here is some tooltip content';

  @Output() canceledClose = new EventEmitter<any>();
  @Output() doneClose = new EventEmitter<any>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { name: string },
    public dialogRef: MatDialogRef<ModalComponent>,
    private dialog: MatDialog
  ) {}

  openDialog() {
    this.dialogRef = this.dialog.open(ModalComponent, {});
    this.dialogRef.afterClosed().subscribe((result) => {});
  }

  dialogClosed(event: any) {}

  handleCancel(): void {
    this.canceledClose.emit(); // should this just emit something different?
  }

  handleDone(): void {
    this.doneClose.emit();
  }
}
