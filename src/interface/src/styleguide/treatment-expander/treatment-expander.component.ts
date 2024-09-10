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

export interface rxType {
  name: string;
  year: number;
}

/**
 * Expander component
 * A component to be used in the treatments panel to show treatment details
 * NOTE: this expects *either* a treatmentType OR a sequenceNumber to determine appearance
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
   * A treatment type (Optional)
   */
  @Input() treatmentType: PrescriptionSingleAction | null = null;
  /**
   * A treatment sequence number  (Optional)
   */
  @Input() sequenceNumber: number | null = null;
  /**
   * A number or ratio indicating stand count
   */
  @Input() standCount: string = '0';
  /**
   * Whether or not this is the selected expander
   */
  @Input() selected = false;
  /**
   * Total number of acres
   */
  @Input() totalAcres = 100;
  /**
   * A list of prescriptions {name: string, year: number}
   */
  @Input() rxDetails: rxType[] = [];
  openState = false;

  toggleState() {
    this.openState = !this.openState;
  }

  // If a title is explicity set, use that.
  // Otherwise, determine title from either treatment type or sequence num
  titleText(): string {
    if (this.title !== null) {
      return this.title;
    } else if (this.treatmentType !== null) {
      return USER_FACING_RX_STRING[this.treatmentType];
    } else if (this.sequenceNumber !== null) {
      return `Sequence ${this.sequenceNumber}`;
    }
    return 'None';
  }

  treatmentIconType(): PrescriptionSingleAction | null {
    if (this.treatmentType !== null) {
      return this.treatmentType;
    }
    return null;
  }

  get isSelected() {
    return this.selected;
  }
}
