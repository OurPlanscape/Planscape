import {
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import FeatureService from 'mapbox-gl-arcgis-featureserver';
import {
  LngLat,
  Map as MapLibreMap,
  MapGeoJSONFeature,
  MapLayerMouseEvent,
  MapLibreEvent,
} from 'maplibre-gl';
import { BaseLayer, BaseLayerTooltipData } from '@types';
import {
  defaultBaseLayerFill,
  defaultBaseLayerLine,
} from '@app/maplibre-map/maplibre.helper';
import { take } from 'rxjs';
import { BaseLayersStateService } from '@app/base-layers/base-layers.state.service';

@Component({
  selector: 'app-map-arcgis-vector-layer',
  standalone: true,
  template: '',
})
export class MapArcgisVectorLayerComponent implements OnInit, OnDestroy {
  @Input() mapLibreMap!: MapLibreMap;
  @Input() layer!: BaseLayer;
  @Input() before = '';

  @Output() updateTooltipData = new EventEmitter<BaseLayerTooltipData | null>();
  private hoveredId: number | null = null;

  private arcGisService: FeatureService | null = null;

  constructor(
    private zone: NgZone,
    private baseLayersStateService: BaseLayersStateService
  ) {}

  ngOnInit(): void {
    this.addArcgisLayers();
    this.setupMapListeners();
  }

  enableBaseLayerHover$ = this.baseLayersStateService.enableBaseLayerHover$;

  ngOnDestroy(): void {
    this.mapLibreMap.off('mousemove', this.layerFillId, this.onMouseMove);
    this.mapLibreMap.off('mouseleave', this.layerFillId, this.onMouseLeave);
    this.mapLibreMap.off('styledata', this.onStyleDataListener);
    this.mapLibreMap.off('movestart', this.moveStart);
    this.mapLibreMap.off('moveend', this.moveEnd);
    this.clearHover();

    this.mapLibreMap.removeLayer(this.layerFillId);
    this.mapLibreMap.removeLayer(this.layerLineId);

    this.mapLibreMap?.off('data', this.onDataListener);
    this.mapLibreMap?.off('error', this.onErrorListener);

    this.arcGisService?.disableRequests();

    this.arcGisService?.destroySource();
  }

  private setupMapListeners() {
    this.mapLibreMap.on('data', this.onDataListener);
    this.mapLibreMap.on('error', this.onErrorListener);
  }

  private onDataListener = (event: any) => {
    // We check for features explicitly because `isSourceLoaded` can be true even if no data is available yet
    const hasFeatures =
      event.source?.data?.features?.length > 0 ||
      this.mapLibreMap.querySourceFeatures(this.sourceId).length > 0;

    if (
      this.sourceId.startsWith('arcgis_source_') &&
      event.isSourceLoaded &&
      hasFeatures
    ) {
      // Using ngZone since otherwise the loading spinner will be displayed forever.
      this.zone.run(() => {
        this.baseLayersStateService.removeLoadingSourceId(
          event.sourceId.replace('arcgis_source_', 'source_')
        );
      });
    }
  };

  private onErrorListener = (event: any) => {
    if (this.sourceId.startsWith('arcgis_source_') && !event.isSourceLoaded) {
      // Using ngZone since otherwise the loading spinner will be displayed forever.
      this.zone.run(() => {
        this.baseLayersStateService.removeLoadingSourceId(
          event.sourceId.replace('arcgis_source_', 'source_')
        );
      });
    }
  };

  private get layerFillId() {
    return 'arcgis_layer_fill_' + this.layer.id;
  }

  private get layerLineId() {
    return 'arcgis_layer_line_' + this.layer.id;
  }

  private get sourceId() {
    return 'arcgis_source_' + this.layer.id;
  }

  private clearHover = () => {
    if (this.hoveredId !== null) {
      this.mapLibreMap.setFeatureState(
        { source: this.sourceId, id: this.hoveredId },
        { hover: false }
      );
      this.hoveredId = null;
      this.clearTooltip();
    }
  };

  private onMouseMove = (e: MapLayerMouseEvent) => {
    this.enableBaseLayerHover$.pipe(take(1)).subscribe((paintingEnabled) => {
      if (paintingEnabled) {
        const f = e.features?.[0];
        if (!f) {
          this.clearHover();
          return;
        }
        const id = f.id as number;
        if (id !== this.hoveredId) {
          this.clearHover();
          this.hoveredId = id;
          this.mapLibreMap.setFeatureState(
            { source: this.sourceId, id },
            { hover: true }
          );
          this.setTooltipInfo(e.lngLat, f);
        }
      }
    });
  };

  private clearTooltip() {
    this.updateTooltipData.emit(null);
  }

  private setTooltipInfo(longLat: LngLat, f: MapGeoJSONFeature) {
    const tooltipInfo: BaseLayerTooltipData = {
      content: this.createTooltipContent(this.layer, f) ?? '',
      longLat: longLat,
    };
    this.updateTooltipData.emit(tooltipInfo);
  }

  private onMouseLeave = () => this.clearHover();

  private addArcgisLayers() {
    this.arcGisService = new FeatureService(this.sourceId, this.mapLibreMap, {
      url: this.layer.map_url,
      setAttributionFromService: true,
      // add options provided on metadata
      ...(this.layer.metadata?.['modules']?.['map']?.['arcgis'] ?? {}),
    });

    this.mapLibreMap.addLayer(
      {
        id: this.layerLineId,
        source: this.sourceId,
        type: 'line',
        paint: defaultBaseLayerLine(
          this.layer.styles[0].data['fill-outline-color']
        ),
      },
      this.before
    );

    this.mapLibreMap.addLayer(
      {
        id: this.layerFillId,
        source: this.sourceId,
        type: 'fill',
        paint: defaultBaseLayerFill(
          this.layer.styles[0].data['fill-outline-color']
        ),
      },
      this.layerLineId
    );

    this.mapLibreMap.on('mousemove', this.layerFillId, this.onMouseMove);
    this.mapLibreMap.on('mouseleave', this.layerFillId, this.onMouseLeave);
    this.mapLibreMap.on('styledata', this.onStyleDataListener);

    this.mapLibreMap.on('movestart', this.moveStart);
    this.mapLibreMap.on('moveend', this.moveEnd);
  }

  private moveEnd = (e: MapLibreEvent<UIEvent> & { broadcast?: boolean }) => {
    if (!e.originalEvent && !e.broadcast) return;
    this.arcGisService?.enableRequests();
    // fire a last moveend to sync after enabling requests
    this.mapLibreMap.fire('moveend');
  };

  private moveStart = (e: MapLibreEvent<UIEvent> & { broadcast?: boolean }) => {
    if (!e.originalEvent && !e.broadcast) return;
    this.arcGisService?.disableRequests();
  };

  private getTooltipTemplate(layer: BaseLayer): string | null {
    return layer.metadata?.modules?.map?.tooltip_format ?? null;
  }

  private createTooltipContent(
    layer: BaseLayer,
    feature: MapGeoJSONFeature
  ): string | null {
    const tooltipTemplate = this.getTooltipTemplate(layer)?.trim();
    if (!tooltipTemplate) {
      return null;
    } else {
      const tooltipString = tooltipTemplate.replace(
        /{(.*?)}/g,
        (match, key: string) => {
          const trimmedKey = key.trim();
          // note: we don't have control over external props being lower/uppercase
          const propValue =
            feature.properties[trimmedKey.toLowerCase()] ??
            feature.properties[trimmedKey.toUpperCase()] ??
            '--';
          return propValue;
        }
      );
      return tooltipString ?? '';
    }
  }

  private onStyleDataListener = () => {
    if (this.mapLibreMap && !this.mapLibreMap.getSource(this.sourceId)) {
      this.addArcgisLayers();
    }
  };
}
