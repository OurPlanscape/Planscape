import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { Plan, PreviewPlan } from '@types';
import {
  canDeletePlanningArea,
  canViewCollaborators,
} from '../../plan/permissions';
import {
  MatLegacyDialog as MatDialog,
  MatLegacyDialogRef as MatDialogRef,
} from '@angular/material/legacy-dialog';
import { DeleteDialogComponent } from '../delete-dialog/delete-dialog.component';
import { take } from 'rxjs';
import { SNACK_NOTICE_CONFIG } from '@shared';
import { AuthService, PlanService } from '@services';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SharePlanDialogComponent } from '../../home/share-plan-dialog/share-plan-dialog.component';

@Component({
  selector: 'app-planning-area-menu',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatMenuModule, RouterLink],
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

  sharePlan() {
    this.dialog.open(SharePlanDialogComponent, {
      data: {
        planningAreaName: '"' + this.plan.name + '"',
        planningAreaId: this.plan.id,
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
    const dialogRef: MatDialogRef<DeleteDialogComponent> = this.dialog.open(
      DeleteDialogComponent,
      {
        data: {
          name: '"' + this.plan.name + '"',
        },
      }
    );
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
