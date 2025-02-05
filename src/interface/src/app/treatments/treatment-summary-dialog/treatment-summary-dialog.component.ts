import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { descriptionsForAction, PRESCRIPTIONS } from '../prescriptions';
import { SequenceIconComponent, TreatmentTypeIconComponent } from '@styleguide';
import { MatIconModule } from '@angular/material/icon';
import { SummaryPrescription } from '@types';
import { Observable } from 'rxjs';

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
    DecimalPipe,
  ],
  templateUrl: './treatment-summary-dialog.component.html',
  styleUrl: './treatment-summary-dialog.component.scss',
})
export class TreatmentSummaryDialogComponent implements OnInit {
  constructor(
    private dialogRef: MatDialogRef<TreatmentSummaryDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      prescriptions: Observable<SummaryPrescription[]>;
    }
  ) {}

  prescriptions!: Observable<SummaryPrescription[]>;

  displayedColumns: string[] = ['action', 'area_acres', 'area_percent'];

  ngOnInit(): void {
    this.prescriptions = this.data.prescriptions;
  }

  getActionLabel(key: string): any {
    if (!key) {
      return 'No Treatment';
    }
    return descriptionsForAction(key).join('<br>');
  }

  isSequence(key: string) {
    return Object.keys(PRESCRIPTIONS.SEQUENCE).includes(key);
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
