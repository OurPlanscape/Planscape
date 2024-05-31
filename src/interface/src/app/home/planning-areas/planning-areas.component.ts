import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '@styleguide';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import {
  DatePipe,
  DecimalPipe,
  NgForOf,
  NgSwitch,
  NgSwitchCase,
  NgSwitchDefault,
} from '@angular/common';
import { PlanService } from '@services';
import { PreviewPlan } from '@types';
import { switchMap } from 'rxjs';

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
  ],
  templateUrl: './planning-areas.component.html',
  styleUrl: './planning-areas.component.scss',
})
export class PlanningAreasComponent {
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
    private router: Router
  ) {}

  dataSource = this.route.queryParams.pipe(
    switchMap((params) => this.planService.getPlanPreviews(params))
  );

  changeSort(e: { active: string; direction: string }) {
    const queryParmams = {
      ordering: e.direction === 'desc' ? '-' + e.active : e.active,
    };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParmams,
      queryParamsHandling: 'merge', // merge with existing query params
    });
  }
}
