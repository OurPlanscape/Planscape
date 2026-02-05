import { Component, EventEmitter, Output } from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { MultiMapConfigState } from '@app/maplibre-map/multi-map-config.state';
import { DrawService } from '@app/maplibre-map/draw.service';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { UploadPlanningAreaBoxComponent } from '@app/explore/upload-planning-area-box/upload-planning-area-box.component';
import { CreatePlanDialogComponent } from '@app/explore/create-plan-dialog/create-plan-dialog.component';
import { ConfirmationDialogComponent } from '@app/standalone/confirmation-dialog/confirmation-dialog.component';
import { BlockDialogComponent } from '@app/standalone/block-dialog/block-dialog.component';

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
    const bbox = this.drawService.getBboxFromUploadedShape();
    this.mapConfigState.updateMapCenter(bbox);
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
      this.openOutsideStateDialog();
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
    return this.dialog.open(CreatePlanDialogComponent, {
      maxWidth: '560px',
      data: {
        drawService: this.drawService,
      },
    });
  }

  private openConfirmExitDialog(): void {
    this.dialog
      .open(ConfirmationDialogComponent, {
        data: {
          title: 'Discard Polygon(s)?',
          body: 'Your polygon(s) have not been saved, are you sure you want to discard?',
          primaryCta: 'Discard',
        },
      })
      .afterClosed()
      .subscribe((confirms: boolean) => {
        if (confirms) {
          this.drawService.clearFeatures();
          this.mapConfigState.enterViewMode();
        }
      });
  }

  private openSaveWarningDialog(): void {
    this.dialog.open(BlockDialogComponent, {
      data: {
        title: 'Planning Area Required',
        body: 'You must add a planning area before saving. Use the drawing tool or upload a valid shapefile to proceed.',
        primaryCta: 'OK',
      },
    });
  }

  private openOutsideStateDialog() {
    this.dialog.open(BlockDialogComponent, {
      data: {
        title:
          'Scenario Planning Available Only in the Contiguous United States',
        body: ` Please adjust your Planning Area to be located within the contiguous United
                States in order to proceed with scenario planning.`,
        primaryCta: 'Adjust Planning Area',
      },
    });
  }
}
