import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TreatmentsService } from '@services/treatments.service';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { Plan, TreatmentPlan, TreatmentStatus } from '@types';
import {
  canCloneTreatmentPlan,
  canDeleteTreatmentPlan,
} from '../../permissions';
import { DeleteDialogComponent } from 'src/app/standalone/delete-dialog/delete-dialog.component';
import { interval, take } from 'rxjs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { POLLING_INTERVAL } from '../../plan-helpers';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-treatments-tab',
  templateUrl: './treatments-tab.component.html',
  styleUrl: './treatments-tab.component.scss',
})
export class TreatmentsTabComponent implements OnInit {
  @Input() scenarioId!: string;
  @Input() planningArea: Plan | null = null;

  state: 'loading' | 'empty' | 'loaded' = 'loading';

  treatments: TreatmentPlan[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private treatmentsService: TreatmentsService,
    private matSnackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.pollForChanges();
  }

  private pollForChanges() {
    this.loadTreatments();
    // we might want to check if any scenario is still pending in order to poll
    interval(POLLING_INTERVAL)
      .pipe(untilDestroyed(this))
      .subscribe(() => this.loadTreatments());
  }

  loadTreatments() {
    this.treatmentsService
      .listTreatmentPlans(Number(this.scenarioId))
      .subscribe((results) => {
        this.treatments = results;
        this.state = results.length > 0 ? 'loaded' : 'empty';
      });
  }

  goToTreatment(id: number, status: TreatmentStatus) {
    const route = ['treatment', id];
    if (status === 'SUCCESS') {
      route.push('impacts');
    }

    this.router.navigate(route, { relativeTo: this.route });
  }

  userCanDelete(): boolean {
    return (
      this.planningArea !== null && canDeleteTreatmentPlan(this.planningArea)
    );
  }

  userCanDuplicate(): boolean {
    return (
      this.planningArea !== null && canCloneTreatmentPlan(this.planningArea)
    );
  }

  deleteTreatment(treatment: TreatmentPlan) {
    const treatmentList = this.treatments;
    this.treatments = this.treatments.filter((t) => t.id != treatment.id);
    this.treatmentsService.deleteTreatmentPlan(treatment.id).subscribe({
      next: () => {
        this.state = this.treatments.length > 0 ? 'loaded' : 'empty';
        this.matSnackBar.open(
          `Deleted Treatment Plan '${treatment.name}'`,
          'Dismiss',
          SNACK_NOTICE_CONFIG
        );
      },
      error: () => {
        this.state = 'loaded';
        this.treatments = treatmentList;
        this.matSnackBar.open(
          `[Error] Cannot delete treatment plan '${treatment.name}'`,
          'Dismiss',
          SNACK_ERROR_CONFIG
        );
      },
    });
  }

  openDeleteDialog(treatment: TreatmentPlan) {
    const dialogRef: MatDialogRef<DeleteDialogComponent> = this.dialog.open(
      DeleteDialogComponent,
      {
        data: {
          name: '"' + treatment.name + '"',
        },
      }
    );
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.deleteTreatment(treatment);
        }
      });
  }

  duplicateTreatment(treatment: TreatmentPlan) {
    this.treatmentsService.duplicateTreatmentPlan(treatment.id).subscribe({
      next: (t) => {
        this.treatments = [...this.treatments, t];
        this.matSnackBar.open(
          `Duplicated Treatment Plan '${treatment.name}'`,
          'Dismiss',
          SNACK_NOTICE_CONFIG
        );
      },
      error: () => {
        this.matSnackBar.open(
          `[Error] Cannot duplicate treatment plan '${treatment.name}'`,
          'Dismiss',
          SNACK_ERROR_CONFIG
        );
      },
    });
  }
}
