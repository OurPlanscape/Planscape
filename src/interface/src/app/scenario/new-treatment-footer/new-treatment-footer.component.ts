import { Component, Input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ButtonComponent } from '@styleguide';
import { CreateTreatmentDialogComponent } from '@scenario/create-treatment-dialog/create-treatment-dialog.component';
import { take } from 'rxjs';
import { SNACK_ERROR_CONFIG } from '@shared';
import { ActivatedRoute, Router } from '@angular/router';
import { TreatmentsService } from '@services/treatments.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AnalyticsService } from '@services/analytics.service';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-new-treatment-footer',
  standalone: true,
  imports: [MatProgressSpinnerModule, ButtonComponent, NgIf],
  templateUrl: './new-treatment-footer.component.html',
  styleUrl: './new-treatment-footer.component.scss',
})
export class NewTreatmentFooterComponent {
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private treatmentsService: TreatmentsService,
    private matSnackBar: MatSnackBar,
    private dialog: MatDialog,
    private analyticsService: AnalyticsService
  ) {}

  @Input() scenarioId!: number | undefined;

  creatingTreatment = false;

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

    this.treatmentsService
      .createTreatmentPlan(Number(this.scenarioId), name)
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
