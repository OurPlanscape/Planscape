import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpandedChangeOverTimeChartComponent } from './expanded-change-over-time-chart.component';
import { MockDeclaration, MockProvider } from 'ng-mocks';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';
import { StandDataChartComponent } from '../stand-data-chart/stand-data-chart.component';

describe('ExpandedStandDataChartComponent', () => {
  let component: ExpandedChangeOverTimeChartComponent;
  let fixture: ComponentFixture<ExpandedChangeOverTimeChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpandedChangeOverTimeChartComponent],
      providers: [
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
