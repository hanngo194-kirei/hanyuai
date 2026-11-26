/* ==========================================================================
   Bộ phân tích phát âm trực tiếp trên trình duyệt (100% cục bộ, miễn phí)
   - Trích xuất đường cong cao độ giọng thật F0 bằng thuật toán YIN (Web Audio API)
   - Vẽ biểu đồ SVG đối chiếu giọng nói với thanh điệu chuẩn (1..4, thanh nhẹ)
   - Hỗ trợ nhận diện giọng nói zh-CN (SpeechRecognition) ở thiết bị tương thích
   ========================================================================== */
(function(){
  function esc(s){
    if(typeof escHtml === 'function') return escHtml(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function isIOS(){
    const ua = String(navigator.userAgent || '');
    return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function isSpeechRecSupported(){
    return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function mixDownToMono(audioBuffer){
    const chCount = audioBuffer.numberOfChannels || 1;
    const len = audioBuffer.length;
    if(chCount === 1) return audioBuffer.getChannelData(0);
    const out = new Float32Array(len);
    for(let c = 0; c < chCount; c++){
      const ch = audioBuffer.getChannelData(c);
      for(let i = 0; i < len; i++) out[i] += ch[i];
    }
    for(let i = 0; i < len; i++) out[i] /= chCount;
    return out;
  }

  function detectYinPitch(frame, sampleRate, minLag, maxLag){
    const half = Math.min(maxLag, Math.floor(frame.length / 2) - 1);
    if(half <= minLag + 2) return 0;

    const diff = new Float32Array(half + 1);
    const cmnd = new Float32Array(half + 1);
    cmnd[0] = 1;
    let runningSum = 0;

    for(let tau = 1; tau <= half; tau++){
      let sum = 0;
      const limit = frame.length - half;
      for(let i = 0; i < limit; i++){
        const d = frame[i] - frame[i + tau];
        sum += d * d;
      }
      diff[tau] = sum;
      runningSum += sum;
      cmnd[tau] = runningSum > 0 ? (diff[tau] * tau / runningSum) : 1;
    }

    let tauEst = -1;
    for(let tau = minLag; tau < half; tau++){
      if(cmnd[tau] < 0.18){
        while(tau + 1 <= half && cmnd[tau + 1] < cmnd[tau]) tau++;
        tauEst = tau;
        break;
      }
    }
    if(tauEst < 0){
      let minVal = 1;
      let minIdx = -1;
      for(let tau = minLag; tau <= half; tau++){
        if(cmnd[tau] < minVal){
          minVal = cmnd[tau];
          minIdx = tau;
        }
      }
      if(minVal < 0.35 && minIdx > 0) tauEst = minIdx;
    }
    if(tauEst <= 0) return 0;

    let betterTau = tauEst;
    if(tauEst > 1 && tauEst < half){
      const s0 = cmnd[tauEst - 1];
      const s1 = cmnd[tauEst];
      const s2 = cmnd[tauEst + 1];
      const denom = 2 * (2 * s1 - s2 - s0);
      if(Math.abs(denom) > 1e-6){
        betterTau = tauEst + (s2 - s0) / denom;
      }
    }
    const hz = sampleRate / betterTau;
    return (hz >= 75 && hz <= 420) ? hz : 0;
  }

  async function decodeBlobAudio(blob){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    const arrBuf = (typeof blob.arrayBuffer === 'function')
      ? await blob.arrayBuffer()
      : await new Response(blob).arrayBuffer();
    const ctx = new AC();
    try{
      const copyBuf = arrBuf.slice(0);
      return await new Promise((resolve, reject) => {
        let settled = false;
        const ok = buf => { if(!settled){ settled = true; resolve(buf); } };
        const fail = err => { if(!settled){ settled = true; reject(err || new Error('DECODE_FAIL')); } };
        try{
          const maybePromise = ctx.decodeAudioData(copyBuf, ok, fail);
          if(maybePromise && typeof maybePromise.then === 'function'){
            maybePromise.then(ok, fail);
          }
        }catch(err){ fail(err); }
      });
    }finally{
      try{ ctx.close(); }catch(_){}
    }
  }

  function downsampleMono(mono, rawRate){
    const decim = Math.max(1, Math.floor((rawRate || 16000) / 16000));
    if(decim <= 1) return { samples: mono, sampleRate: rawRate || 16000 };
    const outLen = Math.floor(mono.length / decim);
    const out = new Float32Array(outLen);
    for(let i = 0; i < outLen; i++){
      let sum = 0;
      const base = i * decim;
      for(let j = 0; j < decim; j++) sum += mono[base + j];
      out[i] = sum / decim;
    }
    return { samples: out, sampleRate: (rawRate || 16000) / decim };
  }

  async function extractPitchContour(blob){
    const empty = { hasVoice: false, voicedCount: 0, durationSec: 0, minHz: 0, maxHz: 0, points: [], energyEnv: [] };
    if(!blob) return empty;
    const decoded = await decodeBlobAudio(blob);
    if(!decoded) return empty;

    const rawRate = decoded.sampleRate || 16000;
    const rawMono = mixDownToMono(decoded);
    const { samples: mono, sampleRate } = downsampleMono(rawMono, rawRate);
    const winSize = Math.max(256, Math.round(sampleRate * 0.030));
    const hopSize = Math.max(128, Math.round(sampleRate * 0.010));
    if(mono.length < winSize){
      return { hasVoice: false, voicedCount: 0, durationSec: decoded.duration || 0, minHz: 0, maxHz: 0, points: [], energyEnv: [] };
    }

    const frames = [];
    let maxRms = 0;
    for(let off = 0; off + winSize <= mono.length; off += hopSize){
      let sq = 0;
      for(let i = 0; i < winSize; i++){
        const v = mono[off + i];
        sq += v * v;
      }
      const rms = Math.sqrt(sq / winSize);
      if(rms > maxRms) maxRms = rms;
      frames.push({ off, rawT: off / sampleRate, rms });
    }

    const silenceThresh = Math.max(0.008, maxRms * 0.14);
    const minLag = Math.max(2, Math.floor(sampleRate / 420));
    const maxLag = Math.min(Math.floor(winSize / 2) - 1, Math.ceil(sampleRate / 75));
    const rawPts = [];
    const frameBuf = new Float32Array(winSize);

    for(let k = 0; k < frames.length; k++){
      const f = frames[k];
      if(f.rms < silenceThresh) continue;
      frameBuf.set(mono.subarray(f.off, f.off + winSize));
      const hz = detectYinPitch(frameBuf, sampleRate, minLag, maxLag);
      if(hz > 0){
        rawPts.push({ rawT: f.rawT, hz });
      }
    }

    // Lọc trung vị 3 điểm để khử nhiễu nhảy quãng tám
    const smoothPts = [];
    for(let i = 0; i < rawPts.length; i++){
      let hz = rawPts[i].hz;
      if(i > 0 && i + 1 < rawPts.length){
        const trio = [rawPts[i - 1].hz, rawPts[i].hz, rawPts[i + 1].hz].sort((a, b) => a - b);
        hz = trio[1];
      }
      smoothPts.push({ rawT: rawPts[i].rawT, hz });
    }

    if(smoothPts.length < 3){
      return {
        hasVoice: false,
        voicedCount: smoothPts.length,
        durationSec: Number((decoded.duration || 0).toFixed(2)),
        minHz: 0,
        maxHz: 0,
        points: [],
        energyEnv: []
      };
    }

    const sortedLog = smoothPts.map(p => Math.log2(p.hz)).sort((a, b) => a - b);
    const p10 = sortedLog[Math.floor(sortedLog.length * 0.10)] || sortedLog[0];
    const p90 = sortedLog[Math.min(sortedLog.length - 1, Math.floor(sortedLog.length * 0.90))] || sortedLog[sortedLog.length - 1];
    const midLog = (p10 + p90) / 2;
    const spanLog = Math.max(0.65, p90 - p10);

    const tStart = smoothPts[0].rawT;
    const tEnd = smoothPts[smoothPts.length - 1].rawT;
    const tSpan = Math.max(0.05, tEnd - tStart);

    // Đường bao năng lượng làm mượt 3 khung trong khoảng có tiếng nói [tStart, tEnd]
    const activeFrames = frames.filter(f => f.rawT >= tStart - 0.005 && f.rawT <= tEnd + 0.005);
    const envNorm = maxRms > 0 ? maxRms : 1;
    const energyEnv = activeFrames.map((f, idx) => {
      const prevR = idx > 0 ? activeFrames[idx - 1].rms : f.rms;
      const nextR = idx + 1 < activeFrames.length ? activeFrames[idx + 1].rms : f.rms;
      const sm = (prevR + f.rms + nextR) / 3;
      const nt = Math.max(0, Math.min(1, (f.rawT - tStart) / tSpan));
      return { t: Number(nt.toFixed(4)), e: Number(Math.min(1, sm / envNorm).toFixed(4)) };
    });

    let minHz = 9999;
    let maxHz = 0;
    const points = smoothPts.map(p => {
      if(p.hz < minHz) minHz = p.hz;
      if(p.hz > maxHz) maxHz = p.hz;
      const lvl = Math.max(1.0, Math.min(5.0, 3.0 + (Math.log2(p.hz) - midLog) / spanLog * 3.4));
      return {
        t: Number(((p.rawT - tStart) / tSpan).toFixed(4)),
        rawT: Number(p.rawT.toFixed(3)),
        hz: Math.round(p.hz),
        level: Number(lvl.toFixed(2))
      };
    });

    return {
      hasVoice: true,
      voicedCount: points.length,
      durationSec: Number((decoded.duration || 0).toFixed(2)),
      minHz: Math.round(minHz),
      maxHz: Math.round(maxHz),
      points,
      energyEnv
    };
  }

  function segmentSyllablesByEnergy(pts, energyEnv, n){
    const cnt = Math.max(1, Number(n) || 1);
    if(cnt === 1) return [{ t0: 0, t1: 1 }];
    const pArr = Array.isArray(pts) ? pts : [];
    const eArr = Array.isArray(energyEnv) ? energyEnv : [];
    const winHalf = 0.35 / cnt;
    const minSeg = 0.35 / cnt;
    const cuts = [0];

    for(let k = 1; k < cnt; k++){
      const ideal = k / cnt;
      const lo = Math.max(cuts[k - 1] + minSeg, ideal - winHalf);
      const hi = Math.min(1 - (cnt - k) * minSeg, ideal + winHalf);
      if(hi <= lo){
        cuts.push(Math.max(cuts[k - 1] + 0.01, Math.min(0.99, ideal)));
        continue;
      }
      // Ưu tiên khoảng ngắt vô thanh rõ (>= 45ms) nằm trong cửa sổ tìm kiếm
      let bestGapT = null;
      let maxGapDur = 0.045;
      for(let i = 1; i < pArr.length; i++){
        const gapDur = (pArr[i].rawT || 0) - (pArr[i - 1].rawT || 0);
        if(gapDur >= maxGapDur){
          const midT = (pArr[i].t + pArr[i - 1].t) / 2;
          if(midT >= lo && midT <= hi){
            maxGapDur = gapDur;
            bestGapT = midT;
          }
        }
      }
      if(bestGapT !== null){
        cuts.push(Number(bestGapT.toFixed(4)));
        continue;
      }
      // Nếu đọc liền hơi, tìm thung lũng năng lượng (RMS thấp nhất gần vị trí kỳ vọng)
      let bestT = ideal;
      let bestScore = Infinity;
      for(let i = 0; i < eArr.length; i++){
        const ep = eArr[i];
        if(ep.t >= lo && ep.t <= hi){
          const cost = ep.e + 0.25 * Math.abs(ep.t - ideal) * cnt;
          if(cost < bestScore){
            bestScore = cost;
            bestT = ep.t;
          }
        }
      }
      cuts.push(Number(bestT.toFixed(4)));
    }
    cuts.push(1);
    const bounds = [];
    for(let i = 0; i < cnt; i++){
      bounds.push({ t0: cuts[i], t1: cuts[i + 1] });
    }
    return bounds;
  }

  function applySandhiAndContext(syls){
    const list = (Array.isArray(syls) ? syls : []).map(s => Object.assign({}, s));
    for(let i = 0; i < list.length; i++){
      const cur = list[i];
      const nxt = list[i + 1];
      const curBase = Number(cur.baseTone || cur.tone) || 5;
      const nxtBase = nxt ? (Number(nxt.baseTone || nxt.tone) || 5) : 5;
      if(!cur.sandhi && nxt){
        if(cur.ch === '一'){
          if(nxtBase === 4){ cur.tone = 2; cur.sandhi = '“一” trước thanh 4 đọc thành thanh 2'; }
          else if([1, 2, 3].includes(nxtBase)){ cur.tone = 4; cur.sandhi = '“一” trước thanh 1/2/3 đọc thành thanh 4'; }
        }else if(cur.ch === '不' && nxtBase === 4){
          cur.tone = 2;
          cur.sandhi = '“不” trước thanh 4 đọc thành thanh 2';
        }else if(curBase === 3 && nxtBase === 3){
          cur.tone = 2;
          cur.sandhi = 'Hai thanh 3 liền nhau: âm trước biến thành thanh 2';
        }
      }
      if(Number(cur.tone) === 3 && nxt && Number(nxt.tone) !== 3){
        cur.halfThird = true;
      }else{
        cur.halfThird = false;
      }
    }
    return list;
  }

  function buildToneContourSvg(pitchData, expectedSyls, bounds){
    const W = 360;
    const H = 132;
    const padL = 22;
    const padR = 10;
    const padT = 12;
    const padB = 30;
    const pw = W - padL - padR;
    const ph = H - padT - padB;
    const yOf = lvl => Number((padT + (5 - Math.max(1, Math.min(5, lvl))) / 4 * ph).toFixed(1));

    const gridSvg = [5, 4, 3, 2, 1].map(lv => {
      const y = yOf(lv);
      const lbl = (lv === 5 || lv === 3 || lv === 1)
        ? `<text x="6" y="${y + 3}" font-size="9" fill="currentColor" opacity="0.55">${lv}</text>`
        : '';
      return `${lbl}<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="currentColor" opacity="0.14" stroke-width="1" stroke-dasharray="${lv === 3 ? '3 3' : '2 4'}"/>`;
    }).join('');

    const syls = applySandhiAndContext(expectedSyls);
    const toneRefLevels = {
      1: [4.8, 4.8],
      2: [2.8, 4.9],
      3: [2.4, 1.15, 3.5],
      '3h': [2.4, 1.35, 1.45],
      4: [4.9, 1.2],
      5: [2.8, 2.8]
    };

    let refSvg = '';
    if(syls.length > 0 && syls.length <= 8){
      const segBounds = (Array.isArray(bounds) && bounds.length === syls.length)
        ? bounds
        : syls.map((_, i) => ({ t0: i / syls.length, t1: (i + 1) / syls.length }));
      for(let i = 0; i < syls.length; i++){
        const s = syls[i];
        const b = segBounds[i];
        const x0 = padL + b.t0 * pw;
        const segW = Math.max(10, (b.t1 - b.t0) * pw);
        if(i > 0){
          refSvg += `<line x1="${x0.toFixed(1)}" y1="${padT}" x2="${x0.toFixed(1)}" y2="${padT + ph}" stroke="currentColor" opacity="0.15" stroke-width="1"/>`;
        }
        const shapeKey = (s.tone === 3 && s.halfThird) ? '3h' : s.tone;
        const shape = toneRefLevels[shapeKey] || toneRefLevels[5];
        const padIn = Math.max(4, segW * 0.14);
        const usableW = Math.max(6, segW - padIn * 2);
        let d = '';
        for(let j = 0; j < shape.length; j++){
          const px = x0 + padIn + (shape.length === 1 ? usableW / 2 : usableW * j / (shape.length - 1));
          const py = yOf(shape[j]);
          d += (j === 0 ? 'M' : 'L') + px.toFixed(1) + ' ' + py;
        }
        refSvg += `<path d="${d}" fill="none" stroke="currentColor" opacity="0.42" stroke-width="2" stroke-dasharray="4 3" stroke-linecap="round"/>`;
        const cx = (x0 + segW / 2).toFixed(1);
        refSvg += `<text x="${cx}" y="${H - 15}" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor" opacity="0.88">${esc(s.ch || '')}</text>`;
        if(s.py){
          refSvg += `<text x="${cx}" y="${H - 4}" text-anchor="middle" font-size="8.5" fill="currentColor" opacity="0.62">${esc(s.py)}</text>`;
        }
      }
    }else if(syls.length > 8){
      refSvg += `<text x="${(padL + pw / 2).toFixed(1)}" y="${H - 10}" text-anchor="middle" font-size="10.5" fill="currentColor" opacity="0.72">Đường cao độ ngữ điệu toàn câu (${syls.length} chữ)</text>`;
    }

    let actualSvg = '';
    const pts = (pitchData && Array.isArray(pitchData.points)) ? pitchData.points : [];
    if(pts.length >= 2){
      let d = '';
      for(let i = 0; i < pts.length; i++){
        const p = pts[i];
        const x = (padL + p.t * pw).toFixed(1);
        const y = yOf(p.level);
        const gap = i > 0 && Math.abs((p.rawT || 0) - (pts[i - 1].rawT || 0)) > 0.14;
        d += (i === 0 || gap ? 'M' : 'L') + x + ' ' + y + ' ';
      }
      actualSvg = `<path d="${d.trim()}" fill="none" stroke="var(--accent, #C7463B)" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`;
    }

    return `<svg class="sp-pitch-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Biểu đồ đường cong cao độ thanh điệu">${gridSvg}${refSvg}${actualSvg}</svg>`;
  }

  function cleanChineseChars(text){
    return String(text || '')
      .replace(/[\s\p{P}\p{S}]/gu, '')
      .trim();
  }

  function simpleDiffChars(input, expected){
    if(typeof diffChars === 'function') return diffChars(input, expected);
    const a = [...String(input || '')];
    const b = [...String(expected || '')];
    const ops = b.map((ch, i) => (a[i] === ch ? { t: 'ok', ch } : (i < a.length ? { t: 'sub', ch, got: a[i] } : { t: 'miss', ch })));
    return { okCount: ops.filter(x => x.t === 'ok').length, total: b.length, ops };
  }

  const CHAO_TEMPLATES = {
    1: [4.6, 4.6, 4.6, 4.6, 4.6, 4.6],
    2: [2.7, 2.9, 3.3, 3.8, 4.3, 4.7],
    3: [2.4, 1.8, 1.3, 1.4, 2.1, 3.1],
    '3h': [2.4, 1.9, 1.5, 1.3, 1.3, 1.4],
    4: [4.8, 4.2, 3.4, 2.6, 1.9, 1.3],
    5: [2.9, 2.8, 2.8, 2.7, 2.7, 2.7]
  };

  function resampleContour(segPts, k){
    const nOut = k || 6;
    const t0 = segPts[0].t;
    const tSpan = Math.max(0.0001, segPts[segPts.length - 1].t - t0);
    const out = [];
    let ptr = 0;
    for(let i = 0; i < nOut; i++){
      const target = nOut === 1 ? 0 : i / (nOut - 1);
      while(ptr + 1 < segPts.length && ((segPts[ptr + 1].t - t0) / tSpan) < target){
        ptr++;
      }
      if(ptr + 1 >= segPts.length){
        out.push(segPts[segPts.length - 1].level);
      }else{
        const x0 = (segPts[ptr].t - t0) / tSpan;
        const x1 = (segPts[ptr + 1].t - t0) / tSpan;
        const w = (x1 - x0) > 1e-6 ? Math.max(0, Math.min(1, (target - x0) / (x1 - x0))) : 0;
        out.push(segPts[ptr].level * (1 - w) + segPts[ptr + 1].level * w);
      }
    }
    return out;
  }

  function pearsonCorr(a, b){
    const n = a.length;
    if(n < 2) return 0;
    const meanA = a.reduce((s, v) => s + v, 0) / n;
    const meanB = b.reduce((s, v) => s + v, 0) / n;
    let num = 0, da = 0, db = 0;
    for(let i = 0; i < n; i++){
      const xa = a[i] - meanA;
      const xb = b[i] - meanB;
      num += xa * xb;
      da += xa * xa;
      db += xb * xb;
    }
    if(da < 1e-4 || db < 1e-4) return 0;
    return Math.max(-1, Math.min(1, num / Math.sqrt(da * db)));
  }

  function maeScore(a, b){
    let sum = 0;
    for(let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
    const mae = sum / Math.max(1, a.length);
    return Math.max(0, Math.min(100, Math.round(100 - mae * 26)));
  }

  function scoreToneSegment(segPts, tone, opts){
    if(!segPts || segPts.length < 2){
      return { score: 25, errorType: 'Omission', note: 'Âm tiết này quá nhỏ hoặc bị lướt mất' };
    }
    const q = Math.max(1, Math.floor(segPts.length * 0.25));
    const avg = arr => arr.reduce((s, x) => s + x.level, 0) / arr.length;
    const startLvl = avg(segPts.slice(0, q));
    const endLvl = avg(segPts.slice(segPts.length - q));
    const allAvg = avg(segPts);
    let minLvl = 5, maxLvl = 1;
    for(let i = 0; i < segPts.length; i++){
      if(segPts[i].level < minLvl) minLvl = segPts[i].level;
      if(segPts[i].level > maxLvl) maxLvl = segPts[i].level;
    }
    const slope = endLvl - startLvl;
    const range = maxLvl - minLvl;

    let heuristic = 85;
    let note = '';
    const isHalfThird = Boolean(opts && opts.halfThird);

    if(tone === 1){
      if(slope < -0.85){
        heuristic = Math.max(40, Math.round(78 - Math.abs(slope) * 18));
        note = 'Thanh 1 bị tụt giọng xuống, cần giữ ngang và cao đều';
      }else if(slope > 0.85){
        heuristic = Math.max(45, Math.round(78 - slope * 16));
        note = 'Thanh 1 bị vút lên như Thanh 2, cần giữ thẳng ngang';
      }else if(allAvg < 2.35){
        heuristic = 68;
        note = 'Thanh 1 hơi thấp, hãy giữ cao độ ở quãng trên';
      }else{
        heuristic = Math.min(96, Math.round(94 - range * 6));
      }
    }else if(tone === 2){
      if(slope >= 0.85){
        heuristic = Math.min(96, Math.round(82 + Math.min(1.4, slope) * 10));
      }else if(slope >= 0.25){
        heuristic = Math.round(66 + slope * 20);
        note = 'Thanh 2 đi lên hơi nhẹ, hãy vuốt cao dứt khoát hơn ở cuối âm';
      }else{
        heuristic = Math.max(35, Math.round(54 + slope * 15));
        note = 'Thanh 2 cần đi lên, giọng bạn đang đi ngang hoặc hạ xuống';
      }
    }else if(tone === 3){
      if(minLvl <= 2.35 || (startLvl - minLvl) >= 0.45){
        heuristic = Math.min(95, Math.round(84 + Math.max(0, 2.5 - minLvl) * 8));
      }else if(slope > 0.35 && minLvl > 2.7){
        heuristic = 48;
        note = 'Thanh 3 chưa hạ xuống vùng trầm, nghe gần giống Thanh 1/2';
      }else{
        heuristic = 68;
        note = 'Thanh 3 cần hạ giọng xuống thấp hơn nữa';
      }
    }else if(tone === 4){
      if(slope <= -0.95){
        heuristic = Math.min(96, Math.round(82 + Math.min(1.5, Math.abs(slope)) * 9));
      }else if(slope <= -0.35){
        heuristic = Math.round(66 + Math.abs(slope) * 18);
        note = 'Thanh 4 rơi hơi nhẹ, hãy thả giọng xuống nhanh và gọn hơn';
      }else{
        heuristic = Math.max(35, Math.round(54 - slope * 14));
        note = 'Thanh 4 cần rơi mạnh xuống thấp, giọng bạn đang đi ngang hoặc lên';
      }
    }else{
      if(endLvl > 3.6 && slope > 0.65){
        heuristic = 48;
        note = 'Thanh nhẹ bị đọc quá cao/vút lên, hãy đọc ngắn và nhẹ';
      }else if(range > 1.8){
        heuristic = 68;
        note = 'Thanh nhẹ cần đọc gọn và đều hơn';
      }else{
        heuristic = 88;
      }
    }

    // Chấm tương quan hình dạng đường cong 6 điểm theo thang Triệu Nguyên Nhiệm
    const resampled = resampleContour(segPts, 6);
    let shapeScore = heuristic;
    if(tone === 1 || tone === 5){
      const tmpl = CHAO_TEMPLATES[tone];
      const flatBonus = Math.max(0, Math.min(100, Math.round(98 - range * 16 - Math.abs(slope) * 14)));
      shapeScore = Math.round(maeScore(resampled, tmpl) * 0.45 + flatBonus * 0.55);
    }else if(tone === 3){
      const scFull = Math.max(0, Math.min(100, Math.round(55 + pearsonCorr(resampled, CHAO_TEMPLATES[3]) * 42)));
      if(isHalfThird){
        const scHalf = Math.max(0, Math.min(100, Math.round(55 + pearsonCorr(resampled, CHAO_TEMPLATES['3h']) * 42)));
        shapeScore = Math.max(scFull, scHalf);
      }else{
        shapeScore = scFull;
      }
    }else{
      const corr = pearsonCorr(resampled, CHAO_TEMPLATES[tone] || CHAO_TEMPLATES[5]);
      shapeScore = Math.max(0, Math.min(100, Math.round(52 + corr * 45)));
    }

    const score = Math.max(0, Math.min(100, Math.round(heuristic * 0.55 + shapeScore * 0.45)));
    if(score >= 78 && note) note = '';
    const errorType = score < 60 ? 'Mispronunciation' : 'None';
    return { score, errorType, note };
  }

  // Bảng đồng âm chuẩn hóa bỏ dấu thanh để giảm oan khi SpeechRecognition chọn nhầm chữ Hán
  const HOMOPHONE_GROUPS = {
    ta: '他她它塌',
    de: '的地得',
    zai: '在再载',
    zuo: '做作坐座昨',
    yi: '一以已意衣医椅议译亿易艺',
    bu: '不步部布补',
    shi: '是事市室试师十时实食识失',
    you: '有友又右由游油邮',
    na: '那哪拿',
    zhe: '这着者',
    ma: '吗妈马骂麻',
    jin: '进近今金斤紧',
    qing: '请轻清晴情青',
    xie: '谢写些鞋',
    jian: '见件间建健简单',
    guo: '国果过锅',
    mai: '买卖',
    qian: '钱前千浅签',
    dian: '点电店典',
    yuan: '元远院员原园',
    yue: '月越乐阅约',
    dui: '对队',
    mei: '没每美妹梅',
    wen: '问文闻温吻',
    ti: '题提体替梯',
    tong: '同通痛童铜',
    jia: '家加假价架',
    li: '里离礼理力历立丽',
    hou: '后候厚猴',
    dong: '东冬懂动洞',
    xi: '西习洗喜系细息希戏',
    nan: '南男难',
    bei: '北杯背被备倍',
    xin: '新心信辛欣',
    jiu: '旧就九久酒救究',
    kuai: '快块筷会',
    zao: '早找照造',
    wan: '晚玩完碗万弯',
    chi: '吃迟池尺',
    he: '喝和河合盒何',
    shui: '睡水谁税',
    zhu: '住主助注祝猪煮',
    bang: '帮班半办旁',
    zhi: '知只纸指直职之支值止',
    dao: '到道倒导刀岛',
    wo: '我握卧',
    ni: '你呢泥拟',
    men: '们门闷',
    hao: '好号浩毫',
    shen: '什神深身审',
    me: '么末',
    ming: '名明命鸣',
    zi: '字子自资紫',
    jiao: '叫教觉角脚交校较',
    xue: '学雪血',
    sheng: '生声升胜省剩',
    han: '汉寒汗喊含',
    yu: '语雨鱼与预遇育玉',
    zhong: '中重种钟终众',
    ren: '人认任忍刃',
    da: '大打达答搭',
    xiao: '小笑校消效',
    duo: '多都朵躲',
    shao: '少烧哨',
    lai: '来莱赖',
    qu: '去区趣取曲',
    hui: '会回灰惠汇',
    neng: '能',
    xiang: '想向象像香箱乡',
    kan: '看刊砍',
    ting: '听停厅庭挺',
    shuo: '说硕',
    du: '读度都毒独肚',
    xihuan: '喜欢',
    ai: '爱矮碍挨',
    ge: '个各哥歌格割',
    ji: '几机记寄季集急极给既计际',
    liang: '两亮凉量辆粮',
    san: '三散伞',
    si: '四死思似寺丝司',
    wu: '五午无舞物务雾误',
    liu: '六流留刘柳',
    qi: '七期起气汽齐其奇骑企',
    ba: '八吧把爸罢拔',
    bai: '百白摆败拜',
    wanr: '玩',
    nian: '年念粘',
    tian: '天田甜添填',
    ri: '日',
    xing: '行醒姓性兴星',
    gong: '工公功共供',
    zu: '租足组祖族',
    che: '车扯彻',
    zhan: '站占战展张',
    lu: '路录绿露陆鹿',
    fang: '放房方防访仿',
    dianhua: '电话',
    shijian: '时间',
    peng: '朋碰捧棚',
    lao: '老劳牢',
    shu: '书数树输熟鼠叔属',
    ben: '本笨奔',
    ku: '哭苦库裤',
    le: '了乐',
    guo2: '过',
    chang: '常长场唱厂肠尝',
    dian2: '点'
  };

  const CHAR_BASE_PY = (function(){
    const map = new Map();
    const add = (ch, py) => {
      if(!ch || !py) return;
      if(!map.has(ch)) map.set(ch, new Set());
      map.get(ch).add(py);
    };
    Object.keys(HOMOPHONE_GROUPS).forEach(k => {
      const base = k.replace(/\d+$/, '');
      for(const ch of HOMOPHONE_GROUPS[k]) add(ch, base);
    });
    return map;
  })();

  function stripTonePinyin(py){
    if(!py) return '';
    return String(py)
      .toLowerCase()
      .trim()
      .replace(/[āáǎà]/g, 'a')
      .replace(/[ēéěè]/g, 'e')
      .replace(/[īíǐì]/g, 'i')
      .replace(/[ōóǒò]/g, 'o')
      .replace(/[ūúǔù]/g, 'u')
      .replace(/[ǖǘǚǜü]/g, 'v')
      .replace(/[1-5]/g, '')
      .replace(/[^a-zv]/g, '');
  }

  let indexedVocabLoaded = false;
  function ensureIndexedHomophones(){
    if(indexedVocabLoaded) return;
    const idxObj = (typeof window !== 'undefined' && window.HANYU_VOCAB_INDEX) || null;
    if(!idxObj || !Array.isArray(idxObj.items)) return;
    indexedVocabLoaded = true;
    for(let i = 0; i < idxObj.items.length; i++){
      const row = idxObj.items[i];
      if(!row || typeof row[0] !== 'string' || typeof row[1] !== 'string') continue;
      const chars = [...cleanChineseChars(row[0])];
      if(chars.length !== 1) continue;
      const ch = chars[0];
      const base = stripTonePinyin(row[1]);
      if(base){
        if(!CHAR_BASE_PY.has(ch)) CHAR_BASE_PY.set(ch, new Set());
        CHAR_BASE_PY.get(ch).add(base);
      }
    }
  }

  function getCharBasePinyins(ch){
    ensureIndexedHomophones();
    return CHAR_BASE_PY.get(ch) || null;
  }

  function isHomophoneChar(gotCh, expectedCh, expectedPy){
    if(!gotCh || !expectedCh) return false;
    if(gotCh === expectedCh) return true;
    const gotSet = getCharBasePinyins(gotCh);
    if(!gotSet) return false;
    const expBase = stripTonePinyin(expectedPy);
    if(expBase && gotSet.has(expBase)) return true;
    const expSet = getCharBasePinyins(expectedCh);
    if(expSet){
      for(const p of gotSet){
        if(expSet.has(p)) return true;
      }
    }
    return false;
  }

  function pickBestTranscript(candidates, refChars, sylList){
    const cleanCands = [];
    const seen = new Set();
    (Array.isArray(candidates) ? candidates : []).forEach(c => {
      const raw = String(c || '').trim();
      if(raw && !seen.has(raw)){
        seen.add(raw);
        cleanCands.push(raw);
      }
    });
    if(!cleanCands.length) return '';
    if(cleanCands.length === 1 || !refChars) return cleanCands[0];

    let bestRaw = cleanCands[0];
    let bestVal = -Infinity;
    for(let i = 0; i < cleanCands.length; i++){
      const cleanC = cleanChineseChars(cleanCands[i]);
      const d = simpleDiffChars(cleanC, refChars);
      let val = 0;
      let rIdx = 0;
      (d.ops || []).forEach(op => {
        if(op.t === 'extra'){ val -= 0.3; return; }
        const s = sylList[rIdx];
        if(op.t === 'ok') val += 2.0;
        else if(op.t === 'sub' && isHomophoneChar(op.got, (s && s.ch) || op.ch, s && s.py)) val += 1.5;
        rIdx++;
      });
      if(val > bestVal){
        bestVal = val;
        bestRaw = cleanCands[i];
      }
    }
    return bestRaw;
  }

  async function assessLocal(blob, item, recognizedInput){
    const refZh = String((item && item.zh) || '').trim();
    const refPy = String((item && item.py) || '').trim();
    const pitchData = await extractPitchContour(blob);
    const rawSyls = (typeof analyzeExpectedTones === 'function')
      ? analyzeExpectedTones(refZh, refPy)
      : [...cleanChineseChars(refZh)].map(ch => ({ ch, py: '', tone: 5 }));
    const expectedSyls = applySandhiAndContext(rawSyls);

    const candList = [];
    if(recognizedInput && typeof recognizedInput === 'object'){
      if(Array.isArray(recognizedInput.alternatives)){
        recognizedInput.alternatives.forEach(a => { if(a) candList.push(String(a)); });
      }
      if(recognizedInput.text) candList.unshift(String(recognizedInput.text));
    }else if(recognizedInput){
      candList.push(String(recognizedInput));
    }

    const cleanRef = cleanChineseChars(refZh);
    const sylList = expectedSyls.length ? expectedSyls : [...cleanRef].map(ch => ({ ch, py: '', tone: 5 }));
    const bestRecogRaw = pickBestTranscript(candList, cleanRef, sylList);
    const cleanRecog = cleanChineseChars(bestRecogRaw);

    const n = sylList.length;
    const pts = pitchData.points || [];
    const bounds = pitchData.hasVoice ? segmentSyllablesByEnergy(pts, pitchData.energyEnv, n) : null;
    const pitchSvg = buildToneContourSvg(pitchData, expectedSyls, bounds);

    const recogMap = new Map();
    if(cleanRecog && cleanRef){
      const d = simpleDiffChars(cleanRecog, cleanRef);
      let refIdx = 0;
      (d.ops || []).forEach(op => {
        if(op.t === 'extra') return;
        recogMap.set(refIdx, op);
        refIdx++;
      });
    }

    let overallScore = null;
    let accuracyScore = null;
    let toneScore = null;
    let completenessScore = null;
    let wordResults = [];
    let feedback = '';

    if(!pitchData.hasVoice){
      feedback = 'Chưa phát hiện rõ giọng nói trong bản ghi. Hãy nhấn micro và đọc to, rõ hơn.';
      return {
        provider: 'local-browser',
        assessedAt: Date.now(),
        referenceText: refZh,
        referencePinyin: refPy,
        recognizedText: bestRecogRaw,
        overallScore: null,
        accuracyScore: null,
        toneScore: null,
        fluencyScore: null,
        completenessScore: null,
        prosodyScore: null,
        wordResults: [],
        pitchData,
        pitchSvg,
        feedback,
        status: 'assessed'
      };
    }

    let omitCnt = 0;

    wordResults = sylList.map((s, i) => {
      const b = bounds ? bounds[i] : { t0: i / n, t1: (i + 1) / n };
      const segPts = pts.filter(p => p.t >= b.t0 && (i === n - 1 ? p.t <= b.t1 : p.t < b.t1));
      const toneEval = scoreToneSegment(segPts, s.tone || 5, { halfThird: Boolean(s.halfThird) });
      let finalScore = toneEval.score;
      let errType = toneEval.errorType;
      let note = toneEval.note;

      const op = recogMap.get(i);
      if(op){
        if(op.t === 'ok'){
          finalScore = Math.min(98, Math.round(toneEval.score * 0.6 + 96 * 0.4));
          if(finalScore >= 60) errType = 'None';
        }else if(op.t === 'sub'){
          if(isHomophoneChar(op.got, s.ch, s.py)){
            finalScore = Math.min(96, Math.round(toneEval.score * 0.72 + 92 * 0.28));
            errType = toneEval.score < 60 ? 'Mispronunciation' : 'None';
            note = toneEval.note || '';
          }else{
            finalScore = Math.min(55, Math.round(toneEval.score * 0.4 + 35 * 0.6));
            errType = 'Mispronunciation';
            note = `Máy nghe thành 「${op.got}」` + (toneEval.note ? ` · ${toneEval.note}` : '');
          }
        }else if(op.t === 'miss'){
          finalScore = Math.min(45, Math.round(toneEval.score * 0.5));
          errType = 'Omission';
          note = toneEval.note || 'Chưa nhận diện được rõ chữ này';
        }
      }
      if(errType === 'Omission') omitCnt++;

      return {
        word: s.ch || '',
        accuracyScore: finalScore,
        errorType: errType,
        syllables: s.py ? [{ syllable: s.py }] : [],
        note
      };
    });

    const sumSc = wordResults.reduce((acc, w) => acc + (w.accuracyScore || 0), 0);
    toneScore = n ? Math.round(sumSc / n) : 0;
    accuracyScore = toneScore;
    completenessScore = n ? Math.round(((n - omitCnt) / n) * 100) : 100;
    overallScore = Math.round(accuracyScore * 0.8 + completenessScore * 0.2);

    const issues = wordResults.filter(w => w.errorType !== 'None' || (w.accuracyScore !== null && w.accuracyScore < 75));
    if(!issues.length){
      feedback = 'Phát âm và hướng thanh điệu các chữ đều đạt tốt! Bạn có thể nghe đối chiếu thêm với giọng mẫu hoặc chuyển sang câu tiếp theo.';
    }else{
      const tips = issues.slice(0, 4).map(w => `• ${w.word}: ${w.note || 'cần đọc rõ thanh điệu hơn'}`);
      feedback = `Cần chỉnh ${issues.length} chữ: ${tips.join(' ')} (Chạm vào từng thẻ chữ ở trên để nghe lại âm chuẩn.)`;
    }

    return {
      provider: 'local-browser',
      assessedAt: Date.now(),
      referenceText: refZh,
      referencePinyin: refPy,
      recognizedText: bestRecogRaw,
      overallScore,
      accuracyScore,
      toneScore,
      fluencyScore: null,
      completenessScore,
      prosodyScore: null,
      wordResults,
      pitchData,
      pitchSvg,
      feedback,
      status: 'assessed'
    };
  }

  function createLiveRecognizer(onResult, onEnd){
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if(!SR) return null;
    try{
      const rec = new SR();
      rec.lang = 'zh-CN';
      rec.interimResults = true;
      rec.continuous = true;
      rec.maxAlternatives = 3;
      let stopped = false;

      rec.onresult = e => {
        try{
          const altCount = 3;
          const bufs = ['', '', ''];
          for(let i = 0; i < e.results.length; i++){
            const r = e.results[i];
            if(!r) continue;
            const baseAlt = (r[0] && r[0].transcript) ? String(r[0].transcript) : '';
            for(let a = 0; a < altCount; a++){
              const cand = (r[a] && r[a].transcript) ? String(r[a].transcript) : baseAlt;
              bufs[a] += cand;
            }
          }
          const alts = [];
          const seen = new Set();
          for(let a = 0; a < bufs.length; a++){
            const t = bufs[a].trim();
            if(t && !seen.has(t)){
              seen.add(t);
              alts.push(t);
            }
          }
          if(typeof onResult === 'function') onResult(alts[0] || '', alts);
        }catch(_){}
      };
      rec.onerror = () => {};
      rec.onend = () => {
        if(!stopped && typeof onEnd === 'function') onEnd();
      };
      rec.start();
      return {
        stop(){
          if(stopped) return;
          stopped = true;
          try{ rec.stop(); }catch(_){}
        }
      };
    }catch(_){
      return null;
    }
  }

  window.LocalSpeechAnalyzer = {
    isIOS,
    isSpeechRecSupported,
    extractPitchContour,
    segmentSyllablesByEnergy,
    applySandhiAndContext,
    buildToneContourSvg,
    assessLocal,
    createLiveRecognizer
  };
})();
