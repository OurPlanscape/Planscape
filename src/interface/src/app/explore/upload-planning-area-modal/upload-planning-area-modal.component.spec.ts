import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadPlanningAreaModalComponent } from './upload-planning-area-modal.component';

describe('UploadPlanningAreaModalComponent', () => {
  let component: UploadPlanningAreaModalComponent;
  let fixture: ComponentFixture<UploadPlanningAreaModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadPlanningAreaModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UploadPlanningAreaModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
