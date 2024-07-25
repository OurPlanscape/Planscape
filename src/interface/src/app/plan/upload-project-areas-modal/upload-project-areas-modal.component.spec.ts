import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadProjectAreasModalComponent } from './upload-project-areas-modal.component';

describe('UploadProjectAreasModalComponent', () => {
  let component: UploadProjectAreasModalComponent;
  let fixture: ComponentFixture<UploadProjectAreasModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadProjectAreasModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UploadProjectAreasModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
