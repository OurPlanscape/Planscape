import { Component, Inject } from '@angular/core';
import { BaseLayerType } from '@types';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-map-layer-select-dialog',
  templateUrl: './map-layer-select-dialog.component.html',
  styleUrl: './map-layer-select-dialog.component.scss',
})
export class MapLayerSelectDialogComponent {
  disableDeleteButton = false;

  constructor(
    @Inject(MatDialogRef)
    private dialogRef: MatDialogRef<MapLayerSelectDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      selectedLayer: number;
    }
  ) {}

  givenLayer = this.data.selectedLayer;
  currentLayer = this.givenLayer;
  baseLayerTypes: number[] = [
    BaseLayerType.Road,
    BaseLayerType.Terrain,
    BaseLayerType.Satellite,
  ];
  readonly BaseLayerType = BaseLayerType;

  cancel(): void {
    this.dialogRef.close(undefined);
  }

  confirm(): void {
    this.dialogRef.close(this.currentLayer);
  }
}
