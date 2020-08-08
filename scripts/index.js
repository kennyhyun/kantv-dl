import { promises as fsp } from 'fs';
import minimist from 'minimist';

import download from './download';

const argv = minimist(process.argv.slice(2));



console.log(argv);

(async () => {
const jsonfile = await fsp.readFile('resp.json').then(b => b.toString()).catch(e => '');
if (jsonfile) {
  
  await download(JSON.parse(jsonfile), argv._[0]);
} else {
  console.log('TODO: implement fetching json');
}

})().catch(e => console.error(e));

