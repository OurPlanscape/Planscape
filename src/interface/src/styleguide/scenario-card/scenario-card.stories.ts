import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';
import { ScenarioCardComponent } from './scenario-card.component';

const meta: Meta<ScenarioCardComponent> = {
  title: 'Components/Scenario Card',
  component: ScenarioCardComponent,
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-scenario-card ${argsToTemplate(args)}></sg-scenario-card>`,
  }),
};

export default meta;
type Story = StoryObj<ScenarioCardComponent>;

export const Default: Story = {
  args: {
    name: 'Test Scenario',
    areas: 5,
      status: 'inProgress',
      creator: 'Larry Larrington',
      created_at: '2024-01-01 12:34:00',
      budget: 1234567,
      treatmentPlansCount: 5
      }
};

export const Running: Story = {
  args: {
    ...Default.args,
    status: 'running',
  },
};

export const Done: Story = {
  args: {
    ...Default.args,
    status: 'success',
  },
};

export const Failed: Story = {
  args: {
    ...Default.args,
    status: 'failed',
  },
};

