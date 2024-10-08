import { Component, Input } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { TreatmentTypeIconComponent } from '../treatment-type-icon/treatment-type-icon.component';
import { SequenceIconComponent } from '../sequence-icon/sequence-icon.component';
import { TreatmentProjectArea } from '@types';
import {
  PRESCRIPTIONS,
  PrescriptionSingleAction,
  PrescriptionSequenceAction,
} from 'src/app/treatments/prescriptions';
/**
 * Project Area Expander component
 * A component to be used in the Project Area panel to show project area details
 */
@Component({
  selector: 'sg-project-area-expander',
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
  templateUrl: './project-area-expander.component.html',
  styleUrl: './project-area-expander.component.scss',
})
export class ProjectAreaExpanderComponent {
  /**
   * Optional title text -- explicitly overrides the derived title
   */
  @Input() title: string | null = null;
  /**
   * Whether or not this is the selected expander
   */
  @Input() selected = false;

  openState = false;
  /**
   * A TreatmentProjectArea record, with an array of prescriptions
   */
  @Input() projectArea!: TreatmentProjectArea;

  toggleState() {
    this.openState = !this.openState;
  }

  // If a title is explicity set, use that.
  // Otherwise, determine title from either treatment type or sequence num
  titleText(action: string): string | null {
    //
    let title = action as PrescriptionSingleAction;
    if (title !== null) {
      return PRESCRIPTIONS.SINGLE[title];
    }
    return '';
  }

  //TODO: sequence number

  treatedStandCount(): number {
    return this.projectArea.prescriptions
      .map((record) => record.treated_stand_count)
      .reduce((acc, count) => acc + count, 0);
  }

  sequenceActions(action: string): string[] {
    let title = action as PrescriptionSequenceAction;
    if (title !== null) {
      return PRESCRIPTIONS.SEQUENCE[title];
    }
    return [];
  }

  get isSelected() {
    return this.selected;
  }
}
