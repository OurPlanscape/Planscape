import { Component, Input, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { Metadata, RasterInfo } from '@types';
import { BrowseDataLayer } from '@api/planscapeAPI.schemas';
import { getFileExtensionFromFile, getSafeFileName } from '@shared/files';
import { DatalayersService } from '@api/datalayers/datalayers.service';
import { map, Observable, shareReplay, take } from 'rxjs';
import { ButtonComponent } from '@styleguide';
import { AccountRoutingModule } from '@account/account-routing.module';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
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
export class DataLayerTooltipComponent implements OnInit {
  @Input() layer!: BrowseDataLayer;

  downloadLink$: Observable<string> | null = null;
  loadingLink = false;
  filename: string | null = null;

  constructor(private datalayersService: DatalayersService) {}

  ngOnInit() {
    this.loadingLink = true;
    this.downloadLink$ = this.datalayersService
      .datalayersUrlsRetrieve(this.layer.id)
      .pipe(map((d) => d.layer_url), take(1), shareReplay(1));

    this.downloadLink$.pipe(untilDestroyed(this)).subscribe((link) => {
      this.loadingLink = false;
      this.filename = this.transformFilename(link);
    });
  }

  // Narrow `info` to RasterInfo at the component boundary; the template binds
  // to `firstStat()` so it can use typed `.min` / `.max` without re-asserting
  // the raster shape inline.
  private get rasterInfo(): RasterInfo | null {
    return this.layer.info as RasterInfo | null;
  }

  firstStat() {
    return this.rasterInfo?.stats?.[0] ?? null;
  }

  hasMinMax(): boolean {
    const stat = this.firstStat();
    return stat?.min != undefined && stat?.max != undefined;
  }

  private get narrowedMetadata(): Metadata | null {
    return this.layer.metadata as Metadata | null;
  }

  getSource() {
    return this.narrowedMetadata?.['metadata']?.['distribution']?.['download'];
  }

  get vintageDate() {
    return this.narrowedMetadata?.['metadata']?.['identification']?.['date']?.[
      'date'
    ];
  }

  getUnits() {
    const units = this.narrowedMetadata?.['metadata']?.[
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
