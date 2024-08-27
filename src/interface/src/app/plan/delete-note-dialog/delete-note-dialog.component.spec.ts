import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeleteNoteDialogComponent } from './delete-note-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

describe('DeleteNoteDialogComponent', () => {
  let component: DeleteNoteDialogComponent;
  let fixture: ComponentFixture<DeleteNoteDialogComponent>;
  let fakeDialogRef: MatDialogRef<DeleteNoteDialogComponent>;

  beforeEach(async () => {
    fakeDialogRef = jasmine.createSpyObj('MatDialogRef', {
      close: null,
    });
    await TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { data: { name: 'one' } } },
        { provide: MatDialogRef, useValue: fakeDialogRef },
      ],
      declarations: [DeleteNoteDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteNoteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
