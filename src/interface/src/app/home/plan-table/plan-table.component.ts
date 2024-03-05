import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { take } from 'rxjs';

import { PlanService } from '../../services';
import { ActualPlan } from '../../types';
import { Router } from '@angular/router';
import { DeleteDialogComponent } from '../../delete-dialog/delete-dialog.component';
import { SNACK_NOTICE_CONFIG } from 'src/app/shared/constants';
import { SharePlanDialogComponent } from '../share-plan-dialog/share-plan-dialog.component';
import { FeatureService } from '../../features/feature.service';
import { canViewCollaborators } from '../../plan/permissions';

interface PlanRow extends ActualPlan {
  totalAcres: number;
}

@Component({
  selector: 'app-plan-table',
  templateUrl: './plan-table.component.html',
  styleUrls: ['./plan-table.component.scss'],
})
export class PlanTableComponent implements OnInit {
  @ViewChild(MatSort) sort!: MatSort;
  // used just for typing the table on the template
  planrows: PlanRow[] = [];

  datasource = new MatTableDataSource<PlanRow>();
  selectedPlan: PlanRow | null = null;
  loading = true;
  error = false;

  displayedColumns: string[] = this.featureService.isFeatureEnabled(
    'show_share_modal'
  )
    ? ['name', 'creator', 'lastUpdated', 'totalAcres', 'scenarios', 'region']
    : ['name', 'lastUpdated', 'totalAcres', 'scenarios', 'region'];

  constructor(
    private dialog: MatDialog,
    private planService: PlanService,
    private router: Router,
    private snackbar: MatSnackBar,
    private featureService: FeatureService
  ) {}

  ngOnInit(): void {
    this.getPlansFromService();
  }

  getPlansFromService(): void {
    this.planService
      .listPlansByUser()
      .pipe(take(1))
      .subscribe({
        next: (plans) => {
          this.loading = false;
          this.datasource.data = plans.map((plan) => {
            return {
              ...plan,
              totalAcres: Math.round(plan.area_acres),
            };
          });
          this.datasource.sort = this.sort;
        },
        error: () => {
          this.loading = false;
          this.error = true;
        },
      });
  }

  deletePlan(): void {
    if (!this.selectedPlan) {
      return;
    }
    const planIdsToDelete: string[] = [String(this.selectedPlan.id)];
    const dialogRef: MatDialogRef<DeleteDialogComponent> = this.dialog.open(
      DeleteDialogComponent,
      {
        data: {
          name: '"' + this.selectedPlan.name + '"',
        },
      }
    );
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.planService
            .deletePlan(planIdsToDelete)
            .subscribe((_) => this.refresh());

          this.snackbar.open(
            `Successfully deleted plan: ${this.selectedPlan?.name}`,
            'Dismiss',
            SNACK_NOTICE_CONFIG
          );
        }
      });
  }

  sharePlan() {
    if (!this.selectedPlan) {
      return;
    }
    this.dialog.open(SharePlanDialogComponent, {
      data: {
        name: '"' + this.selectedPlan.name + '"',
        id: this.selectedPlan.id,
        creatorId: this.selectedPlan.user,
        creatorName: this.selectedPlan.creator,
      },
      restoreFocus: false,
      panelClass: 'no-padding-dialog',
    });
  }

  refresh(): void {
    this.getPlansFromService();
  }

  selectPlan(plan: PlanRow) {
    this.selectedPlan = plan;
  }

  viewMap() {
    if (!this.selectedPlan) {
      return;
    }
    this.router.navigate(['explore', this.selectedPlan.id]);
  }

  goToScenario() {
    if (!this.selectedPlan) {
      return;
    }
    this.router.navigate(['plan', this.selectedPlan.id]);
  }

  shareEnabled() {
    if (!this.selectedPlan) {
      return false;
    }
    return canViewCollaborators(this.selectedPlan);
  }
}
