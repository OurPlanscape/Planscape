import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { ResultsLayer } from '../analysis/analysis.component';
import { MatIconModule } from '@angular/material/icon';
import { PopoverComponent } from '@styleguide/popover/popover.component';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-climate-layers',
  standalone: true,
  imports: [CommonModule, MatIconModule, PopoverComponent],
  templateUrl: './climate-layers.component.html',
  styleUrl: './climate-layers.component.scss',
})
export class ClimateLayersComponent implements OnInit {
  @Input({ required: true }) layers!: ResultsLayer[];
  @Input() selectedLayer?: ResultsLayer;

  private dataLayersState = inject(DataLayersStateService);

  ngOnInit(): void {
    if (this.selectedLayer?.datalayer) {
      this.dataLayersState.selectDataLayer(this.selectedLayer.datalayer);
    }
  }

  viewedLayerId$ = this.dataLayersState.viewedDataLayer$.pipe(
    map((layer) => layer?.id)
  );

  selectLayer(layer: ResultsLayer): void {
    if (layer.datalayer) {
      this.dataLayersState.selectDataLayer(layer.datalayer);
    }
  }
}
