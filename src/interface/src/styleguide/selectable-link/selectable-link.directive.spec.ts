import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { SelectableLinkDirective } from './selectable-link.directive';

@Component({
  standalone: true,
  imports: [RouterLink, SelectableLinkDirective],
  template: `<a sgSelectableLink [routerLink]="['/somewhere', 7]">
    <span>Some link text</span>
    <button type="button" (click)="onButton($event)">A control</button>
  </a>`,
})
class HostComponent {
  clicked = false;

  onButton(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.clicked = true;
  }
}

describe('SelectableLinkDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: ActivatedRoute, useValue: { firstChild: {} } }],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.returnValue(
      Promise.resolve(true)
    );
  });

  function link(): HTMLAnchorElement {
    return fixture.nativeElement.querySelector('a');
  }

  function clickWithSelectionOn(element: Element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    element.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    );
    selection.removeAllRanges();
  }

  it('makes the link undraggable so a drag selects text instead', () => {
    expect(link().getAttribute('draggable')).toBe('false');
    expect(link().style.userSelect).toBe('text');
  });

  it('does not navigate when a click ends a selection inside the link', () => {
    clickWithSelectionOn(fixture.nativeElement.querySelector('span'));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not navigate when the selection ends on the link itself', () => {
    clickWithSelectionOn(link());

    expect(navigate).not.toHaveBeenCalled();
  });

  it('still lets buttons inside the link be clicked while text is selected', () => {
    const button = fixture.nativeElement.querySelector('button');
    clickWithSelectionOn(fixture.nativeElement.querySelector('span'));

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const range = document.createRange();
    range.selectNodeContents(fixture.nativeElement.querySelector('span'));
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    button.dispatchEvent(event);
    selection.removeAllRanges();

    expect(fixture.componentInstance.clicked).toBe(true);
  });

  it('navigates on a plain click', () => {
    link().dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    );

    expect(navigate).toHaveBeenCalled();
  });
});
