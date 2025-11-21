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
  },
  {
    label: 'Exclude Areas',
    description: 'Include and exclude specific areas based on your plan.',
    icon: '/assets/svg/icons/overview/exclude-areas.svg',
  },
  {
    label: 'Stand-level Constraints',
    description:
      'Define the minimum or maximum values for key factors to guide decision-making.',
    icon: '/assets/svg/icons/overview/stand-level.svg',
  },
  {
    label: 'Treatment Target',
    description:
      'Set limits on treatment areas to align with real-world restrictions.',
    icon: '/assets/svg/icons/overview/treatment-target.svg',
  },
  {
    label: 'Generate Output',
    description: 'View scenario results from Forsys.',
    icon: '/assets/svg/icons/overview/generate-output.svg',
  },
];
