import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpandedChangeOverTimeChartComponent } from './expanded-change-over-time-chart.component';
import { MockDeclaration, MockProvider } from 'ng-mocks';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { TreatmentsState } from '../treatments.state';
import { MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';
import { StandDataChartComponent } from '../stand-data-chart/stand-data-chart.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('ExpandedChangeOverTimeChartComponent', () => {
  let component: ExpandedChangeOverTimeChartComponent;
  let fixture: ComponentFixture<ExpandedChangeOverTimeChartComponent>;

  beforeEach(async () => {
    const fakeRoute = jasmine.createSpyObj(
      'ActivatedRoute',
      {},
      {
        snapshot: {
          paramMap: convertToParamMap({ id: '24' }),
        },
      }
    );
    await TestBed.configureTestingModule({
      imports: [
        ExpandedChangeOverTimeChartComponent,
        HttpClientTestingModule,
        BrowserAnimationsModule,
      ],
      providers: [
        TreatmentsState,
        TreatedStandsState,
        MapConfigState,
        { provide: ActivatedRoute, useValue: fakeRoute },
        MockProvider(DirectImpactsStateService, {
          filteredTreatmentTypes$: new BehaviorSubject([]),
          activeStand$: new BehaviorSubject(null),
          selectedProjectArea$: of('All' as any),
          reportMetrics$: of(null as any),
        }),
        { provide: MatDialogRef, useValue: {} },
      ],
      declarations: [MockDeclaration(StandDataChartComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpandedChangeOverTimeChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
