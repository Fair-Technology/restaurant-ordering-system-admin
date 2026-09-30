import type { StepNum } from '../../pages/ProductWizardSteps';

export type WizardMode = 'simple' | 'extended';

// Simple mode skips the Customise step (4); both end on Review (6).
export function wizardStepSequence(mode: WizardMode): StepNum[] {
  return mode === 'simple' ? [1, 2, 3, 6] : [1, 2, 3, 4, 6];
}

// What "← Back" does on a given step: leave the wizard only from the first
// step; from any later step — Review included — go to the previous step,
// keeping everything entered so far.
export function wizardBackAction(
  sequence: readonly StepNum[],
  step: StepNum,
): { kind: 'exit' } | { kind: 'step'; step: StepNum } {
  const earlier = sequence.filter((s) => s < step);
  return earlier.length === 0 ? { kind: 'exit' } : { kind: 'step', step: earlier[earlier.length - 1] };
}
