import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetricSelectorComponent } from './metric-selector.component';
import { MockProviders } from 'ng-mocks';
import { METRICS } from '../metrics';
import { DirectImpactsStateService } from '../direct-impacts.state.service';

describe('MetricSelectorComponent', () => {
  let component: MetricSelectorComponent;
  let fixture: ComponentFixture<MetricSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetricSelectorComponent],
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
