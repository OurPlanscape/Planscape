import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RunAnalysisModalComponent } from './run-analysis-modal.component';

describe('RunAnalysisModalComponent', () => {
  let component: RunAnalysisModalComponent;
  let fixture: ComponentFixture<RunAnalysisModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RunAnalysisModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RunAnalysisModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
