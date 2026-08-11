import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { provideAnimations } from '@angular/platform-browser/animations';
import { WorkspaceCardComponent } from './workspace-card.component';

const meta: Meta<WorkspaceCardComponent> = {
  title: 'Cards/Workspace Card',
  component: WorkspaceCardComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<div style="width: 440px">
      <sg-workspace-card ${argsToTemplate(args)}></sg-workspace-card>
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<WorkspaceCardComponent>;

export const Default: Story = {
  args: {
    name: 'Name',
    planningAreasCount: 0,
    creator: 'Name',
    createdAt: '2025-07-11 12:34:00',
    userCanRename: true,
    userCanShare: true,
    userCanDelete: true,
  },
};

export const SinglePlanningArea: Story = {
  args: {
    ...Default.args,
    name: 'Sierra Nevada Workspace',
    planningAreasCount: 1,
  },
};

export const ManyPlanningAreas: Story = {
  args: {
    ...Default.args,
    name: 'Northern California Region',
    planningAreasCount: 1234,
    creator: 'Larry Larrington',
  },
};

export const LongName: Story = {
  args: {
    ...Default.args,
    name: 'A Very Long Workspace Name That Should Wrap Onto Multiple Lines',
    planningAreasCount: 12,
    creator: 'Larry Larrington',
  },
};

export const ReadOnly: Story = {
  args: {
    ...Default.args,
    userCanRename: false,
    userCanShare: false,
    userCanDelete: false,
  },
};
