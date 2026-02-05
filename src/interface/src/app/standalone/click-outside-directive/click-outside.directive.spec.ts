import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClickOutsideDirective } from '@app/standalone/click-outside-directive/click-outside.directive';

@Component({
  standalone: true,
  imports: [ClickOutsideDirective],
  template: `
    <div appClickOutside (clickOutside)="handleOutside()" class="host">
      <button class="inside-btn">Inside</button>
    </div>
    <button class="outside-btn">Outside</button>
  `,
})
class TestHostComponent {
  outsideCount = 0;

  handleOutside() {
    this.outsideCount += 1;
  }
}

describe('ClickOutsideDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('does not emit when clicking inside the host', () => {
    const insideButton = fixture.nativeElement.querySelector(
      '.inside-btn'
    ) as HTMLButtonElement;

    insideButton.click();

    expect(component.outsideCount).toBe(0);
  });

  it('emits when clicking outside the host', () => {
    const outsideButton = fixture.nativeElement.querySelector(
      '.outside-btn'
    ) as HTMLButtonElement;

    outsideButton.click();

    expect(component.outsideCount).toBe(1);
  });

  it('emits once per outside click', () => {
    const outsideButton = fixture.nativeElement.querySelector(
      '.outside-btn'
    ) as HTMLButtonElement;

    outsideButton.click();
    outsideButton.click();

    expect(component.outsideCount).toBe(2);
  });
});
