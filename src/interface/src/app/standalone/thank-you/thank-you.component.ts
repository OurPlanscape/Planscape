import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@shared';
import { LearnMoreComponent } from '../learn-more/learn-more.component';

@Component({
  selector: 'app-thank-you',
  templateUrl: './thank-you.component.html',
  styleUrls: ['./thank-you.component.scss'],
  standalone: true,
  imports: [CommonModule, SharedModule, LearnMoreComponent],
})
export class ThankYouComponent {
  constructor() {}
}
