import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Plan, TreatmentPlan, TreatmentStatus } from '@app/types';
import { ButtonComponent } from '@styleguide';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { TreatmentsService } from '@app/services/treatments.service';
import {
  canCloneTreatmentPlan,
  canDeleteTreatmentPlan,
  userCanAddTreatmentPlan,
} from '@app/plan/permissions';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@app/shared';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DeleteDialogComponent } from '@app/standalone/delete-dialog/delete-dialog.component';
import {
  BehaviorSubject,
  combineLatest,
  interval,
  shareReplay,
  startWith,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { POLLING_INTERVAL } from '@app/plan/plan-helpers';
import { CreateTreatmentDialogComponent } from '@app/scenario/create-treatment-dialog/create-treatment-dialog.component';
import { AnalyticsService } from '@app/services/analytics.service';
import { TreatmentEffectsCardComponent } from '@styleguide/treatment-effects-card/treatment-effects-card.component';

@Component({
  selector: 'app-treatment-plans-list',
  standalone: true,
  imports: [
    AsyncPipe,
    ButtonComponent,
    MatIconModule,
    MatProgressSpinnerModule,
    NgIf,
    NgFor,
    TreatmentEffectsCardComponent,
  ],
  templateUrl: './treatment-plans-list.component.html',
  styleUrl: './treatment-plans-list.component.scss',
})
export class TreatmentPlansListComponent {
  sortSelection$ = new BehaviorSubject<string>('-created_at');
  loading$ = new BehaviorSubject<boolean>(false);
  @Input() scenarioId!: number;
  @Input() planningArea: Plan | null = null;
  manualRefresh$ = new BehaviorSubject<void>(undefined);

  treatments$ = combineLatest([
    this.sortSelection$,
    interval(POLLING_INTERVAL).pipe(startWith(0)),
    this.manualRefresh$,
  ]).pipe(
    switchMap(([sort]) =>
      this.treatmentsService.listTreatmentPlans(Number(this.scenarioId), sort)
    ),
    tap(() => this.loading$.next(false)),
    shareReplay(1)
  );

  creatingTreatment = false;

  state: 'loading' | 'empty' | 'loaded' = 'loading';

  handleSortChange() {
    this.loading$.next(true);
    this.sortSelection$.next(
      this.sortSelection$.value === '-created_at' ? 'created_at' : '-created_at'
    );
  }

  trackByFn(index: number, item: TreatmentPlan) {
    return item.id;
  }

  constructor(
    private treatmentsService: TreatmentsService,
    private breadcrumbService: BreadcrumbService,
    private analyticsService: AnalyticsService,
    private router: Router,
    private route: ActivatedRoute,
    private matSnackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

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

  userCanAddTreatmentPlan(): boolean {
    return (
      this.planningArea !== null && userCanAddTreatmentPlan(this.planningArea)
    );
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
    this.treatmentsService.deleteTreatmentPlan(treatment.id).subscribe({
      next: () => {
        this.manualRefresh$.next();

        this.matSnackBar.open(
          `Deleted Treatment Plan '${treatment.name}'`,
          'Dismiss',
          SNACK_NOTICE_CONFIG
        );
      },
      error: () => {
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
    this.loading$.next(true);

    this.treatmentsService.duplicateTreatmentPlan(treatment.id).subscribe({
      next: (t) => {
        this.manualRefresh$.next();

        this.matSnackBar.open(
          `Duplicated Treatment Plan '${treatment.name}'`,
          'Dismiss',
          SNACK_NOTICE_CONFIG
        );
      },
      error: () => {
        this.loading$.next(false);
        this.matSnackBar.open(
          `[Error] Cannot duplicate treatment plan '${treatment.name}'`,
          'Dismiss',
          SNACK_ERROR_CONFIG
        );
      },
    });
  }

  openNewTreatmentDialog() {
    this.analyticsService.emitEvent(
      'new_treatment_plan',
      'treatment_effects_list',
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
          this.goToTreatment(result, result.status);
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
