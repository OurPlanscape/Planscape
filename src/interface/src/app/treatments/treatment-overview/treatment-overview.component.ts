import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentSummaryComponent } from '../treatment-summary/treatment-summary.component';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';
import { TreatmentsState } from '../treatments.state';
import { SidebarNameInputComponent } from '@styleguide';
@Component({
  selector: 'app-treatment-overview',
  standalone: true,
  imports: [
    AsyncPipe,
    TreatmentMapComponent,
    TreatmentSummaryComponent,
    MapBaseLayerComponent,
    SidebarNameInputComponent,
    NgIf,
  ],
  templateUrl: './treatment-overview.component.html',
  styleUrl: './treatment-overview.component.scss',
})
export class TreatmentOverviewComponent {
  treatmentPlan$ = this.treatmentsState.treatmentPlan$;
  savingName = false;
  errorSavingName: string | null = null;
  constructor(private treatmentsState: TreatmentsState) {}

  handleNameChange(name: string) {
    this.savingName = true;

    this.treatmentsState.updateTreatmentPlanName(name).subscribe({
      next: () => {
        //TODO: reload the name? the entire plan?
        this.savingName = false;
      },
      // TODO: set this via the component form instead?
      error: (err) => {
        if (err.error.detail) {
          this.errorSavingName = err.error.detail;
        } else {
          this.errorSavingName = 'Could not update the name.';
        }
        this.savingName = false;
      },
    });
  }
}
