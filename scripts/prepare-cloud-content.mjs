import {createServer} from 'vite';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {dirname} from 'node:path';
const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try {
  const {farmBook}=await vite.ssrLoadModule('/content-source/a-day-at-the-farm/book.ts');
  const inventory=JSON.parse(await readFile('public'+farmBook.inventory,'utf8'));
  const urls=[farmBook.inventory,...inventory.assets.map(asset=>asset.url)];
  for(const url of urls){const target='output/r2-public'+url;await mkdir(dirname(target),{recursive:true});await copyFile('public'+url,target);}
  await writeFile('output/farm-manifest.json',JSON.stringify(farmBook,null,2)+'\n');
  const literal=JSON.stringify(farmBook).replaceAll("'","''");
  await writeFile('output/seed-free-book.sql',`insert into public.books(id,title,series,status,access,sort_order,manifest) values ('${farmBook.id}','${farmBook.title.replaceAll("'","''")}','${farmBook.series.replaceAll("'","''")}','published','free',0,'${literal}'::jsonb) on conflict(id) do nothing;\n`);
  console.log(`Prepared ${urls.length} immutable free-media objects and a non-overwriting farm seed.`);
}finally{await vite.close();}
