import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from 'ffmpeg-static';
import ffprobeInstaller from 'ffprobe-static';

function setBinaries() {
  if (ffmpegInstaller) {
    ffmpeg.setFfmpegPath(ffmpegInstaller);
  }
  const ffprobePath = typeof ffprobeInstaller === 'string' ? ffprobeInstaller : ffprobeInstaller?.path;
  if (ffprobePath) {
    ffmpeg.setFfprobePath(ffprobePath);
  }
}

function secToAss(t) {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const cs = Math.floor((t - Math.floor(t)) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function escapeAss(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\r/g, '')
    .replace(/\n/g, '\\N');
}

function buildAss(screenLines, videoDuration) {
  const dur = Math.max(12, Math.min(25, videoDuration || 18));
  const normalized = (screenLines || []).map((line, i) => {
    const start = Math.max(0, Number(line.start) || 0);
    let end = Math.max(start + 0.5, Number(line.end) || start + 3);
    if (end > dur - 0.3 && i < (screenLines?.length || 0) - 1) end = Math.min(end, dur * 0.85);
    return { text: line.text, start, end: Math.min(end, dur) };
  });

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,DejaVu Sans,52,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,3,2,2,40,40,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const events = normalized
    .filter(l => l.text)
    .map(l => {
      const t1 = secToAss(l.start);
      const t2 = secToAss(l.end);
      const txt = escapeAss(l.text);
      return `Dialogue: 0,${t1},${t2},Default,,0,0,0,,{\\an2\\fs52\\bord2\\shad2}${txt}`;
    })
    .join('\n');

  return header + events;
}

function subtitlesFilterArg(assPath) {
  const uri = pathToFileURL(path.resolve(assPath)).href;
  return `subtitles=${uri}`;
}

function runEncode({ imagePath, audioPath, outputPath, targetDur, videoFilters }) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imagePath)
      .inputOptions(['-loop', '1'])
      .input(audioPath)
      .outputOptions([
        '-t',
        String(targetDur),
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '23',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        '-shortest'
      ])
      .videoFilters(videoFilters)
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  });
}

/**
 * @returns {Promise<{ outputPath: string, durationSec: number, sizeBytes: number }>}
 */
export async function renderTikTokVideo({
  workDir,
  imagePath,
  audioPath,
  outputPath,
  screenLines
}) {
  setBinaries();

  const meta = await new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
  const audioDur = meta?.format?.duration ? Number(meta.format.duration) : 16;
  const targetDur = Math.min(25, Math.max(12, audioDur + 0.35));

  const baseFilters = [
    'scale=1080:1920:force_original_aspect_ratio=increase',
    'crop=1080:1920'
  ];

  const assPath = path.join(workDir, 'subs.ass');
  fs.writeFileSync(assPath, buildAss(screenLines, targetDur), 'utf8');
  const subFilter = subtitlesFilterArg(assPath);

  try {
    await runEncode({
      imagePath,
      audioPath,
      outputPath,
      targetDur,
      videoFilters: [...baseFilters, subFilter]
    });
  } catch (err) {
    console.warn('TikTok render with subtitles failed, retrying without:', err?.message);
    await runEncode({
      imagePath,
      audioPath,
      outputPath,
      targetDur,
      videoFilters: baseFilters
    });
  }

  try {
    fs.unlinkSync(assPath);
  } catch { /* ignore */ }

  const st = fs.statSync(outputPath);
  return {
    outputPath,
    durationSec: targetDur,
    sizeBytes: st.size
  };
}
