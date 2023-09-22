import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportChartComponent } from './report-chart.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgChartsModule } from 'ng2-charts';

describe('ReportChartComponent', () => {
  let component: ReportChartComponent;
  let fixture: ComponentFixture<ReportChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReportChartComponent],
      imports: [NgChartsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
