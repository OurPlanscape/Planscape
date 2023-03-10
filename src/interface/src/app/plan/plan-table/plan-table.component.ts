import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { AuthService } from 'src/app/services';

import { PlanService } from './../../services/plan.service';
import { PlanPreview } from './../../types/plan.types';
import { DeletePlanDialogComponent } from './delete-plan-dialog/delete-plan-dialog.component';

interface PlanRow extends PlanPreview {
  selected: boolean;
}

@Component({
  selector: 'app-plan-table',
  templateUrl: './plan-table.component.html',
  styleUrls: ['./plan-table.component.scss'],
})
export class PlanTableComponent implements AfterViewInit, OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  datasource = new MatTableDataSource<PlanRow>();
  displayedColumns: string[] = [
    'select',
    'name',
    'createdTimestamp',
    'region',
    'savedScenarios',
    'configurations',
    'status',
    'options',
  ];

  constructor(
    private dialog: MatDialog,
    private planService: PlanService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngAfterViewInit(): void {
    this.datasource.paginator = this.paginator;
    this.datasource.sort = this.sort;
  }

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
        this.datasource.data = plans
          .map((plan) => {
            return {
              ...plan,
              selected: false,
            };
          })
          .sort((plan) => plan.createdTimestamp ?? 0)
          .reverse();
      });
  }

  create(): void {
    this.router.navigate(['region']);
  }

  // If planId is provided, delete that plan only. Otherwise, delete all selected plans.
  delete(planId?: string): void {
    const planIdsToDelete: string[] = planId
      ? [planId]
      : this.datasource.data
          .filter((plan) => plan.selected)
          .map((plan) => plan.id);
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

  toggleAll(checked: boolean): void {
    this.datasource.data.forEach((plan) => (plan.selected = checked));
  }

  /** WARNING: This function is run repeatedly on this page. Avoid any heavy lifting here. */
  showDelete(): boolean {
    return !!this.datasource.data.find((plan) => plan.selected);
  }
}
