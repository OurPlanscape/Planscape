import { Component, Inject, Input, Output, EventEmitter } from '@angular/core';
import { NgIf, CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import {
  MatDialog,
  MatDialogModule,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { ButtonComponent } from '../button/button.component';

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
  ],
})
export class ModalComponent {
  @Input() title: string = 'Huh ok';
  @Input() leadingIcon?: string | null;
  // @Input() openDialog?: () => void;
  @Input() primaryButtonText: string = 'Done';
  @Input() secondaryButtonText: string = 'Cancel';
  @Input() showClose: boolean = false;
  @Input() showModal = false;

  @Output() canceledClose = new EventEmitter<any>();
  @Output() doneClose = new EventEmitter<any>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { name: string },
    public dialogRef: MatDialogRef<ModalComponent>,
    private dialog: MatDialog
  ) {}

  openDialog() {
    const dialogRef = this.dialog.open(ModalComponent, {
      data: { title: this.title },
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.showModal = false;
    });

    this.showModal = true;
  }

  dialogClosed(event: any) {}

  handleCancel(): void {
    this.dialogRef.close(false);
    this.canceledClose.emit();
  }

  handleDone(): void {
    this.dialogRef.close(true);
    this.doneClose.emit();
  }
}

@Component({
  selector: 'sg-modal-wrapper',
  template: `<button (click)="openDialog()">Click for Modal</button> `,
})
export class ModalWrapperComponent {
  @Input() title = 'Some Title';
  @Input() showClose = true;
  @Input() showModal = false;

  constructor(private dialog: MatDialog) {}

  openDialog() {
    const dialogRef = this.dialog.open(ModalComponent, {
      data: { title: 'what about this' },
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.showModal = false;
    });

    this.showModal = true;
  }

  dialogClosed(event: any) {}
}
