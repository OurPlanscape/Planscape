import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders the icon, title and description', () => {
    component.icon = 'folder';
    component.title = 'Nothing here yet';
    component.description = 'Create something to get started.';
    fixture.detectChanges();

    const element = fixture.nativeElement;
    expect(element.querySelector('.empty-state-icon').textContent).toContain(
      'folder'
    );
    expect(element.textContent).toContain('Nothing here yet');
    expect(element.textContent).toContain('Create something to get started.');
  });

  it('omits the icon, title and description when not provided', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement;
    expect(element.querySelector('.empty-state-icon')).toBeNull();
    expect(element.querySelector('.empty-state-title')).toBeNull();
    expect(element.querySelector('.empty-state-description')).toBeNull();
  });

  it('only marks the icon as outlined when requested', () => {
    component.icon = 'folder';
    fixture.detectChanges();

    const icon = fixture.nativeElement.querySelector('.empty-state-icon');
    expect(icon.classList).not.toContain('material-symbols-outlined');

    component.outlined = true;
    fixture.detectChanges();

    expect(icon.classList).toContain('material-symbols-outlined');
  });
});
