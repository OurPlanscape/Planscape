import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpandedChangeOverTimeChartComponent } from './expanded-change-over-time-chart.component';
import { MockDeclaration, MockProvider } from 'ng-mocks';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { TreatmentsState } from '../treatments.state';
import { MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';
import { StandDataChartComponent } from '../stand-data-chart/stand-data-chart.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { MapConfigState } from '../treatment-map/map-config.state';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

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
      imports: [ExpandedChangeOverTimeChartComponent, HttpClientTestingModule],
      providers: [
        TreatmentsState,
        TreatedStandsState,
        MapConfigState,
        { provide: ActivatedRoute, useValue: fakeRoute },
        MockProvider(DirectImpactsStateService, {
          activeStand$: new BehaviorSubject(null),
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
