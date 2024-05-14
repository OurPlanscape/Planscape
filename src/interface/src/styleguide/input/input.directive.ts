import { Directive, ElementRef } from '@angular/core';

@Directive({
  selector: 'input[sgInput]',
  standalone: true,
})
export class InputDirective {
  private el: ElementRef<HTMLInputElement>;

  constructor(private elementRef: ElementRef<HTMLInputElement>) {
    this.el = this.elementRef;
  }

  focus() {
    this.el.nativeElement.focus();
  }
}
