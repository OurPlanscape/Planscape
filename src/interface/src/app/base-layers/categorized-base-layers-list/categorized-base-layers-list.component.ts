import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { BaseLayer, CategorizedBaseLayers } from '@types';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { BASE_LAYERS_DEFAULT } from '@shared';
import { BaseLayersStateService } from '../base-layers.state.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-categorized-base-layers-list',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    AsyncPipe,
    MatRadioModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './categorized-base-layers-list.component.html',
  styleUrl: './categorized-base-layers-list.component.scss',
})
export class CategorizedBaseLayersListComponent
  implements OnInit, AfterViewInit
{
  @Input() categorizedBaseLayer!: CategorizedBaseLayers;
  @Input() allSelectedLayersIds: number[] = [];

  @Output() layerSelected = new EventEmitter<{
    layer: BaseLayer;
    isMulti: boolean;
  }>();

  @ViewChild('listContent') listContent!: ElementRef<HTMLElement>;

  private baseLayerStateService: BaseLayersStateService = inject(
    BaseLayersStateService
  );

  expanded = false;

  BASE_LAYERS_DEFAULT = BASE_LAYERS_DEFAULT;

  loadingLayers$ = this.baseLayerStateService.loadingLayers$;

  ngOnInit(): void {
    // expand if any selectedLayersId on this categorized list
    this.expanded = this.categorizedBaseLayer.layers.some((layer) =>
      this.allSelectedLayersIds.includes(layer.id)
    );
  }

  ngAfterViewInit(): void {
    if (this.expanded) {
      this.scrollToSelectedItems();
    }
  }

  onLayerChange(layer: any, isMulti: boolean): void {
    if (!isMulti) {
      this.baseLayerStateService.resetSourceIds();
    }
    this.layerSelected.emit({ layer, isMulti });
  }

  isSelectedLayer(id: number): boolean {
    return this.allSelectedLayersIds.includes(id);
  }

  private scrollToSelectedItems() {
    const item = this.listContent.nativeElement.querySelector('[selected]');
    if (item) {
      item.scrollIntoView({
        behavior: 'instant',
        block: 'center',
      });
    }
  }
}
