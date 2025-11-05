import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ModalComponent } from '@styleguide';
import { NamePillarModalComponent } from '../name-pillar-modal/name-pillar-modal.component';

@Component({
  selector: 'app-run-analysis-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  templateUrl: './run-analysis-modal.component.html',
  styleUrl: './run-analysis-modal.component.scss',
})
export class RunAnalysisModalComponent {
  readonly dialogRef = inject(MatDialogRef<NamePillarModalComponent>);

  cancel() {
    this.dialogRef.close(false);
  }

  runAnalysis() {
    this.dialogRef.close(true);
  }
}
