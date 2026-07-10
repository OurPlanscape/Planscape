import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ShareDialogComponent, SharePerson } from './share-dialog.component';

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

  describe('email entry', () => {
    it('adds and removes emails it owns, emitting emailsChange', () => {
      const spy = jasmine.createSpy('emailsChange');
      component.emailsChange.subscribe(spy);

      component.addEmail('a@x.com');
      component.addEmail('b@y.com');
      expect(component.emails).toEqual(['a@x.com', 'b@y.com']);
      expect(spy).toHaveBeenCalledWith(['a@x.com', 'b@y.com']);

      component.removeEmail('a@x.com');
      expect(component.emails).toEqual(['b@y.com']);
      expect(spy).toHaveBeenCalledWith(['b@y.com']);
    });

    it('switches to compose view once an email is entered', () => {
      expect(component.showMessageBox).toBeFalse();
      component.addEmail('a@x.com');
      expect(component.showMessageBox).toBeTrue();
    });

    it('startOver clears emails and the invalid state', () => {
      component.emails = ['a@x.com'];
      component.invalidEmail = true;
      component.startOver();
      expect(component.emails).toEqual([]);
      expect(component.invalidEmail).toBeFalse();
    });
  });

  describe('roles', () => {
    it('seeds the batch role from the first role', () => {
      component.roles = ['Viewer', 'Owner'];
      component.ngOnChanges();
      expect(component.selectedRole).toBe('Viewer');
    });

    it('selectRole updates the batch role', () => {
      component.roles = ['Viewer', 'Owner'];
      component.selectRole('Owner');
      expect(component.selectedRole).toBe('Owner');
    });

    it('changePersonRole updates the row optimistically and emits roleChange', () => {
      const person: SharePerson = {
        id: 1,
        name: 'x',
        role: 'Viewer',
        editable: true,
      };
      const spy = jasmine.createSpy('roleChange');
      component.roleChange.subscribe(spy);

      component.changePersonRole(person, 'Owner');

      expect(person.role).toBe('Owner');
      expect(spy).toHaveBeenCalledWith({ person, role: 'Owner' });
    });
  });

  describe('people list', () => {
    it('normalizes string[] into rows', () => {
      component.people = ['a@x.com', 'b@y.com'];
      expect(component.peopleRows).toEqual([
        { name: 'a@x.com', role: '' },
        { name: 'b@y.com', role: '' },
      ]);
    });

    it('passes { name, role }[] rows through without cloning', () => {
      const people: SharePerson[] = [
        { id: 1, name: 'A', role: 'Owner', editable: true },
      ];
      component.people = people;
      expect(component.peopleRows).toEqual(people);
      // same object references (so optimistic role updates mutate the source)
      expect(component.peopleRows[0]).toBe(people[0]);
    });

    it('re-emits resend and removeAccess with the person', () => {
      const person: SharePerson = { id: 1, name: 'x', role: 'Viewer' };
      const resendSpy = jasmine.createSpy('resend');
      const removeSpy = jasmine.createSpy('removeAccess');
      component.resend.subscribe(resendSpy);
      component.removeAccess.subscribe(removeSpy);

      component.resend.emit(person);
      component.removeAccess.emit(person);

      expect(resendSpy).toHaveBeenCalledWith(person);
      expect(removeSpy).toHaveBeenCalledWith(person);
    });
  });

  describe('primary action', () => {
    it('emits emails, role and message', () => {
      const spy = jasmine.createSpy('primaryAction');
      component.primaryAction.subscribe(spy);
      component.emails = ['a@x.com'];
      component.selectedRole = 'Owner';
      component.message = 'hi';

      component.emitPrimary();

      expect(spy).toHaveBeenCalledWith({
        emails: ['a@x.com'],
        role: 'Owner',
        message: 'hi',
      });
    });

    it('displayLabel is the idle label when empty, the primary label otherwise', () => {
      component.primaryLabel = 'INVITE';
      component.idleLabel = 'DONE';
      expect(component.displayLabel).toBe('DONE');
      component.emails = ['a@x.com'];
      expect(component.displayLabel).toBe('INVITE');
    });

    it('falls back to the primary label when no idle label is set', () => {
      component.primaryLabel = 'Send';
      expect(component.displayLabel).toBe('Send');
    });

    it('auto-disables when there are no emails and no idle label', () => {
      component.primaryLabel = 'Send';
      expect(component.primaryButtonDisabled).toBeTrue();
      component.emails = ['a@x.com'];
      expect(component.primaryButtonDisabled).toBeFalse();
    });

    it('stays enabled when empty if an idle label is set', () => {
      component.idleLabel = 'DONE';
      expect(component.primaryButtonDisabled).toBeFalse();
    });

    it('is disabled while submitting', () => {
      component.idleLabel = 'DONE';
      component.submitting = true;
      expect(component.primaryButtonDisabled).toBeTrue();
    });
  });

  describe('outputs', () => {
    it('emits copyLink, closed and helpClicked', () => {
      const copySpy = jasmine.createSpy('copyLink');
      const closeSpy = jasmine.createSpy('closed');
      component.copyLink.subscribe(copySpy);
      component.closed.subscribe(closeSpy);
      component.copyLink.emit();
      component.closed.emit();
      expect(copySpy).toHaveBeenCalled();
      expect(closeSpy).toHaveBeenCalled();
    });

    it('opens help and emits helpClicked', () => {
      const spy = jasmine.createSpy('helpClicked');
      component.helpClicked.subscribe(spy);
      component.openHelp();
      expect(component.showHelp).toBeTrue();
      expect(spy).toHaveBeenCalled();
    });
  });
});
