import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CumulativeAttainmentChartComponent } from './cumulative-attainment-chart.component';

describe('CumulativeAttainmentChartComponent', () => {
  let component: CumulativeAttainmentChartComponent;
  let fixture: ComponentFixture<CumulativeAttainmentChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CumulativeAttainmentChartComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CumulativeAttainmentChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
