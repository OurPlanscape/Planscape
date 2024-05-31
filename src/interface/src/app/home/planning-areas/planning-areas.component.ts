import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  Location,
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
    NgIf,
    MatProgressSpinnerModule,
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
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {}

  dataSource = new PlanningAreasDataSource(this.planService);
  sortOptions: Sort = this.dataSource.sortOptions;
  loading$ = this.dataSource.loading$;
  initialLoad$ = this.dataSource.initialLoad;
  noEntries = this.dataSource.noEntries;

  ngOnInit() {
    this.dataSource.loadData();
  }

  changeSort(e: { active: string; direction: SortDirection }) {
    this.dataSource.changeSort(e);

    const currentUrl = this.router
      .createUrlTree([], {
        relativeTo: this.route,
        queryParams: e,
        queryParamsHandling: 'merge', // Merge with existing query parameters
      })
      .toString();

    this.location.go(currentUrl);
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
}
