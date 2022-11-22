import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { PlanCreateDialogComponent } from './plan-create-dialog.component';

describe('PlanCreateDialogComponent', () => {
  let component: PlanCreateDialogComponent;
  let fixture: ComponentFixture<PlanCreateDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlanCreateDialogComponent ],
      providers: [
        { provide: MatDialogRef, useValue: {} },
      ]
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
