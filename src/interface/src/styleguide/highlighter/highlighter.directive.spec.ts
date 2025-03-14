import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HighlighterDirective } from './highlighter.directive';
import { Component } from '@angular/core';

@Component({
  template: `
    <div
      sgHighlighter
      [sgHighlighter]="testSearchTerm"
      [sgHighlighterText]="testText"></div>
  `,
})
export class TestHostComponent {
  testSearchTerm = '';
  testText =
    'Planscape is a free, open source decision support tool designed to help ' +
    'teams doing wildland planning identify the optimal areas on their ' +
    'landscape to treat for wildfire resilience.';
}

describe('HighlighterDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // For a standalone directive, include it in "imports" rather than "declarations".
      imports: [HighlighterDirective],
      // The test host component is a normal component, so we declare it here.
      declarations: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should create an instance via the test host', () => {
    // Grab the debug element that has the directive
    const directiveEl = fixture.debugElement.query(
      By.directive(HighlighterDirective)
    );
    expect(directiveEl).toBeTruthy();
  });

  it('should NOT highlight anything when no search term is provided', () => {
    const directiveEl = fixture.debugElement.query(
      By.directive(HighlighterDirective)
    );
    // With an empty search term, we expect no <mark> in the rendered output.
    expect(directiveEl.nativeElement.innerHTML).not.toContain('<mark>');
  });

  it('should highlight matches when search term is set', () => {
    const host = fixture.componentInstance;
    const directiveEl = fixture.debugElement.query(
      By.directive(HighlighterDirective)
    );

    // Provide a search term that appears in the text
    host.testSearchTerm = 'planning'; // part of "...wildland planning identify..."
    fixture.detectChanges();

    // Expect matched occurrences to be wrapped in <mark>
    expect(directiveEl.nativeElement.innerHTML).toContain(
      '<mark>planning</mark>'
    );
  });

  it('should handle case-insensitive matching', () => {
    const host = fixture.componentInstance;
    const directiveEl = fixture.debugElement.query(
      By.directive(HighlighterDirective)
    );

    // "PLANNING" is uppercase, but should still highlight "planning"
    host.testSearchTerm = 'PLANNING';
    fixture.detectChanges();

    expect(directiveEl.nativeElement.innerHTML).toContain(
      '<mark>planning</mark>'
    );
  });

  it('should reset to original content when the search term is empty', () => {
    const host = fixture.componentInstance;
    const directiveEl = fixture.debugElement.query(
      By.directive(HighlighterDirective)
    );

    // Set a term first
    host.testSearchTerm = 'planning';
    fixture.detectChanges();

    // Expect <mark> to exist
    expect(directiveEl.nativeElement.innerHTML).toContain(
      '<mark>planning</mark>'
    );

    // Clear the search term
    host.testSearchTerm = '';
    fixture.detectChanges();

    // The directive should revert the element's innerHTML to the original text (no <mark>)
    expect(directiveEl.nativeElement.innerHTML).not.toContain('<mark>');
    // Optionally, we can test that the original text is still there
    expect(directiveEl.nativeElement.innerHTML).toContain(
      'wildland planning identify'
    );
  });
});
