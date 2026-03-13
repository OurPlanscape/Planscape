import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
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
export class ClimateLayersComponent {
  @Input({ required: true }) layers!: ResultsLayer[];

  private dataLayersState = inject(DataLayersStateService);

  viewedLayerId$ = this.dataLayersState.viewedDataLayer$.pipe(
    map((layer) => layer?.id)
  );

  selectLayer(layer: ResultsLayer): void {
    if (layer.datalayer) {
      this.dataLayersState.selectDataLayer(layer.datalayer);
    }
  }
}
