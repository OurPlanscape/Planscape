import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '@styleguide';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort, SortDirection } from '@angular/material/sort';
import {
  AsyncPipe,
  DatePipe,
  DecimalPipe,
  JsonPipe,
  NgForOf,
  NgSwitch,
  NgSwitchCase,
  NgSwitchDefault,
} from '@angular/common';
import { PlanService } from '@services';
import { PreviewPlan } from '@types';
import { async, Subject } from 'rxjs';

@Component({
  selector: 'app-planning-areas',
  standalone: true,
  imports: [
    MatIconModule,
    RouterLink,
    ButtonComponent,
    MatMenuModule,
    MatButtonModule,
    MatTableModule,
    MatSortModule,
    NgForOf,
    NgSwitch,
    NgSwitchCase,
    NgSwitchDefault,
    DatePipe,
    DecimalPipe,
    JsonPipe,
    AsyncPipe,
  ],
  templateUrl: './planning-areas.component.html',
  styleUrl: './planning-areas.component.scss',
})
export class PlanningAreasComponent implements OnInit {
  displayedColumns: (keyof PreviewPlan | 'menu')[] = [
    'name',
    'creator',
    'region_name',
    'area_acres',
    'scenario_count',
    'latest_updated',
    'menu',
  ];

  columnLabels: Partial<Record<keyof PreviewPlan | 'menu', string>> = {
    name: 'Name',
    creator: 'Creator',
    region_name: 'Region',
    area_acres: 'Total Acres',
    scenario_count: '# of Scenarios',
    latest_updated: 'Date last modified',
    menu: '',
  };

  constructor(
    private planService: PlanService,
    // private route: ActivatedRoute,
    private router: Router
  ) {}

  sortOptions: Sort = { active: 'name', direction: 'asc' };

  _dataSource = new Subject<PreviewPlan[]>();
  dataSource = this._dataSource.asObservable();
  //dataSource = new PlanningAreasDataSource(this.planService, this.sortOptions);
  //
  // dataSource = this.route.queryParams.pipe(
  //   switchMap((params) => this.planService.getPlanPreviews(params))
  // );

  loadData() {
    return this.planService
      .getPlanPreviews(this.getSortOptions())
      .subscribe((d) => {
        console.log(d);
        this._dataSource.next(d);
      });
  }

  private getSortOptions() {
    return {
      ordering:
        this.sortOptions.direction === 'desc'
          ? '-' + this.sortOptions.active
          : this.sortOptions.active,
    };
  }

  ngOnInit() {
    //  this.dataSource.loadData();
    this.loadData();
  }

  changeSort(e: { active: string; direction: SortDirection }) {
    this.sortOptions.active = e.active;
    this.sortOptions.direction = e.direction;
    // this.dataSource.changeSort(e);
    this.loadData();
    // const queryParmams = {
    //   ordering: e.direction === 'desc' ? '-' + e.active : e.active,
    // };
    // this.router.navigate([], {
    //   relativeTo: this.route,
    //   queryParams: queryParmams,
    //   queryParamsHandling: 'merge', // merge with existing query params
    // });
  }

  viewPlan(plan: PreviewPlan, event: MouseEvent) {
    const { target } = event;
    if (target instanceof HTMLElement) {
      if (target.classList.contains('mat-mdc-button-touch-target')) {
        return false;
      }
    }
    this.router.navigate(['plan', plan.id]);
    return;
  }

  protected readonly async = async;
}
