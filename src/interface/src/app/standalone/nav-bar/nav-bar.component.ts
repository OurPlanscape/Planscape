import { Component, Input, OnInit } from '@angular/core';

import { Params, RouterModule } from '@angular/router';
import { HomeParametersStorageService } from '@services/local-storage.service';
import { MatDialogModule } from '@angular/material/dialog';
import { PlanState } from '@plan/plan.state';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { ButtonComponent, SectionComponent } from '@styleguide';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-nav-bar',
  imports: [
    CommonModule,
    ButtonComponent,
    RouterModule,
    SectionComponent,
    MatDialogModule,
  ],
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss'],
})
export class NavBarComponent implements OnInit {
  @Input() area:
    | 'SCENARIOS'
    | 'EXPLORE'
    | 'SCENARIO' // remove after SCENARIO_CONFIG_UI
    | 'NEW_SCENARIO'
    | 'TREATMENTS'
    | 'TREATMENTS_PROJECT_AREA'
    | 'DIRECT_IMPACTS'
    | 'CLIMATE_FORESIGHT' = 'EXPLORE';

  params: Params | null = null;

  currentPlan$ = this.planState.currentPlan$;

  breadcrumb$ = this.breadcrumbService.breadcrumb$;

  @Input() showForsysLogo = false;

  constructor(
    private homeParametersStorageService: HomeParametersStorageService,
    private planState: PlanState,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnInit(): void {
    this.params = this.homeParametersStorageService.getItem();
  }
}
