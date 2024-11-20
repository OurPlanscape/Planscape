import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapStandsTxResultComponent } from './map-stands-tx-result.component';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { TreatmentsState } from '../treatments.state';
import { BehaviorSubject } from 'rxjs';
import { DEFAULT_SLOT, METRICS } from '../metrics';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';

describe('MapStandsTxResultComponent', () => {
  let component: MapStandsTxResultComponent;
  let fixture: ComponentFixture<MapStandsTxResultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapStandsTxResultComponent],
      providers: [
        MockProvider(TreatmentsState, {
          activeMetric$: new BehaviorSubject({
            metric: METRICS[0],
            slot: DEFAULT_SLOT,
          }),
        }),
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
