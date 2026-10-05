import { Directive, ElementRef, OnInit, Renderer2 } from '@angular/core';

/**
 * Lets the user select the text inside a link.
 *
 * Chrome drags a link rather than selecting the text under the cursor, and the
 * mouseup that ends a selection still counts as a click, which RouterLink would
 * follow. This turns off the drag and swallows that click.
 */
@Directive({
  selector: 'a[sgSelectableLink]',
  standalone: true,
})
export class SelectableLinkDirective implements OnInit {
  constructor(
    private el: ElementRef<HTMLAnchorElement>,
    private renderer: Renderer2
  ) {}

  ngOnInit() {
    const link = this.el.nativeElement;
    // Chrome needs all three, or a drag on the link never becomes a selection.
    this.renderer.setAttribute(link, 'draggable', 'false');
    this.renderer.setStyle(link, 'user-select', 'text');
    this.renderer.setStyle(link, '-webkit-user-drag', 'none');
    // RouterLink handles clicks on the bubble phase, so vetoing one means
    // getting in first — which only the capture phase allows.
    link.addEventListener('click', this.cancelClick, true);
  }

  private cancelClick = (event: Event) => {
    // Buttons inside the link handle their own clicks, and clicking one does
    // not clear the selection, so they would otherwise never fire.
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    if (window.getSelection()?.toString()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
}
