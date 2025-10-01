import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DeleteRunModalComponent } from './delete-run-modal.component';

describe('DeleteRunModalComponent', () => {
  let component: DeleteRunModalComponent;
  let fixture: ComponentFixture<DeleteRunModalComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<DeleteRunModalComponent>>;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [DeleteRunModalComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { runName: 'Test Run' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteRunModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
