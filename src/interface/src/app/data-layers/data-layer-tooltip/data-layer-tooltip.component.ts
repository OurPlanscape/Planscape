import { Component, Input } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { BaseLayer, DataLayer } from '@types';
import { getFileExtensionFromFile, getSafeFileName } from '@shared/files';
import { DataLayersService } from '@services/data-layers.service';
import {
  catchError,
  distinctUntilChanged,
  map,
  of,
  ReplaySubject,
  startWith,
  switchMap,
  take,
} from 'rxjs';
import { ButtonComponent } from '@styleguide';
import { AccountRoutingModule } from '@account/account-routing.module';

type DownloadState =
  | { status: 'loading'; link: null; filename: null }
  | { status: 'available'; link: string; filename: string }
  | { status: 'unavailable'; link: null; filename: null };

const unavailableState: DownloadState = {
  status: 'unavailable',
  link: null,
  filename: null,
};

const loadingState: DownloadState = {
  status: 'loading',
  link: null,
  filename: null,
};

@Component({
  selector: 'app-data-layer-tooltip',
  standalone: true,
  imports: [
    AsyncPipe,
    ButtonComponent,
    DecimalPipe,
    MatButtonModule,
    NgIf,
    AccountRoutingModule,
    DatePipe,
  ],
  templateUrl: './data-layer-tooltip.component.html',
  styleUrl: './data-layer-tooltip.component.scss',
})
export class DataLayerTooltipComponent {
  private readonly layerSubject = new ReplaySubject<DataLayer | BaseLayer>(1);

  private _layer!: DataLayer | BaseLayer;

  @Input({ required: true })
  get layer(): DataLayer | BaseLayer {
    return this._layer;
  }
  set layer(value: DataLayer | BaseLayer) {
    this._layer = value;
    this.layerSubject.next(value);
  }

  @Input() showAllData = true;

  readonly downloadState$ = this.layerSubject.pipe(
    map((layer) => layer.id),
    distinctUntilChanged(),
    switchMap((layerId) => {
      if (layerId == null) {
        return of({
          status: 'unavailable',
          link: null,
          filename: null,
        });
      }

      return this.dataLayersService.getPublicUrl(layerId).pipe(
        take(1),
        map(
          (link): DownloadState => ({
            status: 'available',
            link,
            filename: this.transformFilename(link),
          })
        ),
        catchError(() => of(unavailableState)),
        startWith(loadingState)
      );
    })
  );

  constructor(private dataLayersService: DataLayersService) {}

  hasMinMax(): boolean {
    return (
      this.layer.info?.stats?.[0]?.min != undefined &&
      this.layer.info?.stats?.[0]?.max != undefined
    );
  }

  // html `source` field: takes precedence over download
  getRichSource() {
    return this.layer.metadata?.['metadata']?.['distribution']?.['source'];
  }

  // download link (no rich text, just shows button)
  getSourceDownload() {
    return this.layer.metadata?.['metadata']?.['distribution']?.['download'];
  }

  get vintageDate() {
    return this.layer.metadata?.['metadata']?.['identification']?.['date']?.[
      'date'
    ];
  }

  getUnits() {
    const units = this.layer.metadata?.['metadata']?.[
      'identification'
    ]?.keywords?.units?.keywords?.filter((unit: any) => !!unit);

    if (!units || units.length === 0) {
      return '--';
    }
    return units.join(', ');
  }

  transformFilename(downloadPath: string) {
    const urlPath = downloadPath.split('?')[0]; // remove query string
    const originalFilename = urlPath?.substring(urlPath.lastIndexOf('/') + 1); // get last segment
    const extension = getFileExtensionFromFile(originalFilename ?? '');
    // Sanitize the name: lowercase, replace spaces with underscores, remove non-word characters
    const safeName = getSafeFileName(this.layer.name);
    return `${safeName}${extension}`;
  }
}
