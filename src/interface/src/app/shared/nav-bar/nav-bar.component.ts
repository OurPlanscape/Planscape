import { Component, Inject, Input, OnInit } from '@angular/core';
import { WINDOW } from '@services';

import { ShareExploreDialogComponent } from '../share-explore-dialog/share-explore-dialog.component';
import { SharePlanDialogComponent } from '../../home/share-plan-dialog/share-plan-dialog.component';
import { ActivatedRoute, Params } from '@angular/router';
import { filter, map } from 'rxjs';
import { canViewCollaborators } from '../../plan/permissions';
import { HomeParametersStorageService } from '@services/local-storage.service';
import { MatDialog } from '@angular/material/dialog';
import { PlanState } from 'src/app/plan/plan.state';
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
    | 'SCENARIO'
    | 'TREATMENTS'
    | 'TREATMENTS_PROJECT_AREA'
    | 'DIRECT_IMPACTS' = 'EXPLORE';

  params: Params | null = null;

  canSharePlan$ = this.planState.currentPlan$.pipe(
    filter((plan) => !!plan),
    map((plan) => (plan ? canViewCollaborators(plan) : false))
  );

  breadcrumb$ = this.breadcrumbService.breadcrumb$;

  constructor(
    @Inject(WINDOW) private window: Window,
    private dialog: MatDialog,
    private route: ActivatedRoute,
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

  share() {
    this.dialog.open(ShareExploreDialogComponent, { restoreFocus: false });
  }

  sharePlan() {
    this.dialog.open(SharePlanDialogComponent, {
      data: {
        //TODO
        planningAreaName: '', //this.navState?.currentRecordName,
        planningAreaId: this.route.snapshot.params['id'],
      },
      restoreFocus: false,
      panelClass: 'no-padding-dialog',
    });
  }
}
