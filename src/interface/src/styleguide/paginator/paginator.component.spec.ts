import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { PaginatorComponent } from '@styleguide/paginator/paginator.component';

describe('PaginatorComponent', () => {
  let component: PaginatorComponent;
  let fixture: ComponentFixture<PaginatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginatorComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginatorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.pageCount = 1;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('initializes nav select range and button labels on init', () => {
    component.pageCount = 5;
    component.currentPage = 1;

    fixture.detectChanges();

    expect(component.navSelectRange).toEqual([1, 2, 3, 4, 5]);
    expect(component.buttonRange$.value).toEqual([2, 3, 4]);
    expect(component.showFirstSpacer$.value).toBeFalse();
    expect(component.showLastSpacer$.value).toBeFalse();
  });

  it('shows the trailing spacer for longer ranges near the start', () => {
    component.pageCount = 10;
    component.currentPage = 1;

    fixture.detectChanges();

    expect(component.buttonRange$.value).toEqual([2, 3, 4, 5, 6, 7]);
    expect(component.showFirstSpacer$.value).toBeFalse();
    expect(component.showLastSpacer$.value).toBeTrue();
  });

  it('shows the leading spacer for longer ranges near the end', () => {
    component.pageCount = 10;
    component.currentPage = 9;

    fixture.detectChanges();

    expect(component.buttonRange$.value).toEqual([3, 4, 5, 6, 7, 8, 9]);
    expect(component.showFirstSpacer$.value).toBeTrue();
    expect(component.showLastSpacer$.value).toBeFalse();
  });

  it('emits pageChanged when selecting a new page', () => {
    component.pageCount = 5;
    component.currentPage = 1;
    fixture.detectChanges();

    const emitSpy = spyOn(component.pageChanged, 'emit');

    component.setPage(3);

    expect(component.currentPage).toBe(3);
    expect(emitSpy).toHaveBeenCalledWith(3);
  });

  it('does not emit pageChanged when selecting the current page', () => {
    component.pageCount = 5;
    component.currentPage = 2;
    fixture.detectChanges();

    const emitSpy = spyOn(component.pageChanged, 'emit');

    component.setPage(2);

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('respects bounds when navigating previous/next', () => {
    component.pageCount = 3;
    component.currentPage = 1;
    fixture.detectChanges();

    const emitSpy = spyOn(component.pageChanged, 'emit');

    component.handlePrevious();
    expect(component.currentPage).toBe(1);
    expect(emitSpy).not.toHaveBeenCalled();

    component.setPage(3);
    emitSpy.calls.reset();
    component.handleNext();

    expect(component.currentPage).toBe(3);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('emits recordsPerPageChanged when per-page selection changes', () => {
    component.pageCount = 3;
    component.recordsPerPage = 20;
    fixture.detectChanges();

    const emitSpy = spyOn(component.recordsPerPageChanged, 'emit');

    component.perPageChanged();

    expect(emitSpy).toHaveBeenCalledWith(20);
  });
});
