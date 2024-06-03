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
  @Input() currentPage!: number;
  @Input() pageCount!: number;
  @Input() recordsPerPage!: number;

  @Output() pageChanged = new EventEmitter<number>();
  @Output() resultsPerPageChanged = new EventEmitter();

  selectedPage: number = 0;
  buttonsShown = 10;
  showFirstSpacer = false;
  showLastSpacer = false;

  ngOnInit(): void {
    this.selectedPage = Number(this.currentPage);
    this.recordsPerPage = Number(this.recordsPerPage);
  }

  visibleButtonCount(): number {
    const width = window.innerWidth;
    // buttons are fixed at 40px
    // first and last buttons + arrows are 160px wide
    // max width of buttons is 700px
    // TODO: hardcode these once we get the breakpoints settled
    if (width > 800) return Math.ceil((660 - 200) / 40);
    if (width > 400) return Math.ceil((360 - 200) / 40);
    return Math.ceil((300 - 200) / 40);
  }

  getTotalPages(): number {
    return Number(this.pageCount);
  }

  getButtonLabels(): number[] {
    const buttonRange = [];
    const buttonsToShow = Math.min(
      this.getTotalPages(),
      this.visibleButtonCount()
    );

    const remainderAtEnd = Math.max(
      0,
      Math.ceil(buttonsToShow / 2) +
        1 -
        (this.getTotalPages() - this.selectedPage)
    );

    // TODO: adjust remainders to account for spacer buttons
    const remainderAtStart = Math.max(
      0,
      Math.ceil(buttonsToShow / 2) - (this.selectedPage - 1)
    );
    const buttonStart = Math.max(
      this.selectedPage - Math.ceil(buttonsToShow / 2) - remainderAtEnd,
      2
    );
    const buttonEnd = Math.min(
      this.selectedPage + Math.ceil(buttonsToShow / 2) + 1 + remainderAtStart,
      this.getTotalPages()
    );

    this.showFirstSpacer = buttonStart > 2;
    this.showLastSpacer = buttonEnd < this.getTotalPages();

    //create the range of actual visible buttons
    for (let i = buttonStart; i < buttonEnd; i++) {
      buttonRange.push(i);
    }
    return buttonRange;
  }

  setPage(pageNum: number) {
    this.selectedPage = pageNum;
    this.pageChanged.emit(this.selectedPage);
  }

  isCurrentPage(elementPage: number): boolean {
    return elementPage === this.selectedPage;
  }

  perPageChanged() {
    this.resultsPerPageChanged.emit(this.recordsPerPage);
  }

  @HostListener('window:resize')
  onResize() {
    this.visibleButtonCount();
  }

  toFirstPage() {
    this.selectedPage = 1;
  }
  handlePrevious() {
    this.selectedPage = Math.max(this.selectedPage - 1, 1);
  }
  handleNext() {
    this.selectedPage = Math.min(this.selectedPage + 1, this.getTotalPages());
  }
  toLastPage() {
    this.selectedPage = this.getTotalPages();
  }
}
