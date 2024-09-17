import { Component, Input } from '@angular/core';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { TreatmentTypeIconComponent } from '../treatment-type-icon/treatment-type-icon.component';
import { SequenceIconComponent } from '../sequence-icon/sequence-icon.component';
import {
  PrescriptionSingleAction,
  USER_FACING_RX_STRING,
} from '../../app/treatments/prescriptions';

/**
 * Treatment Legend
 * A component that displays a set of treatments, along with an icon
 */
@Component({
  selector: 'sg-treatments-legend',
  standalone: true,
  imports: [
    MatExpansionModule,
    MatIconModule,
    NgClass,
    NgIf,
    NgFor,
    SequenceIconComponent,
    TreatmentTypeIconComponent,
  ],
  templateUrl: './treatments-legend.component.html',
  styleUrl: './treatments-legend.component.scss',
})
export class TreatmentsLegendComponent {
  openState = false;
  @Input() singleTreatments: PrescriptionSingleAction[] = [];
  @Input() sequences: number[] = [];

  loadAvailableTreatments(): void {
    //
  }

  getLabel(tx_key: PrescriptionSingleAction): string {
    return USER_FACING_RX_STRING[tx_key];
  }
}
