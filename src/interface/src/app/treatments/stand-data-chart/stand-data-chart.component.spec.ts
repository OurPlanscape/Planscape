import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StandDataChartComponent } from './stand-data-chart.component';

describe('StandDataChartComponent', () => {
  let component: StandDataChartComponent;
  let fixture: ComponentFixture<StandDataChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StandDataChartComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StandDataChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
