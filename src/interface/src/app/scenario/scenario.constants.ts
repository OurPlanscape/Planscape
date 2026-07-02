export const SUB_UNIT_LAYER_COLOR = '#356A72'; // $color-brand-teal

export interface ScenarioStepConfig {
  label: string; // label for the step
  description: string; // description for the step
  icon: string; // icon for the step
  includeSubUnits?: boolean; // if the step should include sub units when fetching available stands
  includeConstraints: boolean; // if the step should include Constraints when fetching available stands
  includeExcludedAreas: boolean; // if the step should include ExcludedAreas when fetching available stands
  refreshAvailableStands: boolean; // if the step needs to refresh available stands
  hasMap: boolean; // if the step shows the map
  showSubUnitToggle?: boolean; // defaults to true; set false to hide the sub unit toggle
  withIncludes?: boolean;
  includePotentialTreatableArea: boolean;
  includePercentageTreatable: boolean;
}

export const SUB_UNITS_STEP: ScenarioStepConfig = {
  label: 'Select Subunits',
  description: '',
  icon: '',
  includeConstraints: false,
  includeExcludedAreas: false,
  refreshAvailableStands: true,
  hasMap: true,
  showSubUnitToggle: false,
  includeSubUnits: true,
  includePotentialTreatableArea: false,
  includePercentageTreatable: false,
};

export const exitModalData = (scenarioName: string) => ({
  title: `Exit '${scenarioName}'?`,
  body: `Are you sure you want to exit "${scenarioName}"? Saved steps will be kept in draft form; any steps you haven't saved will be lost.`,
  primaryCta: 'Stay',
  secondaryCta: 'Exit Workflow',
});

export const SCENARIO_OVERVIEW_STEPS: ScenarioStepConfig[] = [
  {
    label: 'Treatment Goal',
    description:
      'Select important data layers that will be used throughout the workflow.',
    icon: '/assets/svg/icons/overview/treatment-goal.svg',
    includeConstraints: false,
    includeExcludedAreas: false,
    refreshAvailableStands: false,
    hasMap: false,
    includePotentialTreatableArea: false,
    includePercentageTreatable: false,
  },
  {
    label: 'Include Areas',
    description: 'Include stands based on their ownership.',
    icon: '/assets/svg/icons/overview/include-areas.svg',
    includeConstraints: false,
    includeExcludedAreas: false,
    refreshAvailableStands: true,
    hasMap: true,
    includePotentialTreatableArea: false,
    includePercentageTreatable: false,
  },
  {
    label: 'Exclude Areas',
    description: 'Exclude stands based on management characteristics.',
    icon: '/assets/svg/icons/overview/exclude-areas.svg',
    includeConstraints: false,
    includeExcludedAreas: true,
    includePercentageTreatable: false,
    refreshAvailableStands: true,
    withIncludes: true,
    hasMap: true,
    includePotentialTreatableArea: true,
  },
  {
    label: 'Stand-level Constraints',
    description:
      'Define the minimum or maximum values for key factors to guide decision-making.',
    icon: '/assets/svg/icons/overview/stand-level.svg',
    includeConstraints: true,
    includeExcludedAreas: true,
    refreshAvailableStands: true,
    withIncludes: true,
    includePotentialTreatableArea: true,
    hasMap: true,
    includePercentageTreatable: true,
  },
  {
    label: 'Treatment Target',
    description:
      'Set limits on treatment areas to align with real-world restrictions.',
    icon: '/assets/svg/icons/overview/treatment-target.svg',
    includeConstraints: true,
    includeExcludedAreas: true,
    refreshAvailableStands: false,
    withIncludes: true,
    includePotentialTreatableArea: true,
    hasMap: true,
    includePercentageTreatable: true,
  },
  {
    label: 'Generate Output',
    description: 'View scenario results from Forsys.',
    icon: '/assets/svg/icons/overview/generate-output.svg',
    includeConstraints: true,
    includeExcludedAreas: true,
    refreshAvailableStands: false,
    withIncludes: true,
    includePotentialTreatableArea: true,
    hasMap: true,
    includePercentageTreatable: true,
  },
];

export const CUSTOM_SCENARIO_OVERVIEW_STEPS: ScenarioStepConfig[] = [
  {
    label: 'Priority Objectives',
    description: 'Choose your key objectives that ForSys will prioritize.',
    icon: '/assets/svg/icons/overview/priority.svg',
    includeConstraints: false,
    includeExcludedAreas: false,
    refreshAvailableStands: true,
    hasMap: true,
    includePotentialTreatableArea: false,
    includePercentageTreatable: false,
  },
  {
    label: 'Co-Benefits',
    description: 'Add supporting objectives to refine your plan further.',
    icon: '/assets/svg/icons/overview/co-benefits.svg',
    includeConstraints: false,
    includeExcludedAreas: false,
    refreshAvailableStands: true,
    hasMap: true,
    includePotentialTreatableArea: false,
    includePercentageTreatable: false,
  },
  {
    label: 'Include Areas',
    description: 'Include stands based on their ownership.',
    icon: '/assets/svg/icons/overview/include-areas.svg',
    includeConstraints: false,
    includeExcludedAreas: false,
    refreshAvailableStands: true,
    hasMap: true,
    includePotentialTreatableArea: false,
    includePercentageTreatable: false,
  },
  {
    label: 'Exclude Areas',
    description: 'Exclude stands based on management characteristics.',
    icon: '/assets/svg/icons/overview/exclude-areas.svg',
    includeConstraints: false,
    includeExcludedAreas: true,
    refreshAvailableStands: true,
    withIncludes: true,
    includePotentialTreatableArea: true,
    includePercentageTreatable: false,
    hasMap: true,
  },
  {
    label: 'Stand-level Constraints',
    description:
      'Define the minimum or maximum values for key factors to guide decision-making.',
    icon: '/assets/svg/icons/overview/stand-level.svg',
    includeConstraints: true,
    includeExcludedAreas: true,
    refreshAvailableStands: true,
    withIncludes: true,
    includePotentialTreatableArea: true,
    hasMap: true,
    includePercentageTreatable: true,
  },
  {
    label: 'Treatment Target',
    description:
      'Set limits on treatment areas to align with real-world restrictions.',
    icon: '/assets/svg/icons/overview/treatment-target.svg',
    includeConstraints: true,
    includeExcludedAreas: true,
    refreshAvailableStands: false,
    withIncludes: true,
    includePotentialTreatableArea: true,
    hasMap: true,
    includePercentageTreatable: true,
  },
  {
    label: 'Generate Output',
    description: 'View scenario results from Forsys.',
    icon: '/assets/svg/icons/overview/generate-output.svg',
    includeConstraints: true,
    includeExcludedAreas: true,
    refreshAvailableStands: false,
    withIncludes: true,
    includePotentialTreatableArea: true,
    hasMap: true,
    includePercentageTreatable: true,
  },
];

export const GEO_PACKAGE_LABELS: { [key: string]: string } = {
  FAILED: 'GeoPackage Failed',
  SUCCEEDED: 'Download GeoPackage',
  PENDING: 'Generating GeoPackage',
  PROCESSING: 'Generating GeoPackage',
};
