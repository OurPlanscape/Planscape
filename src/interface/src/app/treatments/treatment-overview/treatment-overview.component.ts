import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';
import { TreatmentsState } from '../treatments.state';
import { TreatmentPlanTabsComponent } from '../treatment-plan-tabs/treatment-plan-tabs.component';
import {
  DebounceInputComponent,
  TreatmentStandsProgressBarComponent,
} from '@styleguide';
import { TreatmentPlan, TreatmentSummary } from '@types';
import { BehaviorSubject, map } from 'rxjs';

@Component({
  selector: 'app-treatment-overview',
  standalone: true,
  imports: [
    AsyncPipe,
    TreatmentMapComponent,
    TreatmentPlanTabsComponent,
    TreatmentStandsProgressBarComponent,
    MapBaseLayerComponent,
    DebounceInputComponent,
    NgIf,
  ],
  templateUrl: './treatment-overview.component.html',
  styleUrl: './treatment-overview.component.scss',
})
export class TreatmentOverviewComponent {
  constructor(private treatmentsState: TreatmentsState) {}

  treatmentPlan$ = this.treatmentsState.treatmentPlan$;
  savingStatus$ = new BehaviorSubject<boolean>(false);
  errorSavingName: string | null = null;
  summary$ = this.treatmentsState.summary$;
  projectAreas$ = this.summary$?.pipe(
    map((summary: TreatmentSummary | null) => summary?.project_areas)
  );

  totalTreatedStands() {
    return this.projectAreas$?.pipe(
      map((areas) =>
        areas?.reduce((sum, area) => {
          const prescriptionSum = area.prescriptions.reduce(
            (count, p) => count + p.treated_stand_count,
            0
          );
          return sum + prescriptionSum;
        }, 0)
      )
    );
  }

  totalStands() {
    return this.projectAreas$?.pipe(
      map(
        (areas) =>
          areas?.reduce((sum, area) => sum + area.total_stand_count, 0) ?? 0
      )
    );
  }

  handleNameChange(name: string) {
    if (name.length < 1) {
      return;
    }
    this.savingStatus$.next(true);
    const partialTreatmentPlan: Partial<TreatmentPlan> = {
      name: name,
    };
    this.treatmentsState.updateTreatmentPlan(partialTreatmentPlan).subscribe({
      next: (result) => {
        this.savingStatus$.next(false);
      },
      error: (err) => {
        if (err.error.detail) {
          this.errorSavingName = err.error.detail;
        } else {
          this.errorSavingName = 'Could not update the name.';
        }
        this.savingStatus$.next(false);
      },
    });
  }
}
