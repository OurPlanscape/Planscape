import { Component, Input } from '@angular/core';
import { LookupService } from '@services/lookup.service';
import {
  AsyncPipe,
  JsonPipe,
  KeyValuePipe,
  NgForOf,
  NgIf,
} from '@angular/common';
import { ButtonComponent } from '@styleguide';
import { TreatmentsService } from '@services/treatments.service';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';

@Component({
  selector: 'app-prescription-actions',
  standalone: true,
  imports: [NgIf, AsyncPipe, JsonPipe, ButtonComponent, NgForOf, KeyValuePipe],
  templateUrl: './prescription-actions.component.html',
  styleUrl: './prescription-actions.component.scss',
})
export class PrescriptionActionsComponent {
  @Input() treatmentPlanId!: number;
  @Input() projectAreaId!: number;
  prescriptions$ = this.lookupService.getPrescriptions();

  constructor(
    private lookupService: LookupService,
    private treatmentsService: TreatmentsService,
    private selectedStandsState: SelectedStandsState
  ) {}

  applyTreatments(action: string) {
    const stands = this.selectedStandsState.getSelectedStands();
    console.log(stands);
    return this.treatmentsService
      .setTreatments(this.treatmentPlanId, this.projectAreaId, action, stands)
      .subscribe();
  }
}
