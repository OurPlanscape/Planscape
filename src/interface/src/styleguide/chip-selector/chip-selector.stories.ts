import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';
import { ChipSelectorComponent } from './chip-selector.component';

const meta: Meta<ChipSelectorComponent<LayerObject>> = {
  title: 'Components/Chip Selector',
  component: ChipSelectorComponent,
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `
    <div style='width: 400px; padding: 20px;  border: 1px solid #d0d0d0; resize: both;'>
    <sg-chip-selector ${argsToTemplate(args)}></sg-chip-selector>
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<ChipSelectorComponent<LayerObject>>;

export interface LayerObject {
  id: number;
  name: string;
}

const items: LayerObject[] = [
  { id: 1, name: 'Quantum Synergy' },
  { id: 2, name: 'Cognitive Resonance' },
  { id: 3, name: 'Transdimensional Pedagogy' },
  { id: 4, name: 'Neuromorphic Ontology' },
  { id: 5, name: 'Meta-analytical Ethnography' },
  { id: 6, name: 'Holistic Epistemology' },
  { id: 7, name: 'Chrono-ecological Paradigm' },
  { id: 8, name: 'Dialectic Assimilation' },
  { id: 9, name: 'Post-structural Biophysics' },
];

export const Default: Story = {
  args: {
    items: items,
  },
};

export const NoItems: Story = {
  args: {
    items: [],
  },
};

export const NoOverageItems: Story = {
  args: {
    items: [
      { id: 1, name: 'Quantum Synergy' },
      { id: 2, name: 'Cognitive Resonance' },
      { id: 3, name: 'Transdimensional Pedagogy' },
      { id: 4, name: 'Neuromorphic Ontology' },
    ],
    maxCollapsedItems: 4,
  },
};

export const LotsOfItems: Story = {
  args: {
    items: [
      { id: 1, name: 'Quantum Synergy' },
      { id: 2, name: 'Cognitive Resonance' },
      { id: 3, name: 'Transdimensional Pedagogy' },
      { id: 4, name: 'Neuromorphic Ontology' },
      { id: 5, name: 'Meta-analytical Ethnography' },
      { id: 6, name: 'Holistic Epistemology' },
      { id: 7, name: 'Chrono-ecological Paradigm' },
      { id: 8, name: 'Dialectic Assimilation' },
      { id: 9, name: 'Post-structural Biophysics' },
      { id: 10, name: 'Simulated Discourse Analysis' },
      { id: 11, name: 'Intertextual Morphology' },
      { id: 12, name: 'Cultural Homogeneity Framework' },
      { id: 13, name: 'Synthetic Ecology' },
      { id: 14, name: 'Post-futuristic Narratives' },
      { id: 15, name: 'Digital Ethos' },
      { id: 16, name: 'Radical Constructivism' },
      { id: 17, name: 'Hyperreal Cognition' },
      { id: 18, name: 'Ephemeral Architecture' },
      { id: 19, name: 'Multimodal Hypertextuality' },
      { id: 20, name: 'Axis of Complexity' },
      { id: 21, name: 'Transcendental Transference' },
      { id: 22, name: 'Structural Nihilism' },
      { id: 23, name: 'Recursive Hermeneutics' },
      { id: 24, name: 'Philosophical Cartography' },
      { id: 25, name: 'Virtual Archeology' },
      { id: 26, name: 'Integrative Semiotics' },
      { id: 27, name: 'Affective Dynamics' },
      { id: 28, name: 'Biocultural Transition' },
      { id: 29, name: 'Preemptive Ethnography' },
      { id: 30, name: 'Cosmological Linguistics' },
      { id: 31, name: 'Embodied Metrics' },
      { id: 32, name: 'Paradoxical Pedagogy' },
      { id: 33, name: 'Sonic Ontogeny' },
      { id: 34, name: 'Epistemic Framing' },
      { id: 35, name: 'Rhizomatic Analysis' },
      { id: 36, name: 'Informatic Epiphany' },
      { id: 37, name: 'Chrono-critical Studies' },
      { id: 38, name: 'Futuristic Liminality' },
      { id: 39, name: 'Collective Cognitive Dissonance' },
      { id: 40, name: 'Simulacra Discourse' },
    ],
    maxCollapsedItems: 4,
  },
};
