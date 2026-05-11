import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from 'ffmpeg-static';

function ensureFfmpegPath() {
  if (ffmpegInstaller) ffmpeg.setFfmpegPath(ffmpegInstaller);
}

export function getMergedCreativeOutputPath(jobId) {
  const dir = path.join(os.tmpdir(), 'ebay-deals-creative-merged');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `job-${jobId}.mp4`);
}

export async function downloadUrlToFile(url, destPath) {
  const res = await fetch(url, { signal: AbortSignal.timeout(600000), redirect: 'follow' });
  if (!res.ok) throw new Error(`Download failed HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
}

/**
 * Concatenate remote MP4s into one file (re-encode for codec/size mismatches).
 * @param {number} jobId
 * @param {string[]} remoteUrls
 * @returns {Promise<string>} absolute path to merged file
 */
export async function concatRemoteVideosForCreativeJob(jobId, remoteUrls) {
  if (!remoteUrls.length) throw new Error('No segment URLs to merge');
  ensureFfmpegPath();

  const workDir = path.join(os.tmpdir(), 'ebay-deals-creative-work', String(jobId));
  fs.mkdirSync(workDir, { recursive: true });
  const locals = [];

  try {
    for (let i = 0; i < remoteUrls.length; i++) {
      const p = path.join(workDir, `seg-${i}.mp4`);
      await downloadUrlToFile(remoteUrls[i], p);
      locals.push(p);
    }

    const outPath = getMergedCreativeOutputPath(jobId);
    const listPath = path.join(workDir, 'concat.txt');
    const toPosix = f => path.resolve(f).replace(/\\/g, '/');
    const listBody = locals.map(p => `file '${toPosix(p).replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(listPath, listBody, 'utf8');

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions([
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-crf',
          '23',
          '-c:a',
          'aac',
          '-b:a',
          '128k',
          '-movflags',
          '+faststart'
        ])
        .output(outPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    return path.resolve(outPath);
  } finally {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}
