import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteNoteDialogComponent } from './delete-note-dialog.component';

describe('DeleteNoteDialogComponent', () => {
  let component: DeleteNoteDialogComponent;
  let fixture: ComponentFixture<DeleteNoteDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteNoteDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteNoteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
