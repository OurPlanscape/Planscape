import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { Plan, Region, User } from '../../../types';
import { calculateAcres, NOTE_SAVE_INTERVAL } from '../../plan-helpers';
import { Subject, interval, takeUntil } from 'rxjs';
import { PlanService } from 'src/app/services';

export interface SummaryInput {
  id?: string;
  type: string;
  name: string;
  owner: string;
  region: Region;
  area: GeoJSON.GeoJSON;
  status?: string;
  createdTime?: number;
  scenarios?: number;
  configs?: number;
  lastUpdated: Date;
  acres: number;
  notes?: string;
}

// todo: move this to shared types
export enum ConditionName {
  GOOD = 'Good',
  LEANING_GOOD = 'Leaning good',
  NEUTRAL = 'Neutral',
  LEANING_POOR = 'Leaning poor',
  POOR = 'Poor',
}

export const conditionScoreColorMap: Record<ConditionName, string> = {
  [ConditionName.GOOD]: '#010108',
  [ConditionName.LEANING_GOOD]: '#4c1761',
  [ConditionName.NEUTRAL]: '#b1354c',
  [ConditionName.LEANING_POOR]: '#F4511e',
  [ConditionName.POOR]: '#fdd853',
};

@Component({
  selector: 'app-summary-panel',
  templateUrl: './summary-panel.component.html',
  styleUrls: ['./summary-panel.component.scss'],
})
export class SummaryPanelComponent implements OnInit, OnChanges {
  @Input() plan: Plan | null = null;
  @Input() owner: User | null = null;

  summaryInput: SummaryInput | null = null;
  conditionScore: ConditionName = ConditionName.POOR;
  futureConditionScore: ConditionName = ConditionName.LEANING_GOOD;
  conditionScoreColorMap = conditionScoreColorMap;
  private readonly destroy$ = new Subject<void>();
  notes: string = '';

  constructor(private planService: PlanService) {}

  ngOnInit(): void {
    this.notes = this.plan?.notes ? this.plan?.notes : '';
    this.autoSaveNotes();
  }
  ngOnChanges(): void {
    if (!!this.plan) {
      this.summaryInput = {
        id: this.plan!.id,
        type: 'Plan',
        name: this.plan!.name,
        owner: this.owner?.firstName
          ? this.owner?.firstName + ' ' + this.owner?.lastName
          : this.owner?.username ?? 'Guest',
        region: this.plan!.region,
        area: this.plan!.planningArea!,
        createdTime: this.plan!.createdTimestamp,
        scenarios: this.plan!.scenarios,
        notes: this.plan!.notes,
        configs: this.plan!.configs,
        lastUpdated: this.plan!.lastUpdated!,
        acres: calculateAcres(this.plan!.planningArea!),
        status: 'In progress',
      };
    }
  }

  autoSaveNotes(): void {
    interval(NOTE_SAVE_INTERVAL)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.plan && this.plan.notes !== this.notes) {
          this.plan.notes = this.notes;
          this.planService
            .updatePlanningArea(this.plan, this.plan.id)
            .subscribe();
        }
      });
  }
}
