import { Component, EventEmitter, Output } from '@angular/core';
import { NgIf, NgFor, NgClass, KeyValuePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { TreatmentTypeIconComponent } from '../../../styleguide/treatment-type-icon/treatment-type-icon.component';
import { SequenceIconComponent } from '../../../styleguide/sequence-icon/sequence-icon.component';
import { ModalComponent } from '../../../styleguide/modal/modal.component';
import { PRESCRIPTIONS } from '../prescriptions';

/**
 * Treatment Legend
 * A component that displays a set of treatments, along with an icon
 */
@Component({
  selector: 'app-treatment-legend',
  standalone: true,
  imports: [
    KeyValuePipe,
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
  readonly singlePrescriptions = PRESCRIPTIONS.SINGLE;
  readonly sequences: number[] = [...Array(8).keys()].map((n) => (n = n + 1));
  @Output() closeRequest = new EventEmitter();
  constructor() {}

  originalOrder = (): number => {
    return 0;
  };

  handleClose() {
    this.closeRequest.emit();
  }
}
