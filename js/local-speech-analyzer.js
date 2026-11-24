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

  async function extractPitchContour(blob){
    if(!blob) return { hasVoice: false, voicedCount: 0, durationSec: 0, minHz: 0, maxHz: 0, points: [] };
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return { hasVoice: false, voicedCount: 0, durationSec: 0, minHz: 0, maxHz: 0, points: [] };

    const arrBuf = await blob.arrayBuffer();
    const ctx = new AC();
    let decoded;
    try{
      decoded = await ctx.decodeAudioData(arrBuf.slice(0));
    }finally{
      try{ ctx.close(); }catch(_){}
    }

    const sampleRate = decoded.sampleRate || 16000;
    const mono = mixDownToMono(decoded);
    const winSize = Math.max(256, Math.round(sampleRate * 0.030));
    const hopSize = Math.max(128, Math.round(sampleRate * 0.010));
    if(mono.length < winSize){
      return { hasVoice: false, voicedCount: 0, durationSec: decoded.duration || 0, minHz: 0, maxHz: 0, points: [] };
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
      frames.push({ off, rms });
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
        rawPts.push({ rawT: f.off / sampleRate, hz });
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
        points: []
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
      points
    };
  }

  function buildToneContourSvg(pitchData, expectedSyls){
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

    const syls = Array.isArray(expectedSyls) ? expectedSyls : [];
    const toneRefLevels = {
      1: [4.8, 4.8],
      2: [2.8, 4.9],
      3: [2.4, 1.15, 3.5],
      4: [4.9, 1.2],
      5: [2.8, 2.8]
    };

    let refSvg = '';
    if(syls.length > 0 && syls.length <= 8){
      const segW = pw / syls.length;
      for(let i = 0; i < syls.length; i++){
        const s = syls[i];
        const x0 = padL + i * segW;
        if(i > 0){
          refSvg += `<line x1="${x0.toFixed(1)}" y1="${padT}" x2="${x0.toFixed(1)}" y2="${padT + ph}" stroke="currentColor" opacity="0.15" stroke-width="1"/>`;
        }
        const shape = toneRefLevels[s.tone] || toneRefLevels[5];
        const padIn = Math.max(5, segW * 0.14);
        const usableW = Math.max(8, segW - padIn * 2);
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

  function scoreToneSegment(segPts, tone){
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

    let score = 85;
    let note = '';

    if(tone === 1){
      if(slope < -0.85){
        score = Math.max(40, Math.round(78 - Math.abs(slope) * 18));
        note = 'Thanh 1 bị tụt giọng xuống, cần giữ ngang và cao đều';
      }else if(slope > 0.85){
        score = Math.max(45, Math.round(78 - slope * 16));
        note = 'Thanh 1 bị vút lên như Thanh 2, cần giữ thẳng ngang';
      }else if(allAvg < 2.35){
        score = 68;
        note = 'Thanh 1 hơi thấp, hãy giữ cao độ ở quãng trên';
      }else{
        score = Math.min(96, Math.round(94 - range * 6));
      }
    }else if(tone === 2){
      if(slope >= 0.85){
        score = Math.min(96, Math.round(82 + Math.min(1.4, slope) * 10));
      }else if(slope >= 0.25){
        score = Math.round(66 + slope * 20);
        note = 'Thanh 2 đi lên hơi nhẹ, hãy vuốt cao dứt khoát hơn ở cuối âm';
      }else{
        score = Math.max(35, Math.round(54 + slope * 15));
        note = 'Thanh 2 cần đi lên, giọng bạn đang đi ngang hoặc hạ xuống';
      }
    }else if(tone === 3){
      if(minLvl <= 2.35 || (startLvl - minLvl) >= 0.45){
        score = Math.min(95, Math.round(84 + Math.max(0, 2.5 - minLvl) * 8));
      }else if(slope > 0.35 && minLvl > 2.7){
        score = 48;
        note = 'Thanh 3 chưa hạ xuống vùng trầm, nghe gần giống Thanh 1/2';
      }else{
        score = 68;
        note = 'Thanh 3 cần hạ giọng xuống thấp hơn nữa';
      }
    }else if(tone === 4){
      if(slope <= -0.95){
        score = Math.min(96, Math.round(82 + Math.min(1.5, Math.abs(slope)) * 9));
      }else if(slope <= -0.35){
        score = Math.round(66 + Math.abs(slope) * 18);
        note = 'Thanh 4 rơi hơi nhẹ, hãy thả giọng xuống nhanh và gọn hơn';
      }else{
        score = Math.max(35, Math.round(54 - slope * 14));
        note = 'Thanh 4 cần rơi mạnh xuống thấp, giọng bạn đang đi ngang hoặc lên';
      }
    }else{
      if(endLvl > 3.6 && slope > 0.65){
        score = 48;
        note = 'Thanh nhẹ bị đọc quá cao/vút lên, hãy đọc ngắn và nhẹ';
      }else if(range > 1.8){
        score = 68;
        note = 'Thanh nhẹ cần đọc gọn và đều hơn';
      }else{
        score = 88;
      }
    }

    const errorType = score < 60 ? 'Mispronunciation' : 'None';
    return { score: Math.max(0, Math.min(100, score)), errorType, note };
  }

  async function assessLocal(blob, item, recognizedText){
    const refZh = String((item && item.zh) || '').trim();
    const refPy = String((item && item.py) || '').trim();
    const pitchData = await extractPitchContour(blob);
    const expectedSyls = (typeof analyzeExpectedTones === 'function')
      ? analyzeExpectedTones(refZh, refPy)
      : [...cleanChineseChars(refZh)].map(ch => ({ ch, py: '', tone: 5 }));
    const pitchSvg = buildToneContourSvg(pitchData, expectedSyls);

    const cleanRecog = cleanChineseChars(recognizedText);
    const cleanRef = cleanChineseChars(refZh);
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
        recognizedText: String(recognizedText || '').trim(),
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

    const sylList = expectedSyls.length ? expectedSyls : [...cleanRef].map(ch => ({ ch, py: '', tone: 5 }));
    const n = sylList.length;
    const pts = pitchData.points || [];
    let omitCnt = 0;

    wordResults = sylList.map((s, i) => {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const segPts = pts.filter(p => p.t >= t0 && (i === n - 1 ? p.t <= t1 : p.t < t1));
      const toneEval = scoreToneSegment(segPts, s.tone || 5);
      let finalScore = toneEval.score;
      let errType = toneEval.errorType;
      let note = toneEval.note;

      const op = recogMap.get(i);
      if(op){
        if(op.t === 'ok'){
          finalScore = Math.min(98, Math.round(toneEval.score * 0.6 + 96 * 0.4));
          if(finalScore >= 60) errType = 'None';
        }else if(op.t === 'sub'){
          finalScore = Math.min(55, Math.round(toneEval.score * 0.4 + 35 * 0.6));
          errType = 'Mispronunciation';
          note = `Máy nghe thành 「${op.got}」` + (toneEval.note ? ` · ${toneEval.note}` : '');
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
      recognizedText: String(recognizedText || '').trim(),
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
      rec.maxAlternatives = 1;
      let stopped = false;

      rec.onresult = e => {
        try{
          let txt = '';
          for(let i = 0; i < e.results.length; i++){
            const r = e.results[i];
            if(r && r[0] && r[0].transcript) txt += r[0].transcript;
          }
          if(typeof onResult === 'function') onResult(txt.trim());
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
    buildToneContourSvg,
    assessLocal,
    createLiveRecognizer
  };
})();
