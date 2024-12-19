import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { ChangeOverTimeChartComponent } from './change-over-time-chart.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MockProvider } from 'ng-mocks';

describe('ChangeOverTimeChartComponent', () => {
  let component: ChangeOverTimeChartComponent;
  let fixture: ComponentFixture<ChangeOverTimeChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangeOverTimeChartComponent, HttpClientTestingModule],
      providers: [MockProvider(DirectImpactsStateService)],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangeOverTimeChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
