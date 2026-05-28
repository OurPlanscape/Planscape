import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullReportViewComponent } from './full-report-view.component';

describe('FullReportViewComponent', () => {
  let component: FullReportViewComponent;
  let fixture: ComponentFixture<FullReportViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullReportViewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FullReportViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
