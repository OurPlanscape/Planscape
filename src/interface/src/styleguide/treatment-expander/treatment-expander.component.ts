import { Component, Input } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { TreatmentTypeIconComponent } from '../treatment-type-icon/treatment-type-icon.component';
import { SequenceIconComponent } from '../sequence-icon/sequence-icon.component';
import {
  PrescriptionSingleAction,
  PRESCRIPTIONS,
  PrescriptionSequenceAction,
} from '../../app/treatments/prescriptions';

export interface rxType {
  name: string;
  year: number;
}

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
  // we are actually given...
  // action
  // area_acres
  // treated_stand_count
  // stand_ids
  // type

  /**
   * Optional title text -- explicitly overrides the derived title
   */
  @Input() title: string | null = null;
  /**
   * A treatment type
   */
  @Input() treatmentType!: string;
  /**
   * A treatment action
   */
  @Input() action?: string;
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
  /**
   * A list of prescriptions {name: string, year: number}
   */
  @Input() rxDetails?: rxType[] = [];
  /**
   * Whether or not this is the selected expander
   */
  @Input() selected = false;
  openState = false;

  toggleState() {
    this.openState = !this.openState;
  }

  sequenceDetails(): string[] {
    if (this.treatmentType === 'SEQUENCE') {
      const attributes =
        PRESCRIPTIONS.SEQUENCE[this.action as PrescriptionSequenceAction];
      return attributes.details;
    } else return [];
  }

  // If a title is explicity set, use that.
  // Otherwise, determine title from either treatment type or sequence num
  titleText(): string {
    if (this.title !== null) {
      return this.title;
    } else if (this.treatmentType === 'SINGLE') {
      const action: PrescriptionSingleAction = this
        .action as PrescriptionSingleAction;
      return PRESCRIPTIONS.SINGLE[action];
    } else if (this.treatmentType === 'SEQUENCE') {
      const rxDetails =
        PRESCRIPTIONS.SEQUENCE[this.action as PrescriptionSequenceAction];
      return rxDetails.name;
    }
    return 'No Treatment';
  }

  treatmentIconType(): PrescriptionSingleAction | null {
    // we only call this for single treatments
    // try to coerce the treatmentType into a PrescriptionSingleAction...
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
