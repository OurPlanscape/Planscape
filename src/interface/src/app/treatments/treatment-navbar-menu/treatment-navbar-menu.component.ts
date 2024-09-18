import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyButtonModule } from '@angular/material/legacy-button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DeleteDialogComponent } from '../../standalone/delete-dialog/delete-dialog.component';
import { take } from 'rxjs';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { TreatmentsState } from '../treatments.state';
import { TreatmentsService } from '@services/treatments.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AfterDuplicateTreatmentDialogComponent } from '../after-duplicate-treatment-dialog/after-duplicate-treatment-dialog.component';
import { TreatmentPlan } from '@types';

@Component({
  selector: 'app-treatment-navbar-menu',
  standalone: true,
  imports: [MatIconModule, MatLegacyButtonModule, MatMenuModule],
  templateUrl: './treatment-navbar-menu.component.html',
  styleUrl: './treatment-navbar-menu.component.scss',
})
export class TreatmentNavbarMenuComponent {
  constructor(
    private treatmentsState: TreatmentsState,
    private treatmentsService: TreatmentsService,
    private dialog: MatDialog,
    private matSnackBar: MatSnackBar
  ) {}

  @Input() treatmentPlanName = '';
  @Output() treatmentPlanDeleted = new EventEmitter();
  @Output() goToDuplicatedPlan = new EventEmitter<number>();

  deleteTreatmentPlan() {
    const dialogRef: MatDialogRef<DeleteDialogComponent> = this.dialog.open(
      DeleteDialogComponent,
      {
        data: {
          name: '"' + this.treatmentPlanName + '"',
        },
      }
    );
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.treatmentsService
            .deleteTreatmentPlan(this.treatmentsState.getTreatmentPlanId())
            .subscribe({
              next: () => {
                this.matSnackBar.open(
                  `Deleted Treatment Plan '${this.treatmentPlanName}'`,
                  'Dismiss',
                  SNACK_NOTICE_CONFIG
                );
                this.treatmentPlanDeleted.emit();
              },
              error: () => {
                this.matSnackBar.open(
                  `[Error] Cannot delete treatment plan '${this.treatmentPlanName}'`,
                  'Dismiss',
                  SNACK_ERROR_CONFIG
                );
              },
            });
        }
      });
  }

  duplicateTreatmentPlan() {
    this.treatmentsService
      .duplicateTreatmentPlan(this.treatmentsState.getTreatmentPlanId())
      .subscribe({
        next: (newPlan) => {
          this.openAfterDuplicateTreatmentDialog(newPlan);
        },
        error: () => {
          this.matSnackBar.open(
            `[Error] Cannot duplicate treatment plan`,
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
        },
      });
  }

  openAfterDuplicateTreatmentDialog(newPlan: TreatmentPlan) {
    this.dialog
      .open(AfterDuplicateTreatmentDialogComponent, {
        data: { name: this.treatmentPlanName },
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          //update
          this.goToDuplicatedPlan.emit(newPlan.id);
        }
      });
  }
}
