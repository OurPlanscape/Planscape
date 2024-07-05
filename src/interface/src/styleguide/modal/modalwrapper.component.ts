import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ModalComponent } from './modal.component';

@Component({
  selector: 'sg-modal-wrapper',
  template: `<button (click)="openDialog()">Click for Modal</button> `,
})
export class ModalWrapperComponent {
  constructor(private dialog: MatDialog) {}

  openDialog() {
    const dialogRef = this.dialog.open(ModalComponent, {
      data: { title: 'what about this' },
    });

    dialogRef.afterClosed().subscribe((result) => {});
  }

  dialogClosed(event: any) {}
}
