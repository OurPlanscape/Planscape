import type { Meta, StoryObj } from '@storybook/angular';
import { FilterDropdownComponent } from './filter-dropdown.component';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { provideAnimations } from '@angular/platform-browser/animations';
type PagePropsAndCustomArgs = FilterDropdownComponent & { content?: string };

/**
 *
 */
const meta: Meta<PagePropsAndCustomArgs> = {
  title: 'Components/Filter Menu',
  component: FilterDropdownComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  render: ({ content, ...args }) => ({
    props: args,
    template: `
     <sg-filter-dropdown ${argsToTemplate(args)}>${content}</sg-filter-dropdown>`,
  }),
};

export default meta;
type Story = StoryObj<PagePropsAndCustomArgs>;

export const Default: Story = {};
