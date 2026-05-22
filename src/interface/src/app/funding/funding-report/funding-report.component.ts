import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { ButtonComponent, SectionComponent } from '@styleguide';

interface ReportSection {
  id: string;
  label: string;
}

@Component({
  selector: 'app-funding-report',
  standalone: true,
  imports: [CommonModule, MatTabsModule, SectionComponent, ButtonComponent],
  templateUrl: './funding-report.component.html',
  styleUrl: './funding-report.component.scss',
})
export class FundingReportComponent implements AfterViewInit, OnDestroy {
  @ViewChild('scrollContainer', { static: true })
  scrollContainer!: ElementRef<HTMLElement>;

  sections: ReportSection[] = [
    { id: 'map', label: 'Map' },
    { id: 'carbon', label: 'Carbon' },
    { id: 'wildfire', label: 'Wildfire Risk' },
    { id: 'water', label: 'Water' },
    { id: 'biomass', label: 'Biomass' },
  ];

  activeId = this.sections[0].id;

  private suppressUntil = 0;
  private pendingScrollFrame: number | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.scrollContainer.nativeElement.addEventListener(
        'scroll',
        this.onScroll,
        { passive: true }
      );
    });
    this.updateActiveNav();
  }

  ngOnDestroy(): void {
    this.scrollContainer?.nativeElement.removeEventListener(
      'scroll',
      this.onScroll
    );
    if (this.pendingScrollFrame !== null)
      cancelAnimationFrame(this.pendingScrollFrame);
  }

  scrollTo(event: Event, id: string): void {
    event.preventDefault();
    this.activeId = id;
    // mute scrollspy until smooth-scroll settles so it doesn't flicker
    // through intermediate sections
    this.suppressUntil = Date.now() + 700;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private onScroll = (): void => {
    if (this.pendingScrollFrame !== null) return;
    this.pendingScrollFrame = requestAnimationFrame(() => {
      this.pendingScrollFrame = null;
      if (Date.now() < this.suppressUntil) return;
      this.updateActiveNav();
    });
  };

  private updateActiveNav(): void {
    const containerTop =
      this.scrollContainer.nativeElement.getBoundingClientRect().top;
    // 80px is the height of the header approximately
    const activeLineY = containerTop + 80;

    let next = this.sections[0].id;
    for (const s of this.sections) {
      const el = document.getElementById(s.id);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= activeLineY) {
        next = s.id;
      } else {
        break;
      }
    }

    if (next !== this.activeId) {
      this.zone.run(() => {
        this.activeId = next;
        this.cdr.markForCheck();
      });
    }
  }
}
