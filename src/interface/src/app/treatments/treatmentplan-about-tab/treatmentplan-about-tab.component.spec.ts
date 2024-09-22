import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentplanAboutTabComponent } from './treatmentplan-about-tab.component';

describe('TreatmentplanAboutTabComponent', () => {
  let component: TreatmentplanAboutTabComponent;
  let fixture: ComponentFixture<TreatmentplanAboutTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentplanAboutTabComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TreatmentplanAboutTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
