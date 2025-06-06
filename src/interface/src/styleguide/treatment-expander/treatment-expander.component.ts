import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  DecimalPipe,
  NgClass,
  NgFor,
  NgIf,
  PercentPipe,
} from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { TreatmentTypeIconComponent } from '../treatment-type-icon/treatment-type-icon.component';
import { SequenceIconComponent } from '../sequence-icon/sequence-icon.component';
import {
  PRESCRIPTIONS,
  PrescriptionSequenceAction,
  PrescriptionSingleAction,
  SequenceAttributes,
} from '../../app/treatments/prescriptions';
import { HighlighterDirective } from '../highlighter/highlighter.directive';

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
    DecimalPipe,
    PercentPipe,
    HighlighterDirective,
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
  /***
   * an event emitted when the expander is toggled
   */
  @Output() stateToggle = new EventEmitter<boolean>();

  openState = false;

  toggleState() {
    this.openState = !this.openState;
    this.stateToggle.emit(this.openState);
  }

  // If a title is explicity set, use that.
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

  get isSelected() {
    return this.selected;
  }

  //if the element is being rendered and searchstring exists,
  // we know that the treatment is in the search results
  get isSearchResult() {
    return this.searchString !== null && this.searchString !== '';
  }
}
