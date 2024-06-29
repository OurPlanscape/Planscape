import { Component, Inject, Input, Output, EventEmitter } from '@angular/core';
import { NgIf, CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
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
  ],
})
export class ModalComponent {
  @Input() title: string = 'Modal Title';
  @Input() leadingIcon?: string | null;
  @Input() openDialog?: () => void;
  @Input() primaryButtonText: string = 'Done';
  @Input() secondaryButtonText: string = 'Cancel';
  @Input() showClose: boolean = false;

  @Output() canceledClose = new EventEmitter<any>();
  @Output() doneClose = new EventEmitter<any>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { name: string },
    public dialogRef: MatDialogRef<ModalComponent>
  ) {}

  handleCancel(): void {
    this.dialogRef.close(false);
    this.canceledClose.emit();
  }

  handleDone(): void {
    this.dialogRef.close(true);
    this.doneClose.emit();
  }
}
