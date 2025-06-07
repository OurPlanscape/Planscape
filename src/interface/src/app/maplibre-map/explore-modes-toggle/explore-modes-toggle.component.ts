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
import { Geometry } from '@turf/helpers';
import { NoPlanningAreaModalComponent } from '../../plan/no-planning-area-modal/no-planning-area-modal.component';
import { ConfirmExitDrawingModalComponent } from '../../plan/confirm-exit-drawing-modal/confirm-exit-drawing-modal.component';
import { PlanService } from '@services';
import { GeoJSON } from 'geojson';
import { take } from 'rxjs';
import { getTotalAcreage, GeoJSONStoreFeatures } from 'src/app/utils/geoconversions';

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
    private planService: PlanService
  ) { }

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
      const area = this.drawService.getTotalAcreage();
      const shape = this.drawService.getGeometry();
      const geom = shape.geometry;
      const snapshot = this.drawService.getPolygonsSnapshot();
      if (snapshot) {
        console.log('here is the snapshot:', snapshot[0]);
        const newerAcres = getTotalAcreage(snapshot[0] as GeoJSONStoreFeatures);
        console.log('newer acres is:', newerAcres);
      }
      console.log('shape is:', shape);
      console.log('acreage is:', area);
      console.log('geom we are sending is:', geom);

      if (shape) {
        const geoJSONFeature = shape;

        const backendArea = this.planService.getTotalArea(geoJSONFeature as GeoJSON).pipe(take(1)).subscribe(value => {
          console.log('what is the backend result?: ', value); // This will log the first emitted number
        });
        console.log('backend area was:', backendArea);
      }
      if (shape) {
        this.openPlanCreateDialog(area, shape);
      }
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
