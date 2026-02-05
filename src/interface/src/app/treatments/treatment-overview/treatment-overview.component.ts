import { Component } from '@angular/core';
import { AsyncPipe, DecimalPipe, NgIf } from '@angular/common';
import { TreatmentMapComponent } from '@app/treatments/treatment-map/treatment-map.component';
import { TreatmentPlanTabsComponent } from '@app/treatments/treatment-plan-tabs/treatment-plan-tabs.component';
import {
  ButtonComponent,
  DebounceEditState,
  DebounceInputComponent,
} from '@styleguide';
import { TreatmentPlan } from '@types';
import { BehaviorSubject, map } from 'rxjs';
import { TreatmentsState } from '@app/treatments/treatments.state';
import { AcresTreatedComponent } from '@app/treatments/acres-treated/acres-treated.component';
import { canEditTreatmentPlan } from '@app/plan/permissions';
import { TreatmentSummaryButtonComponent } from '@app/treatments/treatment-summary-button/treatment-summary-button.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TreatmentPlanNotesComponent } from '@app/treatments/treatment-plan-notes/treatment-plan-notes.component';
import { FeaturesModule } from '@app/features/features.module';
import { PlanState } from '@app/plan/plan.state';

@Component({
  selector: 'app-treatment-overview',
  standalone: true,
  imports: [
    AsyncPipe,
    TreatmentMapComponent,
    TreatmentPlanNotesComponent,
    MatCheckboxModule,
    TreatmentPlanTabsComponent,
    ButtonComponent,
    DebounceInputComponent,
    NgIf,
    FeaturesModule,

    DecimalPipe,
    AcresTreatedComponent,
    TreatmentSummaryButtonComponent,
  ],
  templateUrl: './treatment-overview.component.html',
  styleUrl: './treatment-overview.component.scss',
})
export class TreatmentOverviewComponent {
  constructor(
    private treatmentsState: TreatmentsState,
    private planState: PlanState
  ) {}

  nameFieldStatus$ = new BehaviorSubject<DebounceEditState>('INITIAL');
  errorSavingName: string | null = null;
  summary$ = this.treatmentsState.summary$;
  showNotesOverlay = false;
  currentPlan$ = this.treatmentsState.treatmentPlan$;
  disableInput$ = this.planState.currentPlan$.pipe(
    map((plan) => {
      return plan ? !canEditTreatmentPlan(plan) : false;
    })
  );

  closeNotesOverlay() {
    this.showNotesOverlay = false;
  }

  openNotesOverlay() {
    this.showNotesOverlay = true;
  }

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
