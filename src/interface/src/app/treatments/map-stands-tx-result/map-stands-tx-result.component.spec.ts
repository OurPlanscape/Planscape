import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapStandsTxResultComponent } from './map-stands-tx-result.component';
import { MockDeclarations, MockProvider, MockProviders } from 'ng-mocks';
import { BehaviorSubject, of } from 'rxjs';
import { METRICS } from '../metrics';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { TreatmentsState } from '../treatments.state';
import { MapConfigState } from '../../maplibre-map/map-config.state';

describe('MapStandsTxResultComponent', () => {
  let component: MapStandsTxResultComponent;
  let fixture: ComponentFixture<MapStandsTxResultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapStandsTxResultComponent],
      providers: [
        MockProvider(DirectImpactsStateService, {
          activeMetric$: new BehaviorSubject(METRICS[0]),
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
