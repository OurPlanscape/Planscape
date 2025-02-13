import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TreatmentSummaryDialogComponent } from '../treatment-summary-dialog/treatment-summary-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { TreatmentsState } from '../treatments.state';
import { map } from 'rxjs';
import { ButtonComponent } from '@styleguide';

@Component({
  selector: 'app-treatment-summary',
  standalone: true,
  imports: [MatIconModule, ButtonComponent],
  templateUrl: './treatment-summary.component.html',
  styleUrl: './treatment-summary.component.scss',
})
export class TreatmentSummaryComponent {
  constructor(
    private dialog: MatDialog,
    private treatmentState: TreatmentsState
  ) {}

  prescriptions$ = this.treatmentState.summary$.pipe(
    map((summary) => summary?.prescriptions)
  );

  openTreatmentSummaryDialog(event: Event): void {
    event.stopPropagation();
    this.dialog
      .open(TreatmentSummaryDialogComponent, {
        data: {
          prescriptions: this.prescriptions$,
        },
      })
      .afterClosed()
      .subscribe((data) => {});
  }
}
