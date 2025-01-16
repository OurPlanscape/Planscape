import { Component, Input } from '@angular/core';
import { KeyValuePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { TreatmentTypeIconComponent } from '../../../styleguide/treatment-type-icon/treatment-type-icon.component';
import { SequenceIconComponent } from '../../../styleguide/sequence-icon/sequence-icon.component';
import { ModalComponent } from '../../../styleguide/modal/modal.component';
import { PRESCRIPTIONS } from '../prescriptions';
import { MatDividerModule } from '@angular/material/divider';
import { MapConfigState } from '../treatment-map/map-config.state';

/**
 * Treatment Legend
 * A component that displays a set of treatments, along with an icon
 */
@Component({
  selector: 'app-treatment-legend',
  standalone: true,
  imports: [
    KeyValuePipe,
    MatDividerModule,
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
  readonly sequencePrescriptions = PRESCRIPTIONS.SEQUENCE;
  @Input() defaultExpanded = true;

  constructor(private mapConfigState: MapConfigState) {}

  originalOrder = (): number => {
    return 0;
  };

  handleClose() {
    this.mapConfigState.setTreatmentLegendVisible(false);
  }
}
