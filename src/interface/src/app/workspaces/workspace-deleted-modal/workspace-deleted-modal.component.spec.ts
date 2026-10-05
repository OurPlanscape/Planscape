import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { WorkspaceDeletedModalComponent } from './workspace-deleted-modal.component';

describe('WorkspaceDeletedModalComponent', () => {
  let component: WorkspaceDeletedModalComponent;
  let fixture: ComponentFixture<WorkspaceDeletedModalComponent>;
  let mockDialogRef: jasmine.SpyObj<
    MatDialogRef<WorkspaceDeletedModalComponent>
  >;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [WorkspaceDeletedModalComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { workspaceName: 'Wildfire North' },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceDeletedModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('names the workspace in the title', () => {
    expect(fixture.nativeElement.textContent).toContain(
      'Wildfire North is no longer available'
    );
  });

  it('closes with true when returning to home', () => {
    component.returnToHome();

    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });
});
