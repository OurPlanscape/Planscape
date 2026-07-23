import { AsyncPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FilterDropdownComponent } from '@styleguide';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';

import { FundingMapConfigState } from '../funding-map-config-state';

export interface FilterProjectFormat {
  id: number;
  name: string;
  shortName: string;
}

/**
 * "Viewing outcomes for" project-area filter.
 *
 * Source-agnostic: the parent supplies the list of selectable project areas via
 * {@link menuItems} (from a scenario, a shared link, wherever). The component
 * only owns the *selection*, which flows through {@link FundingMapConfigState}
 * so the report and map react to it.
 *
 * `FundingMapConfigState` is not provided here — it is resolved from the parent
 * so the selection stays shared with the rest of the funding UI.
 */
@Component({
  selector: 'app-funding-project-areas-selector',
  standalone: true,
  imports: [AsyncPipe, FilterDropdownComponent],
  templateUrl: './funding-project-areas-selector.component.html',
  styleUrl: './funding-project-areas-selector.component.scss',
})
export class FundingProjectAreasSelectorComponent {
  private readonly _menuItems$ = new BehaviorSubject<FilterProjectFormat[]>([]);

  /** Selectable project areas shown in the dropdown. */
  @Input() set menuItems(items: FilterProjectFormat[] | null) {
    this._menuItems$.next(items ?? []);
  }

  filterOptions$ = this._menuItems$.asObservable();
  selectedProjectAreas$ = this.fundingMapConfigState.selectedProjectAreas$;

  /** The subset of {@link menuItems} currently selected. */
  readonly filteredProjectAreas$: Observable<FilterProjectFormat[]> =
    combineLatest([this.filterOptions$, this.selectedProjectAreas$]).pipe(
      map(([available, selectedIds]) => {
        if (!selectedIds?.length) return [];
        return available.filter((area) => selectedIds.includes(area.id));
      })
    );

  constructor(private fundingMapConfigState: FundingMapConfigState) {}

  handleFilterSelection(selectedAreas: FilterProjectFormat[]): void {
    const ids = selectedAreas.map((a) => a.id);
    this.fundingMapConfigState.updateSelectedProjectAreas(ids);
  }
}
