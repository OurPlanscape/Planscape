import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { descriptionsForAction, PRESCRIPTIONS } from '../prescriptions';
import { SequenceIconComponent, TreatmentTypeIconComponent } from '@styleguide';
import { MatIconModule } from '@angular/material/icon';
import { TreatmentsState } from '../treatments.state';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { MapConfigState } from '../treatment-map/map-config.state';
import { map } from 'rxjs';

@Component({
  selector: 'app-treatment-summary-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    TreatmentTypeIconComponent,
    SequenceIconComponent,
    MatIconModule,
  ],
  providers: [TreatmentsState, TreatedStandsState, MapConfigState],
  templateUrl: './treatment-summary-dialog.component.html',
  styleUrl: './treatment-summary-dialog.component.scss',
})
export class TreatmentSummaryDialogComponent {
  prescriptions$ = this.treatmentStateService.summary$.pipe(
    map((summary) => summary?.prescriptions)
  );
  displayedColumns: string[] = ['action', 'area_acres', 'area_percent'];
  constructor(
    private dialogRef: MatDialogRef<TreatmentSummaryDialogComponent>,
    private treatmentStateService: TreatmentsState
  ) {}

  getActionLabel(key: string): any {
    if (!key) {
      return 'No Treatment';
    }
    return descriptionsForAction(key);
  }

  isSequence(key: string) {
    return Object.keys(PRESCRIPTIONS.SEQUENCE).includes(key);
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
