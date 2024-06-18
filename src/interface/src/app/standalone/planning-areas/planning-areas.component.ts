import { Component, OnDestroy, OnInit } from '@angular/core';
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
  KeyValuePipe,
  NgForOf,
  NgIf,
  NgSwitch,
  NgSwitchCase,
  NgSwitchDefault,
} from '@angular/common';
import { PlanService } from '@services';
import { PreviewPlan } from '@types';
import { PlanningAreasDataSource } from './planning-areas.datasource';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  DEFAULT_SORT_OPTIONS,
  QueryParamsService,
} from './query-params.service';
import { KeyPipe } from '../key.pipe';

import { MatSnackBarModule } from '@angular/material/snack-bar';
import { PlanningAreaMenuComponent } from '../planning-area-menu/planning-area-menu.component';
import { PlanningAreasSearchComponent } from '../planning-areas-search/planning-areas-search.component';

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
    MatSnackBarModule,
    DatePipe,
    DecimalPipe,
    JsonPipe,
    AsyncPipe,
    NgIf,
    MatProgressSpinnerModule,
    KeyValuePipe,
    KeyPipe,
    PlanningAreaMenuComponent,
    PlanningAreasSearchComponent,
  ],
  templateUrl: './planning-areas.component.html',
  styleUrl: './planning-areas.component.scss',
  providers: [
    QueryParamsService,
    {
      provide: DEFAULT_SORT_OPTIONS,
      useValue: { active: 'name', direction: 'asc' },
    },
    {
      provide: PlanningAreasDataSource,
      useFactory: (
        planService: PlanService,
        queryParamsService: QueryParamsService
      ) => {
        return new PlanningAreasDataSource(planService, queryParamsService);
      },
      deps: [PlanService, QueryParamsService],
    },
  ],
})
export class PlanningAreasComponent implements OnInit, OnDestroy {
  readonly columns: { key: keyof PreviewPlan | 'menu'; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'creator', label: 'Creator' },
    { key: 'region_name', label: 'Region' },
    { key: 'area_acres', label: 'Total Acres' },
    { key: 'scenario_count', label: '# of Scenarios' },
    { key: 'latest_updated', label: 'Date last modified' },
    { key: 'menu', label: '' },
  ];

  constructor(
    private router: Router,
    public dataSource: PlanningAreasDataSource
  ) {}

  sortOptions: Sort = this.dataSource.sortOptions;
  loading$ = this.dataSource.loading$;
  initialLoad$ = this.dataSource.initialLoad$;
  noEntries$ = this.dataSource.noEntries$;
  hasFilters$ = this.dataSource.hasFilters$;

  ngOnInit() {
    this.dataSource.loadData();
  }

  changeSort(e: { active: string; direction: SortDirection }) {
    this.dataSource.changeSort(e);
  }

  goToPage(page: number) {
    this.dataSource.goToPage(page);
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

  reload() {
    this.dataSource.loadData();
  }

  search(str: string) {
    this.dataSource.search(str);
  }

  ngOnDestroy(): void {
    this.dataSource.destroy();
  }
}
