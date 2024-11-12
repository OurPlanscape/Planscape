import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetricFiltersComponent } from './metric-filters.component';

describe('MetricFiltersComponent', () => {
  let component: MetricFiltersComponent;
  let fixture: ComponentFixture<MetricFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetricFiltersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MetricFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
