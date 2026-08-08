import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChipInputComponent } from './chip-input.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { NgForOf } from '@angular/common';
import { MatChipInputEvent } from '@angular/material/chips';

describe('ChipInputComponent', () => {
  let component: ChipInputComponent;
  let fixture: ComponentFixture<ChipInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [],
      imports: [
        MatFormFieldModule,
        MatInputModule,
        NoopAnimationsModule,
        MatChipsModule,
        MatIconModule,
        NgForOf,
        ChipInputComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChipInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  function makeChipEvent(value: string): MatChipInputEvent {
    return {
      value,
      chipInput: { clear: jasmine.createSpy('clear') } as any,
      input: document.createElement('input'),
    } as unknown as MatChipInputEvent;
  }

  function makePasteEvent(text: string): ClipboardEvent {
    const input = document.createElement('input');
    const event = {
      clipboardData: { getData: () => text },
      preventDefault: jasmine.createSpy('preventDefault'),
      target: input,
    } as unknown as ClipboardEvent;
    return event;
  }

  describe('addIfValid', () => {
    it('emits a valid email and clears the input', () => {
      const added: string[] = [];
      component.addEmail.subscribe((e) => added.push(e));

      const event = makeChipEvent('user@example.com');
      component.addIfValid(event);

      expect(added).toEqual(['user@example.com']);
      expect(event.chipInput!.clear).toHaveBeenCalled();
    });

    it('extracts an email from "Name <email>" format', () => {
      const added: string[] = [];
      component.addEmail.subscribe((e) => added.push(e));

      component.addIfValid(makeChipEvent('First Last <user@example.com>'));

      expect(added).toEqual(['user@example.com']);
    });

    it('emits invalid when the value is not an email', () => {
      const invalidEvents: boolean[] = [];
      component.isInvalid.subscribe((v) => invalidEvents.push(v));

      const event = makeChipEvent('not-an-email');
      component.addIfValid(event);

      expect(invalidEvents).toContain(true);
      expect(event.chipInput!.clear).not.toHaveBeenCalled();
    });
  });

  describe('onPaste', () => {
    it('adds multiple comma-separated emails', () => {
      const added: string[] = [];
      component.addEmail.subscribe((e) => added.push(e));

      component.onPaste(makePasteEvent('a@x.com, b@x.com, c@x.com'));

      expect(added).toEqual(['a@x.com', 'b@x.com', 'c@x.com']);
    });

    it('extracts emails from "Name <email>" list', () => {
      const added: string[] = [];
      component.addEmail.subscribe((e) => added.push(e));

      component.onPaste(
        makePasteEvent(
          'First Last <first@example.com>, Other Person <other@example.com>'
        )
      );

      expect(added).toEqual(['first@example.com', 'other@example.com']);
    });

    it('handles semicolons, newlines, and spaces as separators', () => {
      const added: string[] = [];
      component.addEmail.subscribe((e) => added.push(e));

      component.onPaste(makePasteEvent('a@x.com; b@x.com\nc@x.com d@x.com'));

      expect(added).toEqual(['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com']);
    });

    it('keeps invalid tokens in the input and flags invalid', () => {
      const added: string[] = [];
      const invalidEvents: boolean[] = [];
      component.addEmail.subscribe((e) => added.push(e));
      component.isInvalid.subscribe((v) => invalidEvents.push(v));

      const event = makePasteEvent('good@x.com, not-an-email');
      component.onPaste(event);

      expect(added).toEqual(['good@x.com']);
      expect((event.target as HTMLInputElement).value).toBe('not-an-email');
      expect(invalidEvents).toContain(true);
    });
  });
});
