import { Component, Inject, Input, OnInit } from '@angular/core';
import { WINDOW } from '@services';

import { SharePlanDialogComponent } from '@home/share-plan-dialog/share-plan-dialog.component';
import { Params } from '@angular/router';
import { filter, lastValueFrom, map, take } from 'rxjs';
import { canViewCollaborators } from '@plan/permissions';
import { HomeParametersStorageService } from '@services/local-storage.service';
import { MatDialog } from '@angular/material/dialog';
import { PlanState } from '@plan/plan.state';
import { BreadcrumbService } from '@services/breadcrumb.service';

@Component({
  selector: 'app-nav-bar',
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

  canSharePlan$ = this.currentPlan$.pipe(
    filter((plan) => !!plan),
    map((plan) => (plan ? canViewCollaborators(plan) : false))
  );

  breadcrumb$ = this.breadcrumbService.breadcrumb$;

  @Input() showForsysLogo = false;

  constructor(
    @Inject(WINDOW) private window: Window,
    private dialog: MatDialog,
    private homeParametersStorageService: HomeParametersStorageService,
    private planState: PlanState,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnInit(): void {
    this.params = this.homeParametersStorageService.getItem();
  }

  print() {
    this.window.print();
  }

  async sharePlan() {
    const plan = await lastValueFrom(this.currentPlan$.pipe(take(1)));

    this.dialog.open(SharePlanDialogComponent, {
      data: { plan },
      restoreFocus: false,
      panelClass: 'no-padding-dialog',
    });
  }

  showPrintButton() {
    return ![
      'TREATMENTS',
      'TREATMENTS_PROJECT_AREA',
      'EXPLORE',
      'CLIMATE_FORESIGHT',
      'NEW_SCENARIO',
    ].some((area) => area === this.area);
  }

  showTooltip() {
    // should hide if its on area explore or climate
    return !['EXPLORE', 'CLIMATE_FORESIGHT', 'NEW_SCENARIO'].some(
      (area) => area === this.area
    );
  }
}
