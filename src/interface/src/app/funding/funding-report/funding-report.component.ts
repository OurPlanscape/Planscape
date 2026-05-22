import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
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

  private observer?: IntersectionObserver;
  private suppressObserverUntil = 0;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < this.suppressObserverUntil) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.activeId = (entry.target as HTMLElement).id;
            this.cdr.markForCheck();
          }
        }
      },
      {
        root: this.scrollContainer.nativeElement,
        rootMargin: '0px 0px -80% 0px',
        threshold: 0,
      }
    );

    for (const s of this.sections) {
      const el = document.getElementById(s.id);
      if (el) this.observer.observe(el);
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  scrollTo(event: Event, id: string): void {
    event.preventDefault();
    this.activeId = id;
    // suppress observer updates briefly so smooth-scroll's transit through
    // intermediate sections doesn't flicker the active tab
    this.suppressObserverUntil = Date.now() + 700;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
