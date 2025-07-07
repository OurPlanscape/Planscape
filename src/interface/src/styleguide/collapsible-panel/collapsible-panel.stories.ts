import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate, moduleMetadata } from '@storybook/angular';
import { CollapsiblePanelComponent } from './collapsible-panel.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

const meta: Meta<CollapsiblePanelComponent> = {
  title: 'Components/Collapsible Panel',
  component: CollapsiblePanelComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [BrowserAnimationsModule],
    }),
  ],
  render: (args) => ({
    props: args,
    template: `<sg-collapsible-panel ${argsToTemplate(args)}>
Lorem ipsum dolor sit amet, consectetur adipiscing elit,
sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
 Ut enim ad minim veniam, quis nostrud exercitation ullamco
 laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
 reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
  Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
</sg-collapsible-panel>`,
  }),
};

export default meta;
type Story = StoryObj<CollapsiblePanelComponent>;

export const Default: Story = {
  args: {
    title: 'Project Areas',
    tooltipContent:
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
  },
};

export const NotCollapsible: Story = {
  args: {
    isCollapsible: false,
    title: 'Project Areas',
    tooltipContent:
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
  },
};
