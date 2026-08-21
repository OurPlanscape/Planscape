import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { WorkspacesService } from '@services';
import { Workspace } from '@types';
import { CreateWorkspaceModalComponent } from './create-workspace-modal.component';

describe('CreateWorkspaceModalComponent', () => {
  let component: CreateWorkspaceModalComponent;
  let fixture: ComponentFixture<CreateWorkspaceModalComponent>;
  let fakeDialogRef: jasmine.SpyObj<
    MatDialogRef<CreateWorkspaceModalComponent>
  >;
  let workspacesService: WorkspacesService;

  const workspace: Workspace = {
    id: 1,
    name: 'My workspace',
    creator: '',
    created_at: '2026-08-21T00:00:00Z',
  };

  beforeEach(async () => {
    fakeDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [CreateWorkspaceModalComponent, MatDialogModule],
      providers: [
        MockProvider(WorkspacesService),
        { provide: MatDialogRef, useValue: fakeDialogRef },
      ],
    }).compileComponents();

    workspacesService = TestBed.inject(WorkspacesService);

    fixture = TestBed.createComponent(CreateWorkspaceModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('requires a name', () => {
    expect(component.form.invalid).toBeTrue();

    component.form.setValue({ name: 'My workspace' });

    expect(component.form.valid).toBeTrue();
  });

  it('does not save when the name is missing', () => {
    const spy = spyOn(workspacesService, 'createWorkspace');

    component.handleSubmit();

    expect(spy).not.toHaveBeenCalled();
    expect(fakeDialogRef.close).not.toHaveBeenCalled();
  });

  it('closes with the created workspace', () => {
    const spy = spyOn(workspacesService, 'createWorkspace').and.returnValue(
      of(workspace)
    );
    component.form.setValue({ name: 'My workspace' });

    component.handleSubmit();

    expect(spy).toHaveBeenCalledWith({ name: 'My workspace' });
    expect(fakeDialogRef.close).toHaveBeenCalledWith(workspace);
  });

  it('shows an error and stays open when saving fails', () => {
    spyOn(workspacesService, 'createWorkspace').and.returnValue(
      throwError(() => new Error('nope'))
    );
    component.form.setValue({ name: 'My workspace' });

    component.handleSubmit();

    expect(component.displayError).toBeTrue();
    expect(component.submitting).toBeFalse();
    expect(component.primaryCTA).toBe('Try Again');
    expect(fakeDialogRef.close).not.toHaveBeenCalled();
  });

  it('closes with no workspace on cancel', () => {
    component.cancel();

    expect(fakeDialogRef.close).toHaveBeenCalledWith(undefined);
  });
});
