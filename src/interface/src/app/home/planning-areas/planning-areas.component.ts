import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AuthService, PlanService } from '../../services';
import { FeatureService } from '../../features/feature.service';
import { take } from 'rxjs';
import { DeletePlanDialogComponent } from '../plan-table/delete-plan-dialog/delete-plan-dialog.component';
import { PlanPreview } from '../../types';
interface PlanRow extends PlanPreview {
  selected: boolean;
}
@Component({
  selector: 'app-planning-areas',
  templateUrl: './planning-areas.component.html',
  styleUrls: ['./planning-areas.component.scss'],
})
export class PlanningAreasComponent implements OnInit {
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
  loggedIn$ = this.authService.loggedInStatus$;
  login_enabled = this.featureService.isFeatureEnabled('login');

  constructor(
    private dialog: MatDialog,
    private planService: PlanService,
    private authService: AuthService,
    private featureService: FeatureService
  ) {}

  ngOnInit(): void {
    this.getPlansFromService();
    this.authService.isLoggedIn$.subscribe((_) => {
      this.refresh();
    });
  }

  /** Retrieve plans from backend and sort them by date created, descending.
   *  TODO: Sort by last updated instead when that field is available.
   */
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
        this.datasource.paginator = this.paginator;
        this.datasource.sort = this.sort;
      });
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
