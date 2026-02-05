import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetricSelectorComponent } from '@app/treatments/metric-selector/metric-selector.component';
import { MockProviders } from 'ng-mocks';
import { METRICS } from '@app/treatments/metrics';
import { DirectImpactsStateService } from '@app/treatments/direct-impacts.state.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('MetricSelectorComponent', () => {
  let component: MetricSelectorComponent;
  let fixture: ComponentFixture<MetricSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetricSelectorComponent, NoopAnimationsModule],
      providers: [MockProviders(DirectImpactsStateService)],
    }).compileComponents();

    fixture = TestBed.createComponent(MetricSelectorComponent);
    component = fixture.componentInstance;
    component.metrics = METRICS;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
