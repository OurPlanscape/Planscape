import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { ClimateForesightRun } from '@types';

@Component({
  selector: 'app-climate-foresight-run-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
  ],
  templateUrl: './climate-foresight-run-card.component.html',
  styleUrl: './climate-foresight-run-card.component.scss',
})
export class ClimateForesightRunCardComponent {
  @Input() run!: ClimateForesightRun;
  @Output() delete = new EventEmitter<ClimateForesightRun>();
  @Output() openRun = new EventEmitter<ClimateForesightRun>();

  get statusClass(): string {
    const status = this.run.status || 'draft';
    return `status-${status}`;
  }

  get statusLabel(): string {
    const status = this.run.status || 'draft';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  onCardClick(): void {
    this.openRun.emit(this.run);
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    this.delete.emit(this.run);
  }
}
