import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeleteDialogComponent } from './delete-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

describe('DeleteDialogComponent', () => {
  let component: DeleteDialogComponent;
  let fixture: ComponentFixture<DeleteDialogComponent>;
  let fakeDialogRef: MatDialogRef<DeleteDialogComponent>;
  let data: { title: string; body: string; confirmText?: string };

  /** The dialog reads its data once, so set it before creating the view. */
  function create(): HTMLElement {
    fixture = TestBed.createComponent(DeleteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    fakeDialogRef = jasmine.createSpyObj('MatDialogRef', {
      close: null,
    });
    data = { title: 'the title', body: 'the body' };

    await TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: fakeDialogRef },
      ],

      imports: [DeleteDialogComponent],
    }).compileComponents();
  });

  it('should create', () => {
    create();

    expect(component).toBeTruthy();
  });

  it('shows the title and body it was given', () => {
    const el = create();

    expect(el.textContent).toContain('the title');
    expect(el.textContent).toContain('the body');
  });

  it('confirms with Delete when the caller says nothing else', () => {
    const el = create();

    expect(el.textContent).toContain('Delete');
  });

  // leaving a workspace is also a point of no return, with another word for it
  it('takes the word for the action from the caller', () => {
    data.confirmText = 'Leave';

    const el = create();

    expect(el.textContent).toContain('Leave');
    expect(el.textContent).not.toContain('Delete');
  });
});
