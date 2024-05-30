import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
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

export interface PeriodicElement {
  name: string;
  position: number;
  weight: number;
  symbol: string;
}

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
  ELEMENT_DATA: PeriodicElement[] = [
    { position: 1, name: 'Hydrogen', weight: 1.0079, symbol: 'H' },
    { position: 2, name: 'Helium', weight: 4.0026, symbol: 'He' },
    { position: 3, name: 'Lithium', weight: 6.941, symbol: 'Li' },
    { position: 4, name: 'Beryllium', weight: 9.0122, symbol: 'Be' },
    { position: 5, name: 'Boron', weight: 10.811, symbol: 'B' },
    { position: 6, name: 'Carbon', weight: 12.0107, symbol: 'C' },
    { position: 7, name: 'Nitrogen', weight: 14.0067, symbol: 'N' },
    { position: 8, name: 'Oxygen', weight: 15.9994, symbol: 'O' },
    { position: 9, name: 'Fluorine', weight: 18.9984, symbol: 'F' },
    { position: 10, name: 'Neon', weight: 20.1797, symbol: 'Ne' },
  ];

  dataSource = this.planService.listPlansByUser();

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

  constructor(private planService: PlanService) {}

  changeSort(e: { active: string; direction: string }) {
    console.log(e);
  }
}
