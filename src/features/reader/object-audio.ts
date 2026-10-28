import type { Target } from '../../content/schema';
export function objectAudioCue(target: Target, narration: boolean, sounds: boolean) {
  return {
    text: target.soundFile ? null : narration ? target.transcript : null,
    sound: sounds ? target.soundFile ?? (target.sound !== null) : false,
  };
}
