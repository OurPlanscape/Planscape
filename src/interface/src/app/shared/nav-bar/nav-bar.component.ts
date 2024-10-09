import { Component, Inject, Input, OnInit } from '@angular/core';
import { AuthService, PlanStateService, WINDOW } from '@services';

import { ShareExploreDialogComponent } from '../share-explore-dialog/share-explore-dialog.component';
import { SharePlanDialogComponent } from '../../home/share-plan-dialog/share-plan-dialog.component';
import { ActivatedRoute, Params } from '@angular/router';
import { map, of } from 'rxjs';
import { canViewCollaborators } from '../../plan/permissions';
import { HomeParametersStorageService } from '@services/local-storage.service';
import { MatDialog } from '@angular/material/dialog';

export interface Breadcrumb {
  name: string;
  path?: string;
}

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss'],
})
export class NavBarComponent implements OnInit {
  @Input() breadcrumbs: Breadcrumb[] = [];
  @Input() area: 'SCENARIOS' | 'EXPLORE' | 'SCENARIO' | 'TREATMENTS' =
    'EXPLORE';

  params: Params | null = null;

  canSharePlan$ =
    this.route.snapshot?.params && this.route.snapshot?.params['id']
      ? this.planStateService
          .getPlan(this.route.snapshot.params['id'])
          .pipe(map((plan) => canViewCollaborators(plan)))
      : of(false);

  firstBreadcrumb$ = this.authService.isLoggedIn$.pipe(
    map((loggedIn) => (loggedIn ? 'Planning Areas' : 'Welcome'))
  );

  constructor(
    @Inject(WINDOW) private window: Window,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private planStateService: PlanStateService,
    private homeParametersStorageService: HomeParametersStorageService,
    private authService: AuthService
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
        planningAreaName: '"' + this.breadcrumbs[0].name + '"',
        planningAreaId: this.route.snapshot.params['id'],
      },
      restoreFocus: false,
      panelClass: 'no-padding-dialog',
    });
  }
}
