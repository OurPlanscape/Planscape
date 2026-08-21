import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MockProvider } from 'ng-mocks';

import { WorkspacesComponent } from '@app/workspaces/workspaces.component';
import { WorkspaceCreationService } from '@app/workspaces/workspace-creation.service';

describe('WorkspacesComponent', () => {
  let component: WorkspacesComponent;
  let fixture: ComponentFixture<WorkspacesComponent>;
  let creationService: WorkspaceCreationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspacesComponent],
      providers: [MockProvider(WorkspaceCreationService)],
    }).compileComponents();

    creationService = TestBed.inject(WorkspaceCreationService);

    fixture = TestBed.createComponent(WorkspacesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the empty state with a create workspace action', () => {
    const element = fixture.nativeElement;

    expect(element.textContent).toContain(
      'Workspace: A shared space for smarter planning'
    );
    expect(element.querySelector('button[sg-button]').textContent).toContain(
      'Create Workspace'
    );
  });

  it('starts the create flow from the empty state', () => {
    const spy = spyOn(
      creationService,
      'openCreateWorkspaceModal'
    ).and.returnValue(of(null));

    fixture.nativeElement.querySelector('button[sg-button]').click();

    expect(spy).toHaveBeenCalledWith('empty-state');
  });
});
