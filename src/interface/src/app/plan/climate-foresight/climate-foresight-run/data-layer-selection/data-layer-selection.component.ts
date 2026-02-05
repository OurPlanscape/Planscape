import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTreeModule } from '@angular/material/tree';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ButtonComponent, SectionComponent } from '@styleguide';
import { Plan, ClimateForesightRun, DataLayer } from '@types';
import { ClimateForesightService } from '@services';
import { StepDirective } from '@styleguide/steps/step.component';
import { MapConfigService } from '@maplibre/map-config.service';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { ClimateForesightMapComponent } from '@plan/climate-foresight/climate-foresight-run/climate-foresight-map/climate-foresight-map.component';
import { MAX_CLIMATE_DATALAYERS } from '@shared';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-data-layer-selection',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    MatButtonModule,
    MatTreeModule,
    MatProgressSpinnerModule,
    SectionComponent,
    DataLayersComponent,
    ClimateForesightMapComponent,
  ],
  providers: [
    { provide: StepDirective, useExisting: DataLayerSelectionComponent },
    MapConfigService,
  ],
  templateUrl: './data-layer-selection.component.html',
  styleUrls: ['./data-layer-selection.component.scss'],
})
export class DataLayerSelectionComponent
  extends StepDirective<any>
  implements OnChanges
{
  @Input() plan: Plan | null = null;
  @Input() run: ClimateForesightRun | null = null;
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() complete = new EventEmitter<any>();

  selectedDataLayers!: DataLayer[];

  maxDataLayers = MAX_CLIMATE_DATALAYERS;

  form = new FormGroup({
    dataLayers: new FormControl<DataLayer[]>(
      [],
      [Validators.required, Validators.minLength(1)]
    ),
  });

  isBrowserOpen = false;

  selectedCount$ = this.dataLayersState.selectedLayersCount$;

  canProceed$ = this.dataLayersState.hasSelectedDatalayers$;

  canSelectMore$ = this.dataLayersState.canSelectMoreDatalayers$;

  constructor(
    private climateForesightService: ClimateForesightService,
    private dataLayersState: DataLayersStateService,
    private cdr: ChangeDetectorRef
  ) {
    super();

    // Saving datalayers on the form so we can send to the parent on save
    this.dataLayersState.selectedDataLayers$
      .pipe(untilDestroyed(this))
      .subscribe((datalayers) => {
        this.form.patchValue({
          dataLayers: datalayers,
        });
        this.selectedDataLayers = datalayers;
        this.form.markAsTouched();
        this.cdr.markForCheck();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['run'] && this.run?.input_datalayers) {
      this.loadSavedDataLayers();
    }
  }

  private loadSavedDataLayers(): void {
    if (this.run?.input_datalayers) {
      const layerIds = this.run.input_datalayers.map(
        (config) => config.datalayer
      );

      this.climateForesightService.getDataLayers().subscribe({
        next: (layers: DataLayer[]) => {
          const dls = layers.filter((layer) => layerIds.includes(layer.id));
          this.dataLayersState.updateSelectedLayers(dls);
        },
        error: (err: any) => {
          console.error('Failed to load saved data layers:', err);
        },
      });
    }
  }

  toggleBrowser(): void {
    this.isBrowserOpen = !this.isBrowserOpen;
  }

  removeDataLayer(layer: DataLayer): void {
    this.dataLayersState.removeSelectedLayer(layer);
  }

  getData() {
    const datalayers = this.form.getRawValue().dataLayers;
    return {
      dataLayers: datalayers,
    };
  }

  saveAndContinue(): void {
    this.complete.emit(this.getData());
  }
}
