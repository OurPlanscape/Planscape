import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapStandsTxResultComponent } from './map-stands-tx-result.component';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { BehaviorSubject } from 'rxjs';
import { DEFAULT_SLOT, METRICS } from '../metrics';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { TreatmentsState } from '../treatments.state';

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
        }),
        MockProvider(TreatmentsState),
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
