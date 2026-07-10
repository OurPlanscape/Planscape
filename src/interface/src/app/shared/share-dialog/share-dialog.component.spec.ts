import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ShareDialogComponent } from './share-dialog.component';

describe('ShareDialogComponent', () => {
  let component: ShareDialogComponent;
  let fixture: ComponentFixture<ShareDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShareDialogComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ShareDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits primaryAction', () => {
    const spy = jasmine.createSpy('primaryAction');
    component.primaryAction.subscribe(spy);
    component.primaryAction.emit();
    expect(spy).toHaveBeenCalled();
  });

  it('opens help and emits helpClicked', () => {
    const spy = jasmine.createSpy('helpClicked');
    component.helpClicked.subscribe(spy);
    component.openHelp();
    expect(component.showHelp).toBeTrue();
    expect(spy).toHaveBeenCalled();
  });

  it('emits copyLink', () => {
    const spy = jasmine.createSpy('copyLink');
    component.copyLink.subscribe(spy);
    component.copyLink.emit();
    expect(spy).toHaveBeenCalled();
  });

  it('owns the email list: adds and emits emailsChange', () => {
    const spy = jasmine.createSpy('emailsChange');
    component.emailsChange.subscribe(spy);

    component.addEmail('a@x.com');
    component.addEmail('b@y.com');

    expect(component.emails).toEqual(['a@x.com', 'b@y.com']);
    expect(spy).toHaveBeenCalledWith(['a@x.com', 'b@y.com']);
  });

  it('removes an email and emits emailsChange', () => {
    component.emails = ['a@x.com', 'b@y.com'];
    const spy = jasmine.createSpy('emailsChange');
    component.emailsChange.subscribe(spy);

    component.removeEmail('a@x.com');

    expect(component.emails).toEqual(['b@y.com']);
    expect(spy).toHaveBeenCalledWith(['b@y.com']);
  });

  it('startOver clears emails and the invalid state', () => {
    component.emails = ['a@x.com'];
    component.invalidEmail = true;

    component.startOver();

    expect(component.emails).toEqual([]);
    expect(component.invalidEmail).toBeFalse();
  });

  it('switches to compose view once an email is entered', () => {
    expect(component.showMessageBox).toBeFalse();
    component.addEmail('a@x.com');
    expect(component.showMessageBox).toBeTrue();
  });
});
