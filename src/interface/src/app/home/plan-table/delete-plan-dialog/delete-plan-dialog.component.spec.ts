import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material/material.module';

import { DeletePlanDialogComponent } from './delete-plan-dialog.component';

describe('DeletePlanDialogComponent', () => {
  let component: DeletePlanDialogComponent;
  let fixture: ComponentFixture<DeletePlanDialogComponent>;

  let fakeDialogRef: MatDialogRef<DeletePlanDialogComponent>;

  beforeEach(async () => {
    fakeDialogRef = jasmine.createSpyObj('MatDialogRef', {
      close: null,
    });

    await TestBed.configureTestingModule({
      imports: [MaterialModule],
      declarations: [DeletePlanDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: ['fakeId'] },
        { provide: MatDialogRef, useValue: fakeDialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeletePlanDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('cancel should close dialog with value false', () => {
    component.cancel();

    expect(fakeDialogRef.close).toHaveBeenCalledOnceWith(false);
  });

  it('confirm should close dialog with value true', () => {
    component.confirm();

    expect(fakeDialogRef.close).toHaveBeenCalledOnceWith(true);
  });
});
