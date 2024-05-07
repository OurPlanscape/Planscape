import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HorizonalCardComponent } from '../horizonal-card/horizonal-card.component';

@Component({
  selector: 'app-learn-more',
  templateUrl: './learn-more.component.html',
  styleUrls: ['./learn-more.component.scss'],
  standalone: true,
  imports: [CommonModule, HorizonalCardComponent],
})
export class LearnMoreComponent {
  constructor() {}
}
