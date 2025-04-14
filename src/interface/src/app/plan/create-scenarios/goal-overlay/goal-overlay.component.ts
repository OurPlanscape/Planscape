import { Component, OnDestroy } from '@angular/core';
import { GoalOverlayService } from './goal-overlay.service';
import { FeatureService } from '../../../features/feature.service';
import { map } from 'rxjs';
import { ScenarioGoal } from '@types';
import { filter } from 'rxjs/operators';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-goal-overlay',
  templateUrl: './goal-overlay.component.html',
  styleUrls: ['./goal-overlay.component.scss'],
})
export class GoalOverlayComponent implements OnDestroy {
  goal$ = this.goalOverlayService.selectedQuestion$;
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
    private featureService: FeatureService,
    private sanitizer: DomSanitizer
  ) {}

  close() {
    this.goalOverlayService.close();
  }

  get isStatewideScenariosEnabled() {
    return this.featureService.isFeatureEnabled('statewide_scenarios');
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
