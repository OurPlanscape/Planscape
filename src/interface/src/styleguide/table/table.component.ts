import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { NgForOf } from '@angular/common';
import { MatSortModule } from '@angular/material/sort';

@Component({
  selector: 'sg-table',
  standalone: true,
  imports: [MatTableModule, NgForOf, MatSortModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
})
export class TableComponent<T> {
  @Input() dataSource: T[] = [];
  @Input() displayedColumns: (keyof T)[] = [];
  @Output() sortData = new EventEmitter<{
    active: string;
    direction: string;
  }>();
}
