import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import {
  ButtonComponent,
  FilterDropdownComponent,
  OverlayLoaderComponent,
  PaginatorComponent,
} from '@styleguide';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, SortDirection } from '@angular/material/sort';
import {
  AsyncPipe,
  DatePipe,
  DecimalPipe,
  KeyValuePipe,
  NgForOf,
  NgIf,
  NgSwitch,
  NgSwitchCase,
  NgSwitchDefault,
} from '@angular/common';

import { PlanService } from '@services';
import { Creator, PreviewPlan } from '@types';
import { PlanningAreasDataSource } from '@app/standalone/planning-areas/planning-areas.datasource';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  DEFAULT_SORT_OPTIONS,
  QueryParamsService,
} from '@app/standalone/planning-areas/query-params.service';
import { KeyPipe } from '@app/standalone/key.pipe';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { PlanningAreaMenuComponent } from '@app/standalone/planning-area-menu/planning-area-menu.component';
import { PlanningAreasSearchComponent } from '@app/standalone/planning-areas-search/planning-areas-search.component';
import { FormsModule } from '@angular/forms';
import { combineLatest, map } from 'rxjs';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { FeaturesModule } from '@app/features/features.module';
import { PlanState } from '@app/plan/plan.state';
import { PopoverComponent } from '@styleguide/popover/popover.component';

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
    AsyncPipe,
    NgIf,
    MatProgressSpinnerModule,
    KeyValuePipe,
    KeyPipe,
    PlanningAreaMenuComponent,
    PlanningAreasSearchComponent,
    FormsModule,
    FilterDropdownComponent,
    PaginatorComponent,
    OverlayLoaderComponent,
    FeaturesModule,
    PopoverComponent,
  ],
  templateUrl: './planning-areas.component.html',
  styleUrl: './planning-areas.component.scss',
  providers: [
    QueryParamsService,
    {
      provide: DEFAULT_SORT_OPTIONS,
      useValue: { active: 'latest_updated', direction: 'desc' },
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
    { key: 'area_acres', label: 'Total Acres' },
    { key: 'scenario_count', label: '# of Scenarios' },
    { key: 'latest_updated', label: 'Date last modified' },
    { key: 'menu', label: '' },
  ];

  constructor(
    private router: Router,
    public dataSource: PlanningAreasDataSource,
    private breadcrumbService: BreadcrumbService,
    private planState: PlanState
  ) {}

  sortOptions = this.dataSource.sortOptions;
  pageOptions = this.dataSource.pageOptions;

  overlayLoader$ = combineLatest([
    this.dataSource.loading$,
    this.dataSource.initialLoad$,
  ]).pipe(map(([loading, initial]) => loading && !initial));
  initialLoad$ = this.dataSource.initialLoad$;

  noEntries$ = this.dataSource.noEntries$;
  hasFilters$ = this.dataSource.hasFilters$;

  pages$ = this.dataSource.pages$;

  searchTerm = this.dataSource.searchTerm;

  selectedCreators$ = this.dataSource.selectedCreators$;

  creators$ = this.dataSource.creators$;

  ngOnInit() {
    this.dataSource.loadData();
  }

  changeSort(e: { active: string; direction: SortDirection }) {
    this.dataSource.changeSort(e);
  }

  goToPage(page: number) {
    this.dataSource.goToPage(page);
  }

  changePageSize(size: number) {
    this.dataSource.changePageSize(size);
  }

  viewPlan(plan: PreviewPlan) {
    this.breadcrumbService.updateBreadCrumb({
      label: 'Planning Area: ' + plan.name,
      backUrl: '/',
    });
    this.router.navigate(['plan', plan.id]);
    return;
  }

  reload() {
    this.dataSource.loadData();
  }

  afterRename() {
    this.planState.reloadPlan();
    this.reload();
  }

  search(str: string) {
    this.dataSource.search(str);
  }

  ngOnDestroy(): void {
    this.dataSource.destroy();
  }

  selectCreators(creators: Creator[]) {
    this.dataSource.filterCreator(creators.map((creator) => creator.id));
  }
}
