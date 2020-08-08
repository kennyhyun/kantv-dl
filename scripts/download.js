const fs = require('fs');
const { spawn } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const concurrency = 4;
const fsp = { mkdir: promisify(fs.mkdir) };

const exec = (cmd, ...params) =>
  new Promise((resp, rej) => {
    let cnt = 0;
    const param = params[0].join(' ');
    const [,outName] = param.match(/\/(.*)\.%\(ext\)s/);
    // return resp('test');
    const subp = spawn(cmd, ...params);
    const cmdline = [cmd].concat(params[0]).join(' ');
    console.log(`running ${cmdline}`);
    subp.stdout.on('data', (data) => {
      console.log(`${cmdline}: ${data}`);
    });
    subp.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('hls,applehttp')) return;
      if (output.startsWith('frame=')) {
        cnt ++;
        if (cnt >= 8) {
          cnt = 0;
          console.log(outName, output);
        }
      }
    });
    subp.on('error', (err) => {
      rej(new Error(err));
    });
    subp.on('close', (code) => {
      resp(code);
    });
  });

const download = async (data, { title = 'untitled', directory }) => {
  const {
    data: { partList, tvid },
  } = data || {};
  const queue = partList.map((part) => ({
    tvid,
    title: part.part_title,
    url: part.url,
    seq: part.part,
  }));
  const pipelines = Array(concurrency);
  queue.forEach((part, idx) => {
    const numPipe = idx % concurrency;
    if (!pipelines[numPipe]) pipelines[numPipe] = [];
    pipelines[numPipe].push(part);
  });

  const outDir = directory || tvid;
  await fsp.mkdir(`${outDir}`).catch((e) => {
    if (e.code !== 'EEXIST') throw e;
  });
  await Promise.all(
    pipelines.map((pipe, idx) =>
      pipe.reduce(async (p, part) => {
        const prev = await p;
        const { seq, url } = part;
        const cwd = process.cwd();
        return exec('youtube-dl', ['-o', `${outDir}/${title}.${`000${seq}`.slice(-3)}.%(ext)s`, url]);
      }, null)
    )
  );
};

module.exports = download;
