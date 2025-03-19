import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentProjectAreasComponent } from './treatment-project-areas.component';

describe('TreatmentProjectAreasComponent', () => {
  let component: TreatmentProjectAreasComponent;
  let fixture: ComponentFixture<TreatmentProjectAreasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentProjectAreasComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TreatmentProjectAreasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
