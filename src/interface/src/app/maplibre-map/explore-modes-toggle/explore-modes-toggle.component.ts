import { Component, EventEmitter, Output } from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MapConfigState } from '../map-config.state';
import { MultiMapConfigState } from '../multi-map-config.state';
import { take } from 'rxjs';
import { PlanCreateDialogComponent } from '../../map/plan-create-dialog/plan-create-dialog.component';
import { MatDialog } from '@angular/material/dialog';
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
    private dialog: MatDialog
  ) {}

  handleDrawingButton() {
    // first, ensure we're only on single map view
    this.multiMapConfigState.setLayoutMode(1);
    this.mapConfigState.enterDrawingMode();
  }

  handleCancelButton() {
    //TODO: if there are features on the map... we show a dialog
    // otherwise...
    //TODO: possible to actively query terradraw?
    this.mapConfigState.hasDrawnFeature$
      .pipe(take(1))
      .subscribe((hasFeature) => {
        if (hasFeature === true) {
          console.log('we have a feature!');
        } else {
          this.mapConfigState.exitDrawingMode();
        }
      });
    this.mapConfigState.exitDrawingMode();
  }

  handleSaveButton() {
    // TODO: if user has finished a polygon, show an upload dialog
    // (proposed) if user hasn't drawn a polygon, a notice should appear
    this.mapConfigState.hasDrawnFeature$
      .pipe(take(1))
      .subscribe((hasFeature) => {
        if (hasFeature === true) {
          //TODO: grab current features
          this.openPlanCreateDialog(0);
        } else {
          console.log('we dont have a feautre!');
        }
      });
  }

  clickedUpload() {
    this.scenarioUpload.emit();
  }

  private openPlanCreateDialog(area: number) {
    return this.dialog.open(PlanCreateDialogComponent, {
      maxWidth: '560px',
      data: {
        shape: {},
        totalArea: area,
      },
    });
  }
}
