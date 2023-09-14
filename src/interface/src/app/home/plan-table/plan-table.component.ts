import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { take } from 'rxjs';
import { AuthService } from 'src/app/services';

import { PlanService } from '../../services/plan.service';
import { PlanPreview } from '../../types/plan.types';
import { DeletePlanDialogComponent } from './delete-plan-dialog/delete-plan-dialog.component';
import { calculateAcres } from '../../plan/plan-helpers';
import { Router } from '@angular/router';

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
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.getPlansFromService();
    this.authService.isLoggedIn$.subscribe((_) => {
      this.refresh();
    });
  }

  getPlansFromService(): void {
    this.planService
      .listPlansByUser(null)
      .pipe(take(1))
      .subscribe((plans) => {
        this.loading = false;
        this.datasource.data = plans.map((plan) => {
          return {
            ...plan,
            totalAcres: plan.geometry ? calculateAcres(plan.geometry) : 0,
          };
        });
        this.datasource.sort = this.sort;
      });
  }

  deletePlan(): void {
    if (!this.selectedPlan) {
      return;
    }
    const planIdsToDelete: string[] = [String(this.selectedPlan.id)];
    const dialogRef: MatDialogRef<DeletePlanDialogComponent> = this.dialog.open(
      DeletePlanDialogComponent,
      {
        data: planIdsToDelete,
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
        }
      });
  }

  refresh(): void {
    this.getPlansFromService();
  }
  selectPlan(plan: PlanRow) {
    this.selectedPlan = plan;
  }

  viewMap() {}

  goToScenario() {
    if (!this.selectedPlan) {
      return;
    }
    this.router.navigate(['plan', this.selectedPlan.id]);
  }
}
