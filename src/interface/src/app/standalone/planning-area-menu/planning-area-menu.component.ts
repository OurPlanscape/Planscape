import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { Plan, PreviewPlan } from '@types';
import {
  canDeletePlanningArea,
  canViewCollaborators,
} from '../../plan/permissions';
import { take } from 'rxjs';
import { SNACK_NOTICE_CONFIG } from '@shared';
import { AuthService, PlanService } from '@services';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SharePlanDialogComponent } from '../../home/share-plan-dialog/share-plan-dialog.component';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { DeletePlanningAreaComponent } from '../delete-planning-area/delete-planning-area.component';
import { MatLegacyButtonModule } from '@angular/material/legacy-button';

@Component({
  selector: 'app-planning-area-menu',
  standalone: true,
  imports: [
    MatLegacyButtonModule,
    MatIconModule,
    MatMenuModule,
    RouterLink,
    MatDialogModule,
  ],
  templateUrl: './planning-area-menu.component.html',
  styleUrl: './planning-area-menu.component.scss',
})
export class PlanningAreaMenuComponent {
  @Input() plan!: Plan | PreviewPlan;
  @Output() afterDelete = new EventEmitter();

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    private planService: PlanService
  ) {}

  get shareEnabled() {
    return canViewCollaborators(this.plan);
  }

  stopClickEvent(event: MouseEvent) {
    event.stopPropagation();
    return false;
  }

  sharePlan() {
    this.dialog.open(SharePlanDialogComponent, {
      data: {
        plan: this.plan,
      },
      restoreFocus: false,
      panelClass: 'no-padding-dialog',
    });
  }

  get canDeletePlanningArea() {
    const user = this.authService.currentUser();
    if (!user) {
      return false;
    }
    return canDeletePlanningArea(this.plan, user);
  }

  deletePlan() {
    const dialogRef: MatDialogRef<DeletePlanningAreaComponent> =
      this.dialog.open(DeletePlanningAreaComponent, {
        data: {
          name: '"' + this.plan.name + '"',
        },
      });
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.planService.deletePlan(this.plan.id).subscribe(() => {
            this.afterDelete.emit();
            this.snackbar.open(
              `Successfully deleted plan: ${this.plan.name}`,
              'Dismiss',
              SNACK_NOTICE_CONFIG
            );
          });
        }
      });
  }
}
