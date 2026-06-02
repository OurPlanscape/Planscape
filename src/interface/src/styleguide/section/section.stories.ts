import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate, moduleMetadata } from '@storybook/angular';
import { SectionComponent } from './section.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatExpansionModule } from '@angular/material/expansion';
import { ModalComponent } from '@styleguide';

const meta: Meta<SectionComponent> = {
  title: 'Components/Section',
  component: SectionComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [BrowserAnimationsModule, MatExpansionModule, ModalComponent],
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

export const TooltipWithLink: Story = {
  args: {
    headline: 'Project Areas',
    tooltipIcon: 'help',
    tooltipLink: 'https://www.google.com',
  },
};

export const TooltipWithTemplate: Story = {
  render: () => ({
    template: `
      <ng-template #tooltipTpl>
        <b>This is it:</b> <i> Behold the tooltip content </i>
      </ng-template>
      <sg-section headline="SubUnits" [tooltipTemplate]="tooltipTpl">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      </sg-section>
    `,
  }),
};

export const TooltipTemplateTakesPrecedence: Story = {
  render: () => ({
    template: `
      <ng-template #tooltipTpl>
        <strong>I am the template — tooltipContent is ignored.</strong>
      </ng-template>
      <sg-section
        headline="Both provided"
        tooltipContent="This string content should NOT appear"
        [tooltipTemplate]="tooltipTpl">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      </sg-section>
    `,
  }),
};

export const WithHint: Story = {
  args: {
    headline: 'Project Areas',
    headlineHint: '0/2 Selected',
    tooltipContent:
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
  },
};

/**
 * With `tooltipInteractive`, the tooltip opens as a modal-like panel anchored to
 * the icon. It's delegated to `sg-popover`'s modal mode (so it animates and is
 * elevated), but clicks inside don't close it — it only closes when the template
 * calls the `close` function exposed on its context. Requires `tooltipTemplate`.
 */
export const InteractiveTooltip: Story = {
  render: () => ({
    template: `
      <ng-template #tooltipTpl let-close="close">
        <sg-modal
          title="Interactive tooltip"
          width="xsmall"
          (clickedClose)="close()"
          (clickedPrimary)="close()"
          (clickedSecondary)="close()">
          <div modalBodyContent>
            This panel opens like a menu but behaves like a modal: it stays open
            so you can interact with it, and only closes via its own actions
            (Cancel, Done, or the close button).
          </div>
        </sg-modal>
      </ng-template>
      <sg-section
        headline="Carbon"
        [tooltipTemplate]="tooltipTpl"
        [tooltipInteractive]="true">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      </sg-section>
    `,
  }),
};

/**
 * Interactive mode needs a `tooltipTemplate`. If `tooltipInteractive` is set but
 * only `tooltipContent` (a string) is provided, the section gracefully falls
 * back to the read-only popover instead of rendering nothing.
 */
export const InteractiveWithoutTemplateFallsBack: Story = {
  args: {
    headline: 'Carbon',
    tooltipInteractive: true,
    tooltipContent:
      'Interactive mode needs a template — with only string content the section falls back to the read-only popover.',
  },
};

/**
 * `tooltipClicked` fires when the interactive icon is clicked (before the panel
 * opens), so several sections can share ONE template and just set which content
 * to show. Both sections below reuse the same template; the modal reflects the
 * section you clicked.
 */
export const InteractiveSharedTemplate: Story = {
  render: () => ({
    props: { activeName: '' },
    template: `
      <ng-template #tip let-close="close">
        <sg-modal
          [title]="activeName"
          width="xsmall"
          (clickedClose)="close()"
          (clickedPrimary)="close()"
          (clickedSecondary)="close()">
          <div modalBodyContent>Showing info for: {{ activeName }}</div>
        </sg-modal>
      </ng-template>

      <sg-section
        headline="Carbon"
        [tooltipTemplate]="tip"
        [tooltipInteractive]="true"
        (tooltipClicked)="activeName = 'Carbon'">
        Carbon section body.
      </sg-section>

      <sg-section
        headline="Water"
        [tooltipTemplate]="tip"
        [tooltipInteractive]="true"
        (tooltipClicked)="activeName = 'Water'">
        Water section body.
      </sg-section>
    `,
  }),
};
