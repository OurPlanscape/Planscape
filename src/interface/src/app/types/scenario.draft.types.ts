export interface AvailableStands {
  unavailable: {
    by_inclusions: number[];
    by_exclusions: number[];
    by_thresholds: number[];
  };
  summary: {
    total_area: number; // total PA stands area
    available_area: number; // total area - exclusions
    treatable_area: number; // available area - thresholds
    unavailable_area: number; // unavailable area
    treatable_stand_count: number; // number of available stands
  };
}
