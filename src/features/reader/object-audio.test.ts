import { expect, it } from 'vitest';
import { farmBook } from '../../../content-source/a-day-at-the-farm/book';
import { objectAudioCue } from './object-audio';
it('animal taps play their call directly without human identification speech', () => {
  for (const page of farmBook.scenes) for (const target of page.objects) {
    if (!target.soundFile) continue;
    expect(objectAudioCue(target,true,true)).toEqual({text:null,sound:target.soundFile});
    expect(objectAudioCue(target,true,false)).toEqual({text:null,sound:false});
  }
  expect(farmBook.scenes[0].objects.find(o=>o.id === 'birds')?.soundFile).toContain('/effects/birds.wav');
  expect(farmBook.scenes[1].objects.find(o=>o.id === 'cow')?.soundFile).toContain('/effects/cow.wav');
  expect(farmBook.scenes[0].objects.find(o=>o.id === 'barn-door')?.soundFile).toBe('/books/a-day-at-the-farm/0.5.0/effects/door.wav');
  expect(farmBook.scenes[3].objects.find(o=>o.id === 'chicks')?.soundFile).toBe('/books/a-day-at-the-farm/0.5.0/effects/hen.wav');
});
