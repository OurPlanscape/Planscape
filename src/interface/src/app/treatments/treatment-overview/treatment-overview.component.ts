import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';
import { TreatmentsState } from '../treatments.state';
import { TreatmentPlanTabsComponent } from '../treatment-plan-tabs/treatment-plan-tabs.component';
import { editState, DebounceInputComponent } from '@styleguide';
import { TreatmentPlan } from '@types';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-treatment-overview',
  standalone: true,
  imports: [
    AsyncPipe,
    TreatmentMapComponent,
    TreatmentPlanTabsComponent,
    MapBaseLayerComponent,
    DebounceInputComponent,
    NgIf,
  ],
  templateUrl: './treatment-overview.component.html',
  styleUrl: './treatment-overview.component.scss',
})
export class TreatmentOverviewComponent {
  nameFieldStatus$ = new BehaviorSubject<editState>('INITIAL');
  errorSavingName: string | null = null;

  constructor(private treatmentsState: TreatmentsState) {}

  currentPlan$ = this.treatmentsState.treatmentPlan$;

  handleNameChange(name: string) {
    if (name.length < 1) {
      return;
    }
    this.nameFieldStatus$.next('SAVING');
    const partialTreatmentPlan: Partial<TreatmentPlan> = {
      name: name,
    };
    this.treatmentsState.updateTreatmentPlan(partialTreatmentPlan).subscribe({
      next: (result) => {
        this.nameFieldStatus$.next('INITIAL');
      },
      error: (err) => {
        if (err.error.detail) {
          this.errorSavingName = err.error.detail;
        } else {
          this.errorSavingName = 'Could not update the name.';
        }
        this.nameFieldStatus$.next('EDIT');
      },
    });
  }
}
