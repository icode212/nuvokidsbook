import { bookSchema, type Scene, type Target } from '../../src/content/schema';
import narrationAssets from './narration.json' with { type: 'json' };
import effects from './effects.json' with { type: 'json' };

const animalEffects: Record<string, string> = { 'Moo': 'cow', 'Soft calf call': 'cow', 'Chirping birds': 'birds', 'Baa': 'sheep', 'Soft baa': 'sheep', 'Quiet sheep call': 'sheep', 'Cluck': 'hen', 'Peep': 'chicks', 'Peeping chicks': 'chicks', 'Quack': 'ducks', 'Soft neigh': 'horse' };
const animalIds: Record<string, string> = { cow: 'cow', calf: 'calf', birds: 'birds', sheep: 'sheep', lamb: 'lamb', ducks: 'ducks', hen: 'hen', chick: 'chicks', chicks: 'chicks', family: 'chicks', horse: 'horse', 'barn-door': 'door', door: 'door', feet: 'scratching-feet' };

type TargetInput = [string, string, number, number, number, number, string | null, string, string | null, string?];
function target([id, label, x, y, width, height, sound, productionMotion, findPrompt, transcript]: TargetInput): Target {
  return { id, label, rect: { x, y, width, height }, transcript: transcript ?? `This is ${label.toLowerCase()}.`, sound, soundFile: (effects as Record<string, string>)[animalIds[id] ?? (sound ? animalEffects[sound] : '')], productionMotion, findPrompt, narrationAssetId: `${id}-name`, soundAssetId: sound ? `${id}-sound` : null, findPromptAssetId: findPrompt ? `find-${id}` : null, animation: 'pulse' };
}
const page = (pageNumber: number, id: string, title: string, storyText: string, targets: TargetInput[], aspectRatio = 1.5): Scene => ({
  pageNumber, id, title, storyText, storyNarrationAssetId: `page-${String(pageNumber).padStart(2, '0')}-story`,
  image: `/books/a-day-at-the-farm/0.1.0/page-${String(pageNumber).padStart(2, '0')}.webp`, aspectRatio,
  renderMode: 'static', objects: targets.map(target).map(object => ({ ...object,
    narrationAssetId: `${id}-${object.id}-name`,
    soundAssetId: object.sound ? `${id}-${object.id}-sound` : null,
    findPromptAssetId: object.findPrompt ? `${id}-find-${object.id}` : null,
  })),
});
export const farmBook = bookSchema.parse({
  schemaVersion: 1, id: 'a-day-at-the-farm', contentVersion: '0.8.0', title: 'A Day at the Farm',
  series: 'Nuvo & the Wonder Crew', creator: 'NuvoKids', summary: 'A little moo, a little peep, and a big discovery. Join the crew to find out what makes a happy farm.',
  locale: 'en-CA', ageRange: '2–5', kind: 'story', access: 'free', status: 'published', sortOrder: 0,
  cover: '/books/a-day-at-the-farm/0.1.0/cover.webp', inventory: '/books/a-day-at-the-farm/0.8.0/inventory.json', assetStatus: 'development', narrationAssets,
  scenes: [
    page(1, '01-welcome', 'Welcome to the Farm', 'The farm is waking up. What can we hear?', [
      ['birds', 'Birds', .015,.30,.105,.10,'Chirping birds','Wing lift','Where are the birds?','These are birds.'],
      ['cow', 'Cow', .58,.385,.13,.10,'Moo','Head nod','Where is the cow?','This is a cow.'],
      ['barn-door', 'Barn door', .19,.30,.085,.14,'Creak','Small opening','Where is the barn door?'],
    ]),
    page(2, '02-cow', 'Hello, Cow!', 'Moo! A cow stands beside her calf. They stay close together.', [
      ['cow','Cow',.55,.19,.35,.32,'Moo','Head nod','Where is the cow?','This is a cow.'],
      ['calf','Calf',.65,.46,.24,.38,'Soft calf call','Ear twitch','Where is the calf?','This is a calf. A calf is a young cow.'],
      ['cow-tail','Cow’s tail',.91,.35,.085,.23,null,'Gentle swish','Can you find the cow’s tail?','This is the cow’s tail.'],
    ]),
    page(3, '03-sheep', 'Breakfast for the Sheep', 'The sheep are eating grass. Pip watches quietly beside Nuvo.', [
      ['sheep','Sheep',.49,.37,.19,.35,'Baa','Head lift','Where is the sheep?','This is a sheep.'],
      ['lamb','Lamb',.66,.50,.14,.26,'Soft baa','Ear twitch','Where is the lamb?','This is a lamb. A lamb is a young sheep.'],
      ['grass','Grass',.54,.78,.39,.13,'Grass rustle','Sway','Where is the grass?','This is grass. The sheep eat grass.'],
    ]),
    page(4, '04-chicken', 'A Busy Chicken', 'Cluck, cluck! A hen scratches the ground. Her chicks follow behind.', [
      ['hen','Hen',.48,.44,.26,.32,'Cluck','Head bob','Where is the hen?','This is a hen.'],
      ['chicks','Chicks',.73,.68,.265,.16,'Peep','Small steps','Where are the chicks?','These are chicks. Chicks are young chickens.'],
      ['feet','Scratching feet',.53,.77,.15,.09,'Soil scrape','Short scratch',null,'The hen scratches the ground with her feet.'],
    ]),
    page(5, '05-pond', 'Down by the Pond', 'The ducks paddle across the pond. Mimi watches from the path.', [
      ['ducks','Ducks',.50,.62,.21,.20,'Quack','Paddle','Where are the ducks?','These are ducks.'],
      ['water','Water',.68,.87,.25,.10,'Water ripples','Ripple rings','Where is the water?','This is water.'],
      ['reeds','Reeds',.84,.30,.15,.25,'Reed rustle','Sway','Where are the reeds?','These are reeds.'],
    ]),
    page(6, '06-horse', 'A Gentle Hello', 'The farmer shows Lina how to greet the horse. Lina waits while the horse comes closer.', [
      ['horse','Horse',.54,.20,.43,.31,'Soft neigh','Head dip','Where is the horse?','This is a horse.'],
      ['ears','Horse’s ears',.56,.10,.08,.095,null,'Quiet ear twitch',null,'These are the horse’s ears.'],
      ['hoof','Hoof',.58,.71,.105,.14,'Gentle hoof tap','Small tap','Can you find a hoof?','This is a hoof.'],
    ]),
    page(7, '07-water', 'What Do Animals Need?', 'Milo notices the water trough. Animals need fresh water, too!', [
      ['stream','Water stream',.57,.49,.10,.15,'Pouring water','Flow','Can you find the pouring water?','The farmer pours fresh water.'],
      ['cow','Drinking cow',.74,.40,.25,.26,'Drinking water','Head dip','Where is the cow?','The cow drinks fresh water.'],
      ['bucket','Bucket',.52,.38,.09,.13,'Gentle clunk','Settle','Where is the bucket?','This is a bucket.'],
    ]),
    page(8, '08-rain', 'Here Comes the Rain', 'Drip, drop! The farmer opens the shelter. The animals have a dry place to rest.', [
      ['rain','Rain',.32,.03,.16,.16,'Soft rain','Falling drops','Can you find the rain?','This is rain. Drip, drop!'],
      ['door','Shelter door',.65,.02,.08,.34,'Creak','Small opening','Where is the shelter door?','The door opens into a dry shelter.'],
      ['sheep','Sheep',.65,.41,.17,.36,'Straw footsteps','Step inside','Where is the sheep?','The sheep rests in the dry shelter.'],
    ]),
    page(9, '09-peeping', 'Something Is Peeping', 'Peep, peep! A chick is beside the wrong fence. Its hen is calling nearby.', [
      ['chick','Chick',.55,.65,.10,.16,'Peep','Head turn','Where is the little chick?','This chick is looking for its hen.'],
      ['hen','Hen',.79,.37,.19,.24,'Cluck','Head bob','Where is the hen?','The hen is calling her chick.'],
      ['pip-ears','Pip’s ears',.18,.49,.14,.12,null,'Listening tilt',null,'Pip listens quietly.'],
    ]),
    page(10, '10-space', 'Let’s Give It Space', 'Everyone steps back. The farmer opens the little gate, and the chick follows its hen.', [
      ['gate','Gate',.60,.38,.065,.34,'Creak','Open gate','Where is the little gate?','The farmer opens the gate.'],
      ['chick','Chick',.67,.60,.095,.13,'Tiny steps','Walk through','Where is the little chick?','The chick follows its hen.'],
      ['family','Chick family',.79,.44,.19,.24,'Peeping chicks','Gentle bob','Where is the hen with her chicks?','The chicks are together again.'],
    ]),
    page(11, '11-happy-farm', 'A Happy Farm', 'Food, water, shelter—and gentle care. Now the crew knows what animals need.', [
      ['sheep','Grazing sheep',.03,.29,.19,.15,'Grass rustle','Head dip','Where are the grazing sheep?','The sheep have grass to eat.'],
      ['cow','Drinking cow',.51,.40,.23,.36,'Drinking water','Head dip','Where is the drinking cow?','The cow has fresh water.'],
      ['shelter','Shelter',.72,.25,.19,.25,'Quiet sheep call','Highlight dry straw','Where is the dry shelter?','The animals have a dry shelter.'],
    ], 2.2235),
    page(12, '12-goodbye', 'Goodbye for Now', '“Thank you, farm!” says Nuvo. “What did you discover today?”', [
      ['cow','Cow',.64,.255,.08,.12,'Moo','Head nod','Where is the cow?','This is a cow.'],
      ['sheep','Sheep',.69,.37,.11,.15,'Baa','Head lift','Where is the sheep?','This is a sheep.'],
      ['farmer','Farmer',.775,.17,.13,.38,'Friendly goodbye','Wave','Where is the farmer?','Goodbye! Thank you for visiting the farm.'],
    ]),
  ],
});
