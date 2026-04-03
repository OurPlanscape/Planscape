import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Plan, TreatmentPlan, TreatmentStatus } from '@app/types';
import { ButtonComponent } from '@styleguide';
import { NgFor, NgIf } from '@angular/common';
import { TreatmentsService } from '@app/services/treatments.service';
import {
  canCloneTreatmentPlan,
  canDeleteTreatmentPlan,
} from '@app/plan/permissions';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@app/shared';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DeleteDialogComponent } from '@app/standalone/delete-dialog/delete-dialog.component';
import { take } from 'rxjs';
import { TreatmentEffectsCardComponent } from '@styleguide/treatment-effects-card/treatment-effects-card.component';

@Component({
  selector: 'app-treatment-plans-list',
  standalone: true,
  imports: [
    ButtonComponent,
    MatIconModule,
    MatProgressSpinnerModule,
    NgIf,
    NgFor,
    TreatmentEffectsCardComponent
  ],
  templateUrl: './treatment-plans-list.component.html',
  styleUrl: './treatment-plans-list.component.scss',
})
export class TreatmentPlansListComponent {
  treatments: TreatmentPlan[] = [];

  sortSelection = '';

  loading = false;
  creatingTreatment = false;

  state: 'loading' | 'empty' | 'loaded' = 'loading';

  handleSortChange() {
    this.sortSelection =
      this.sortSelection === '-created_at' ? 'created_at' : '-created_at';
    this.loading = true;
    this.loadTreatments();
  }
  @Input() scenarioId: number = 5659; // TODO: remove placeholder
  @Input() planningArea: Plan | null = null;

  constructor(
    private treatmentsService: TreatmentsService,
    private breadcrumbService: BreadcrumbService,
    private router: Router,
    private route: ActivatedRoute,
    private matSnackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.loadTreatments();
  }

  openNewTreatmentDialog() {}

  loadTreatments() {
    this.treatmentsService
      .listTreatmentPlans(Number(this.scenarioId))
      .subscribe((results) => {
        this.treatments = results;
        this.state = results.length > 0 ? 'loaded' : 'empty';
        this.loading = false;
      });
  }

  goToTreatment(treatment: TreatmentPlan, status: TreatmentStatus) {
    const route = ['treatment', treatment.id];

    if (status === 'SUCCESS') {
      route.push('impacts');
      this.breadcrumbService.updateBreadCrumb({
        label: 'Direct Treatment Impacts: ' + treatment.name,
        backUrl: this.router.url,
      });
    } else {
      this.breadcrumbService.updateBreadCrumb({
        label: 'Treatment Plan: ' + treatment.name,
        backUrl: this.router.url,
        icon: 'close',
      });
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

  // TODO: handle polling

  // ngOnInit(): void {
  //   this.pollForChanges();
  // }

  // private pollForChanges() {
  //   this.loadTreatments();
  //   // we might want to check if any scenario is still pending in order to poll
  //   interval(POLLING_INTERVAL)
  //     .pipe(untilDestroyed(this))
  //     .subscribe(() => this.loadTreatments());
  // }

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
          title: 'Delete "' + treatment.name + '"?',
          body: `<b>Warning</b>: This operation cannot be reversed.`,
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
