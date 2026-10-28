import { expect, it } from 'vitest';
import { farmBook } from '../../../content-source/a-day-at-the-farm/book';
import { objectAudioCue } from './object-audio';
it('animal taps play their call directly without human identification speech', () => {
  for (const page of farmBook.scenes) for (const target of page.objects) {
    if (!target.soundFile) continue;
    expect(objectAudioCue(target,true,true)).toEqual({text:null,sound:target.soundFile});
    expect(objectAudioCue(target,true,false)).toEqual({text:null,sound:false});
  }
  expect(farmBook.scenes[0].objects.find(o=>o.id === 'birds')?.soundFile).toContain('/effects/birds.m4a');
  expect(farmBook.scenes[1].objects.find(o=>o.id === 'cow')?.soundFile).toContain('/effects/cow.m4a');
  for (const [page, id, file] of [[0,'barn-door','door'], [1,'calf','calf'], [2,'lamb','lamb'], [3,'chicks','chicks'], [3,'hen','hen'], [3,'feet','scratching-feet']] as const) {
    expect(farmBook.scenes[page].objects.find(o=>o.id === id)?.soundFile).toBe(`/books/a-day-at-the-farm/${farmBook.contentVersion}/effects/${file}.m4a`);
  }
});
