import { Component } from '@angular/core';
import { GoalOverlayService } from './goal-overlay.service';

@Component({
  selector: 'app-goal-overlay',
  templateUrl: './goal-overlay.component.html',
  styleUrls: ['./goal-overlay.component.scss'],
})
export class GoalOverlayComponent {
  goal$ = this.service.selectedQuestion$;

  constructor(private service: GoalOverlayService) {}

  close() {
    this.service.close();
  }
}
