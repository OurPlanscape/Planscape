import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { ResultsLayer } from '../analysis/analysis.component';
import { MatIconModule } from '@angular/material/icon';
import { PopoverComponent } from '@styleguide/popover/popover.component';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { combineLatest, map, take } from 'rxjs';
import { MultiMapConfigState } from '@app/maplibre-map/multi-map-config.state';

@Component({
  selector: 'app-climate-layers',
  standalone: true,
  imports: [CommonModule, MatIconModule, PopoverComponent],
  templateUrl: './climate-layers.component.html',
  styleUrl: './climate-layers.component.scss',
})
export class ClimateLayersComponent implements OnInit {
  @Input({ required: true }) layers!: ResultsLayer[];

  private dataLayersState = inject(DataLayersStateService);
  private multiMapState = inject(MultiMapConfigState);

  viewedLayerId$ = this.dataLayersState.viewedDataLayer$.pipe(
    map((layer) => layer?.id)
  );

  ngOnInit(): void {
    combineLatest([
      this.dataLayersState.viewedDataLayer$.pipe(take(1)),
      this.multiMapState.selectedMapId$.pipe(take(1)),
    ]).subscribe(([layer, map]) => {
      const mpatMatrixLayer = this.layers.find((l) => l.id === 'mpat_matrix');
      // If there is no viewed layer we should select mpat_matrix as default if it exist on the layers list and we are on Map1
      if (!layer && mpatMatrixLayer && map === 1) {
        this.selectLayer(mpatMatrixLayer);
      }
    });
  }

  selectLayer(layer: ResultsLayer): void {
    if (layer.datalayer) {
      this.dataLayersState.selectDataLayer(layer.datalayer);
    }
  }
}
