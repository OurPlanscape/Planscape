import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspacesComponent } from '@app/workspaces/workspaces.component';

describe('WorkspacesComponent', () => {
  let component: WorkspacesComponent;
  let fixture: ComponentFixture<WorkspacesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspacesComponent],
    }).compileComponents();

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
});
