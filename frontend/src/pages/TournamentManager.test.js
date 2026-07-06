import { createInitialGroupSizes, getRequiredGroupCount } from './TournamentManager';

describe('TournamentManager setup', () => {
  it('expands to the minimum number of groups needed for 64 teams', () => {
    expect(getRequiredGroupCount(64)).toBe(8);
    expect(createInitialGroupSizes(4, 64)).toEqual({
      0: 8,
      1: 8,
      2: 8,
      3: 8,
      4: 8,
      5: 8,
      6: 8,
      7: 8
    });
  });
});
