import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';
import {
  OverviewStep,
  ProcessOverviewComponent,
} from './process-overview.component';

const meta: Meta<ProcessOverviewComponent> = {
  title: 'Components/Process Overview',
  component: ProcessOverviewComponent,
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<div style='width:500px; height: 500px; border: 1px solid #d0d0d0; resize: both; overflow: auto'>
                  <sg-process-overview ${argsToTemplate(args)} style='padding: 40px;'></sg-process-overview>
               </div>`,
  }),
};

export default meta;
type Story = StoryObj<ProcessOverviewComponent>;

const steps: OverviewStep[] = [
  {
    name: 'Treatment Goal',
    description:
      'Select important data layers that will be used throughout the workflow.',
    icon: '/assets/svg/icons/overview/identify.svg',
  },
  {
    name: 'Exclude Areas',
    description: 'Include and exclude specific areas based on your plan.',
    icon: '/assets/svg/icons/overview/include-exclude.svg',
  },
  {
    name: 'Stand-level Constraints',
    description:
      'Define the minimum or maximum values for key factors to guide decision-making.',
    icon: '/assets/svg/icons/overview/stand-level.svg',
  },
];

const allSteps: OverviewStep[] = [
  ...steps,
  {
    name: 'Treatment Target',
    description:
      'Set limits on treatment areas to align with real-world restrictions.',
    icon: '/assets/svg/icons/overview/group.svg',
  },
  {
    name: 'Generate Output',
    description: 'View scenario results from Forsys.',
    icon: '/assets/svg/icons/overview/output.svg',
  },
];

export const Default: Story = {
  args: {
    steps: steps,
  },
};

export const AllSteps: Story = {
  args: {
    steps: allSteps,
  },
};
