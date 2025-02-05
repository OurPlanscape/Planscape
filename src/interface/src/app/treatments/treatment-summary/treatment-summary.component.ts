import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TreatmentSummaryDialogComponent } from '../treatment-summary-dialog/treatment-summary-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-treatment-summary',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './treatment-summary.component.html',
  styleUrl: './treatment-summary.component.scss',
})
export class TreatmentSummaryComponent {
  constructor(private dialog: MatDialog) {}

  openTreatmentSummaryDialog(event: Event): void {
    event.stopPropagation();
    this.dialog
      .open(TreatmentSummaryDialogComponent, {})
      .afterClosed()
      .subscribe((data) => {});
  }
}
