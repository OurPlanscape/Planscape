import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate, moduleMetadata } from '@storybook/angular';
import { SectionComponent } from '@styleguide/section/section.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatExpansionModule } from '@angular/material/expansion';

const meta: Meta<SectionComponent> = {
  title: 'Components/Section',
  component: SectionComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [BrowserAnimationsModule, MatExpansionModule],
    }),
  ],
  render: (args) => ({
    props: args,
    template: `<sg-section ${argsToTemplate(args)}>
Lorem ipsum dolor sit amet, consectetur adipiscing elit,
sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
 Ut enim ad minim veniam, quis nostrud exercitation ullamco
 laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
 reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
  Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
</sg-section>`,
  }),
};

export default meta;
type Story = StoryObj<SectionComponent>;

export const Default: Story = {
  args: {
    headline: 'Project Areas',
    tooltipContent:
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
  },
};

export const NoTooltip: Story = {
  args: {
    headline: 'Project Areas',
  },
};

export const Required: Story = {
  args: {
    headline: 'Project Areas',
    required: true,
  },
};

export const Collapsible: Story = {
  args: {
    isCollapsible: true,
    headline: 'Project Areas',
    tooltipContent:
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
  },
};

export const DefaultExpanded: Story = {
  args: {
    isCollapsible: true,
    headline: 'Project Areas',
    defaultExpanded: true,
    tooltipContent:
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
  },
};

export const TooltipWithLinks: Story = {
  args: {
    headline: 'Project Areas',
    tooltipContent:
      'Here click on <a href="https://app.planscape.org/home">Planscape</a>',
  },
};

export const TooltipWithIconVariant: Story = {
  args: {
    headline: 'Project Areas',
    tooltipContent:
      'Here click on <a href="https://app.planscape.org/home">Planscape</a>',
    tooltipIcon: 'help',
  },
};
