import fs, { promises as fsp } from 'fs';
import { spawn } from 'child_process';
import youtubedl from 'youtube-dl';
import { promisify } from 'util';
import path from 'path';

const concurrency = 4;

const getInfo = promisify(youtubedl.getInfo);

const exec = (cmd, ...params) =>
  new Promise((resp, rej) => {
    let cnt = 0;
    const param = params[0].join(' ');
    const [,outName] = param.match(/\/(.*)\.%\(ext\)s/);
    // return resp('test');
    const subp = spawn(cmd, ...params);
    const cmdline = [cmd].concat(params[0]).join(' ');
    console.log(`running ${cmdline}`);
    subp.stdout?.on('data', (data) => {
      console.log(`${cmdline}: ${data}`);
    });
    subp.stderr?.on('data', (data) => {
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

export default async (data, { title = 'untitled' }) => {
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

  youtubedl.setYtdlBinary('/usr/local/bin/youtube-dl');

  await fsp.mkdir(`${tvid}`).catch((e) => {
    if (e.code !== 'EEXIST') throw e;
  });
  await Promise.all(
    pipelines.map((pipe, idx) =>
      pipe.reduce(async (p, part) => {
        const prev = await p;
        const { seq, url } = part;
        const cwd = process.cwd();
        return exec('youtube-dl', ['-o', `${tvid}/${title}.${`000${seq}`.slice(-3)}.%(ext)s`, url]);
        /*
        const details = await getInfo(url);
        const { ext } = details;
        console.log(details);
        const output = path.resolve(cwd, `${title}.${`000${seq}`.slice(-3)}.${ext}`);
        const existing = await fsp.stat(output).catch(e => {
          if (e.code !== 'ENOENT') throw e;
        });
        console.log('cwd:', process.cwd(), '__dir', __dirname, output, existing);
        return new Promise((res, rej) => {
          const video = youtubedl(url, [], { start: existing ? existing.size : 0, cwd });
          console.log(video);
          video.on('info', info => {
            console.log('Download started', info, 'size:', info.size + existing?.size || 0);
          });
          video.pipe(fs.createWriteStream(output, { flags: 'a' }));
          video.on('complete', info => {
            console.log('filename: ' + info._filename + ' already downloaded.', info)
            res('already downloaded');
          });
          video.on('complete', info => {
            console.log('complete', info);
            res('complete');
          })
          video.on('error', err => {
            console.error('error', err);
            rej(err);
          });
        });
        */
        // return exec('youtube-dl', ['-o', `"${tvid}/${title}.${`000${seq}`.slice(-3)}.%(ext)s"`, url]);
      }, null),
    ),
  );
};
