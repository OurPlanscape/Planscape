import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { ChangeOverTimeChartComponent } from './change-over-time-chart.component';
import { BehaviorSubject } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ChangeOverTimeChartComponent', () => {
  let component: ChangeOverTimeChartComponent;
  let fixture: ComponentFixture<ChangeOverTimeChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangeOverTimeChartComponent, HttpClientTestingModule],
      providers: [
        MockProvider(DirectImpactsStateService, {
          activeStand$: new BehaviorSubject(null),
          changeOverTimeData$: new BehaviorSubject([[]]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangeOverTimeChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
