import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InputFieldComponent } from './input-field.component';
import { InputDirective } from './input.directive';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  template: ` <sg-input-field>
    <input sgInput />
  </sg-input-field>`,
})
class TestHostComponent {}

describe('InputFieldComponent without sgInput directive', () => {
  let errorFixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    // Override the template before compiling components
    TestBed.configureTestingModule({
      declarations: [TestHostComponent],
      imports: [
        CommonModule,
        MatIconModule,
        InputDirective,
        InputFieldComponent,
      ],
    });

    TestBed.overrideComponent(TestHostComponent, {
      set: { template: `<sg-input-field></sg-input-field>` },
    });

    await TestBed.compileComponents();

    errorFixture = TestBed.createComponent(TestHostComponent);
  });

  it('throws an error if sgInput directive is not projected', () => {
    expect(() => errorFixture.detectChanges()).toThrowError(
      'The projected content must include an <input> element with the sgInput directive.'
    );
  });
});

describe('InputFieldComponent', () => {
  let hostComponent: TestHostComponent;
  let hostFixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestHostComponent],
      imports: [
        CommonModule,
        MatIconModule,
        InputDirective,
        InputFieldComponent,
      ],
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostComponent = hostFixture.componentInstance;
    hostFixture.detectChanges();
  });

  it('should create', () => {
    expect(hostComponent).toBeTruthy();
  });

  it('should correctly project sgInput directive', () => {
    const inputEl = hostFixture.debugElement.query(
      By.directive(InputDirective)
    );
    expect(inputEl).toBeTruthy();
  });

  it('should handle disabled, error, and highlighted bindings', () => {
    const inputComponent = hostFixture.debugElement.query(
      By.directive(InputFieldComponent)
    ).componentInstance as InputFieldComponent;
    inputComponent.disabled = true;
    inputComponent.error = true;
    inputComponent.highlighted = true;
    hostFixture.detectChanges();

    expect(inputComponent.isDisabled).toBeTrue();
    expect(inputComponent.hasError).toBeTrue();
    expect(inputComponent.isHighlighted).toBeTrue();
  });

  it('should display support messages conditionally', () => {
    const inputComponent = hostFixture.debugElement.query(
      By.directive(InputFieldComponent)
    ).componentInstance as InputFieldComponent;
    inputComponent.error = true;
    inputComponent.showSupportMessage = 'on-error';
    hostFixture.detectChanges();
    expect(inputComponent.displaysSupportMessage).toBeTrue();

    inputComponent.showSupportMessage = 'always';
    hostFixture.detectChanges();
    expect(inputComponent.displaysSupportMessage).toBeTrue();

    inputComponent.showSupportMessage = false;
    hostFixture.detectChanges();
    expect(inputComponent.displaysSupportMessage).toBeFalse();
  });

  it('should focus the input when focusInput is called', () => {
    const inputComponent = hostFixture.debugElement.query(
      By.directive(InputFieldComponent)
    ).componentInstance as InputFieldComponent;
    const inputDirective = hostFixture.debugElement
      .query(By.directive(InputDirective))
      .injector.get(InputDirective);
    spyOn(inputDirective, 'focus');
    inputComponent.focusInput();
    expect(inputDirective.focus).toHaveBeenCalled();
  });
});
