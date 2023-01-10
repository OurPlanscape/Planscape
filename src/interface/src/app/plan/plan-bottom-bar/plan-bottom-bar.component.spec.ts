import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanBottomBarComponent } from './plan-bottom-bar.component';

describe('BottomBarComponent', () => {
  let component: PlanBottomBarComponent;
  let fixture: ComponentFixture<PlanBottomBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlanBottomBarComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanBottomBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
