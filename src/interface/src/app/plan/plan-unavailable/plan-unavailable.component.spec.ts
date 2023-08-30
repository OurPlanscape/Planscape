import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanUnavailableComponent } from './plan-unavailable.component';

describe('PlanUnavailableComponent', () => {
  let component: PlanUnavailableComponent;
  let fixture: ComponentFixture<PlanUnavailableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PlanUnavailableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanUnavailableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
