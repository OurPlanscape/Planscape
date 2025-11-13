export const exitModalData = (scenarioName: string) => ({
  title: `Exit '${scenarioName}'?`,
  body: `Are you sure you want to exit “${scenarioName}”? Saved steps will be kept in draft form; any steps you haven’t saved will be lost.`,
  primaryCta: 'Stay',
  secondaryCta: 'Exit Workflow',
});
