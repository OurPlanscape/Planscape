import {
  AfterViewInit,
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
export class HighlighterDirective implements AfterViewInit, OnChanges {
  /**
   * The term we want to highlight in this element's content.
   */
  @Input('sgHighlighter') highlightTerm: string = '';

  // Keep a copy of the original HTML for resetting
  private originalHTML: string = '';

  constructor(
    private el: ElementRef,
    private renderer: Renderer2
  ) {}

  // After the view initializes, capture the original content
  ngAfterViewInit(): void {
    this.originalHTML = this.el.nativeElement.innerHTML;
    this.applyHighlight();
  }

  // Listen for input changes (search term changes)
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['highlightTerm'] && !changes['highlightTerm'].isFirstChange()) {
      this.applyHighlight();
    }
  }

  private applyHighlight(): void {
    // If there is no search term, reset to original content
    const term = this.highlightTerm.trim();
    if (!term) {
      this.renderer.setProperty(
        this.el.nativeElement,
        'innerHTML',
        this.originalHTML
      );
      return;
    }

    // Case-insensitive regex
    const regex = new RegExp(term, 'gi');
    // Insert <mark> around all matches
    const highlighted = this.originalHTML.replace(
      regex,
      (match) => `<mark>${match}</mark>`
    );

    // Update element's content
    this.renderer.setProperty(this.el.nativeElement, 'innerHTML', highlighted);
  }
}
