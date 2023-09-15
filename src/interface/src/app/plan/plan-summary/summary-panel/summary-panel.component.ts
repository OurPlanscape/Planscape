import { Component, Input, OnChanges } from '@angular/core';
import { Plan, Region, User } from '../../../types';
import { calculateAcres } from '../../plan-helpers';
import { BehaviorSubject } from 'rxjs';

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
  selector: 'summary-panel',
  templateUrl: './summary-panel.component.html',
  styleUrls: ['./summary-panel.component.scss'],
})
export class SummaryPanelComponent implements OnChanges {
  @Input() plan = new BehaviorSubject<Plan | null>(null);
  @Input() owner: User | null = null;

  summaryInput: SummaryInput | null = null;
  conditionScore: ConditionName = ConditionName.POOR;
  futureConditionScore: ConditionName = ConditionName.LEANING_GOOD;
  conditionScoreColorMap = conditionScoreColorMap;

  ngOnChanges(): void {
    if (!!this.plan) {
      var plan_value = this.plan.getValue();
      console.log(this.plan);
      this.summaryInput = {
        id: plan_value!.id,
        type: 'Plan',
        name: plan_value!.name,
        owner: this.owner?.firstName
          ? this.owner?.firstName + ' ' + this.owner?.lastName
          : this.owner?.username ?? 'Guest',
        region: plan_value!.region,
        area: plan_value!.planningArea!,
        createdTime: plan_value!.createdTimestamp,
        scenarios: plan_value!.scenarios,
        notes: plan_value!.notes,
        configs: plan_value!.configs,
        lastUpdated: plan_value!.lastUpdated!,
        acres: calculateAcres(plan_value!.planningArea!),
        status: 'In progress',
      };
    }
  }
}
