import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadedScenarioViewComponent } from './uploaded-scenario-view.component';

describe('UploadedScenarioViewComponent', () => {
  let component: UploadedScenarioViewComponent;
  let fixture: ComponentFixture<UploadedScenarioViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadedScenarioViewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UploadedScenarioViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
