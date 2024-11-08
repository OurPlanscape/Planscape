import { Component, Input } from '@angular/core';
import {
  PRESCRIPTIONS,
  PrescriptionSequenceAction,
  PrescriptionSingleAction,
} from '../prescriptions';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { TreatmentSummary } from '@types';

@Component({
  selector: 'app-printable-tx-footer',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf],
  templateUrl: './printable-tx-footer.component.html',
  styleUrl: './printable-tx-footer.component.scss',
})
export class PrintableTxFooterComponent {
  @Input() summary?: TreatmentSummary | null;

  //print element functions
  sequenceActions(action: string): string[] {
    let title = action as PrescriptionSequenceAction;
    if (title !== null) {
      return PRESCRIPTIONS.SEQUENCE[title].details;
    }
    return [];
  }

  prescriptionName(action: string, type: string): string | null {
    if (type === 'SINGLE') {
      let title = action as PrescriptionSingleAction;
      if (title !== null) {
        return PRESCRIPTIONS.SINGLE[title];
      }
    } else if (type === 'SEQUENCE') {
      let title = action as PrescriptionSequenceAction;
      if (title !== null) {
        return PRESCRIPTIONS.SEQUENCE[title].name;
      }
    }
    return '';
  }
}
