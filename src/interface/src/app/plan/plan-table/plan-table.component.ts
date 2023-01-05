import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { take } from 'rxjs';

import { PlanService } from './../../services/plan.service';
import { PlanPreview } from './../../types/plan.types';

@Component({
  selector: 'app-plan-table',
  templateUrl: './plan-table.component.html',
  styleUrls: ['./plan-table.component.scss'],
})
export class PlanTableComponent implements AfterViewInit, OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  datasource = new MatTableDataSource<PlanPreview>();
  displayedColumns: string[] = [
    'name',
    'createdTimestamp',
    'region',
    'savedScenarios',
    'status',
  ];

  constructor(private planService: PlanService) {}

  ngAfterViewInit(): void {
    this.datasource.paginator = this.paginator;
    this.datasource.sort = this.sort;
  }

  ngOnInit(): void {
    this.planService
      .listPlansByUser(null)
      .pipe(take(1))
      .subscribe((plans) => {
        this.datasource.data = plans;
      });
  }
}
