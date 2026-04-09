import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ListCardComponent } from './list-card.component';

const meta: Meta<ListCardComponent> = {
  title: 'Components/List Card',
  component: ListCardComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-list-card ${argsToTemplate(args)}></sg-list-card>`,
  }),
};

export default meta;
type Story = StoryObj<ListCardComponent>;

export const Default: Story = {
  args: {
    name: 'Test Scenario',
    recordType: 'SCENARIO',
    resultStatus: 'SUCCESS',
    creator: 'Larry Larrington',
    created_at: '2024-01-01 12:34:00',
  },
};

export const ProjectArea: Story = {
  args: {
    name: 'Test Project Area',
    recordType: 'PROJECT_AREA',
    resultStatus: 'SUCCESS',
    creator: 'Larry Larrington',
    created_at: '2024-01-01 12:34:00',
    origin: 'USER',
    leftEdgeColor: '#ffaaee',
  },
};

export const Scenario: Story = {
  args: {
    name: 'Test Project Area',
    resultStatus: 'SUCCESS',
    creator: 'Larry Larrington',
    created_at: '2024-01-01 12:34:00',
    origin: 'USER',
    leftEdgeColor: '#3344aa',
  },
};


export const Running: Story = {
  args: {
    ...Default.args,
    resultStatus: 'RUNNING',
  },
};

export const Done: Story = {
  args: {
    ...Default.args,
    resultStatus: 'SUCCESS',
  },
};

export const Failed: Story = {
  args: {
    ...Default.args,
    resultStatus: 'FAILURE',
  },
};

export const DisabledScenario: Story = {
  args: {
    name: 'Test Scenario',
    resultStatus: 'SUCCESS',
    creator: 'Larry Larrington',
    created_at: '2024-01-01 12:34:00',
    disabled: true,
    contextualMenuEnabled: false,
    userCanDeleteRecord: true,
  },
};

export const TreatmentCard: Story = {
  args: {
    name: 'Treatment Plan Name',
    resultStatus: 'INPROGRESS',
    recordType: 'TREATMENT',
    creator: 'Planny Plannington',
    created_at: '2024-01-01 12:34:00',
  },
};