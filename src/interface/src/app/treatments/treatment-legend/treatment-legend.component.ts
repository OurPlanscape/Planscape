import { Component, Input } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { TreatmentTypeIconComponent } from '../../../styleguide/treatment-type-icon/treatment-type-icon.component';
import { SequenceIconComponent } from '../../../styleguide/sequence-icon/sequence-icon.component';
import { ModalComponent } from '../../../styleguide/modal/modal.component';
import { PrescriptionAction, PRESCRIPTIONS } from '../prescriptions';
import { MatDividerModule } from '@angular/material/divider';
import { MapConfigState } from '../../maplibre-map/map-config.state';

/**
 * Treatment Legend
 * A component that displays a set of treatments, along with an icon
 */
@Component({
  selector: 'app-treatment-legend',
  standalone: true,
  imports: [
    MatDividerModule,
    MatExpansionModule,
    MatIconModule,
    ModalComponent,
    NgIf,
    NgFor,
    SequenceIconComponent,
    TreatmentTypeIconComponent,
  ],
  templateUrl: './treatment-legend.component.html',
  styleUrl: './treatment-legend.component.scss',
})
export class TreatmentLegendComponent {
  readonly singleRxTypes: { type: PrescriptionAction; value: string }[] =
    Object.entries(PRESCRIPTIONS.SINGLE).map(([key, value]) => ({
      type: key as PrescriptionAction,
      value,
    }));
  readonly sequenceRxTypes = Object.entries(PRESCRIPTIONS.SEQUENCE).map(
    ([key, value]) => ({
      type: key as PrescriptionAction,
      value,
    })
  );

  @Input() defaultExpanded = true;
  @Input() appliedTreatments: PrescriptionAction[] | null = null;

  constructor(private mapConfigState: MapConfigState) {}

  originalOrder = (): number => {
    return 0;
  };

  handleClose() {
    this.mapConfigState.setTreatmentLegendVisible(false);
  }

  //this is meant to keep compatibility for when we want to show all treatments,
  // so we only filter when the array is not null
  inAppliedTreatments(pa: PrescriptionAction) {
    // if the appliedTreatments list is null, return true
    if (!this.appliedTreatments) {
      return true;
    }
    //otherwise check if the item is in the list first
    if (this.appliedTreatments.includes(pa)) {
      return true;
    }
    return false;
  }

  hasSingleTreatments() {
    if (!this.appliedTreatments) {
      return true;
    }
    return this.appliedTreatments.some((dt) =>
      this.singleRxTypes.map((rx) => rx.type).includes(dt)
    );
  }

  hasSequenceTreatments() {
    if (!this.appliedTreatments) {
      return true;
    }
    return this.appliedTreatments.some((dt) =>
      this.sequenceRxTypes.map((rx) => rx.type).includes(dt)
    );
  }
}
