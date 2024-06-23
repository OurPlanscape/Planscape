import { Component, Input } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'sg-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
})
export class ModalComponent {
  error: any;
  @Input() openDialog?: void;

  constructor(
    // @Inject(MAT_DIALOG_DATA) private data: { someData: 'testData' },
    private dialogRef: MatDialogRef<ModalComponent>,
    private dialog: MatDialog
  ) {}

  openModal() {
    console.log('you want to open this modal?');
    this.dialog.open(ModalComponent);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
