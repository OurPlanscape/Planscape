import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeOverTimeChartComponent } from './change-over-time-chart.component';

describe('ChangeOverTimeChartComponent', () => {
  let component: ChangeOverTimeChartComponent;
  let fixture: ComponentFixture<ChangeOverTimeChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangeOverTimeChartComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChangeOverTimeChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
