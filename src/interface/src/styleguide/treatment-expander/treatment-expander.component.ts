import { Component, Input } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { TreatmentTypeIconComponent } from '../treatment-type-icon/treatment-type-icon.component';
import { SequenceIconComponent } from '../sequence-icon/sequence-icon.component';
import {
  PRESCRIPTIONS,
  PrescriptionSequenceAction,
  PrescriptionSingleAction,
} from '../../app/treatments/prescriptions';

/**
 * Expander component
 * A component to be used in the treatments panel to show treatment details
 */
@Component({
  selector: 'sg-treatment-expander',
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
  templateUrl: './treatment-expander.component.html',
  styleUrl: './treatment-expander.component.scss',
})
export class TreatmentExpanderComponent {
  /**
   * Optional title text -- explicitly overrides the derived title
   */
  @Input() title: string | null = null;
  /**
   * A treatment type
   */
  @Input() treatmentType: string | null = null;
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
  /**
   * Total number of acres
   */
  @Input() totalAcres = 100;
  /***
   * Area Acres
   */
  @Input() selected = false;
  openState = false;

  toggleState() {
    this.openState = !this.openState;
  }

  // If a title is explicity set, use that.
  // Otherwise, determine title from either treatment type or sequence num
  titleText(): string {
    if (this.title !== null) {
      return this.title;
    } else if (this.treatmentType === 'SINGLE') {
      return PRESCRIPTIONS.SINGLE[this.action as PrescriptionSingleAction];
    } else if (this.treatmentType === 'SEQUENCE') {
      return PRESCRIPTIONS.SEQUENCE[this.action as PrescriptionSequenceAction]
        .name;
    }
    return 'No Treatment';
  }

  sequenceDetails(): string[] {
    if (this.treatmentType === 'SEQUENCE') {
      return PRESCRIPTIONS.SEQUENCE[this.action as PrescriptionSequenceAction]
        .details;
    }
    return [];
  }

  treatmentIconType(): PrescriptionSingleAction | null {
    if (this.action !== null) {
      return this.action as PrescriptionSingleAction;
    }
    return null;
  }

  totalStands(): number {
    return this.standIds.length;
  }

  get isSelected() {
    return this.selected;
  }
}
