import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DirectImpactsMapLegendComponent } from './direct-impacts-map-legend.component';
import { MockProvider } from 'ng-mocks';
import { DEFAULT_SLOT, METRICS } from '../metrics';
import { BehaviorSubject } from 'rxjs';
import { DirectImpactsStateService } from '../direct-impacts.state.service';

describe('DirectImpactsMapLegendComponent', () => {
  let component: DirectImpactsMapLegendComponent;
  let fixture: ComponentFixture<DirectImpactsMapLegendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DirectImpactsMapLegendComponent],
      providers: [
        MockProvider(DirectImpactsStateService, {
          activeMetric$: new BehaviorSubject({
            metric: METRICS[0],
            slot: DEFAULT_SLOT,
          }),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DirectImpactsMapLegendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
