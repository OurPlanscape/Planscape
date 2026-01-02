import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DataLayer, DataLayerSearchResult } from '@types';
import { ButtonComponent, HighlighterDirective } from '@styleguide';
import { MatRadioModule } from '@angular/material/radio';
import { DataLayersStateService } from '../data-layers.state.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { map } from 'rxjs';
import { MatMenuModule } from '@angular/material/menu';
import { DataLayerTooltipComponent } from '../data-layer-tooltip/data-layer-tooltip.component';

@Component({
  selector: 'app-data-set',
  standalone: true,
  imports: [
    NgForOf,
    MatIconModule,
    ButtonComponent,
    NgIf,
    MatProgressSpinnerModule,
    MatRadioModule,
    HighlighterDirective,
    AsyncPipe,
    MatMenuModule,
    DataLayerTooltipComponent,
  ],
  templateUrl: './data-set.component.html',
  styleUrl: './data-set.component.scss',
})
export class DataSetComponent {
  @Input() name = '';
  @Input() organizationName = '';
  @Input() layers?: DataLayerSearchResult[];
  @Input() path?: string[];
  @Input() searchTerm = '';

  @Output() selectDataset = new EventEmitter<void>();

  loadingDataLayer$ = this.dataLayersStateService.loadingLayer$;

  selectedDataLayerId$ = this.dataLayersStateService.viewedDataLayer$.pipe(
    map((dl) => dl?.id)
  );

  displayTooltipLayer = false;

  constructor(private dataLayersStateService: DataLayersStateService) {}

  selectDataLayer(dataLayer: DataLayer) {
    this.dataLayersStateService.selectDataLayer(dataLayer);
  }
}
