import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { WorkspaceCardComponent } from './workspace-card.component';

describe('WorkspaceCardComponent', () => {
  let component: WorkspaceCardComponent;
  let fixture: ComponentFixture<WorkspaceCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceCardComponent, NoopAnimationsModule, RouterLink],
      providers: [{ provide: ActivatedRoute, useValue: { firstChild: {} } }],
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

  it('makes the whole card a link named after the workspace', () => {
    component.name = 'My Workspace';
    component.link = ['/workspace', 7];
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a.card-link');
    expect(link.getAttribute('href')).toBe('/workspace/7');
    expect(link.getAttribute('aria-label')).toBe('My Workspace');
  });

  function clickWithSelectionOn(selector: string) {
    const el = fixture.nativeElement.querySelector(selector);
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    el.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    );
    selection.removeAllRanges();
  }

  it('does not navigate when a click ends a text selection', () => {
    const navigate = spyOn(
      TestBed.inject(Router),
      'navigateByUrl'
    ).and.returnValue(Promise.resolve(true));
    component.name = 'My Workspace';
    component.link = ['/workspace', 7];
    fixture.detectChanges();

    clickWithSelectionOn('.workspace-name');

    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not navigate when the selection ends on the link itself', () => {
    const navigate = spyOn(
      TestBed.inject(Router),
      'navigateByUrl'
    ).and.returnValue(Promise.resolve(true));
    component.name = 'My Workspace';
    component.link = ['/workspace', 7];
    fixture.detectChanges();

    clickWithSelectionOn('.card-link');

    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates on a plain click', () => {
    const navigate = spyOn(
      TestBed.inject(Router),
      'navigateByUrl'
    ).and.returnValue(Promise.resolve(true));
    component.link = ['/workspace', 7];
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('.workspace-name')
      .dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      );

    expect(navigate).toHaveBeenCalled();
  });

  it('leaves modified clicks to the browser', () => {
    const navigate = spyOn(
      TestBed.inject(Router),
      'navigateByUrl'
    ).and.returnValue(Promise.resolve(true));
    component.link = ['/workspace', 7];
    fixture.detectChanges();

    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      metaKey: true,
    });
    fixture.nativeElement.querySelector('.workspace-name').dispatchEvent(event);

    expect(navigate).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('does not navigate when the menu button is clicked', () => {
    fixture.detectChanges();

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    fixture.nativeElement
      .querySelector('.more-menu-button')
      .dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
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
