import { Component } from '@angular/core';
import { ModalComponent } from '../../../styleguide/modal/modal.component';
import { PrescriptionAction, PRESCRIPTIONS } from '../prescriptions';
import { AsyncPipe, KeyValuePipe, NgForOf, NgIf } from '@angular/common';
import { KeyPipe } from '../../standalone/key.pipe';
import { MatRadioModule } from '@angular/material/radio';
import { MatLegacyOptionModule } from '@angular/material/legacy-core';
import { MatLegacySelectModule } from '@angular/material/legacy-select';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatLegacyFormFieldModule } from '@angular/material/legacy-form-field';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatmentsState } from '../treatments.state';

@Component({
  selector: 'app-apply-treatment',
  standalone: true,
  imports: [
    ModalComponent,
    KeyValuePipe,
    NgForOf,
    KeyPipe,
    MatRadioModule,
    MatLegacyOptionModule,
    MatLegacySelectModule,
    ReactiveFormsModule,
    MatLegacyFormFieldModule,
    AsyncPipe,
    NgIf,
  ],
  templateUrl: './apply-treatment.component.html',
  styleUrl: './apply-treatment.component.scss',
})
export class ApplyTreatmentComponent {
  projectArea$ = this.treatmentsState.activeProjectArea$;
  hasSelectedStands$ = this.selectedStandsState.hasSelectedStands$;

  readonly sequenceTypes: Record<keyof typeof PRESCRIPTIONS, string> = {
    SINGLE: 'Single',
    SEQUENCE: 'Sequence',
  };
  prescriptionForm = new FormGroup({
    sequenceType: new FormControl<keyof typeof PRESCRIPTIONS>(
      'SINGLE',
      Validators.required
    ),
    prescriptionAction: new FormControl<PrescriptionAction | null>(
      null,
      Validators.required
    ),
  });

  constructor(
    public selectedStandsState: SelectedStandsState,
    public treatmentsState: TreatmentsState
  ) {}

  readonly prescriptions = PRESCRIPTIONS;

  cancel(): void {
    this.treatmentsState.setShowApplyTreatmentsDialog(false);
  }

  apply(): void {
    const action = this.prescriptionForm.get('prescriptionAction')?.value;
    if (action) {
      this.applyTreatments(action);
    }
    this.treatmentsState.setShowApplyTreatmentsDialog(false);
  }

  // sorting function to ensure that the keyvalue pipe lists objects in their original order
  originalOrder = (): number => {
    return 0; // Keep the original insertion order
  };

  resetPrescription() {
    this.prescriptionForm
      .get('prescriptionAction')
      ?.reset(null, { emitEvent: false });
  }

  get selectedSequenceType(): keyof typeof PRESCRIPTIONS {
    return this.prescriptionForm.get('sequenceType')?.value || 'SINGLE';
  }

  get selectedPrescription() {
    return this.prescriptionForm.get('prescriptionAction')?.value;
  }

  private applyTreatments(action: PrescriptionAction) {
    const stands = this.selectedStandsState.getSelectedStands();
    this.selectedStandsState.clearStands();
    return this.treatmentsState.updateTreatedStands(action, stands).subscribe();
  }

  removeTreatments() {
    const stands = this.selectedStandsState.getSelectedStands();
    this.selectedStandsState.clearStands();
    this.treatmentsState.removeTreatments(stands).subscribe();
  }
}
