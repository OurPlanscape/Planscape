import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisInProgressModalComponent } from './analysis-in-progress-modal.component';

describe('AnalysisInProgressModalComponent', () => {
  let component: AnalysisInProgressModalComponent;
  let fixture: ComponentFixture<AnalysisInProgressModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisInProgressModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AnalysisInProgressModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
