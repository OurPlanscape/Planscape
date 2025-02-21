import { Component } from '@angular/core';
import { AsyncPipe, DecimalPipe, JsonPipe, NgIf } from '@angular/common';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';
import { TreatmentPlanTabsComponent } from '../treatment-plan-tabs/treatment-plan-tabs.component';
import { DebounceEditState, DebounceInputComponent } from '@styleguide';
import { TreatmentPlan, TreatmentSummary } from '@types';
import { BehaviorSubject, map } from 'rxjs';
import { TreatmentsState } from '../treatments.state';
import { AcresTreatedComponent } from '../acres-treated/acres-treated.component';
import { canEditTreatmentPlan } from 'src/app/plan/permissions';
import { TreatmentSummaryButtonComponent } from '../treatment-summary-button/treatment-summary-button.component';
import { ButtonComponent } from '@styleguide';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSidenavModule } from '@angular/material/sidenav';
import { TreatmentPlanNotesComponent } from '../treatment-plan-notes/treatment-plan-notes.component';

@Component({
  selector: 'app-treatment-overview',
  standalone: true,
  imports: [
    AsyncPipe,
    TreatmentMapComponent,
    TreatmentPlanNotesComponent,
    MatCheckboxModule,
    MatSidenavModule,
    TreatmentPlanTabsComponent,
    ButtonComponent,
    MapBaseLayerComponent,
    DebounceInputComponent,
    NgIf,
    JsonPipe,
    DecimalPipe,
    AcresTreatedComponent,
    TreatmentSummaryButtonComponent,
  ],
  templateUrl: './treatment-overview.component.html',
  styleUrl: './treatment-overview.component.scss',
})
export class TreatmentOverviewComponent {
  constructor(private treatmentsState: TreatmentsState) {}

  nameFieldStatus$ = new BehaviorSubject<DebounceEditState>('INITIAL');
  showNotes = false;
  errorSavingName: string | null = null;
  summary$ = this.treatmentsState.summary$;
  projectAreas$ = this.summary$?.pipe(
    map((summary: TreatmentSummary | null) => summary?.project_areas)
  );

  currentPlan$ = this.treatmentsState.treatmentPlan$;

  disableInput$ = this.treatmentsState.planningArea$.pipe(
    map((plan) => {
      return !canEditTreatmentPlan(plan);
    })
  );

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

  closeNotesDrawer(): void {
    this.showNotes = false;
  }

  openNotesDrawer(): void {
    this.showNotes = true;
  }
}
