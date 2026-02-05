import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { Plan, PreviewPlan } from '@types';
import {
  canDeletePlanningArea,
  canEditPlanName,
  canViewCollaborators,
} from '@plan/permissions';
import { take } from 'rxjs';
import { SNACK_BOTTOM_NOTICE_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { AuthService, PlanService } from '@services';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SharePlanDialogComponent } from '@home/share-plan-dialog/share-plan-dialog.component';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { CreatePlanDialogComponent } from '@explore/create-plan-dialog/create-plan-dialog.component';
import { NgIf } from '@angular/common';
import { DeleteDialogComponent } from '@standalone/delete-dialog/delete-dialog.component';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-planning-area-menu',
  standalone: true,
  imports: [
    NgIf,
    MatButtonModule,
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
  @Output() afterRename = new EventEmitter();

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    private planService: PlanService,
    private breadcrumbService: BreadcrumbService
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

  get canEditPlanName() {
    const user = this.authService.currentUser();
    if (!user) {
      return false;
    }
    return canEditPlanName(this.plan, user);
  }

  editPlanName() {
    const dialogRef: MatDialogRef<CreatePlanDialogComponent> = this.dialog.open(
      CreatePlanDialogComponent,
      {
        data: {
          planName: this.plan.name,
          planId: this.plan.id,
        },
      }
    );
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.snackbar.open(
            `Planning area name has been updated`,
            'Dismiss',
            SNACK_BOTTOM_NOTICE_CONFIG
          );
          this.afterRename.emit();
        }
      });
  }

  deletePlan() {
    const dialogRef: MatDialogRef<DeleteDialogComponent> = this.dialog.open(
      DeleteDialogComponent,
      {
        data: {
          title: 'Delete planning area "' + this.plan.name + '"?',
          body: ` Are you sure you want to delete this planning area? All scenarios of this
                  planning area will be permanently deleted, and users who have access to this
                  planning area will lose the access.`,
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

  saveBreadcrumbs() {
    this.breadcrumbService.updateBreadCrumb({
      label: 'Explore: ' + this.plan.name,
      backUrl: '/',
    });
  }
}
