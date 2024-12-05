import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpandedStandDataChartComponent } from './expanded-stand-data-chart.component';

describe('ExpandedStandDataChartComponent', () => {
  let component: ExpandedStandDataChartComponent;
  let fixture: ComponentFixture<ExpandedStandDataChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpandedStandDataChartComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ExpandedStandDataChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
