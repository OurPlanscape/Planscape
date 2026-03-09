import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { OutputLayer } from '../analysis/analysis.component';
import { MatIconModule } from '@angular/material/icon';
import { PopoverComponent } from '@styleguide/popover/popover.component';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-output-layers',
  standalone: true,
  imports: [CommonModule, MatIconModule, PopoverComponent],
  templateUrl: './output-layers.component.html',
  styleUrl: './output-layers.component.scss',
})
export class OutputLayersComponent {
  @Input({ required: true }) layers!: OutputLayer[];

  private dataLayersState = inject(DataLayersStateService);

  viewedLayerId$ = this.dataLayersState.viewedDataLayer$.pipe(
    map((layer) => layer?.id)
  );

  selectLayer(layer: OutputLayer): void {
    if (layer.datalayer) {
      this.dataLayersState.selectDataLayer(layer.datalayer);
    }
  }
}
