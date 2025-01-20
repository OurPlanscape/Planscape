import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapStandsTxResultComponent } from './map-stands-tx-result.component';
import { MockDeclarations, MockProvider, MockProviders } from 'ng-mocks';
import { BehaviorSubject, of } from 'rxjs';
import { DEFAULT_SLOT, METRICS } from '../metrics';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { TreatmentsState } from '../treatments.state';
import { MapConfigState } from '../treatment-map/map-config.state';

describe('MapStandsTxResultComponent', () => {
  let component: MapStandsTxResultComponent;
  let fixture: ComponentFixture<MapStandsTxResultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapStandsTxResultComponent],
      providers: [
        MockProvider(DirectImpactsStateService, {
          activeMetric$: new BehaviorSubject({
            metric: METRICS[0],
            slot: DEFAULT_SLOT,
          }),
          activeStand$: new BehaviorSubject(null),
          standsTxSourceLoaded$: of(false),
        }),
        MockProviders(TreatmentsState, MapConfigState),
      ],
      declarations: MockDeclarations(LayerComponent, VectorSourceComponent),
    }).compileComponents();

    fixture = TestBed.createComponent(MapStandsTxResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
