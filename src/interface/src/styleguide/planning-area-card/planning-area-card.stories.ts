import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { provideAnimations } from '@angular/platform-browser/animations';

import { PlanningAreaCardComponent } from './planning-area-card.component';
import { PreviewPlan } from '@app/types';

const planning: PreviewPlan = {
  area_acres: 12000,
  created_at: '02/02/2026',
  creator: 'Han Solo',
  id: 1,
  name: 'The Falkor 2',
  permissions: [],
  role: '',
  user: 12,
  capabilities: [],
};

const meta: Meta<PlanningAreaCardComponent> = {
  title: 'Cards/Planning Area Card',
  component: PlanningAreaCardComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<PlanningAreaCardComponent>;

export const Default: Story = {
  args: {
    planningArea: planning,
  },
  render: (args) => ({
    props: args,
    template: `
      <sg-planning-area-card ${argsToTemplate(args)}>
        <div
          mapSlot
          style="
            width: 84px;
            height: 84px;
            background: #d9d9d9;
          ">
        </div>
      </sg-planning-area-card>
    `,
  }),
};
