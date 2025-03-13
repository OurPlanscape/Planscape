import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { HighlighterDirective } from './highlighter.directive';
import { Component } from '@angular/core';

@Component({
  template: `
    <div sgHighlighter [sgHighlighter]="testSearchTerm">
      Planscape is a free, open source decision support tool designed to help
      teams doing wildland planning identify the optimal areas on their
      landscape to treat for wildfire resilience.
    </div>
  `,
})
export class TestHostComponent {
  testSearchTerm = '';
}

describe('HighlighterDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HighlighterDirective],
      declarations: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should create an instance of the directive via the test host', () => {
    // Grab the element with the directive
    const directiveEl = fixture.debugElement.query(
      By.directive(HighlighterDirective)
    );
    expect(directiveEl).toBeTruthy();
  });

  it('should highlight matches when search term is set', () => {
    const testHost = fixture.componentInstance;
    const directiveEl = fixture.debugElement.query(
      By.directive(HighlighterDirective)
    );

    // Initially, there's no highlightTerm
    expect(directiveEl.nativeElement.innerHTML).not.toContain('<mark>');

    // Update the search term
    testHost.testSearchTerm = 'Planning'; // case-insensitive check
    fixture.detectChanges();

    // Expect matched occurrences to be wrapped in <mark>
    // We'll see <mark> for "Angular" in the text
    expect(directiveEl.nativeElement.innerHTML).toContain(
      '<mark>planning</mark>'
    );
  });

  it('should handle case-insensitive matching', () => {
    const testHost = fixture.componentInstance;
    const directiveEl = fixture.debugElement.query(
      By.directive(HighlighterDirective)
    );

    // Provide a term that doesn't match exact case
    testHost.testSearchTerm = 'PLANNING';
    fixture.detectChanges();

    // Should still highlight "Angular"
    expect(directiveEl.nativeElement.innerHTML).toContain(
      '<mark>planning</mark>'
    );
  });

  it('should reset to original content when the search term is empty', () => {
    const testHost = fixture.componentInstance;
    const directiveEl = fixture.debugElement.query(
      By.directive(HighlighterDirective)
    );

    // Set a search term to highlight
    testHost.testSearchTerm = 'planning';
    fixture.detectChanges();

    // Expect <mark> tags to exist
    expect(directiveEl.nativeElement.innerHTML).toContain(
      '<mark>planning</mark>'
    );

    // Now clear out the search term
    testHost.testSearchTerm = '';
    fixture.detectChanges();

    // The directive should revert the innerHTML to the original (no <mark>)
    expect(directiveEl.nativeElement.innerHTML).not.toContain('<mark>');
  });
});
