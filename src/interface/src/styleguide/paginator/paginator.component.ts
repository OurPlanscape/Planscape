import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule, NgClass, NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

/**
 * Provides a responsive set of page selection buttons and a select menu for results per page.
 * At small window widths, it will display a select menu for pages instead of buttons.
 */
@Component({
  selector: 'sg-paginator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgFor,
    NgIf,
    NgClass,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
  ],
  templateUrl: './paginator.component.html',
  styleUrl: './paginator.component.scss',
})
export class PaginatorComponent implements OnInit, OnChanges {
  /**
   * The initial starting page.
   */
  @Input() currentPage = 1;
  /**
   * The number of available result pages. If there's only one page or less, no page selector will be shown.
   */
  @Input() pageCount!: number;
  /**
   * The initial number of records per page shown.
   */
  @Input() recordsPerPage = 10;
  /**
   * The options presented for records per page.
   */
  @Input() perPageOptions = [10, 20, 50];

  /**
   * Determines if this we should render a compact version, which does not include records per page
   * or disabled back button if on page 1
   */
  @Input() compact = false;

  /**
   * Emits an event with the latest selected page.
   */
  @Output() pageChanged = new EventEmitter<number>();
  /**
   * Emits an event with the latest selection for results per page.
   */
  @Output() recordsPerPageChanged = new EventEmitter<number>();

  buttonsShown = 0;
  showFirstSpacer$ = new BehaviorSubject<boolean>(false);
  showLastSpacer$ = new BehaviorSubject<boolean>(false);
  buttonRange$ = new BehaviorSubject<number[]>([]);
  navSelectRange: number[] = [];
  defaultButtonsToShow = 6;
  compactButtonsToShow = 2;

  ngOnInit(): void {
    this.navSelectRange = [1, ...Array(this.pageCount + 1).keys()].slice(2);
    this.calcButtonLabels();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['pageCount']) {
      this.calcButtonLabels();
    }
  }

  getTotalPages(): number {
    return this.pageCount;
  }

  calcButtonLabels(): void {
    const curPages = this.pageCount;
    const buttonsToShow = Math.min(
      curPages,
      this.compact ? this.compactButtonsToShow : this.defaultButtonsToShow
    );

    const midCount = Math.ceil(buttonsToShow / 2);
    const rightRemainder = Math.max(
      0,
      midCount + 1 - (curPages - this.currentPage)
    );
    const leftRemainder = Math.max(0, midCount - (this.currentPage - 1));
    let buttonStart = Math.max(this.currentPage - midCount - rightRemainder, 2);
    let buttonEnd = Math.min(
      this.currentPage + midCount + 1 + leftRemainder,
      curPages
    );
    this.showFirstSpacer$.next(buttonStart > 2);
    this.showLastSpacer$.next(buttonEnd < curPages);

    //create the range of actual visible buttons
    const buttonArray = [];
    for (let i = buttonStart; i < buttonEnd; i++) {
      buttonArray.push(i);
    }
    this.buttonRange$.next(buttonArray);
  }

  selectPageChange() {
    this.calcButtonLabels();
    this.pageChanged.emit(this.currentPage);
  }

  setPage(pageNum: number) {
    if (this.currentPage !== pageNum) {
      this.currentPage = pageNum;
      this.pageChanged.emit(this.currentPage);
      this.calcButtonLabels();
    }
  }

  isCurrentPage(elementPage: number): boolean {
    return elementPage === this.currentPage;
  }

  perPageChanged() {
    this.recordsPerPageChanged.emit(this.recordsPerPage);
  }

  handlePrevious() {
    const pageNum = Math.max(this.currentPage - 1, 1);
    this.setPage(pageNum);
  }

  handleNext() {
    const pageNum = Math.min(this.currentPage + 1, this.pageCount);
    this.setPage(pageNum);
  }
}
