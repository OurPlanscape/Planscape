import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { WelcomeWorkspaceModalComponent } from './welcome-workspace-modal.component';

describe('WelcomeWorkspaceModalComponent', () => {
  let component: WelcomeWorkspaceModalComponent;
  let fixture: ComponentFixture<WelcomeWorkspaceModalComponent>;
  let fakeDialogRef: jasmine.SpyObj<
    MatDialogRef<WelcomeWorkspaceModalComponent>
  >;

  beforeEach(async () => {
    fakeDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [WelcomeWorkspaceModalComponent, MatDialogModule],
      providers: [{ provide: MatDialogRef, useValue: fakeDialogRef }],
    }).compileComponents();

    fixture = TestBed.createComponent(WelcomeWorkspaceModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lists what the user can do next', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Welcome to Your Workspace');
    expect(text).toContain(
      'Upload or draw a planning area to run scenarios and analyses'
    );
    expect(text).toContain('View, organize, and upload data in the Map Viewer');
    expect(text).toContain('Invite colleagues with the Share feature');
  });

  it('closes the dialog', () => {
    component.close();

    expect(fakeDialogRef.close).toHaveBeenCalled();
  });
});
