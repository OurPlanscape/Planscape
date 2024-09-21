import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { SidebarNameInputComponent } from './sidebar-name-input.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const meta: Meta<SidebarNameInputComponent> = {
  title: 'Components/Sidebar Name Component',
  component: SidebarNameInputComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-sidebar-name-input ${argsToTemplate(args)}></sg-sidebar-name-input>`,
  }),
};

export default meta;
type Story = StoryObj<SidebarNameInputComponent>;

export const Default: Story = {
  args: {
    name: 'hello',
    title: 'ok',
  },
};
