import { Component, Input } from '@angular/core';
import {
  PRESCRIPTIONS,
  PrescriptionSequenceAction,
  PrescriptionSingleAction,
  SequenceAttributes,
} from '../../app/treatments/prescriptions';
import { DecimalPipe, NgForOf, NgIf, PercentPipe } from '@angular/common';

import { TreatmentTypeIconComponent } from '../treatment-type-icon/treatment-type-icon.component';
import { SequenceIconComponent } from '../sequence-icon/sequence-icon.component';
import { HighlighterDirective } from '../highlighter/highlighter.directive';

@Component({
  selector: 'sg-treatment-prescription',
  standalone: true,
  imports: [
    NgIf,
    SequenceIconComponent,
    TreatmentTypeIconComponent,
    NgForOf,
    HighlighterDirective,
    PercentPipe,
    DecimalPipe,
  ],
  templateUrl: './treatment-prescription.component.html',
  styleUrl: './treatment-prescription.component.scss',
})
export class TreatmentPrescriptionComponent {
  /**
   * Optional title text -- explicitly overrides the derived title
   */
  @Input() title: string | null = null;
  /**
   * A treatment type
   */
  @Input() treatmentType: keyof typeof PRESCRIPTIONS | null = null;
  /**
   * A treatment action
   */
  @Input() action!: string;
  /**
   * A number or ratio indicating stand count
   */
  @Input() treatedStandCount?: number;
  /***
   * Area Acres
   */
  @Input() areaAcres?: number;
  /***
   * Stand Ids
   */
  @Input() standIds: number[] = [];

  /***
   * Whether this component is selected, for styling
   */
  @Input() selected = false;
  /***
   * Search string - a string to be highlighted if it appears
   */
  @Input() searchString: string | null = null;

  /**
   * Total of project area acres
   */
  @Input() projectAreaTotalAcres = 0;

  // If a title is explicitly set, use that.
  // Otherwise, determine title from either treatment type or sequence num
  singleRxTitleText(): string {
    if (this.title !== null) {
      return this.title;
    } else if (this.treatmentType === 'SINGLE') {
      return PRESCRIPTIONS.SINGLE[this.action as PrescriptionSingleAction];
    } else if (this.treatmentType === 'SEQUENCE') {
      return PRESCRIPTIONS.SEQUENCE[this.action as PrescriptionSequenceAction]
        .map((d) => d.description)
        .join(' ');
    }
    return 'No Treatment';
  }

  sequenceTitles(): SequenceAttributes[] {
    return PRESCRIPTIONS.SEQUENCE[this.action as PrescriptionSequenceAction];
  }

  treatmentIconType(): PrescriptionSingleAction | null {
    if (this.action !== null) {
      return this.action as PrescriptionSingleAction;
    }
    return null;
  }
}
