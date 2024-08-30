import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeleteDialogComponent } from './delete-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

describe('DeleteDialogComponent', () => {
  let component: DeleteDialogComponent;
  let fixture: ComponentFixture<DeleteDialogComponent>;
  let fakeDialogRef: MatDialogRef<DeleteDialogComponent>;

  beforeEach(async () => {
    fakeDialogRef = jasmine.createSpyObj('MatDialogRef', {
      close: null,
    });

    await TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { data: { name: 'one' } } },
        { provide: MatDialogRef, useValue: fakeDialogRef },
      ],

      imports: [DeleteDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
