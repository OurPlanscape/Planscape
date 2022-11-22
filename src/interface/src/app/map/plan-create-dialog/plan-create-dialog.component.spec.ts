import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanCreateDialogComponent } from './plan-create-dialog.component';

describe('PlanCreateDialogComponent', () => {
  let component: PlanCreateDialogComponent;
  let fixture: ComponentFixture<PlanCreateDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlanCreateDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanCreateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
