import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { ChangeOverTimeChartComponent } from './change-over-time-chart.component';
import { BehaviorSubject } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ChangeOverTimeChartService } from './change-over-time-chart.service';

describe('ChangeOverTimeChartComponent', () => {
  let component: ChangeOverTimeChartComponent;
  let fixture: ComponentFixture<ChangeOverTimeChartComponent>;
  let barChartData$: BehaviorSubject<any>;
  let hasChartData$: BehaviorSubject<boolean>;

  beforeEach(async () => {
    barChartData$ = new BehaviorSubject(undefined);
    hasChartData$ = new BehaviorSubject(false);

    await TestBed.configureTestingModule({
      imports: [ChangeOverTimeChartComponent, HttpClientTestingModule],
      providers: [
        MockProvider(ChangeOverTimeChartService, {
          barChartData$,
          hasChartData$,
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
