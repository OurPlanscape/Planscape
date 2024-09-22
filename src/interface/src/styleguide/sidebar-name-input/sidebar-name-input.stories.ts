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
    template: `<div style="width:100%;height:200px;background-color:#aaaaaa;">
    <div style="width:400px"><sg-sidebar-name-input ${argsToTemplate(args)}></sg-sidebar-name-input></div></div>`,
  }),
};

export default meta;
type Story = StoryObj<SidebarNameInputComponent>;

export const Default: Story = {
  args: {
    textValue: '',
    title: 'Treatment plan name',
  },
};

export const WithError: Story = {
  args: {
    textValue: '',
    title: 'Treatment plan name',
    errorMessage: 'This name already exists',
  },
};

export const NoTitle: Story = {
  args: {
    textValue: '',
  },
};

export const HelpText: Story = {
  args: {
    textValue: '',
    title: 'Treatment plan name',
    helpText: 'Clicking this does something',
  },
};
