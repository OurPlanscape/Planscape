import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanningAreasSearchComponent } from './planning-areas-search.component';

describe('PlanningAreasSearchComponent', () => {
  let component: PlanningAreasSearchComponent;
  let fixture: ComponentFixture<PlanningAreasSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanningAreasSearchComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PlanningAreasSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
