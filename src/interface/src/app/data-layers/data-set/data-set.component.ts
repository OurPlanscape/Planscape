import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DataLayer, DataLayerSearchResult } from '@types';
import { ButtonComponent, HighlighterDirective } from '@styleguide';
import { MatRadioModule } from '@angular/material/radio';
import { DataLayersStateService } from '../data-layers.state.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-data-set',
  standalone: true,
  imports: [
    NgForOf,
    MatIconModule,
    ButtonComponent,
    NgIf,
    MatRadioModule,
    HighlighterDirective,
    AsyncPipe,
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

  selectedDataLayerId$ = this.dataLayersStateService.selectedDataLayer$.pipe(
    map((dl) => dl?.id)
  );

  constructor(private dataLayersStateService: DataLayersStateService) {}

  selectDataLayer(dataLayer: DataLayer) {
    this.dataLayersStateService.selectDataLayer(dataLayer);
  }
}
