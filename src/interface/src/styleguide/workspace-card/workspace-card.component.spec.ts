import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { WorkspaceCardComponent } from './workspace-card.component';

describe('WorkspaceCardComponent', () => {
  let component: WorkspaceCardComponent;
  let fixture: ComponentFixture<WorkspaceCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceCardComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders name, planning area count and details', () => {
    component.name = 'My Workspace';
    component.planningAreasCount = 3;
    component.creator = 'Larry Larrington';
    component.createdAt = '2025-07-11 12:34:00';
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('My Workspace');
    expect(text).toContain('3 Planning Areas');
    expect(text).toContain('Creator: Larry Larrington');
    expect(text).toContain('Created Date: Jul 11, 2025');
  });

  it('singularizes the planning areas label', () => {
    component.planningAreasCount = 1;
    expect(component.planningAreasLabel).toBe('Planning Area');

    component.planningAreasCount = 0;
    expect(component.planningAreasLabel).toBe('Planning Areas');
  });

  it('falls back when creator and date are missing', () => {
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Creator: N/A');
    expect(text).toContain('Created Date: -');
  });

  it('emits clicked when the card is clicked', () => {
    const spy = jasmine.createSpy('clicked');
    component.clicked.subscribe(spy);
    fixture.detectChanges();

    fixture.nativeElement.click();

    expect(spy).toHaveBeenCalled();
  });

  it('only shows menu actions the user is allowed to perform', () => {
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.more-menu-button').click();
    fixture.detectChanges();

    expect(document.querySelectorAll('.action-button').length).toBe(0);
  });

  it('shows rename, share and delete when permitted', () => {
    component.userCanRename = true;
    component.userCanShare = true;
    component.userCanDelete = true;
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.more-menu-button').click();
    fixture.detectChanges();

    const labels = Array.from(
      document.querySelectorAll('.action-button .mat-mdc-menu-item-text')
    ).map((el) => el.textContent?.trim());
    expect(labels).toEqual(['Rename', 'Share', 'Delete']);
  });
});
