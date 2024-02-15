import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { take } from 'rxjs';

import { PlanService } from '../../services/plan.service';
import { PlanPreview } from '../../types/plan.types';
import { calculateAcres } from '../../plan/plan-helpers';
import { Router } from '@angular/router';
import { DeleteDialogComponent } from '../../delete-dialog/delete-dialog.component';
import { SNACK_NOTICE_CONFIG } from 'src/app/shared/constants';

interface PlanRow extends PlanPreview {
  totalAcres: number;
}

@Component({
  selector: 'app-plan-table',
  templateUrl: './plan-table.component.html',
  styleUrls: ['./plan-table.component.scss'],
})
export class PlanTableComponent implements OnInit {
  @ViewChild(MatSort) sort!: MatSort;

  datasource = new MatTableDataSource<PlanRow>();
  selectedPlan: PlanRow | null = null;
  loading = true;
  error = false;

  displayedColumns: string[] = [
    'name',
    'lastUpdated',
    'totalAcres',
    'scenarios',
    'region',
  ];

  constructor(
    private dialog: MatDialog,
    private planService: PlanService,
    private router: Router,
    private snackbar: MatSnackBar
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
              totalAcres: plan.geometry ? calculateAcres(plan.geometry) : 0,
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
}
