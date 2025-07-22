import { Directive, Input, TemplateRef } from '@angular/core';

@Directive({
  selector: '[sgStep]',
  standalone: true, // 👈 Required if you're using standalone component system
})
export class StepTemplateDirective {
  @Input('sgStep') label!: string;

  constructor(public template: TemplateRef<any>) {}
}
