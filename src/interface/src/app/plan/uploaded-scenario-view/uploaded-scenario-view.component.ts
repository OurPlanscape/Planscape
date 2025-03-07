import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Scenario, Plan } from '@types';
import { LegacyPlanStateService } from '@services';
import { TreatmentsService } from '@services/treatments.service';
import { BehaviorSubject, take } from 'rxjs';
import { untilDestroyed, UntilDestroy } from '@ngneat/until-destroy';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SNACK_ERROR_CONFIG } from '@shared';
import { CreateTreatmentDialogComponent } from '../create-scenarios/create-treatment-dialog/create-treatment-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { AnalyticsService } from '@services/analytics.service';

@UntilDestroy()
@Component({
  selector: 'app-uploaded-scenario-view',
  templateUrl: './uploaded-scenario-view.component.html',
  styleUrl: './uploaded-scenario-view.component.scss',
})
export class UploadedScenarioViewComponent implements OnInit {
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private LegacyPlanStateService: LegacyPlanStateService,
    private treatmentsService: TreatmentsService,
    private matSnackBar: MatSnackBar,
    private dialog: MatDialog,
    private analyticsService: AnalyticsService
  ) {}

  @Input() scenario?: Scenario;
  plan$ = new BehaviorSubject<Plan | null>(null);
  creatingTreatment = false;

  ngOnInit() {
    if (this.scenario) {
      this.LegacyPlanStateService.planState$
        .pipe(untilDestroyed(this), take(1))
        .subscribe((planState) => {
          this.plan$.next(planState.all[planState.currentPlanId!]);
          this.LegacyPlanStateService.updateStateWithScenario(
            this.scenario?.id ?? null,
            this.scenario?.name ?? null
          );
          this.LegacyPlanStateService.updateStateWithShapes(
            this.scenario?.scenario_result?.result.features
          );
        });
    }
  }

  showTreatmentFooter() {
    return true;
  }

  goToTreatment(id: number) {
    this.router.navigate(['treatment', id], {
      relativeTo: this.route,
    });
  }

  openNewTreatmentDialog() {
    this.analyticsService.emitEvent(
      'new_treatment_plan',
      'uploaded_scenario_page',
      'New Treatment Plan'
    );
    this.dialog
      .open(CreateTreatmentDialogComponent)
      .afterClosed()
      .pipe(take(1))
      .subscribe((name) => {
        if (name) {
          this.createTreatmentPlan(name);
        }
      });
  }

  createTreatmentPlan(name: string) {
    this.creatingTreatment = true;
    if (!this.scenario) {
      return;
    }

    this.treatmentsService
      .createTreatmentPlan(Number(this.scenario?.id), name)
      .subscribe({
        next: (result) => {
          this.goToTreatment(result.id);
        },
        error: () => {
          this.creatingTreatment = false;
          this.matSnackBar.open(
            '[Error] Cannot create a new treatment plan',
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
        },
      });
  }
}
