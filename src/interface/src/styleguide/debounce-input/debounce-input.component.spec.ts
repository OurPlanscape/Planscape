import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject } from 'rxjs';

import {
  DebounceEditState,
  DebounceInputComponent,
} from '@styleguide/debounce-input/debounce-input.component';

describe('DebounceInputComponent', () => {
  let component: DebounceInputComponent;
  let fixture: ComponentFixture<DebounceInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DebounceInputComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(DebounceInputComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('sets edit mode when starting with an empty value', () => {
    component.textValue = '';
    component.currentMode$ = new BehaviorSubject<DebounceEditState>('INITIAL');

    fixture.detectChanges();

    expect(component.currentMode$.value).toBe('EDIT');
  });

  it('keeps initial mode when starting with a value', () => {
    component.textValue = 'Original';
    component.currentMode$ = new BehaviorSubject<DebounceEditState>('INITIAL');

    fixture.detectChanges();

    expect(component.currentMode$.value).toBe('INITIAL');
    expect(component.originalText).toBe('Original');
  });

  it('emits debounced updates from saveText', fakeAsync(() => {
    component.debounceInterval = 0;
    component.textValue = 'Original';
    fixture.detectChanges();

    const emitSpy = spyOn(component.textValueUpdated, 'emit');

    component.textValue = 'Updated';
    component.saveText();
    tick();

    expect(emitSpy).toHaveBeenCalledWith('Updated');
    expect(component.currentMode$.value).toBe('INITIAL');
  }));

  it('restores original text on blur when empty', () => {
    component.textValue = 'Original';
    fixture.detectChanges();

    const emitSpy = spyOn(component.textValueUpdated, 'emit');

    component.textValue = '';
    component.onBlur();

    expect(component.textValue).toBe('Original');
    expect(component.currentMode$.value).toBe('INITIAL');
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('emits debounced updates on blur when value changes', fakeAsync(() => {
    component.debounceInterval = 0;
    component.textValue = 'Original';
    fixture.detectChanges();

    const emitSpy = spyOn(component.textValueUpdated, 'emit');

    component.textValue = 'New value';
    component.onBlur();
    tick();

    expect(emitSpy).toHaveBeenCalledWith('New value');
    expect(component.currentMode$.value).toBe('INITIAL');
  }));
});
