import { Component, Input, EventEmitter, Output } from '@angular/core';
import { NgIf, NgFor, NgClass, KeyValuePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { TreatmentTypeIconComponent } from '../../../styleguide/treatment-type-icon/treatment-type-icon.component';
import { SequenceIconComponent } from '../../../styleguide/sequence-icon/sequence-icon.component';
import { ModalComponent } from '../../../styleguide/modal/modal.component';
import { PRESCRIPTIONS } from '../prescriptions';
import { MatDividerModule } from '@angular/material/divider';
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
  @Output() handleCloseLegend = new EventEmitter();
  constructor() {}

  originalOrder = (): number => {
    return 0;
  };

  handleClose() {
    this.handleCloseLegend.emit();
  }
}
