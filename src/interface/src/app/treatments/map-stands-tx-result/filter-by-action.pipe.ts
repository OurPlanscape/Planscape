import { Pipe, PipeTransform } from '@angular/core';
import { FilterSpecification } from 'maplibre-gl';

@Pipe({
  name: 'filterByAction',
  standalone: true,
})
export class FilterByActionPipe implements PipeTransform {
  transform(treatments: string[] | null): FilterSpecification | undefined {
    if (!treatments || treatments.length === 0) {
      // No filter applied
      return undefined; // Explicitly return undefined when there's no filter
    }
    // Apply filter based on the "action" property
    return ['in', 'action', ...treatments] as FilterSpecification;
  }
}
