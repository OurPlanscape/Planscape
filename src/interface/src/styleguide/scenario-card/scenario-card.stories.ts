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

const sampleScenario = {
  name: 'Scenario Name',
  est_budget: 100.0,
  planning_area: 'ok',
  area_count: 5,
  configuration: {},
  status: 'ACTIVE',
  treatment_plans_count: 5,
  creator: 'Larry Larrington',
  created_at: '2023-12-12',
};

export const Default: Story = {
  args: { scenario: sampleScenario },
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-scenario-card ${argsToTemplate(args)}></sg-scenario-card>`,
  }),
};
