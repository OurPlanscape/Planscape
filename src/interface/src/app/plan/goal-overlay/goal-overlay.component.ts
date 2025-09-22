import { Component, OnDestroy } from '@angular/core';
import { GoalOverlayService } from './goal-overlay.service';
import { map } from 'rxjs';
import { ScenarioGoal } from '@types';
import { filter } from 'rxjs/operators';
import { DomSanitizer } from '@angular/platform-browser';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ButtonComponent } from '@styleguide';

@Component({
  selector: 'app-goal-overlay',
  templateUrl: './goal-overlay.component.html',
  styleUrls: ['./goal-overlay.component.scss'],
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    CommonModule,
    MatButtonModule,
    ButtonComponent,
  ],
})
export class GoalOverlayComponent implements OnDestroy {
  stateWideGoal$ = this.goalOverlayService.selectedStateWideGoal$;

  safeDescription$ = this.stateWideGoal$.pipe(
    filter((goal): goal is ScenarioGoal => !!goal),
    map((goal) =>
      this.sanitizer.bypassSecurityTrustHtml(
        this.sanitizeLinks(goal.description)
      )
    )
  );

  constructor(
    private goalOverlayService: GoalOverlayService,
    private sanitizer: DomSanitizer
  ) {}

  close() {
    this.goalOverlayService.close();
  }

  sanitizeLinks(html: string): string {
    return html.replace(
      /<a /g,
      '<a target="_blank" rel="noopener noreferrer" '
    );
  }

  ngOnDestroy() {
    this.close();
  }
}
