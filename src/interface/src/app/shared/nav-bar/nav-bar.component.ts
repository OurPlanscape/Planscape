import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { WINDOW } from '../../services/window.service';
import { MatDialog } from '@angular/material/dialog';
import { ShareExploreDialogComponent } from '../share-explore-dialog/share-explore-dialog.component';

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

  constructor(
    @Inject(WINDOW) private window: Window,
    private dialog: MatDialog
  ) {}

  print() {
    this.window.print();
  }

  share() {
    this.dialog.open(ShareExploreDialogComponent, { restoreFocus: false });
  }
}
