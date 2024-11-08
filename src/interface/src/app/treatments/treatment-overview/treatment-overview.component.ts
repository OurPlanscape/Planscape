import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';
import { TreatmentPlanTabsComponent } from '../treatment-plan-tabs/treatment-plan-tabs.component';
import {
  DebounceEditState,
  DebounceInputComponent,
  TreatmentStandsProgressBarComponent,
} from '@styleguide';
import { TreatmentPlan, TreatmentSummary } from '@types';
import { BehaviorSubject, map } from 'rxjs';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { TreatmentsState } from '../treatments.state';

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
  constructor(
    private treatmentsState: TreatmentsState,
    private treatedStandsState: TreatedStandsState
  ) {}
  nameFieldStatus$ = new BehaviorSubject<DebounceEditState>('INITIAL');
  treatmentPlan$ = this.treatmentsState.treatmentPlan$;
  savingStatus$ = new BehaviorSubject<boolean>(false);
  errorSavingName: string | null = null;
  summary$ = this.treatmentsState.summary$;
  projectAreas$ = this.summary$?.pipe(
    map((summary: TreatmentSummary | null) => summary?.project_areas)
  );

  totalStands$ = this.projectAreas$?.pipe(
    map(
      (areas) =>
        areas?.reduce((sum, area) => sum + area.total_stand_count, 0) ?? 0
    )
  );
  treatedStands$ = this.treatedStandsState.treatedStands$;

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
