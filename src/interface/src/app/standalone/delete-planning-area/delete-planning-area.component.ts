import { Component, inject } from '@angular/core';
import { ModalComponent } from '../../../styleguide/modal/modal.component';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

@Component({
  selector: 'app-delete-planning-area',
  standalone: true,
  imports: [ModalComponent, MatDialogModule],
  templateUrl: './delete-planning-area.component.html',
  styleUrl: './delete-planning-area.component.scss',
})
export class DeletePlanningAreaComponent {
  readonly dialogRef = inject(MatDialogRef<DeletePlanningAreaComponent>);
  readonly data = inject<{ name: string }>(MAT_DIALOG_DATA);

  clickedClose(event: MouseEvent) {
    this.dialogRef.close();
  }

  clickedPrimary(event: MouseEvent) {
    this.dialogRef.close(true);
  }
}
