export const exitModalData = (scenarioName: string) => ({
  title: `Exit '${scenarioName}'?`,
  body: `Are you sure you want to exit “${scenarioName}”? Saved steps will be kept in draft form; any steps you haven’t saved will be lost.`,
  primaryCta: 'Stay',
  secondaryCta: 'Exit Workflow',
});

export const SCENARIO_OVERVIEW_STEPS = [
  {
    label: 'Treatment Goal',
    description:
      'Select important data layers that will be used throughout the workflow.',
    icon: '/assets/svg/icons/overview/treatment-goal.svg',
    includeConstraints: false,
    includeExcludedAreas: false,
    refreshAvailableStands: true,
    hasMap: false,
  },
  {
    label: 'Exclude Areas',
    description: 'Include and exclude specific areas based on your plan.',
    icon: '/assets/svg/icons/overview/exclude-areas.svg',
    includeConstraints: false,
    includeExcludedAreas: true,
    refreshAvailableStands: true,
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
    hasMap: true,
  },
  {
    label: 'Treatment Target',
    description:
      'Set limits on treatment areas to align with real-world restrictions.',
    icon: '/assets/svg/icons/overview/treatment-target.svg',
    includeConstraints: true,
    includeExcludedAreas: true,
    refreshAvailableStands: false,
    hasMap: true,
  },
  {
    label: 'Generate Output',
    description: 'View scenario results from Forsys.',
    icon: '/assets/svg/icons/overview/generate-output.svg',
    includeConstraints: true,
    includeExcludedAreas: true,
    refreshAvailableStands: false,
    hasMap: true,
  },
];

export const CUSTOM_SCENARIO_OVERVIEW_STEPS = [
  {
    label: 'Priority Objectives',
    description: 'Choose your key objectives that ForSys will prioritize.',
    icon: '/assets/svg/icons/overview/priority.svg',
    includeConstraints: false,
    includeExcludedAreas: false,
    refreshAvailableStands: true, // REMOVE - use hasMap instead??
    hasMap: false,
  },
  {
    label: 'Co-Benefits',
    description: 'Add supporting objectives to refine your plan further.',
    icon: '/assets/svg/icons/overview/co-benefits.svg',
    includeConstraints: false,
    includeExcludedAreas: false,
    refreshAvailableStands: true,
    hasMap: true,
  },
  {
    label: 'Exclude Areas',
    description: 'Include and exclude specific areas based on your plan.',
    icon: '/assets/svg/icons/overview/exclude-areas.svg',
    includeConstraints: false,
    includeExcludedAreas: true,
    refreshAvailableStands: true,
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
    hasMap: true,
  },
  {
    label: 'Treatment Target',
    description:
      'Set limits on treatment areas to align with real-world restrictions.',
    icon: '/assets/svg/icons/overview/treatment-target.svg',
    includeConstraints: true,
    includeExcludedAreas: true,
    refreshAvailableStands: false,
    hasMap: true,
  },
  {
    label: 'Generate Output',
    description: 'View scenario results from Forsys.',
    icon: '/assets/svg/icons/overview/generate-output.svg',
    includeConstraints: true,
    includeExcludedAreas: true,
    refreshAvailableStands: false,
    hasMap: true,
  },
];
