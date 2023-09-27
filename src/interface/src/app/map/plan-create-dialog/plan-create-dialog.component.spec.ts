import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { PlanCreateDialogComponent } from './plan-create-dialog.component';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

describe('PlanCreateDialogComponent', () => {
  let component: PlanCreateDialogComponent;
  let fixture: ComponentFixture<PlanCreateDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [PlanCreateDialogComponent],
      providers: [{ provide: MatDialogRef, useValue: { close: () => {} } }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanCreateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should submit if there is a plan name', () => {
    const dialogRef = TestBed.inject(MatDialogRef<PlanCreateDialogComponent>);
    spyOn(dialogRef, 'close');
    component.planForm.setValue({
      planName: 'some plan',
    });

    const saveBtn = fixture.debugElement.query(
      By.css('[data-id="save"]')
    ).nativeElement;
    saveBtn.click();
    expect(dialogRef.close).toHaveBeenCalledTimes(1);
  });
  it('should not submit if there is not a plan name', () => {
    const dialogRef = TestBed.inject(MatDialogRef<PlanCreateDialogComponent>);
    spyOn(dialogRef, 'close');

    const saveBtn = fixture.debugElement.query(
      By.css('[data-id="save"]')
    ).nativeElement;
    saveBtn.click();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
