import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink } from '@angular/router';
import { Plan, PreviewPlan } from '@types';
import { canDeletePlanningArea } from '@plan/permissions';
import { take } from 'rxjs';
import { SNACK_NOTICE_CONFIG } from '@shared';
import { AuthService, PlanService } from '@services';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ButtonComponent } from '@styleguide';
import { DeleteDialogComponent } from '@standalone/delete-dialog/delete-dialog.component';

@Component({
  selector: 'app-planning-area-titlebar-menu',
  standalone: true,
  imports: [
    MatIconModule,
    MatMenuModule,
    RouterLink,
    MatDialogModule,
    ButtonComponent,
  ],
  templateUrl: './planning-area-titlebar-menu.component.html',
  styleUrl: './planning-area-titlebar-menu.component.scss',
})
export class PlanningAreaTitlebarMenuComponent {
  @Input() plan!: Plan | PreviewPlan;

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    private planService: PlanService,
    private router: Router
  ) {}

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
            this.snackbar.open(
              `Successfully deleted plan: ${this.plan.name}`,
              'Dismiss',
              SNACK_NOTICE_CONFIG
            );
            this.router.navigate(['/home']);
          });
        }
      });
  }
}
