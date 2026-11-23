import { NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ButtonComponent, ToggleComponent } from '@styleguide';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { DataLayer, EmbeddedDataLayer, ScenarioGoal, UsageType } from '@types';

interface PreviewRow {
  key: string;
  layer: EmbeddedDataLayer;
}

interface PreviewGroup {
  label: string;
  rows: PreviewRow[];
}

const PREVIEW_GROUPS: { usageType: string; label: string }[] = [
  { usageType: 'PRIORITY', label: 'Priority Objective' },
  { usageType: 'SECONDARY_METRIC', label: 'Co-Benefits' },
  { usageType: 'THRESHOLD', label: 'Stand-Level Constraint' },
];

function rowsOf(usages: UsageType[], usageType: string): PreviewRow[] {
  return usages
    .filter((usage) => usage.usage_type === usageType)
    .map((usage) => usage.datalayer)
    .filter((layer): layer is EmbeddedDataLayer => typeof layer !== 'string')
    .map((layer) => ({ key: `${usageType}:${layer.id}`, layer }));
}

@UntilDestroy()
@Component({
  selector: 'app-treatment-goal-details',
  standalone: true,
  imports: [ButtonComponent, NgFor, NgIf, ToggleComponent],
  templateUrl: './treatment-goal-details.component.html',
  styleUrl: './treatment-goal-details.component.scss',
})
export class TreatmentGoalDetailsComponent {
  private _goal!: ScenarioGoal;

  @Input({ required: true })
  get goal(): ScenarioGoal {
    return this._goal;
  }
  set goal(goal: ScenarioGoal) {
    this._goal = goal;
    this.previewGroups = PREVIEW_GROUPS.map((group) => ({
      label: group.label,
      rows: rowsOf(goal.usage_types ?? [], group.usageType),
    })).filter((group) => group.rows.length > 0);
    this.previewedRow = null;
  }

  @Output() closed = new EventEmitter<void>();

  previewGroups: PreviewGroup[] = [];

  previewedRow: PreviewRow | null = null;

  constructor(private dataLayersStateService: DataLayersStateService) {
    this.dataLayersStateService.viewedDataLayer$
      .pipe(untilDestroyed(this))
      .subscribe((layer) => this.followMap(layer));
  }

  toggleLayer(row: PreviewRow, previewing: boolean) {
    this.previewedRow = previewing ? row : null;
    this.dataLayersStateService.selectDataLayer(
      previewing ? (row.layer as DataLayer) : null
    );
  }

  sourceOf(layer: EmbeddedDataLayer) {
    return layer.dataset?.name ?? '';
  }

  trackByRow(_: number, row: PreviewRow) {
    return row.key;
  }

  trackByGroup(_: number, group: PreviewGroup) {
    return group.label;
  }

  private followMap(layer: DataLayer | null) {
    if (!layer) {
      this.previewedRow = null;
      return;
    }
    if (layer.id === this.previewedRow?.layer.id) {
      return;
    }
    const rows = this.previewGroups
      .flatMap((group) => group.rows)
      .filter((row) => row.layer.id === layer.id);
    this.previewedRow = rows.length === 1 ? rows[0] : null;
  }
}
