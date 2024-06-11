import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanningAreaMenuComponent } from './planning-area-menu.component';

describe('PlanningAreaMenuComponent', () => {
  let component: PlanningAreaMenuComponent;
  let fixture: ComponentFixture<PlanningAreaMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanningAreaMenuComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PlanningAreaMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
