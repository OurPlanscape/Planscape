import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspacesComponent } from 'src/app/workspaces/workspaces.component';

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
});
