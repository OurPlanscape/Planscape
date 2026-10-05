import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
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
    creator: 'Han Solo',
    created_by: 3,
    created_at: '2026-08-21T00:00:00Z',
    updated_at: '2026-08-21T00:00:00Z',
    planning_areas_count: 0,
    collaborators_count: 1,
    role: 'OWNER',
    permissions: ['view_workspace'],
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

  it('shows a generic error and stays open when saving fails', () => {
    spyOn(workspacesService, 'createWorkspace').and.returnValue(
      throwError(() => new Error('nope'))
    );
    component.form.setValue({ name: 'My workspace' });

    component.handleSubmit();

    expect(component.displayError).toBeTrue();
    expect(component.errorMessage).toBe(
      'Something went wrong. Please try again.'
    );
    expect(component.submitting).toBeFalse();
    expect(component.primaryCTA).toBe('Try Again');
    expect(fakeDialogRef.close).not.toHaveBeenCalled();
  });

  it('surfaces the backend message when the name is taken', () => {
    spyOn(workspacesService, 'createWorkspace').and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              detail: 'Validation error.',
              errors: { name: ['A workspace with this name already exists.'] },
            },
          })
      )
    );
    component.form.setValue({ name: 'Taken' });

    component.handleSubmit();

    expect(component.errorMessage).toBe(
      'A workspace with this name already exists.'
    );
    expect(fakeDialogRef.close).not.toHaveBeenCalled();
  });

  it('shows a generic error for a non-validation http failure', () => {
    spyOn(workspacesService, 'createWorkspace').and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500, error: 'boom' }))
    );
    component.form.setValue({ name: 'My workspace' });

    component.handleSubmit();

    expect(component.errorMessage).toBe(
      'Something went wrong. Please try again.'
    );
  });

  it('closes with no workspace on cancel', () => {
    component.cancel();

    expect(fakeDialogRef.close).toHaveBeenCalledWith(undefined);
  });
  describe('in edit mode', () => {
    let editFixture: ComponentFixture<CreateWorkspaceModalComponent>;
    let editComponent: CreateWorkspaceModalComponent;

    beforeEach(async () => {
      TestBed.resetTestingModule();
      fakeDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

      await TestBed.configureTestingModule({
        imports: [CreateWorkspaceModalComponent, MatDialogModule],
        providers: [
          MockProvider(WorkspacesService),
          { provide: MatDialogRef, useValue: fakeDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: { workspace } },
        ],
      }).compileComponents();

      workspacesService = TestBed.inject(WorkspacesService);

      editFixture = TestBed.createComponent(CreateWorkspaceModalComponent);
      editComponent = editFixture.componentInstance;
      editFixture.detectChanges();
    });

    it('prefills the name and relabels the modal', () => {
      expect(editComponent.form.getRawValue().name).toBe('My workspace');
      expect(editComponent.title).toBe('Rename Workspace');
      expect(editComponent.primaryCTA).toBe('Done');
    });

    it('patches the workspace and closes with the result', () => {
      const renamed = { ...workspace, name: 'Renamed' };
      const spy = spyOn(workspacesService, 'updateWorkspace').and.returnValue(
        of(renamed)
      );
      editComponent.form.setValue({ name: 'Renamed' });

      editComponent.handleSubmit();

      expect(spy).toHaveBeenCalledWith(1, { name: 'Renamed' });
      expect(fakeDialogRef.close).toHaveBeenCalledWith(renamed);
    });

    it('surfaces the backend message when the name is taken', () => {
      spyOn(workspacesService, 'updateWorkspace').and.returnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: {
                detail: 'Validation error.',
                errors: {
                  name: ['A workspace with this name already exists.'],
                },
              },
            })
        )
      );
      editComponent.form.setValue({ name: 'Taken' });

      editComponent.handleSubmit();

      expect(editComponent.errorMessage).toBe(
        'A workspace with this name already exists.'
      );
      expect(fakeDialogRef.close).not.toHaveBeenCalled();
    });
  });
});
