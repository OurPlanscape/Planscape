import { Component, EventEmitter, Output } from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MapConfigState } from '../map-config.state';
import { MultiMapConfigState } from '../multi-map-config.state';
import { DrawService } from '../draw.service';
import { PlanCreateDialogComponent } from '../../map/plan-create-dialog/plan-create-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { Geometry, feature } from '@turf/helpers';
import { NoPlanningAreaModalComponent } from '../../plan/no-planning-area-modal/no-planning-area-modal.component';
import { ConfirmExitDrawingModalComponent } from '../../plan/confirm-exit-drawing-modal/confirm-exit-drawing-modal.component';
import { Router } from '@angular/router';
import { PlanService } from '@services';
import { Feature, MultiPolygon, Polygon } from 'geojson';
import { take } from 'rxjs';

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
  ],
  templateUrl: './explore-modes-toggle.component.html',
  styleUrl: './explore-modes-toggle.component.scss',
})
export class ExploreModesToggleComponent {
  @Output() scenarioUpload = new EventEmitter<void>();

  drawModeEnabled$ = this.mapConfigState.drawingModeEnabled$;

  constructor(
    private mapConfigState: MapConfigState,
    private multiMapConfigState: MultiMapConfigState,
    private dialog: MatDialog,
    private drawService: DrawService,
    private planService: PlanService,
    private router: Router
  ) {}

  handleDrawingButton() {
    // first, ensure we're only on single map view
    this.multiMapConfigState.setLayoutMode(1);
    this.mapConfigState.enterDrawingMode();
  }

  handleCancelButton() {
    //if there are features on the map... we show a confirm dialog
    // otherwise just exit
    if (this.drawService.hasPolygonFeatures()) {
      this.openConfirmExitDialog();
    } else {
      this.mapConfigState.exitDrawingMode();
    }
  }

  handleSaveButton() {
    // if user has finished a polygon, show an upload dialog
    // but if user hasn't drawn a polygon, a notice should appear
    if (!this.drawService.hasPolygonFeatures()) {
      this.openSaveWarningDialog();
    } else {
      if (!this.drawService.isDrawingWithinBoundary()) {
        console.log('cant save - outside boundary');
        return;
      }
      const polygons = this.drawService.getPolygonsSnapshot();
      const polygonFeatures = polygons as Feature<Polygon>[];
      const coordinates = polygonFeatures.map(
        (feature) => feature.geometry.coordinates
      );
      const combinedGeometry: MultiPolygon = {
        type: 'MultiPolygon',
        coordinates,
      };
      const geoJSON = feature(combinedGeometry);
      // TODO: replace with frontend acreage function when ready
      this.planService
        .getTotalArea(geoJSON.geometry)
        .pipe(take(1))
        .subscribe((acres: number) => {
          if (acres && geoJSON) {
            this.openPlanCreateDialog(acres, geoJSON.geometry)
              .afterClosed()
              .subscribe((id) => {
                if (id) {
                  this.router.navigate(['plan', id]);
                }
              });
          }
        });
    }
  }

  clickedUpload() {
    this.scenarioUpload.emit();
  }

  private openPlanCreateDialog(area: number, shape: Geometry) {
    return this.dialog.open(PlanCreateDialogComponent, {
      maxWidth: '560px',
      data: {
        shape: shape,
        totalArea: area,
      },
    });
  }

  private openConfirmExitDialog(): void {
    this.dialog
      .open(ConfirmExitDrawingModalComponent)
      .afterClosed()
      .subscribe((modalResponse: any) => {
        if (modalResponse === true) {
          this.mapConfigState.exitDrawingMode();
        }
      });
  }

  private openSaveWarningDialog(): void {
    this.dialog.open(NoPlanningAreaModalComponent);
  }
}
