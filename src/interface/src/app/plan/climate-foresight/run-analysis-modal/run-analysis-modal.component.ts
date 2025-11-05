import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ModalComponent } from '@styleguide';

@Component({
  selector: 'app-run-analysis-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  templateUrl: './run-analysis-modal.component.html',
  styleUrl: './run-analysis-modal.component.scss',
})
export class RunAnalysisModalComponent {}
