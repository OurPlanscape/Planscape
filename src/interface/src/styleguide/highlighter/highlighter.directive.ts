import {
  Directive,
  ElementRef,
  Input,
  OnChanges,
  Renderer2,
  SimpleChanges,
} from '@angular/core';

@Directive({
  selector: '[sgHighlighter]',
  standalone: true,
})
export class HighlighterDirective implements OnChanges {
  /** The text on which to apply highlights. */
  @Input() sgHighlighterText = '';

  /** The term to highlight.
   *  Aliased to the directive selector, so you can do
   *  `[sgHighlighter]="searchTerm"` in your template.
   */
  @Input('sgHighlighter') highlightTerm = '';

  constructor(
    private el: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Whenever the text or the search term changes, update highlights
    if (changes['sgHighlighterText'] || changes['highlightTerm']) {
      this.applyHighlight();
    }
  }

  private applyHighlight(): void {
    const text = this.sgHighlighterText || '';
    const term = this.highlightTerm.trim();

    // If no term, just show the raw text
    if (!term) {
      this.renderer.setProperty(this.el.nativeElement, 'innerHTML', text);
      return;
    }

    // Do a case-insensitive find/replace
    const regex = new RegExp(term, 'gi');
    const highlighted = text.replace(regex, (match) => `<mark>${match}</mark>`);

    // Update the element’s content
    this.renderer.setProperty(this.el.nativeElement, 'innerHTML', highlighted);
  }
}
