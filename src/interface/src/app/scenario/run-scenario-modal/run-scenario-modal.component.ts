import { Component, inject } from '@angular/core';
import { ModalComponent } from '@styleguide';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-run-scenario-modal',
  standalone: true,
  imports: [ModalComponent],
  templateUrl: './run-scenario-modal.component.html',
  styleUrl: './run-scenario-modal.component.scss',
})
export class RunScenarioModalComponent {
  readonly dialogRef = inject(MatDialogRef<RunScenarioModalComponent, boolean>);

  cancel(): void {
    this.dialogRef.close(false);
  }

  runScenario(): void {
    this.dialogRef.close(true);
  }
}
