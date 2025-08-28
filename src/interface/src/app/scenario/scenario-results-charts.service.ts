import { Injectable } from '@angular/core';

const AVAILABLE_COLORS: string[] = [
  '#483D78',
  '#A59CCD',
  '#BBE3B6',
  '#FFDB69',
  '#F18226',
  '#CC4678',
  '#FB6F92',
  '#B06565',
  '#4169E1',
  '#87CEFA',
  '#2A9D8F',
  '#356A72',
  '#BC8F8F',
  '#EDD9A4',
  '#F0D3F7',
  '#DD5FB3',
  '#465DAA',
  '#003366',
  '#DC143C',
  '#990000',
  '#3399FF',
  '#FF6600',
  '#6A5ACD',
  '#808000',
  '#0066CC',
  '#B8860B',
  '#EB8573',
  '#778899',
  '#8B8D8B',
  '#0000CD',
];
@Injectable({
  providedIn: 'root', // TODO: probably just this module...
})
export class ScenarioResultsChartsService {
  public selectedColors: Map<string, string> = new Map();

  getOrAddColor(name: string): string {
    if (this.selectedColors.has(name)) {
      return this.selectedColors.get(name)!;
    }

    for (let color of AVAILABLE_COLORS) {
      if (![...this.selectedColors.values()].includes(color)) {
        this.selectedColors.set(name, color);
        return color;
      }
    }

    throw new Error('No available colors left to assign.');
  }

  public getAssignedColors() {
    return Object.fromEntries(this.selectedColors);
  }

  resetColors() {
    this.selectedColors.clear();
  }
}
