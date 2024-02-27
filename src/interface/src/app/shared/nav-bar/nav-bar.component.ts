import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { WINDOW } from '../../services/window.service';
import { MatDialog } from '@angular/material/dialog';
import { ShareExploreDialogComponent } from '../share-explore-dialog/share-explore-dialog.component';
import { SharePlanDialogComponent } from '../../home/share-plan-dialog/share-plan-dialog.component';
import { FeatureService } from '../../features/feature.service';
import { ActivatedRoute } from '@angular/router';

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

  hasSharePlanFeatureFLag =
    this.featureService.isFeatureEnabled('show_share_modal');

  constructor(
    @Inject(WINDOW) private window: Window,
    private dialog: MatDialog,
    private featureService: FeatureService,
    private route: ActivatedRoute
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
        name: '"' + this.breadcrumbs[0].name + '"',
        id: this.route.snapshot.params['id'],
      },
      restoreFocus: false,
      panelClass: 'no-padding-dialog',
    });
  }
}
