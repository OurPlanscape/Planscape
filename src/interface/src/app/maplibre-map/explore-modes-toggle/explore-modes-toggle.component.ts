import { Component, EventEmitter, Output } from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MapConfigState } from '../map-config.state';
import { MultiMapConfigState } from '../multi-map-config.state';
import { DrawService } from '../draw.service';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { NoPlanningAreaModalComponent } from '../../plan/no-planning-area-modal/no-planning-area-modal.component';
import { ConfirmExitDrawingModalComponent } from '../../plan/confirm-exit-drawing-modal/confirm-exit-drawing-modal.component';
import { UploadPlanningAreaBoxComponent } from 'src/app/explore/upload-planning-area-box/upload-planning-area-box.component';
import { OutsideStateDialogComponentComponent } from 'src/app/plan/outside-state-dialog-component/outside-state-dialog-component.component';
import { ExplorePlanCreateDialogComponent } from '../explore-plan-create-dialog/explore-plan-create-dialog.component';
@Component({
  selector: 'app-explore-modes-selection-toggle',
  standalone: true,
  imports: [
    AsyncPipe,
    MatDividerModule,
    MatIconModule,
    MatTooltipModule,
    NgClass,
    NgIf,
    UploadPlanningAreaBoxComponent,
  ],
  templateUrl: './explore-modes-toggle.component.html',
  styleUrl: './explore-modes-toggle.component.scss',
})
export class ExploreModesToggleComponent {
  @Output() scenarioUpload = new EventEmitter<void>();

  mapInteractionMode$ = this.mapConfigState.mapInteractionMode$;

  constructor(
    private mapConfigState: MapConfigState,
    private multiMapConfigState: MultiMapConfigState,
    private dialog: MatDialog,
    private drawService: DrawService,
    private router: Router
  ) {}

  showUploadForm = false;

  handleDrawingButton() {
    // first, ensure we're only on single map view
    this.showUploadForm = false;
    this.multiMapConfigState.setLayoutMode(1);
    this.mapConfigState.enterDrawingMode();
  }

  handleUploadButton() {
    this.showUploadForm = true;
    this.drawService.start();
    this.multiMapConfigState.setLayoutMode(1);
    this.mapConfigState.enterUploadMode();
    this.drawService.setMode('select');
  }

  uploadedShape() {
    this.showUploadForm = false;
    this.drawService.setMode('select');
  }

  handleCancelButton() {
    // this is contextual, so if we are in the upload mode, this will just cancel our upload.
    if (this.showUploadForm === true) {
      this.showUploadForm = false;
      this.mapConfigState.enterViewMode();
    } else {
      //if there are features on the map... we show a confirm dialog
      // otherwise just exit
      if (this.drawService.hasPolygonFeatures()) {
        this.openConfirmExitDialog();
      } else {
        this.mapConfigState.enterViewMode();
      }
    }
  }

  handleSaveButton() {
    // if user has finished a polygon, show an upload dialog
    // but if user hasn't drawn a polygon, a notice should appear
    if (!this.drawService.hasPolygonFeatures()) {
      this.openSaveWarningDialog();
    } else if (!this.drawService.isDrawingWithinBoundary()) {
      this.dialog.open(OutsideStateDialogComponentComponent, {
        maxWidth: '560px',
      });
      return;
    } else {
      this.openPlanCreateDialog()
        .afterClosed()
        .subscribe((id) => {
          if (id) {
            this.router.navigate(['plan', id]);
          }
        });
    }
  }

  private openPlanCreateDialog() {
    return this.dialog.open(ExplorePlanCreateDialogComponent, {
      maxWidth: '560px',
      data: {
        drawService: this.drawService,
      },
    });
  }

  private openConfirmExitDialog(): void {
    this.dialog
      .open(ConfirmExitDrawingModalComponent)
      .afterClosed()
      .subscribe((modalResponse: any) => {
        if (modalResponse === true) {
          this.mapConfigState.enterViewMode();
        }
      });
  }

  private openSaveWarningDialog(): void {
    this.dialog.open(NoPlanningAreaModalComponent);
  }
}
