import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgFor, NgIf, NgClass } from '@angular/common';
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
export class PaginatorComponent implements OnInit {
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
   * Emits an event with the latest selected page.
   */
  @Output() pageChanged = new EventEmitter<number>();
  /**
   * Emits an event with the latest selection for results per page.
   */
  @Output() recordsPerPageChanged = new EventEmitter<number>();

  selectedPage: number = 0;
  buttonsShown = 0;
  showFirstSpacer$ = new BehaviorSubject<boolean>(false);
  showLastSpacer$ = new BehaviorSubject<boolean>(false);
  buttonRange$ = new BehaviorSubject<number[]>([]);
  navSelectRange: number[] = [];
  deafultButtonsToShow = 6;

  ngOnInit(): void {
    this.selectedPage = Number(this.currentPage);
    this.recordsPerPage = Number(this.recordsPerPage);
    this.navSelectRange = [1, ...Array(this.pageCount + 1).keys()].slice(2);
    this.getButtonLabels();
  }

  getTotalPages(): number {
    return Number(this.pageCount);
  }

  getButtonLabels(): void {
    const buttonsToShow = Math.min(
      this.getTotalPages(),
      this.deafultButtonsToShow
    );

    const remainderAtEnd = Math.max(
      0,
      Math.ceil(buttonsToShow / 2) +
        1 -
        (this.getTotalPages() - this.selectedPage)
    );
    const remainderAtStart = Math.max(
      0,
      Math.ceil(buttonsToShow / 2) - (this.selectedPage - 1)
    );
    let buttonStart = Math.max(
      this.selectedPage - Math.ceil(buttonsToShow / 2) - remainderAtEnd,
      2
    );
    let buttonEnd = Math.min(
      this.selectedPage + Math.ceil(buttonsToShow / 2) + 1 + remainderAtStart,
      this.getTotalPages()
    );

    this.showFirstSpacer$.next(buttonStart > 2);
    this.showLastSpacer$.next(buttonEnd < this.getTotalPages());

    //create the range of actual visible buttons
    const buttonArray = [];
    for (let i = buttonStart; i < buttonEnd; i++) {
      buttonArray.push(i);
    }
    this.buttonRange$.next(buttonArray);
  }

  setPage(pageNum: number) {
    this.selectedPage = pageNum;
    this.pageChanged.emit(this.selectedPage);
  }

  isCurrentPage(elementPage: number): boolean {
    return elementPage === this.selectedPage;
  }

  perPageChanged() {
    this.recordsPerPageChanged.emit(this.recordsPerPage);
  }

  handlePrevious() {
    const pageNum = Math.max(this.selectedPage - 1, 1);
    this.setPage(pageNum);
    this.getButtonLabels();
  }
  handleNext() {
    const pageNum = Math.min(this.selectedPage + 1, this.getTotalPages());
    this.setPage(pageNum);
    this.getButtonLabels();
  }
  @HostListener('window:resize')
  onResize() {
    this.getButtonLabels();
  }
}
