import { Component, Input } from '@angular/core';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { TreatmentTypeIconComponent } from '../../../styleguide/treatment-type-icon/treatment-type-icon.component';
import { SequenceIconComponent } from '../../../styleguide/sequence-icon/sequence-icon.component';
import { ModalComponent } from '../../../styleguide/modal/modal.component';
import { PrescriptionSingleAction, PRESCRIPTIONS } from '../prescriptions';

/**
 * Treatment Legend
 * A component that displays a set of treatments, along with an icon
 */
@Component({
  selector: 'app-treatments-legend',
  standalone: true,
  imports: [
    MatExpansionModule,
    MatIconModule,
    ModalComponent,
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
  constructor() {}

  openState = false;
  @Input() singleTreatments: PrescriptionSingleAction[] = [];
  @Input() sequences: number[] = [1, 2, 3, 4, 5, 6, 7, 8]; // TODO: make dynamic

  loadAvailableTreatments(): void {
    // TODO: read this from local types instead of lookups?
  }

  getSingleTreatmentLabel(tx_key: PrescriptionSingleAction): string {
    return PRESCRIPTIONS.SINGLE[tx_key];
  }
  getSequenceLabel(seq: number) {
    return `Sequence ${seq}`;
  }
}
