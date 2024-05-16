import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';
import { ScenarioCardComponent } from './scenario-card.component';

const meta: Meta<ScenarioCardComponent> = {
  title: 'Components/Scenario Card',
  component: ScenarioCardComponent,
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-scenario-card></sg-scenario-card>`,
  }),
};

export default meta;
type Story = StoryObj<ScenarioCardComponent>;

export const Default: Story = {
  args: {},
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-scenario-card ${argsToTemplate(args)}></sg-scenario-card>`,
  }),
};

export const BasicScenario: Story = {
  args: {
    scenario: {
      name: 'sample scenario',
      planning_area: 'ok',
      configuration: {},
      status: 'ACTIVE',
    },
  },
};
