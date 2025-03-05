import { Component, Inject, Input, OnInit } from '@angular/core';
import { LegacyPlanStateService, WINDOW } from '@services';

import { ShareExploreDialogComponent } from '../share-explore-dialog/share-explore-dialog.component';
import { SharePlanDialogComponent } from '../../home/share-plan-dialog/share-plan-dialog.component';
import { ActivatedRoute, Params } from '@angular/router';
import { map, of } from 'rxjs';
import { canViewCollaborators } from '../../plan/permissions';
import { HomeParametersStorageService } from '@services/local-storage.service';
import { MatDialog } from '@angular/material/dialog';

export type NavView =
  | 'Explore'
  | 'Planning Area'
  | 'Scenario'
  | 'Treatment Plan'
  | 'Project Area'
  | 'Direct Treatment Impacts'
  | '';

export interface NavState {
  currentView: NavView;
  currentRecordName: string;
  backLink?: string;
}

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

  @Input() navState?: NavState | null = null;

  params: Params | null = null;

  canSharePlan$ =
    this.route.snapshot?.params && this.route.snapshot?.params['id']
      ? this.LegacyPlanStateService.getPlan(
          this.route.snapshot.params['id']
        ).pipe(map((plan) => canViewCollaborators(plan)))
      : of(false);

  constructor(
    @Inject(WINDOW) private window: Window,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private LegacyPlanStateService: LegacyPlanStateService,
    private homeParametersStorageService: HomeParametersStorageService
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
        planningAreaName: this.navState?.currentRecordName,
        planningAreaId: this.route.snapshot.params['id'],
      },
      restoreFocus: false,
      panelClass: 'no-padding-dialog',
    });
  }
}
