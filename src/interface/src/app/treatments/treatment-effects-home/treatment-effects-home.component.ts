import { Component } from '@angular/core';
import { PlanState } from '@app/plan/plan.state';
import { OverlayLoaderComponent } from '@styleguide';
import { TreatmentsModule } from '../treatments.module';
import { AsyncPipe } from '@angular/common';
import { TreatmentPlansListComponent } from '../treatment-plans-list/treatment-plans-list.component';

@Component({
  selector: 'app-treatment-effects',
  standalone: true,
  imports: [AsyncPipe, OverlayLoaderComponent, TreatmentPlansListComponent, TreatmentsModule],
  templateUrl: './treatment-effects-home.component.html',
  styleUrl: './treatment-effects-home.component.scss'
})
export class TreatmentEffectsHomeComponent {

  currentPlan$ = this.planState.currentPlan$;

  loading = false;

  $navBarArea$ = 'ok';

  constructor(
    private planState: PlanState
  ) {}
}
