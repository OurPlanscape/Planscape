import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { NotesSidebarComponent } from './notes-sidebar.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const meta: Meta<NotesSidebarComponent> = {
  title: 'Components/Notes Sidebar',
  component: NotesSidebarComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-scenario-card ${argsToTemplate(args)}></sg-scenario-card>`,
  }),
};

export default meta;
type Story = StoryObj<NotesSidebarComponent>;

export const Default: Story = {
  args: {
    model: 'planning_area',
  },
};
