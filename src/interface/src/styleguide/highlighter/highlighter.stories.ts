import { Meta, moduleMetadata, StoryObj } from '@storybook/angular';
import { FormsModule } from '@angular/forms';
import { HighlighterDirective } from './highlighter.directive';

interface StoryProps {
  searchTerm?: string;
}

const meta: Meta<StoryProps> = {
  title: 'Components/Highlighter',
  // For autodocs, we can still reference the directive as the "component",
  // but we must also properly import it below.
  component: HighlighterDirective,
  decorators: [
    moduleMetadata({
      imports: [HighlighterDirective, FormsModule],
    }),
  ],
};

export default meta;

// Create a Story type
type Story = StoryObj<StoryProps>;

export const Default: Story = {
  render: () => ({
    props: { searchTerm: '' },
    template: `
      <div style='display: flex; align-items: center; margin-bottom: 10px; gap: 8px;'>
        <label for='searchInput'>Search term:</label>
        <input
          id='searchInput'
          [(ngModel)]='searchTerm'
          placeholder='Type something to highlight'
          style='padding: 5px; width: 400px;'
        />
      </div>
      <div style='padding: 20px 10px; max-width: 500px;' [sgHighlighter]='searchTerm' sgHighlighterText='Planscape is a free, open source decision support tool designed to help
        teams doing wildland planning identify the optimal areas on their landscape
        to treat for wildfire resilience.'>
      </div>
      <div style='display: grid; grid-template-columns: 32px 1fr; gap: 8px; padding: 0px 0'>
        <input type='radio'><label [sgHighlighter]='searchTerm' sgHighlighterText='Annual Burn Probability'></label>
        <input type='radio'><label [sgHighlighter]='searchTerm' sgHighlighterText='Probability of Fire Severity (High)'></label>
        <input type='radio'><label [sgHighlighter]='searchTerm' sgHighlighterText='Wildfire Hazard Potential'></label>
      </div>
    `,
  }),
};
