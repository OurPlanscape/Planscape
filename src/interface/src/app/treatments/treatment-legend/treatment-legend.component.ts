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
  selector: 'app-treatment-legend',
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
  templateUrl: './treatment-legend.component.html',
  styleUrl: './treatment-legend.component.scss',
})
export class TreatmentLegendComponent {
  constructor() {}
  //TODO: Originally thought we'd optionally let the consumer set these, but maybe we can remove Input()
  @Input() singleTreatments: PrescriptionSingleAction[] = Object.keys(
    PRESCRIPTIONS.SINGLE
  ) as PrescriptionSingleAction[];
  @Input() sequences: number[] = [...Array(8).keys()].map((n) => (n = n + 1));

  getSingleTreatmentLabel(tx_key: PrescriptionSingleAction): string {
    return PRESCRIPTIONS.SINGLE[tx_key];
  }
  getSequenceLabel(seq: number) {
    return `Sequence ${seq}`;
  }
}
