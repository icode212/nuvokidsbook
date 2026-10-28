import type { Scene, Target } from '../../content/schema';
export function nextFindTarget(scene: Scene, previousId?: string, random = Math.random): Target | undefined {
  const eligible = scene.objects.filter(o => o.findPrompt !== null);
  const choices = eligible.filter(o => o.id !== previousId);
  const pool = choices.length ? choices : eligible;
  return pool[Math.floor(random() * pool.length)];
}
export function findResponse(selectedId: string, requestedId: string) {
  return selectedId === requestedId ? { correct: true, text: 'You found it!' } : { correct: false, text: 'Let’s look again.' };
}
