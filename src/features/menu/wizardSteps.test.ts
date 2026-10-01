import { describe, expect, it } from 'vitest';

import { wizardBackAction, wizardStepSequence } from './wizardSteps';

describe('wizardBackAction', () => {
  // Back on Review used to close the edit wizard and throw the unsaved edit
  // away; it must step back to the last step before Review instead.
  it('goes from Review to the step before it, in both modes', () => {
    expect(wizardBackAction(wizardStepSequence('simple'), 6)).toEqual({ kind: 'step', step: 3 });
    expect(wizardBackAction(wizardStepSequence('extended'), 6)).toEqual({ kind: 'step', step: 4 });
  });

  it('steps back one step from the middle steps', () => {
    expect(wizardBackAction(wizardStepSequence('simple'), 3)).toEqual({ kind: 'step', step: 2 });
    expect(wizardBackAction(wizardStepSequence('extended'), 4)).toEqual({ kind: 'step', step: 3 });
    expect(wizardBackAction(wizardStepSequence('extended'), 2)).toEqual({ kind: 'step', step: 1 });
  });

  it('never leaves the wizard from a step outside the current sequence', () => {
    // Customise (4) isn't part of simple mode; Back still lands on Food info.
    expect(wizardBackAction(wizardStepSequence('simple'), 4)).toEqual({ kind: 'step', step: 3 });
  });

  it('leaves the wizard only from the first step', () => {
    expect(wizardBackAction(wizardStepSequence('simple'), 1)).toEqual({ kind: 'exit' });
    expect(wizardBackAction(wizardStepSequence('extended'), 1)).toEqual({ kind: 'exit' });
  });
});
