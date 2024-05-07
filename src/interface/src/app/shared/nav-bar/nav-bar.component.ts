import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { PlanStateService, WINDOW } from '@services';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { ShareExploreDialogComponent } from '../share-explore-dialog/share-explore-dialog.component';
import { SharePlanDialogComponent } from '../../home/share-plan-dialog/share-plan-dialog.component';
import { FeatureService } from '../../features/feature.service';
import { ActivatedRoute } from '@angular/router';
import { map, of } from 'rxjs';
import { canViewCollaborators } from '../../plan/permissions';

export interface Breadcrumb {
  name: string;
  path?: string;
}

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss'],
})
export class NavBarComponent {
  @Input() breadcrumbs: Breadcrumb[] = [];
  @Input() area: 'SCENARIOS' | 'EXPLORE' | 'SCENARIO' = 'EXPLORE';
  @Output() goBack = new EventEmitter<void>();

  hasSharePlanFeatureFlag =
    this.featureService.isFeatureEnabled('show_share_modal');

  canSharePlan$ =
    this.route.snapshot?.params && this.route.snapshot?.params['id']
      ? this.planStateService
          .getPlan(this.route.snapshot.params['id'])
          .pipe(map((plan) => canViewCollaborators(plan)))
      : of(false);

  constructor(
    @Inject(WINDOW) private window: Window,
    private dialog: MatDialog,
    private featureService: FeatureService,
    private route: ActivatedRoute,
    private planStateService: PlanStateService
  ) {}

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
