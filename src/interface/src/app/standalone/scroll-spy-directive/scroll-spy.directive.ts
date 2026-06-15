import {
  AfterViewInit,
  Directive,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  Output,
} from '@angular/core';

/**
 * Scrollspy: highlights navigation as sections scroll past an "active line".
 *
 * Place it on the nav element and give it the ids of the sections to track. It
 * watches them with an `IntersectionObserver` — no scroll listener and no layout
 * reads on scroll — and emits the id of the section currently at the top of the
 * reading area. Call `scrollTo(id)` from a tab click to smooth-scroll there.
 *
 * The active line sits at each section's CSS `scroll-margin-top` below the scroll
 * container's top — the same offset `scrollIntoView` uses — so the spy and
 * click-to-scroll always agree, with the offset defined once in CSS.
 *
 * @example
 * <nav [appScrollSpy]="sectionIds"
 *      [spyRoot]="scrollElement"
 *      (activeSection)="activeId = $event"
 *      #spy="appScrollSpy">
 *   <a *ngFor="let s of sections"
 *      [class.active]="activeId === s.id"
 *      (click)="$event.preventDefault(); spy.scrollTo(s.id)">{{ s.label }}</a>
 * </nav>
 */
@Directive({
  selector: '[appScrollSpy]',
  standalone: true,
  exportAs: 'appScrollSpy',
})
export class ScrollSpyDirective implements AfterViewInit, OnDestroy {
  /** Ids of the section elements to track, in document order. */
  @Input('appScrollSpy') sectionIds: string[] = [];
  /** The element that scrolls the sections. */
  @Input({ required: true }) spyRoot!: HTMLElement;
  /** Emits the active section id whenever it changes. */
  @Output() activeSection = new EventEmitter<string>();

  private observer?: IntersectionObserver;
  /** Ids of sections currently below the active line, kept in sync by the observer. */
  private readonly visible = new Set<string>();
  private activeId = '';
  /** Section a click is scrolling toward; the spy holds here until it arrives. */
  private seekId: string | null = null;
  /** Safety release for `seekId` if the target is never reached (e.g. last section). */
  private seekDeadline = 0;

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    const offset = this.activeLineOffset();
    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(this.onIntersect, {
        root: this.spyRoot,
        rootMargin: `-${offset}px 0px 0px 0px`,
        threshold: 0,
      });
      for (const id of this.sectionIds) {
        const el = document.getElementById(id);
        if (el) this.observer.observe(el);
      }
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  /** Smooth-scroll a section to the active line, holding the spy on it en route. */
  scrollTo(id: string): void {
    this.emit(id);
    // Hold the spy on this target so it doesn't flicker through the sections the
    // smooth scroll passes over; released when we arrive or after a safety delay.
    this.seekId = id;
    this.seekDeadline = Date.now() + 1500;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Distance below the container's top where a section becomes active. */
  private activeLineOffset(): number {
    const first = document.getElementById(this.sectionIds[0]);
    return first
      ? parseInt(getComputedStyle(first).scrollMarginTop, 10) || 0
      : 0;
  }

  private onIntersect = (entries: IntersectionObserverEntry[]): void => {
    for (const e of entries) {
      if (e.isIntersecting) this.visible.add(e.target.id);
      else this.visible.delete(e.target.id);
    }

    // Active section = the first one still below the active line.
    const next = this.sectionIds.find((id) => this.visible.has(id));
    if (!next) return;

    // While a click scroll is in flight, hold on the target; release once we
    // reach it (or the safety deadline elapses).
    if (this.seekId) {
      if (next === this.seekId || Date.now() >= this.seekDeadline) {
        this.seekId = null;
      } else {
        return;
      }
    }

    this.emit(next);
  };

  private emit(id: string): void {
    if (id === this.activeId) return;
    this.activeId = id;
    this.zone.run(() => this.activeSection.emit(id));
  }
}
