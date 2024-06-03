import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
  @Input() defaultRecordsPerPage!: number;

  @Output() pageChanged = new EventEmitter<number>();
  @Output() resultsPerPageChanged = new EventEmitter();

  private selectedPage: number = 0;
  recordsPerPage: number = 20;

  ngOnInit(): void {
    this.selectedPage = Number(this.currentPage);
    this.recordsPerPage = Number(this.defaultRecordsPerPage);
  }

  getTotalPages(): number {
    return Number(this.pageCount);
  }
  getPageNumbers(): number[] {
    const pageNumbers = [];
    for (let i = 1; i <= this.getTotalPages(); i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
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
