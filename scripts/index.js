#!/usr/bin/env node

const minimist = require('minimist');
const axios = require('axios');

const download = require('./download');

const argv = minimist(process.argv.slice(2));

/*
 * --id=301908161830001
 * --title=Terror
 */

(async () => {
  const [_id, _title] = argv._;
  const { title = _title, id = _id, directory } = argv;
  if (!id) return console.log('id is required, e.g. "--id=1234"');
  if (typeof id !== 'number') return console.log('id should be a number');
  const { data } = await axios.get(`https:\/\/www.wekan.tv/index.php/video/part?tvid=${id}`)
  await download(data, { title, id, directory });
})().catch(e => console.error(e));

