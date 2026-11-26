/* ==========================================================================
   Tích hợp Chấm phát âm AI (Google Gemini Free / Microsoft Azure Speech)
   + Bộ lọc & chọn giọng đọc tiếng Trung (zh-CN) trên thiết bị
   - Gemini lưu riêng tại localStorage['hanyu_gemini_speech']
   - Azure & giọng máy lưu riêng tại localStorage['hanyu_azure_speech']
   (Cả hai đều tách khỏi hanyu_ai_data để không lộ API Key khi xuất backup JSON)
   ========================================================================== */
(function(){
  const STORAGE_KEY = 'hanyu_azure_speech';
  const GEMINI_STORAGE_KEY = 'hanyu_gemini_speech';
  const SDK_CDN = 'https://cdn.jsdelivr.net/npm/microsoft-cognitiveservices-speech-sdk@1.42.0/distrib/browser/microsoft.cognitiveservices.speech.sdk.bundle-min.js';
  const MAX_URL_CACHE = 80;

  const VOICES = [
    { id: 'zh-CN-XiaoxiaoNeural', label: 'Xiaoxiao · Nữ (Tự nhiên, phổ biến nhất)' },
    { id: 'zh-CN-YunxiNeural', label: 'Yunxi · Nam (Ấm áp, rõ ràng)' },
    { id: 'zh-CN-XiaoyiNeural', label: 'Xiaoyi · Nữ (Nhẹ nhàng, trẻ trung)' },
    { id: 'zh-CN-YunjianNeural', label: 'Yunjian · Nam (Dứt khoát, chuẩn phát thanh)' },
    { id: 'zh-CN-YunyangNeural', label: 'Yunyang · Nam (Bản tin chuyên nghiệp)' }
  ];

  const REGIONS = [
    { id: 'southeastasia', label: 'Singapore (southeastasia · Khuyên dùng cho VN)' },
    { id: 'eastasia', label: 'Hong Kong (eastasia)' },
    { id: 'japaneast', label: 'Nhật Bản Đông (japaneast)' },
    { id: 'koreacentral', label: 'Hàn Quốc (koreacentral)' },
    { id: 'eastus', label: 'Mỹ Đông (eastus)' },
    { id: 'westus', label: 'Mỹ Tây (westus)' }
  ];

  const GEMINI_MODELS = [
    { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (Khuyên dùng · Nghe chuẩn, miễn phí)' },
    { id: 'gemini-3.8-flash-lite', label: 'Gemini 3.8 Flash-Lite (Nhanh, hạn mức free cao)' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Chỉ tài khoản cũ)' }
  ];

  const DEFAULT_CFG = {
    key: '',
    region: 'southeastasia',
    voice: 'zh-CN-XiaoxiaoNeural',
    useTts: true,
    useAssess: true,
    localVoiceName: ''
  };

  const GEMINI_DEFAULT_CFG = {
    key: '',
    model: 'gemini-3.8-flash',
    enabled: true
  };

  let playSeq = 0;
  let activeAudio = null;
  let reuseAudioEl = null;
  let sdkPromise = null;
  let localZhWarned = false;
  let azureErrNotified = false;
  const ttsCache = new Map();

  function esc(s){
    if(typeof escHtml === 'function') return escHtml(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function escXml(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[m]));
  }

  function notify(msg){
    if(typeof toast === 'function') toast(msg);
  }

  function getConfig(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return Object.assign({}, DEFAULT_CFG);
      const parsed = JSON.parse(raw);
      return Object.assign({}, DEFAULT_CFG, {
        key: typeof parsed.key === 'string' ? parsed.key.trim() : '',
        region: typeof parsed.region === 'string' && parsed.region.trim() ? parsed.region.trim().toLowerCase() : DEFAULT_CFG.region,
        voice: typeof parsed.voice === 'string' && parsed.voice.trim() ? parsed.voice.trim() : DEFAULT_CFG.voice,
        useTts: parsed.useTts !== false,
        useAssess: parsed.useAssess !== false,
        localVoiceName: typeof parsed.localVoiceName === 'string' ? parsed.localVoiceName.trim() : ''
      });
    }catch(_){
      return Object.assign({}, DEFAULT_CFG);
    }
  }

  function saveConfig(patch){
    const next = Object.assign({}, getConfig(), patch || {});
    next.key = String(next.key || '').trim();
    next.region = String(next.region || DEFAULT_CFG.region).trim().toLowerCase() || DEFAULT_CFG.region;
    next.voice = String(next.voice || DEFAULT_CFG.voice).trim() || DEFAULT_CFG.voice;
    next.useTts = next.useTts !== false;
    next.useAssess = next.useAssess !== false;
    next.localVoiceName = String(next.localVoiceName || '').trim();
    azureErrNotified = false;
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }catch(_){}
    return next;
  }

  function clearConfig(){
    const cur = getConfig();
    const cleared = Object.assign({}, cur, { key: '' });
    azureErrNotified = false;
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleared));
    }catch(_){}
    return cleared;
  }

  function isConfigured(){
    return false;
  }

  function isTtsEnabled(){
    return false;
  }

  function isAssessEnabled(){
    return false;
  }

  function scoreZhVoice(v){
    const lang = String(v.lang || '').toLowerCase().replace('_', '-');
    const name = String(v.name || '');
    if(!lang.startsWith('zh') && !lang.startsWith('cmn')) return -9999;

    let score = 0;
    if(lang === 'zh-cn' || lang === 'cmn-hans-cn') score += 100;
    else if(lang.startsWith('zh-tw') || lang.startsWith('cmn-hant')) score += 20;
    else if(lang.startsWith('zh-hk') || lang.includes('yue')) score -= 40;
    else score += 15;

    if(/natural|neural|online/i.test(name)) score += 80;
    if(/enhanced|premium|siri/i.test(name)) score += 60;
    if(/tingting|ting-ting|xiaoxiao|yunxi|xiaoyi|yunjian|lili|kangkang|yaoyao|ordinary|putonghua|普通话/i.test(name)) score += 50;
    if(/google/i.test(name) && /zh-cn|普通话|china|mandarin/i.test(name + ' ' + lang)) score += 45;
    if(/microsoft/i.test(name)) score += 25;
    if(v.localService) score += 5;
    return score;
  }

  function getLocalZhVoices(){
    if(typeof speechSynthesis === 'undefined') return [];
    const voices = speechSynthesis.getVoices() || [];
    const ranked = [];
    for(let i = 0; i < voices.length; i++){
      const sc = scoreZhVoice(voices[i]);
      if(sc > -9000) ranked.push({ voice: voices[i], score: sc });
    }
    ranked.sort((a, b) => b.score - a.score);
    return ranked.map(x => x.voice);
  }

  function pickBestZhVoice(){
    const list = getLocalZhVoices();
    if(!list.length) return null;
    const cfg = getConfig();
    if(cfg.localVoiceName){
      const chosen = list.find(v => v.name === cfg.localVoiceName);
      if(chosen) return chosen;
    }
    return list[0];
  }

  function stopAudio(keepSeq){
    if(!keepSeq) playSeq++;
    try{
      if(activeAudio){
        activeAudio.onended = null;
        activeAudio.onerror = null;
        activeAudio.pause();
        activeAudio = null;
      }
    }catch(_){}
    try{
      if(typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    }catch(_){}
  }

  function speakLocal(text, rate, onEnd, skipCancel){
    let ended = false;
    const done = () => {
      if(ended) return;
      ended = true;
      if(typeof onEnd === 'function') onEnd();
    };
    if(!text){ done(); return; }
    if(typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined'){
      notify('Thiết bị chưa hỗ trợ đọc mẫu');
      done();
      return;
    }
    try{
      if(!skipCancel){
        try{ if(activeAudio){ activeAudio.pause(); activeAudio = null; } }catch(_){}
        speechSynthesis.cancel();
      }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.volume = 1.0;
      u.rate = Math.min(2, Math.max(0.4, Number(rate) || 0.65));
      const voices = speechSynthesis.getVoices() || [];
      const best = pickBestZhVoice();
      if(best) u.voice = best;
      else if(voices.length > 0 && !localZhWarned){
        localZhWarned = true;
        notify('Thiết bị chưa có giọng đọc tiếng Trung chuẩn (zh-CN)');
      }
      u.onend = done;
      u.onerror = () => {
        if(!localZhWarned){
          localZhWarned = true;
          notify('Không thể phát âm thanh tiếng Trung trên thiết bị này');
        }
        done();
      };
      speechSynthesis.speak(u);
    }catch(_){
      notify('Thiết bị chưa hỗ trợ đọc mẫu');
      done();
    }
  }

  function calcProsodyRate(rate){
    const r = Number(rate);
    const num = Number.isFinite(r) && r > 0 ? r : 0.65;
    const pct = Math.max(-60, Math.min(100, Math.round((num - 1) * 100)));
    return (pct >= 0 ? '+' : '') + pct + '%';
  }

  function cacheSet(cacheKey, url){
    if(ttsCache.has(cacheKey)){
      ttsCache.delete(cacheKey);
    }else if(ttsCache.size >= MAX_URL_CACHE){
      const oldestKey = ttsCache.keys().next().value;
      const oldestUrl = ttsCache.get(oldestKey);
      ttsCache.delete(oldestKey);
      try{ if(oldestUrl) URL.revokeObjectURL(oldestUrl); }catch(_){}
    }
    ttsCache.set(cacheKey, url);
  }

  async function synthesizeToUrl(text, rate, overrideCfg){
    const cfg = overrideCfg || getConfig();
    if(!isConfigured(cfg)) throw new Error('AZURE_NOT_CONFIGURED');
    const prosodyRate = calcProsodyRate(rate);
    const voice = cfg.voice || DEFAULT_CFG.voice;
    const region = cfg.region || DEFAULT_CFG.region;
    const cacheKey = `v35|${region}|${voice}|${prosodyRate}|${text}`;
    if(ttsCache.has(cacheKey)) return ttsCache.get(cacheKey);

    const ssml = `<speak version="1.0" xml:lang="zh-CN"><voice xml:lang="zh-CN" name="${escXml(voice)}"><prosody rate="${prosodyRate}" volume="+35%">${escXml(text)}</prosody></voice></speak>`;
    const endpoint = `https://${encodeURIComponent(region)}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': cfg.key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3'
      },
      body: ssml
    });
    if(!res.ok){
      const err = new Error('AZURE_TTS_' + res.status);
      err.status = res.status;
      throw err;
    }
    const blob = await res.blob();
    if(!blob || !blob.size) throw new Error('AZURE_TTS_EMPTY');
    const url = URL.createObjectURL(blob);
    cacheSet(cacheKey, url);
    return url;
  }

  function getAudioEl(){
    if(!reuseAudioEl) reuseAudioEl = new Audio();
    return reuseAudioEl;
  }

  async function speak(text, rate, onEnd){
    const done = typeof onEnd === 'function' ? onEnd : () => {};
    if(!text){ done(); return; }

    playSeq++;
    stopAudio(true);
    speakLocal(text, rate, done, true);
  }

  function encodeWav16kMono(float32Samples, sampleRate){
    const srcRate = Number(sampleRate) > 0 ? Number(sampleRate) : 16000;
    const src = float32Samples || new Float32Array(0);
    let samples = src;
    if(srcRate !== 16000 && src.length > 0){
      const targetLen = Math.max(1, Math.round(src.length * 16000 / srcRate));
      const resampled = new Float32Array(targetLen);
      const ratio = src.length / targetLen;
      for(let i = 0; i < targetLen; i++){
        const pos = i * ratio;
        const i0 = Math.floor(pos);
        const i1 = Math.min(src.length - 1, i0 + 1);
        const frac = pos - i0;
        resampled[i] = src[i0] * (1 - frac) + src[i1] * frac;
      }
      samples = resampled;
    }

    const dataBytes = samples.length * 2;
    const buf = new ArrayBuffer(44 + dataBytes);
    const view = new DataView(buf);
    const writeStr = (off, str) => {
      for(let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
    };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataBytes, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true);
    view.setUint32(28, 32000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataBytes, true);

    let offset = 44;
    for(let i = 0; i < samples.length; i++){
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7FFF), true);
      offset += 2;
    }
    return new Uint8Array(buf);
  }

  function mixDownToMono(audioBuffer){
    const chCount = audioBuffer.numberOfChannels || 1;
    const len = audioBuffer.length;
    if(chCount === 1) return audioBuffer.getChannelData(0);
    const out = new Float32Array(len);
    for(let c = 0; c < chCount; c++){
      const chData = audioBuffer.getChannelData(c);
      for(let i = 0; i < len; i++) out[i] += chData[i];
    }
    for(let i = 0; i < len; i++) out[i] /= chCount;
    return out;
  }

  function uint8ToBase64(bytes){
    let bin = '';
    const step = 0x8000;
    for(let i = 0; i < bytes.length; i += step){
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
    }
    return btoa(bin);
  }

  function trimSilenceSamples(samples, sampleRate){
    if(!samples || samples.length < sampleRate * 0.4) return samples;
    let peak = 0;
    for(let i = 0; i < samples.length; i++){
      const a = Math.abs(samples[i]);
      if(a > peak) peak = a;
    }
    if(peak < 0.005) return samples;
    const thresh = Math.max(0.01, peak * 0.08);
    const pad = Math.round(sampleRate * 0.15);
    let first = 0;
    while(first < samples.length && Math.abs(samples[first]) < thresh) first++;
    let last = samples.length - 1;
    while(last > first && Math.abs(samples[last]) < thresh) last--;
    if(last <= first) return samples;
    const start = Math.max(0, first - pad);
    const end = Math.min(samples.length, last + pad + 1);
    if(end - start < sampleRate * 0.3) return samples;
    return samples.subarray(start, end);
  }

  async function blobToWav16kBytes(blob, trimSilence){
    if(!blob) throw new Error('EMPTY_AUDIO_BLOB');
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) throw new Error('NO_AUDIO_CONTEXT');
    const arrBuf = await blob.arrayBuffer();
    const ctx = new AC();
    let decoded;
    try{
      decoded = await ctx.decodeAudioData(arrBuf.slice(0));
    }finally{
      try{ ctx.close(); }catch(_){}
    }

    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if(OAC && decoded.duration > 0){
      const targetLen = Math.max(1, Math.ceil(decoded.duration * 16000));
      const offline = new OAC(1, targetLen, 16000);
      const src = offline.createBufferSource();
      src.buffer = decoded;
      src.connect(offline.destination);
      src.start(0);
      const rendered = await offline.startRendering();
      const ch0 = rendered.getChannelData(0);
      return encodeWav16kMono(trimSilence ? trimSilenceSamples(ch0, 16000) : ch0, 16000);
    }
    const mono = mixDownToMono(decoded);
    return encodeWav16kMono(trimSilence ? trimSilenceSamples(mono, decoded.sampleRate) : mono, decoded.sampleRate);
  }

  async function blobToPcm16k(blob){
    const wavBytes = await blobToWav16kBytes(blob);
    return wavBytes.subarray(44);
  }

  function loadSdk(){
    if(typeof window.SpeechSDK !== 'undefined') return Promise.resolve(window.SpeechSDK);
    if(sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SDK_CDN;
      s.async = true;
      let done = false;
      const timer = setTimeout(() => {
        if(done) return;
        done = true;
        sdkPromise = null;
        reject(new Error('SDK_TIMEOUT'));
      }, 15000);
      s.onload = () => {
        if(done) return;
        done = true;
        clearTimeout(timer);
        if(typeof window.SpeechSDK !== 'undefined') resolve(window.SpeechSDK);
        else { sdkPromise = null; reject(new Error('SDK_INVALID')); }
      };
      s.onerror = () => {
        if(done) return;
        done = true;
        clearTimeout(timer);
        sdkPromise = null;
        reject(new Error('SDK_LOAD_ERROR'));
      };
      document.head.appendChild(s);
    });
    return sdkPromise;
  }

  function buildVietnameseFeedback(summary){
    const parts = [];
    const words = summary.wordResults || [];
    const omitted = words.filter(w => w.errorType === 'Omission').map(w => w.word);
    const inserted = words.filter(w => w.errorType === 'Insertion').map(w => w.word);
    const weak = words.filter(w => w.errorType !== 'Omission' && w.errorType !== 'Insertion' && (w.errorType === 'Mispronunciation' || (w.accuracyScore !== null && w.accuracyScore < 75)));

    if(omitted.length){
      parts.push(`Đọc thiếu chữ: ${omitted.join(', ')}.`);
    }
    if(inserted.length){
      parts.push(`Đọc thừa chữ: ${inserted.join(', ')}.`);
    }
    if(weak.length){
      const details = weak.slice(0, 5).map(w => {
        const weakSyl = (w.syllables || []).find(sy => sy.accuracyScore !== null && sy.accuracyScore < 75);
        const hint = weakSyl && weakSyl.syllable ? ` (âm "${weakSyl.syllable}" ${weakSyl.accuracyScore}đ)` : '';
        return `${w.word} (${w.accuracyScore !== null ? w.accuracyScore + 'đ' : 'chưa chuẩn'}${hint})`;
      });
      parts.push(`Cần chỉnh lại phát âm / thanh điệu ở: ${details.join(', ')}. Bấm trực tiếp vào từng thẻ chữ bên trên để nghe mẫu.`);
    }
    if(!omitted.length && !inserted.length && !weak.length){
      if(summary.overallScore !== null && summary.overallScore >= 85){
        parts.push('Phát âm rõ ràng và thanh điệu rất tốt! Bạn có thể luyện nói nhanh tự nhiên hơn hoặc chuyển sang mục tiếp theo.');
      }else{
        parts.push('Các chữ đều khá chính xác; hãy chú ý giữ nhịp nói đều và độ trôi chảy giữa các từ.');
      }
    }
    if(summary.fluencyScore !== null && summary.fluencyScore < 70){
      parts.push('Nhịp nói còn ngắt quãng — thử nghe mẫu rồi đọc liền cụm không dừng giữa từ.');
    }
    return parts.join(' ');
  }

  function extractWeakPhoneme(phonemes, syllable){
    if(!Array.isArray(phonemes) || !phonemes.length) return '';
    let bestP = '';
    let low = 999;
    const grapheme = syllable && (syllable.Grapheme || syllable.Syllable) ? String(syllable.Grapheme || syllable.Syllable) : '';
    for(const p of phonemes){
      const sc = p && p.PronunciationAssessment && Number.isFinite(Number(p.PronunciationAssessment.AccuracyScore))
        ? Number(p.PronunciationAssessment.AccuracyScore) : null;
      if(sc !== null && sc < 75 && sc < low){
        low = sc;
        bestP = p.Phoneme || '';
      }
    }
    if(bestP && grapheme && grapheme.includes(bestP)) return bestP;
    return bestP;
  }

  async function assessPronunciation(blob, referenceText){
    const cfg = getConfig();
    if(!isAssessEnabled()){
      const e = new Error('AZURE_NOT_CONFIGURED');
      e.code = 'AZURE_NOT_CONFIGURED';
      throw e;
    }

    const [SDK, pcmBytes] = await Promise.all([loadSdk(), blobToPcm16k(blob)]);
    const speechConfig = SDK.SpeechConfig.fromSubscription(cfg.key, cfg.region);
    speechConfig.speechRecognitionLanguage = 'zh-CN';

    const format = SDK.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
    const pushStream = SDK.AudioInputStream.createPushStream(format);
    pushStream.write(pcmBytes.buffer.slice(pcmBytes.byteOffset, pcmBytes.byteOffset + pcmBytes.byteLength));
    pushStream.close();

    const audioConfig = SDK.AudioConfig.fromStreamInput(pushStream);
    const paConfig = new SDK.PronunciationAssessmentConfig(
      String(referenceText || '').trim(),
      SDK.PronunciationAssessmentGradingSystem.HundredMark,
      SDK.PronunciationAssessmentGranularity.Phoneme,
      true
    );
    if(typeof paConfig.enableProsodyAssessment === 'function'){
      try{ paConfig.enableProsodyAssessment(); }catch(_){}
    }

    const recognizer = new SDK.SpeechRecognizer(speechConfig, audioConfig);
    paConfig.applyTo(recognizer);

    const sdkResult = await new Promise((resolve, reject) => {
      try{
        recognizer.recognizeOnceAsync(
          res => resolve(res),
          err => reject(new Error(typeof err === 'string' ? err : (err && err.message) || 'SDK_RECOGNIZE_ERROR'))
        );
      }catch(ex){
        reject(ex);
      }
    }).finally(() => {
      try{ recognizer.close(); }catch(_){}
      try{ speechConfig.close(); }catch(_){}
    });

    if(sdkResult.reason === SDK.ResultReason.NoMatch){
      const e = new Error('Không nghe rõ tiếng Trung trong bản ghi');
      e.code = 'NO_MATCH';
      throw e;
    }
    if(sdkResult.reason === SDK.ResultReason.Canceled){
      const details = SDK.CancellationDetails.fromResult(sdkResult);
      const errDetail = String((details && details.errorDetails) || '');
      const e = new Error(errDetail || 'Kết nối Azure Speech bị hủy');
      if(/401|403|Authentication|key|region/i.test(errDetail) || (details && details.errorCode === SDK.CancellationErrorCode.AuthenticationFailure)){
        e.code = 'AUTH_ERROR';
      }else if(/Connection|timeout|WebSocket|network/i.test(errDetail)){
        e.code = 'NETWORK_ERROR';
      }else{
        e.code = 'CANCELED';
      }
      throw e;
    }

    const jsonStr = sdkResult.properties && SDK.PropertyId && SDK.PropertyId.SpeechServiceResponse_JsonResult
      ? sdkResult.properties.getProperty(SDK.PropertyId.SpeechServiceResponse_JsonResult)
      : '';
    let parsed = null;
    try{ parsed = jsonStr ? JSON.parse(jsonStr) : null; }catch(_){}

    const nbest = parsed && Array.isArray(parsed.NBest) && parsed.NBest[0] ? parsed.NBest[0] : {};
    const pa = nbest.PronunciationAssessment || {};
    const num = v => (v !== null && v !== undefined && Number.isFinite(Number(v))) ? Math.round(Number(v)) : null;

    const wordResults = (Array.isArray(nbest.Words) ? nbest.Words : []).map(w => {
      const wpa = w.PronunciationAssessment || {};
      const syllables = (Array.isArray(w.Syllables) ? w.Syllables : []).map(s => ({
        syllable: s.Grapheme || s.Syllable || '',
        accuracyScore: num(s.PronunciationAssessment && s.PronunciationAssessment.AccuracyScore),
        weakPhoneme: extractWeakPhoneme(w.Phonemes, s)
      }));
      return {
        word: w.Word || '',
        accuracyScore: num(wpa.AccuracyScore),
        errorType: wpa.ErrorType || 'None',
        syllables
      };
    });

    const out = {
      provider: 'azure-speech',
      assessedAt: Date.now(),
      referenceText: String(referenceText || '').trim(),
      recognizedText: nbest.Display || sdkResult.text || '',
      overallScore: num(pa.PronScore),
      accuracyScore: num(pa.AccuracyScore),
      fluencyScore: num(pa.FluencyScore),
      completenessScore: num(pa.CompletenessScore),
      prosodyScore: num(pa.ProsodyScore),
      wordResults,
      status: 'assessed'
    };
    out.feedback = buildVietnameseFeedback(out);
    return out;
  }

  /* ================= GOOGLE GEMINI SPEECH (FREE TIER · BYOK) ================= */
  function getGeminiConfig(){
    try{
      const raw = localStorage.getItem(GEMINI_STORAGE_KEY);
      if(!raw) return Object.assign({}, GEMINI_DEFAULT_CFG);
      const parsed = JSON.parse(raw);
      return Object.assign({}, GEMINI_DEFAULT_CFG, {
        key: typeof parsed.key === 'string' ? parsed.key.trim() : '',
        model: typeof parsed.model === 'string' && parsed.model.trim() ? parsed.model.trim() : GEMINI_DEFAULT_CFG.model,
        enabled: parsed.enabled !== false
      });
    }catch(_){
      return Object.assign({}, GEMINI_DEFAULT_CFG);
    }
  }

  function saveGeminiConfig(patch){
    const next = Object.assign({}, getGeminiConfig(), patch || {});
    next.key = String(next.key || '').trim();
    next.model = String(next.model || GEMINI_DEFAULT_CFG.model).trim() || GEMINI_DEFAULT_CFG.model;
    next.enabled = next.enabled !== false;
    try{
      localStorage.setItem(GEMINI_STORAGE_KEY, JSON.stringify(next));
    }catch(_){}
    return next;
  }

  function clearGeminiConfig(){
    const cur = getGeminiConfig();
    const cleared = Object.assign({}, cur, { key: '' });
    try{
      localStorage.setItem(GEMINI_STORAGE_KEY, JSON.stringify(cleared));
    }catch(_){}
    return cleared;
  }

  function isGeminiConfigured(cfg){
    const c = cfg || getGeminiConfig();
    return Boolean(c.key && c.key.length >= 16);
  }

  function isGeminiAssessEnabled(){
    const c = getGeminiConfig();
    return isGeminiConfigured(c) && c.enabled !== false;
  }

  function normalizeAudioMime(mime){
    const clean = String(mime || '').split(';')[0].trim().toLowerCase();
    if(clean === 'audio/m4a' || clean === 'audio/x-m4a') return 'audio/mp4';
    if(!clean || !clean.startsWith('audio/')) return 'audio/webm';
    return clean;
  }

  function blobToBase64(blob){
    if(!blob) return Promise.reject(new Error('EMPTY_AUDIO_BLOB'));
    return new Promise((resolve, reject) => {
      if(typeof FileReader !== 'undefined'){
        const reader = new FileReader();
        reader.onload = () => {
          const s = String(reader.result || '');
          const idx = s.indexOf(',');
          resolve(idx >= 0 ? s.slice(idx + 1) : s);
        };
        reader.onerror = () => reject(new Error('BLOB_READ_ERROR'));
        reader.readAsDataURL(blob);
      }else{
        blob.arrayBuffer().then(buf => {
          const bytes = new Uint8Array(buf);
          let bin = '';
          const step = 0x8000;
          for(let i = 0; i < bytes.length; i += step){
            bin += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
          }
          resolve(btoa(bin));
        }).catch(reject);
      }
    });
  }

  async function callGeminiGenerate(key, model, bodyObj){
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const retryDelays = [];

    for(let attempt = 0; attempt <= retryDelays.length; attempt++){
      let res;
      try{
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyObj)
        });
      }catch(netErr){
        const e = new Error('Lỗi kết nối mạng tới Google Gemini');
        e.code = 'NETWORK_ERROR';
        throw e;
      }

      let data = null;
      try{ data = await res.json(); }catch(_){}

      if(res.ok) return data;

      const apiMsg = (data && data.error && data.error.message) ? String(data.error.message) : ('HTTP ' + res.status);
      const isOverloaded = (res.status === 503 || /high demand|overloaded|unavailable/i.test(apiMsg));
      if(isOverloaded && attempt < retryDelays.length){
        await new Promise(r => setTimeout(r, retryDelays[attempt]));
        continue;
      }

      const e = new Error(apiMsg);
      e.status = res.status;
      if(isOverloaded){
        e.code = 'OVERLOADED';
      }else if(res.status === 429 || /quota|rate|resource_exhausted/i.test(apiMsg)){
        e.code = 'RATE_LIMIT';
      }else if(res.status === 401 || res.status === 403 || /api key|permission|unauthenticated/i.test(apiMsg)){
        e.code = 'AUTH_ERROR';
      }else if(res.status === 400 && /key/i.test(apiMsg)){
        e.code = 'AUTH_ERROR';
      }else{
        e.code = 'GEMINI_API_ERROR';
      }
      throw e;
    }
  }

  function extractGeminiJson(data){
    const parts = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    const txt = parts.map(p => p && p.text ? p.text : '').join('').trim();
    if(!txt) throw new Error('EMPTY_GEMINI_RESPONSE');
    const clean = txt.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(clean);
  }

  async function testGeminiKey(key, model){
    const k = String(key || '').trim();
    const m = String(model || GEMINI_DEFAULT_CFG.model).trim() || GEMINI_DEFAULT_CFG.model;
    if(!k || k.length < 16){
      const e = new Error('Key Gemini không hợp lệ');
      e.code = 'AUTH_ERROR';
      throw e;
    }
    const data = await callGeminiGenerate(k, m, {
      contents: [{ parts: [{ text: 'Reply strictly with JSON: {"ok":true}' }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0 }
    });
    return extractGeminiJson(data);
  }

  async function assessWithGemini(blob, referenceText, referencePinyin){
    const cfg = getGeminiConfig();
    if(!isGeminiAssessEnabled()){
      const e = new Error('GEMINI_NOT_CONFIGURED');
      e.code = 'GEMINI_NOT_CONFIGURED';
      throw e;
    }
    const base64 = await blobToBase64(blob);
    const mimeType = normalizeAudioMime(blob.type);
    const refZh = String(referenceText || '').trim();
    const refPy = String(referencePinyin || '').trim();

    const prompt = [
      'Bạn là giáo viên luyện phát âm tiếng Trung phổ thông (zh-CN) chấm rất chặt và khách quan.',
      `Câu mẫu chữ Hán: "${refZh}"`,
      refPy ? `Pinyin chuẩn: "${refPy}"` : '',
      'Hãy nghe thật kỹ file ghi âm đính kèm và so sánh với câu mẫu:',
      '- Nếu bản ghi im lặng, chỉ có tiếng ồn hoặc hoàn toàn không có tiếng nói tiếng Trung, hãy trả về "noSpeech": true và "recognizedText": "".',
      '- Chấm công bằng, KHÔNG nới tay; phát hiện chính xác lỗi thanh điệu (thanh 1, 2, 3, 4, thanh nhẹ), lỗi âm đầu (nhầm zh/ch/sh với z/c/s, j/q/x, âm bật hơi p/t/k/q/c/ch), lỗi vần (nhầm -n/-ng, ü/u, e/o) và đọc thiếu/thừa chữ.',
      '- Mục "wordResults": tách đúng theo từng chữ Hán (hoặc từ đọc dư) trong câu mẫu. Giá trị "errorType" chỉ được dùng một trong 4 chuỗi: "None", "Mispronunciation", "Omission", "Insertion".',
      '- Nếu một chữ trong câu mẫu bị người nói bỏ qua, ghi errorType là "Omission" và accuracyScore = 0.',
      '- Mục "feedback": viết 1–3 câu tiếng Việt ngắn gọn, dễ hiểu, chỉ rõ lỗi ở chữ nào và hướng dẫn cách đặt lưỡi/môi hoặc chỉnh cao độ thanh điệu để sửa.',
      'Trả về DUY NHẤT JSON đúng cấu trúc sau:',
      '{"noSpeech":false,"recognizedText":"chuỗi tiếng Trung nghe được","overallScore":0,"accuracyScore":0,"fluencyScore":0,"completenessScore":0,"prosodyScore":0,"wordResults":[{"word":"你","accuracyScore":90,"errorType":"None","syllable":"nǐ","note":""}],"feedback":"Nhận xét tiếng Việt cụ thể"}'
    ].filter(Boolean).join('\n');

    const data = await callGeminiGenerate(cfg.key, cfg.model, {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64 } }
        ]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const parsed = extractGeminiJson(data);
    if(parsed.noSpeech === true){
      const e = new Error('Không nghe rõ tiếng Trung trong bản ghi');
      e.code = 'NO_MATCH';
      throw e;
    }

    const clampScore = v => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
    };

    const rawWords = Array.isArray(parsed.wordResults) ? parsed.wordResults : [];
    const wordResults = rawWords.map(w => {
      const errType = ['None', 'Mispronunciation', 'Omission', 'Insertion'].includes(w && w.errorType)
        ? w.errorType
        : 'None';
      const sylTxt = w && typeof w.syllable === 'string' ? w.syllable.trim() : '';
      return {
        word: (w && w.word) ? String(w.word) : '',
        accuracyScore: clampScore(w && w.accuracyScore),
        errorType: errType,
        syllables: sylTxt ? [{ syllable: sylTxt }] : [],
        note: (w && typeof w.note === 'string') ? w.note.trim() : ''
      };
    }).filter(w => w.word);

    const out = {
      provider: 'gemini',
      assessedAt: Date.now(),
      referenceText: refZh,
      recognizedText: typeof parsed.recognizedText === 'string' ? parsed.recognizedText.trim() : '',
      overallScore: clampScore(parsed.overallScore),
      accuracyScore: clampScore(parsed.accuracyScore),
      fluencyScore: clampScore(parsed.fluencyScore),
      completenessScore: clampScore(parsed.completenessScore),
      prosodyScore: clampScore(parsed.prosodyScore),
      wordResults,
      feedback: typeof parsed.feedback === 'string' ? parsed.feedback.trim() : '',
      status: 'assessed'
    };
    if(!out.feedback) out.feedback = buildVietnameseFeedback(out);
    return out;
  }

  /* ================= CHIVOX MCP (600 LƯỢT FREE · MANDARIN) ================= */
  const CHIVOX_STORAGE_KEY = 'hanyu_chivox_speech';
  const CHIVOX_ENDPOINT = 'https://mcp-global.cloud.chivox.com';
  const CHIVOX_ASSESS_TIMEOUT_MS = 10000;
  const CHIVOX_TEST_TIMEOUT_MS = 8000;
  const CHIVOX_DEFAULT_CFG = { key: '', enabled: true };
  let chivoxSession = null;
  let chivoxReqId = 1;

  function getChivoxConfig(){
    try{
      const raw = localStorage.getItem(CHIVOX_STORAGE_KEY);
      if(!raw) return Object.assign({}, CHIVOX_DEFAULT_CFG);
      const parsed = JSON.parse(raw);
      return Object.assign({}, CHIVOX_DEFAULT_CFG, {
        key: typeof parsed.key === 'string' ? parsed.key.trim() : '',
        enabled: parsed.enabled !== false
      });
    }catch(_){
      return Object.assign({}, CHIVOX_DEFAULT_CFG);
    }
  }

  function saveChivoxConfig(patch){
    const next = Object.assign({}, getChivoxConfig(), patch || {});
    next.key = String(next.key || '').trim();
    next.enabled = next.enabled !== false;
    if(chivoxSession?.key !== next.key) chivoxSession = null;
    try{
      localStorage.setItem(CHIVOX_STORAGE_KEY, JSON.stringify(next));
    }catch(_){}
    return next;
  }

  function clearChivoxConfig(){
    const cur = getChivoxConfig();
    const cleared = Object.assign({}, cur, { key: '' });
    chivoxSession = null;
    try{
      localStorage.setItem(CHIVOX_STORAGE_KEY, JSON.stringify(cleared));
    }catch(_){}
    return cleared;
  }

  function isChivoxConfigured(cfg){
    const c = cfg || getChivoxConfig();
    return Boolean(c.key && c.key.length >= 12);
  }

  function isChivoxAssessEnabled(){
    const c = getChivoxConfig();
    return isChivoxConfigured(c) && c.enabled !== false;
  }

  function chivoxError(message, status, serviceCode){
    const e = new Error(message);
    e.status = status;
    const detail = `${serviceCode || ''} ${message}`;
    if(status === 401 || status === 403 || /unauthorized|invalid (?:api )?key/i.test(detail)) e.code = 'AUTH_ERROR';
    else if(status === 429 || /quota|rate.limit|insufficient (?:points|balance)/i.test(detail)) e.code = 'RATE_LIMIT';
    else if(status === 408 || status === 504 || /timeout|timed out|\b(?:504|53000)\b/i.test(detail)) e.code = 'CHIVOX_TIMEOUT';
    else if(status >= 500 || /busy|UPSTREAM_CONNECT|CAPACITY_FULL/i.test(detail)) e.code = 'OVERLOADED';
    else e.code = 'CHIVOX_API_ERROR';
    return e;
  }

  async function withChivoxDeadline(ms, run){
    const controller = new AbortController();
    let timer;
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = chivoxError(`Chivox chưa phản hồi sau ${ms / 1000} giây`, 408);
        reject(err);
        controller.abort(err);
      }, ms);
    });
    try{
      return await Promise.race([deadline, run(controller.signal)]);
    }finally{
      clearTimeout(timer);
      controller.abort();
    }
  }

  async function readMcpResponse(response, id){
    if(!(response.headers.get('Content-Type') || '').includes('text/event-stream')) return response.json();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    let data = [];
    const readEvent = () => {
      const payload = data.join('\n');
      data = [];
      if(!payload || payload === '[DONE]') return null;
      try{
        const message = JSON.parse(payload);
        return (Array.isArray(message) ? message : [message]).find(msg =>
          msg?.id === id && ('result' in msg || 'error' in msg)) || null;
      }catch(_){ return null; }
    };
    try{
      while(true){
        const {value, done} = await reader.read();
        if(done) {
          pending += decoder.decode();
          if(pending.startsWith('data:')) data.push(pending.slice(5).trim());
          return readEvent();
        }
        pending += decoder.decode(value, {stream: true});
        let end;
        while((end = pending.indexOf('\n')) >= 0){
          const line = pending.slice(0, end).replace(/\r$/, '');
          pending = pending.slice(end + 1);
          if(line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
          if(!line){
            const message = readEvent();
            if(message) return message;
          }
        }
      }
    }finally{
      // Có thể máy chủ vẫn giữ luồng SSE mở sau khi trả điểm.
      void reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }

  async function mcpCallRaw(session, method, params, signal){
    const isNotification = method === 'notifications/initialized';
    const request = {jsonrpc: '2.0', method, params};
    if(!isNotification) request.id = chivoxReqId++;
    const headers = {
      'Authorization': 'Bearer ' + session.key,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    };
    if(session.id) headers['Mcp-Session-Id'] = session.id;
    if(session.protocol) headers['MCP-Protocol-Version'] = session.protocol;

    let res;
    try{
      res = await fetch(CHIVOX_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal
      });
    }catch(err){
      if(signal.aborted) throw signal.reason || err;
      const e = new Error('Không kết nối được Chivox MCP (kiểm tra mạng hoặc trình duyệt chặn CORS)');
      e.code = 'NETWORK_ERROR';
      throw e;
    }
    if(!res.ok){
      // Không chờ đọc thân trang lỗi 5xx từ gateway.
      void res.body?.cancel().catch(() => {});
      throw chivoxError(`Chivox trả về HTTP ${res.status}`, res.status);
    }
    if(isNotification){
      void res.body?.cancel().catch(() => {});
      return null;
    }
    let msg;
    try{
      msg = await readMcpResponse(res, request.id);
    }catch(err){
      if(signal.aborted) throw signal.reason || err;
      throw chivoxError('Chivox gửi phản hồi không đọc được', 502);
    }
    if(msg?.error){
      const message = msg.error.message || 'Chivox báo lỗi MCP';
      const code = msg.error.data?.code || msg.error.code;
      const status = /SESSION_(NOT_FOUND|EXPIRED)|session (?:not found|expired)|invalid session/i.test(`${code || ''} ${message}`) ? 404 : undefined;
      throw chivoxError(message, status, code);
    }
    if(msg?.id !== request.id || !('result' in msg)) throw chivoxError('Phản hồi Chivox không hợp lệ', 502);
    if(method === 'initialize') session.id = res.headers.get('Mcp-Session-Id') || '';
    return msg.result;
  }

  async function openChivoxSession(key, signal){
    const session = {key, id: '', protocol: ''};
    const result = await mcpCallRaw(session, 'initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: {name: 'HanyuAI', version: '1.0.0'}
    }, signal);
    session.protocol = result?.protocolVersion;
    if(typeof session.protocol !== 'string' || !session.protocol) throw chivoxError('Chivox chưa xác nhận phiên bản MCP', 502);
    await mcpCallRaw(session, 'notifications/initialized', {}, signal);
    if(key === getChivoxConfig().key) chivoxSession = session;
    return session;
  }

  async function mcpCallTool(key, params, signal){
    const session = chivoxSession?.key === key ? chivoxSession : await openChivoxSession(key, signal);
    try{
      return await mcpCallRaw(session, 'tools/call', params, signal);
    }catch(err){
      // Chỉ gửi lại khi máy chủ xác nhận phiên đã hết hạn, không lặp bài chấm bị timeout.
      if(err.status !== 404 || !session.id || signal.aborted) throw err;
      if(chivoxSession === session) chivoxSession = null;
      const renewed = await openChivoxSession(key, signal);
      return await mcpCallRaw(renewed, 'tools/call', params, signal);
    }
  }

  async function testChivoxKey(key){
    const k = String(key || '').trim();
    if(!k || k.length < 12){
      const e = new Error('Key Chivox không hợp lệ');
      e.code = 'AUTH_ERROR';
      throw e;
    }
    return withChivoxDeadline(CHIVOX_TEST_TIMEOUT_MS, async signal => {
      const session = await openChivoxSession(k, signal);
      const res = await mcpCallRaw(session, 'tools/list', {}, signal);
      const tools = Array.isArray(res?.tools) ? res.tools : [];
      return {toolCount: tools.length, hasMandarin: tools.some(t => t?.name === 'cn_sentence_eval')};
    });
  }

  function extractChivoxJson(mcpRes){
    if(!mcpRes) throw chivoxError('Chivox trả về phản hồi trống', 502);
    if(mcpRes.isError){
      const errTxt = (Array.isArray(mcpRes.content) && mcpRes.content[0] && mcpRes.content[0].text) ? mcpRes.content[0].text : 'CHIVOX_TOOL_ERROR';
      throw chivoxError(errTxt);
    }
    if(mcpRes.structuredContent && typeof mcpRes.structuredContent === 'object'){
      return mcpRes.structuredContent;
    }
    const content = Array.isArray(mcpRes.content) ? mcpRes.content : [];
    for(let i = 0; i < content.length; i++){
      const part = content[i];
      if(part && part.text){
        const rawText = String(part.text);
        const clean = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
        try{ return JSON.parse(clean); }catch(_){}
        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        if(firstBrace !== -1 && lastBrace > firstBrace){
          try{ return JSON.parse(rawText.slice(firstBrace, lastBrace + 1)); }catch(_){}
        }
      }
    }
    throw chivoxError('Chivox trả về kết quả chấm không đọc được', 502);
  }

  function unwrapChivoxPayload(parsed){
    let cur = parsed && typeof parsed === 'object' ? parsed : {};
    for(let depth = 0; depth < 3; depth++){
      if(cur.overall !== undefined || cur.overall_score !== undefined || cur.total_score !== undefined || Array.isArray(cur.details) || Array.isArray(cur.words)){
        return cur;
      }
      const next = cur.result || cur.data || cur.evaluation || cur.eval || cur.response;
      if(next && typeof next === 'object') cur = next;
      else break;
    }
    return cur;
  }

  function buildChivoxFeedback(out){
    const parts = [];
    const words = out.wordResults || [];
    if(!words.length) return 'Chivox chưa trả về điểm từng chữ cho đoạn ghi âm này.';
    const omitted = words.filter(w => w.errorType === 'Omission').map(w => w.word);
    const bad = words.filter(w => w.errorType === 'Mispronunciation' || (w.accuracyScore !== null && w.accuracyScore < 75));
    const mid = words.filter(w => !bad.includes(w) && w.errorType !== 'Omission' && w.accuracyScore !== null && w.accuracyScore < 85);
    if(omitted.length) parts.push(`Đọc thiếu chữ: ${omitted.join(', ')}.`);
    if(bad.length){
      const list = bad.slice(0, 4).map(w => `${w.word} (${w.accuracyScore !== null ? w.accuracyScore + 'đ' : 'sai'}${w.note ? ' — ' + w.note : ''})`);
      parts.push(`Cần sửa phát âm / thanh điệu: ${list.join('; ')}.`);
    }
    if(mid.length && !bad.length){
      const list = mid.slice(0, 3).map(w => `${w.word} (${w.accuracyScore}đ)`);
      parts.push(`Có thể đọc rõ hơn ở: ${list.join(', ')}.`);
    }
    if(!omitted.length && !bad.length && !mid.length){
      parts.push('Chivox đánh giá phát âm và thanh điệu rất chuẩn! Chạm vào từng thẻ chữ để nghe đối chiếu thêm nếu muốn.');
    }
    return parts.join(' ');
  }

  async function assessWithChivox(blob, referenceText, referencePinyin){
    const cfg = getChivoxConfig();
    if(!isChivoxAssessEnabled()){
      const e = new Error('CHIVOX_NOT_CONFIGURED');
      e.code = 'CHIVOX_NOT_CONFIGURED';
      throw e;
    }

    if(!blob?.size) throw new Error('EMPTY_AUDIO_BLOB');
    const refZh = String(referenceText || '').trim();
    const parsed = await withChivoxDeadline(CHIVOX_ASSESS_TIMEOUT_MS, async signal => {
      const wavBytes = await blobToWav16kBytes(blob, true);
      if(signal.aborted) throw signal.reason;
      const rawRes = await mcpCallTool(cfg.key, {
        name: 'cn_sentence_eval',
        arguments: {ref_text: refZh, audio_base64: uint8ToBase64(wavBytes)}
      }, signal);
      return extractChivoxJson(rawRes);
    });
    const num = v => (v !== null && v !== undefined && Number.isFinite(Number(v))) ? Math.round(Number(v)) : null;
    const root = unwrapChivoxPayload(parsed);

    const details = Array.isArray(root.details) ? root.details
      : Array.isArray(root.words) ? root.words
      : Array.isArray(root.word_details) ? root.word_details
      : Array.isArray(root.chars) ? root.chars
      : Array.isArray(root.char_details) ? root.char_details
      : Array.isArray(root.syllables) ? root.syllables : [];
    const wordResults = details.map(d => {
      const word = String((d && (d.char || d.word || d.text || d.hanzi)) || '').trim();
      const score = num(d && (d.score !== undefined ? d.score : (d.overall !== undefined ? d.overall : d.accuracy)));
      const dp = String((d && (d.dp_type || d.error_type)) || 'normal').toLowerCase();
      let errorType = 'None';
      if(dp === 'omission') errorType = 'Omission';
      else if(dp === 'insertion') errorType = 'Insertion';
      else if(dp === 'mispronunciation' || (score !== null && score < 60)) errorType = 'Mispronunciation';

      let note = '';
      const tRef = d && d.tone_ref !== undefined ? d.tone_ref : null;
      const tDet = d && d.tone_detected !== undefined ? d.tone_detected : null;
      if(tRef !== null && tDet !== null && String(tRef) !== String(tDet) && dp !== 'normal'){
        note = `Thanh ${tRef} đọc thành Thanh ${tDet}`;
      }else if(dp === 'omission'){
        note = 'Đọc thiếu chữ này';
      }else if(score !== null && score < 75){
        note = `Chưa chuẩn (${score}đ)`;
      }

      const py = d && (d.pinyin || d.syllable) ? String(d.pinyin || d.syllable) : '';
      return {
        word,
        accuracyScore: score,
        errorType,
        syllables: py ? [{ syllable: py }] : [],
        note
      };
    }).filter(w => w.word);

    const flObj = root.fluency && typeof root.fluency === 'object' ? root.fluency.overall : root.fluency;
    const out = {
      provider: 'chivox',
      assessedAt: Date.now(),
      referenceText: refZh,
      referencePinyin: String(referencePinyin || '').trim(),
      recognizedText: String(root.recognized_text || root.transcript || '').trim(),
      overallScore: num(root.overall !== undefined ? root.overall : (root.overall_score !== undefined ? root.overall_score : (root.total_score !== undefined ? root.total_score : root.score))),
      accuracyScore: num(root.accuracy !== undefined ? root.accuracy : (root.accuracy_score !== undefined ? root.accuracy_score : (root.pron !== undefined ? root.pron : root.pron_score))),
      fluencyScore: num(flObj !== undefined ? flObj : (root.fluency_score !== undefined ? root.fluency_score : root.rhythm)),
      completenessScore: num(root.integrity !== undefined ? root.integrity : (root.completeness !== undefined ? root.completeness : root.completeness_score)),
      prosodyScore: num(root.prosody !== undefined ? root.prosody : (root.tone !== undefined ? root.tone : (root.tone_score !== undefined ? root.tone_score : root.pron))),
      wordResults,
      status: 'assessed'
    };
    if(!wordResults.length && [out.overallScore, out.accuracyScore, out.fluencyScore, out.completenessScore, out.prosodyScore].every(score => score === null)){
      throw chivoxError('Chivox không trả về điểm phát âm', 502);
    }
    out.feedback = buildChivoxFeedback(out);
    return out;
  }

  /* ================= TONEPERFECT API (50 CREDITS FREE · zh-CN) ================= */
  const TONEPERFECT_STORAGE_KEY = 'hanyu_toneperfect_speech';
  const TONEPERFECT_ENDPOINT = 'https://api.toneperfect.app/v1/assess';
  const TONEPERFECT_TIMEOUT_MS = 10000;
  const TONEPERFECT_DEFAULT_CFG = { key: '', enabled: true, endpoint: '' };

  function getTonePerfectConfig(){
    try{
      const raw = localStorage.getItem(TONEPERFECT_STORAGE_KEY);
      if(!raw) return Object.assign({}, TONEPERFECT_DEFAULT_CFG);
      const parsed = JSON.parse(raw);
      return Object.assign({}, TONEPERFECT_DEFAULT_CFG, {
        key: typeof parsed.key === 'string' ? parsed.key.trim() : '',
        enabled: parsed.enabled !== false,
        endpoint: typeof parsed.endpoint === 'string' ? parsed.endpoint.trim() : ''
      });
    }catch(_){
      return Object.assign({}, TONEPERFECT_DEFAULT_CFG);
    }
  }

  function saveTonePerfectConfig(patch){
    const next = Object.assign({}, getTonePerfectConfig(), patch || {});
    next.key = String(next.key || '').trim();
    next.enabled = next.enabled !== false;
    next.endpoint = String(next.endpoint || '').trim();
    try{
      localStorage.setItem(TONEPERFECT_STORAGE_KEY, JSON.stringify(next));
    }catch(_){}
    return next;
  }

  function clearTonePerfectConfig(){
    const cur = getTonePerfectConfig();
    const cleared = Object.assign({}, cur, { key: '' });
    try{
      localStorage.setItem(TONEPERFECT_STORAGE_KEY, JSON.stringify(cleared));
    }catch(_){}
    return cleared;
  }

  function isTonePerfectConfigured(cfg){
    const c = cfg || getTonePerfectConfig();
    return Boolean(c.key && c.key.length >= 10);
  }

  function isTonePerfectAssessEnabled(){
    const c = getTonePerfectConfig();
    return isTonePerfectConfigured(c) && c.enabled !== false;
  }

  function buildTonePerfectFeedback(out){
    const words = out.wordResults || [];
    if(!words.length) return 'TonePerfect chưa trả về chi tiết từng chữ cho bản ghi này.';
    const bad = words.filter(w => w.note || (w.accuracyScore !== null && w.accuracyScore < 75));
    const mid = words.filter(w => !bad.includes(w) && w.accuracyScore !== null && w.accuracyScore < 85);
    const parts = [];
    if(bad.length){
      parts.push('Cần sửa phát âm / thanh điệu: ' + bad.slice(0, 4).map(w => `${w.word} (${w.accuracyScore !== null ? w.accuracyScore + 'đ' : 'sai'}${w.note ? ' — ' + w.note : ''})`).join('; ') + '.');
    }
    if(mid.length && !bad.length){
      parts.push('Có thể đọc rõ hơn: ' + mid.slice(0, 3).map(w => `${w.word} (${w.accuracyScore}đ)`).join(', ') + '.');
    }
    if(!parts.length) parts.push('TonePerfect đánh giá phát âm và thanh điệu rất tốt!');
    return parts.join(' ');
  }

  async function assessWithTonePerfect(blob, referenceText, referencePinyin){
    const cfg = getTonePerfectConfig();
    if(!isTonePerfectConfigured(cfg)){
      const e = new Error('NO_TONEPERFECT_KEY');
      e.code = 'AUTH_ERROR';
      throw e;
    }
    if(!blob || !blob.size) throw new Error('EMPTY_AUDIO_BLOB');
    const refZh = String(referenceText || '').trim();
    if(!refZh) throw new Error('EMPTY_REFERENCE_TEXT');

    let audioPart = blob;
    let fileName = 'recording.webm';
    try{
      const wavBytes = await blobToWav16kBytes(blob, true);
      audioPart = new Blob([wavBytes], { type: 'audio/wav' });
      fileName = 'recording.wav';
    }catch(_){
      const mime = String(blob.type || '').toLowerCase();
      if(mime.includes('ogg')) fileName = 'recording.ogg';
      else if(mime.includes('mp4') || mime.includes('m4a')) fileName = 'recording.mp4';
      else if(mime.includes('wav')) fileName = 'recording.wav';
    }

    const endpoint = cfg.endpoint || TONEPERFECT_ENDPOINT;
    const fd = new FormData();
    fd.append('audio', audioPart, fileName);
    fd.append('text', refZh);
    fd.append('language', 'zh-CN');

    const controller = new AbortController();
    let timeoutId = null;
    const timeoutErr = new Error(`TonePerfect chưa phản hồi sau ${TONEPERFECT_TIMEOUT_MS / 1000} giây`);
    timeoutErr.code = 'CHIVOX_TIMEOUT';
    timeoutErr.status = 504;

    const timerPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(timeoutErr);
        controller.abort(timeoutErr);
      }, TONEPERFECT_TIMEOUT_MS);
    });

    const idemKey = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : (`tp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);

    try{
      const fetchPromise = fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + cfg.key,
          'Idempotency-Key': idemKey
        },
        body: fd,
        signal: controller.signal
      });
      const res = await Promise.race([fetchPromise, timerPromise]);
      const data = await res.json().catch(() => null);
      if(!res.ok){
        const msg = (data && (data.message || data.error?.message || data.detail)) || (`HTTP ${res.status}`);
        const err = new Error(String(msg));
        err.status = res.status;
        if(res.status === 401 || res.status === 403) err.code = 'AUTH_ERROR';
        else if(res.status === 429 || res.status === 402) err.code = 'RATE_LIMIT';
        else if(res.status === 408 || res.status === 504) err.code = 'CHIVOX_TIMEOUT';
        else if(res.status >= 500) err.code = 'OVERLOADED';
        else err.code = 'NETWORK_ERROR';
        throw err;
      }
      if(!data || typeof data !== 'object'){
        const err = new Error('INVALID_RESPONSE');
        err.status = 502;
        throw err;
      }

      const num = v => (v !== null && v !== undefined && Number.isFinite(Number(v))) ? Math.round(Number(v)) : null;
      const sc = data.scores || data;
      const rawWords = Array.isArray(data.words) ? data.words : [];
      const wordResults = rawWords.map(w => {
        const units = Array.isArray(w.units) ? w.units : [];
        const notes = [];
        const toneUnit = units.find(u => u && u.dimension === 'tone');
        const initUnit = units.find(u => u && u.dimension === 'initial');
        const finUnit = units.find(u => u && u.dimension === 'final');
        if(toneUnit && toneUnit.expected && toneUnit.heard && String(toneUnit.expected) !== String(toneUnit.heard)){
          notes.push(`Thanh ${toneUnit.expected} đọc thành Thanh ${toneUnit.heard}`);
        }
        if(initUnit && initUnit.expected && initUnit.heard && String(initUnit.expected) !== String(initUnit.heard)){
          notes.push(`Âm đầu ${initUnit.expected} → ${initUnit.heard}`);
        }
        if(finUnit && finUnit.expected && finUnit.heard && String(finUnit.expected) !== String(finUnit.heard)){
          notes.push(`Vần ${finUnit.expected} → ${finUnit.heard}`);
        }
        const score = num(w.score);
        if(!notes.length && score !== null && score < 75){
          notes.push(`Chưa chuẩn (${score}đ)`);
        }
        const py = w.pinyin ? String(w.pinyin) : '';
        return {
          word: String(w.text || ''),
          accuracyScore: score,
          errorType: (score !== null && score < 60) ? 'Mispronunciation' : 'None',
          syllables: py ? [{ syllable: py }] : [],
          note: notes.join(' · ')
        };
      }).filter(w => w.word);

      const out = {
        provider: 'toneperfect',
        assessedAt: Date.now(),
        referenceText: refZh,
        referencePinyin: String(referencePinyin || '').trim(),
        recognizedText: '',
        overallScore: num(sc.overall !== undefined ? sc.overall : sc.pronunciation),
        accuracyScore: num(sc.pronunciation !== undefined ? sc.pronunciation : sc.overall),
        initialScore: num(sc.initial),
        finalScore: num(sc.final),
        toneScore: num(sc.tone),
        fluencyScore: num(sc.fluency),
        completenessScore: num(sc.completeness),
        prosodyScore: num(sc.rhythm !== undefined ? sc.rhythm : sc.tone),
        wordResults,
        status: 'assessed'
      };
      out.feedback = buildTonePerfectFeedback(out);
      return out;
    }catch(err){
      if(controller.signal.aborted && err && err.code === 'CHIVOX_TIMEOUT') throw err;
      if(err && err.code) throw err;
      const netErr = new Error(err && err.message ? err.message : 'Không kết nối được TonePerfect API');
      netErr.code = 'NETWORK_ERROR';
      throw netErr;
    }finally{
      clearTimeout(timeoutId);
    }
  }

  /* ================= MODAL HỢP NHẤT (TONEPERFECT + CHIVOX + GEMINI + GIỌNG MÁY) ================= */
  function showModalHtml(html){
    if(typeof openModal === 'function'){
      openModal(html);
      return;
    }
    const bg = document.getElementById('hanyu-modal');
    const box = document.getElementById('hanyu-modal-box');
    if(box && bg){
      box.innerHTML = html;
      bg.classList.remove('hide');
    }
  }

  function hideModal(){
    if(typeof closeModal === 'function'){
      closeModal();
      return;
    }
    const bg = document.getElementById('hanyu-modal');
    if(bg) bg.classList.add('hide');
  }

  function syncAfterConfigChange(){
    try{
      if(typeof speakCtrl !== 'undefined' && speakCtrl && typeof speakCtrl.render === 'function'){
        speakCtrl.render();
      }
    }catch(_){}
    const btn = document.getElementById('btn-azure-speech-cfg');
    if(btn){
      if(isTonePerfectAssessEnabled()){
        btn.textContent = '🎙 AI Chấm phát âm (Đã bật TonePerfect)';
      }else if(isChivoxAssessEnabled()){
        btn.textContent = '🎙 AI Chấm phát âm (Đã bật Chivox)';
      }else if(isGeminiAssessEnabled()){
        btn.textContent = '🎙 AI Chấm phát âm (Đã bật Gemini)';
      }else{
        btn.textContent = '🎙 AI Chấm phát âm & Giọng đọc';
      }
    }
  }

  function renderLocalVoiceOptions(selectedName){
    const voices = getLocalZhVoices();
    const head = `<option value="" ${!selectedName ? 'selected' : ''}>Tự động chọn giọng hay nhất (${voices.length ? esc(voices[0].name) : 'Mặc định máy'})</option>`;
    return head + voices.map(v => `<option value="${esc(v.name)}" ${selectedName === v.name ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('');
  }

  function openSettingsModal(){
    const cfg = getConfig();
    const tpCfg = getTonePerfectConfig();
    const gmCfg = getGeminiConfig();
    const cvCfg = getChivoxConfig();
    const defaultTab = isTonePerfectConfigured(tpCfg)
      ? 'toneperfect'
      : (isChivoxConfigured(cvCfg) ? 'chivox' : (isGeminiConfigured(gmCfg) ? 'gemini' : 'toneperfect'));
    const isHttpMobile = !window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';

    const tpStatusTxt = isTonePerfectConfigured(tpCfg)
      ? 'Đã cấu hình TonePerfect API (Chấm âm đầu · Vần · Thanh điệu)'
      : 'Chưa nhập TonePerfect Key · Có sẵn 50 Credits miễn phí khi tạo tài khoản';
    const cvStatusTxt = isChivoxConfigured(cvCfg)
      ? 'Đã cấu hình Chivox MCP (600 lượt Free / 30 ngày)'
      : 'Chưa nhập Chivox Key · Có sẵn 600 lượt chấm miễn phí không cần thẻ';
    const gmStatusTxt = isGeminiConfigured(gmCfg)
      ? `Đã cấu hình Gemini (${gmCfg.model})`
      : 'Chưa nhập Gemini Key · Miễn phí bằng tài khoản Google, không cần thẻ';

    const gmModelOpts = GEMINI_MODELS.map(m => `<option value="${esc(m.id)}" ${gmCfg.model === m.id ? 'selected' : ''}>${esc(m.label)}</option>`).join('');
    const localVoiceOpts = renderLocalVoiceOptions(cfg.localVoiceName);

    showModalHtml(`
      <div class="az-form">
        <div class="az-head">
          <h3>Cài đặt Chấm phát âm AI &amp; Giọng đọc</h3>
          <button type="button" class="ico-btn" id="az-close-x" aria-label="Đóng">✕</button>
        </div>

        <div class="az-tabs" id="ai-cfg-tabs">
          <button type="button" class="${defaultTab === 'toneperfect' ? 'on' : ''}" data-aitab="toneperfect">TonePerfect (50 Free)</button>
          <button type="button" class="${defaultTab === 'chivox' ? 'on' : ''}" data-aitab="chivox">Chivox (600 Free)</button>
          <button type="button" class="${defaultTab === 'gemini' ? 'on' : ''}" data-aitab="gemini">Google Gemini</button>
        </div>

        ${isHttpMobile ? `<div class="az-warn"><b>Lưu ý Micro trên điện thoại / tablet:</b> Trình duyệt chặn quyền ghi âm khi mở qua <code>http://</code>. Nghe giọng đọc vẫn chạy bình thường, nhưng để ghi âm chấm phát âm trên iPhone/Samsung cần mở app qua <b>HTTPS</b> (ví dụ GitHub Pages).</div>` : ''}

        <div id="tp-pane" class="${defaultTab === 'toneperfect' ? '' : 'hide'}" style="display:grid;gap:10px">
          <div class="az-status ${isTonePerfectConfigured(tpCfg) ? 'ok' : ''}" id="tp-status-pill">${esc(tpStatusTxt)}</div>
          <div class="fld">
            <label for="tp-key">TonePerfect API Key (tp_live_... hoặc tp_test_...)</label>
            <div class="az-key-row">
              <input id="tp-key" type="password" value="${esc(tpCfg.key)}" autocomplete="off" placeholder="Dán API key từ TonePerfect → API keys"/>
              <button type="button" class="chip" id="tp-toggle-key">Hiện</button>
            </div>
          </div>
          <div class="fld">
            <label for="tp-endpoint">Endpoint / Proxy (để trống = mặc định api.toneperfect.app/v1/assess)</label>
            <input id="tp-endpoint" type="url" value="${esc(tpCfg.endpoint)}" autocomplete="off" placeholder="https://api.toneperfect.app/v1/assess"/>
          </div>
          <label class="az-chk"><input id="tp-enabled" type="checkbox" ${tpCfg.enabled ? 'checked' : ''}/><span>Bật chấm phát âm (Âm đầu, Vần, Thanh điệu) bằng TonePerfect (ưu tiên cao nhất)</span></label>
          <div class="az-acts">
            <button type="button" class="btn sm" id="tp-save">💾 Lưu cấu hình</button>
            <button type="button" class="btn ghost sm" id="tp-clear">🗑 Xóa Key</button>
            <button type="button" class="btn ghost sm" id="tp-close">Đóng</button>
          </div>
          <details class="az-help">
            <summary>Hướng dẫn lấy Key TonePerfect &amp; lưu ý CORS trình duyệt</summary>
            <ol>
              <li>Vào Workspace TonePerfect → mục <b>API keys</b> → bấm <b>Create a key</b> để tạo key (<code>tp_live_...</code> hoặc <code>tp_test_...</code>).</li>
              <li>Dán key vào ô trên → bấm <b>Lưu cấu hình</b>. Nếu gọi trực tiếp từ trình duyệt bị chặn CORS hoặc quá 10 giây, app tự fallback sang phân tích ngay trên web; hoặc điền link Cloudflare Worker/Proxy ở ô Endpoint.</li>
            </ol>
          </details>
        </div>

        <div id="cv-pane" class="${defaultTab === 'chivox' ? '' : 'hide'}" style="display:grid;gap:10px">
          <div class="az-status ${isChivoxConfigured(cvCfg) ? 'ok' : ''}" id="cv-status-pill">${esc(cvStatusTxt)}</div>
          <div class="fld">
            <label for="cv-key">Chivox MCP API Key (sk_...)</label>
            <div class="az-key-row">
              <input id="cv-key" type="password" value="${esc(cvCfg.key)}" autocomplete="off" placeholder="Dán chuỗi sk_... từ Chivox MCP Dashboard"/>
              <button type="button" class="chip" id="cv-toggle-key">Hiện</button>
            </div>
          </div>
          <label class="az-chk"><input id="cv-enabled" type="checkbox" ${cvCfg.enabled ? 'checked' : ''}/><span>Bật chấm phát âm tiếng Trung chuyên sâu bằng Chivox (ưu tiên cao nhất)</span></label>
          <div class="az-acts">
            <button type="button" class="btn ghost sm" id="cv-test-key">✅ Kiểm tra Key</button>
            <button type="button" class="btn sm" id="cv-save">💾 Lưu cấu hình</button>
            <button type="button" class="btn ghost sm" id="cv-clear">🗑 Xóa Key</button>
            <button type="button" class="btn ghost sm" id="cv-close">Đóng</button>
          </div>
          <details class="az-help">
            <summary>Hướng dẫn lấy Key Chivox MCP (600 lượt miễn phí, không cần thẻ)</summary>
            <ol>
              <li>Đăng nhập <b>api-portal.cloud.chivox.com</b> → mục <b>API Keys</b> → bấm <b>Create key</b>.</li>
              <li>Copy chuỗi bắt đầu bằng <code>sk_...</code> dán vào ô trên → bấm <b>Kiểm tra Key</b> → <b>Lưu cấu hình</b>.</li>
            </ol>
          </details>
        </div>

        <div id="gm-pane" class="${defaultTab === 'gemini' ? '' : 'hide'}" style="display:grid;gap:10px">
          <div class="az-status ${isGeminiConfigured(gmCfg) ? 'ok' : ''}" id="gm-status-pill">${esc(gmStatusTxt)}</div>
          <div class="fld">
            <label for="gm-key">Google Gemini API Key (Miễn phí, không cần thẻ)</label>
            <div class="az-key-row">
              <input id="gm-key" type="password" value="${esc(gmCfg.key)}" autocomplete="off" placeholder="Dán chuỗi AQ.... hoặc AIza... từ Google AI Studio"/>
              <button type="button" class="chip" id="gm-toggle-key">Hiện</button>
            </div>
          </div>
          <div class="fld">
            <label for="gm-model">Model chấm phát âm</label>
            <select id="gm-model">${gmModelOpts}</select>
          </div>
          <label class="az-chk"><input id="gm-enabled" type="checkbox" ${gmCfg.enabled ? 'checked' : ''}/><span>Bật chấm phát âm từng chữ &amp; nhận xét tiếng Việt bằng Gemini</span></label>
          <div class="az-acts">
            <button type="button" class="btn ghost sm" id="gm-test-key">✅ Kiểm tra Key</button>
            <button type="button" class="btn sm" id="gm-save">💾 Lưu cấu hình</button>
            <button type="button" class="btn ghost sm" id="gm-clear">🗑 Xóa Key</button>
            <button type="button" class="btn ghost sm" id="gm-close">Đóng</button>
          </div>
          <details class="az-help">
            <summary>Hướng dẫn lấy Gemini Key miễn phí trong 30 giây (không cần thẻ ngân hàng)</summary>
            <ol>
              <li>Mở trang <b>aistudio.google.com/apikey</b> và đăng nhập bằng tài khoản Gmail của bạn.</li>
              <li>Bấm nút <b>Create API key</b> (tạo hoặc chọn project nếu được hỏi).</li>
              <li>Chép chuỗi Key bắt đầu bằng <code>AQ...</code> (hoặc <code>AIza...</code>) dán vào ô trên rồi bấm <b>Kiểm tra Key</b> → <b>Lưu cấu hình</b>.</li>
            </ol>
          </details>
        </div>

        <div class="az-local-box">
          <div class="fld">
            <label for="loc-voice-sel">Giọng đọc trên thiết bị (dùng cho Luyện nghe, Bài khóa, Từ vựng &amp; Pinyin)</label>
            <div class="az-key-row">
              <select id="loc-voice-sel">${localVoiceOpts}</select>
              <button type="button" class="chip" id="loc-test-voice">🔊 Thử</button>
            </div>
          </div>
        </div>
      </div>
    `);

    const tpPane = document.getElementById('tp-pane');
    const cvPane = document.getElementById('cv-pane');
    const gmPane = document.getElementById('gm-pane');
    const tabsEl = document.getElementById('ai-cfg-tabs');
    if(tabsEl){
      tabsEl.addEventListener('click', e => {
        const b = e.target.closest('button[data-aitab]');
        if(!b) return;
        const tab = b.dataset.aitab;
        tabsEl.querySelectorAll('button[data-aitab]').forEach(x => x.classList.toggle('on', x === b));
        if(tpPane) tpPane.classList.toggle('hide', tab !== 'toneperfect');
        if(cvPane) cvPane.classList.toggle('hide', tab !== 'chivox');
        if(gmPane) gmPane.classList.toggle('hide', tab !== 'gemini');
      });
    }
    const closeX = document.getElementById('az-close-x');
    if(closeX) closeX.onclick = hideModal;

    // TonePerfect handlers
    const tpKeyInp = document.getElementById('tp-key');
    const tpEpInp = document.getElementById('tp-endpoint');
    const tpEnChk = document.getElementById('tp-enabled');
    const tpStatusEl = document.getElementById('tp-status-pill');
    const readTpForm = () => ({
      key: tpKeyInp ? tpKeyInp.value.trim() : '',
      endpoint: tpEpInp ? tpEpInp.value.trim() : '',
      enabled: tpEnChk ? tpEnChk.checked : true
    });
    const tpTog = document.getElementById('tp-toggle-key');
    if(tpTog && tpKeyInp){
      tpTog.onclick = () => {
        const show = tpKeyInp.type === 'password';
        tpKeyInp.type = show ? 'text' : 'password';
        tpTog.textContent = show ? 'Ẩn' : 'Hiện';
      };
    }
    const tpClose = document.getElementById('tp-close');
    if(tpClose) tpClose.onclick = hideModal;
    const tpSaveBtn = document.getElementById('tp-save');
    if(tpSaveBtn){
      tpSaveBtn.onclick = () => {
        const locSelEl = document.getElementById('loc-voice-sel');
        if(locSelEl) saveConfig({ localVoiceName: locSelEl.value });
        const saved = saveTonePerfectConfig(readTpForm());
        syncAfterConfigChange();
        hideModal();
        notify(isTonePerfectConfigured(saved) ? 'Đã lưu cấu hình TonePerfect API' : 'Đã lưu tùy chọn TonePerfect');
      };
    }
    const tpClearBtn = document.getElementById('tp-clear');
    if(tpClearBtn){
      tpClearBtn.onclick = () => {
        clearTonePerfectConfig();
        if(tpKeyInp) tpKeyInp.value = '';
        if(tpStatusEl){
          tpStatusEl.className = 'az-status';
          tpStatusEl.textContent = 'Đã xóa Key TonePerfect';
        }
        syncAfterConfigChange();
        notify('Đã xóa TonePerfect Key khỏi trình duyệt');
      };
    }

    // Chivox handlers
    const cvKeyInp = document.getElementById('cv-key');
    const cvEnChk = document.getElementById('cv-enabled');
    const cvStatusEl = document.getElementById('cv-status-pill');
    const readChivoxForm = () => ({
      key: cvKeyInp ? cvKeyInp.value.trim() : '',
      enabled: cvEnChk ? cvEnChk.checked : true
    });
    const cvTog = document.getElementById('cv-toggle-key');
    if(cvTog && cvKeyInp){
      cvTog.onclick = () => {
        const show = cvKeyInp.type === 'password';
        cvKeyInp.type = show ? 'text' : 'password';
        cvTog.textContent = show ? 'Ẩn' : 'Hiện';
      };
    }
    const cvClose = document.getElementById('cv-close');
    if(cvClose) cvClose.onclick = hideModal;

    const cvTestBtn = document.getElementById('cv-test-key');
    if(cvTestBtn){
      cvTestBtn.onclick = async () => {
        const f = readChivoxForm();
        if(!isChivoxConfigured(f)){
          if(cvStatusEl){
            cvStatusEl.className = 'az-status err';
            cvStatusEl.textContent = 'Vui lòng dán Chivox API Key hợp lệ (bắt đầu bằng sk_...)';
          }
          return;
        }
        cvTestBtn.disabled = true;
        cvTestBtn.textContent = 'Đang kiểm tra...';
        try{
          const info = await testChivoxKey(f.key);
          if(cvStatusEl){
            cvStatusEl.className = 'az-status ok';
            cvStatusEl.textContent = `Kết nối Chivox MCP thành công (${info.toolCount} công cụ${info.hasMandarin ? ' · Đã bật tiếng Trung' : ''})`;
          }
          notify('Key Chivox hoạt động tốt!');
        }catch(err){
          if(cvStatusEl){
            cvStatusEl.className = 'az-status err';
            const detail = err && err.message ? (' — ' + err.message) : '';
            cvStatusEl.textContent = err && err.code === 'AUTH_ERROR'
              ? 'Key Chivox không đúng hoặc bị từ chối' + detail
              : 'Không kết nối được Chivox MCP' + detail;
          }
          notify('Kiểm tra Key Chivox thất bại');
        }finally{
          cvTestBtn.disabled = false;
          cvTestBtn.textContent = '✅ Kiểm tra Key';
        }
      };
    }

    const cvSaveBtn = document.getElementById('cv-save');
    if(cvSaveBtn){
      cvSaveBtn.onclick = () => {
        const locSelEl = document.getElementById('loc-voice-sel');
        if(locSelEl) saveConfig({ localVoiceName: locSelEl.value });
        const saved = saveChivoxConfig(readChivoxForm());
        syncAfterConfigChange();
        hideModal();
        notify(isChivoxConfigured(saved) ? 'Đã lưu cấu hình Chivox MCP' : 'Đã lưu tùy chọn Chivox');
      };
    }

    const cvClearBtn = document.getElementById('cv-clear');
    if(cvClearBtn){
      cvClearBtn.onclick = () => {
        clearChivoxConfig();
        if(cvKeyInp) cvKeyInp.value = '';
        if(cvStatusEl){
          cvStatusEl.className = 'az-status';
          cvStatusEl.textContent = 'Đã xóa Key Chivox';
        }
        syncAfterConfigChange();
        notify('Đã xóa Chivox Key khỏi trình duyệt');
      };
    }

    const locSel = document.getElementById('loc-voice-sel');
    const locTest = document.getElementById('loc-test-voice');
    if(locSel){
      locSel.onchange = () => {
        saveConfig({ localVoiceName: locSel.value });
        notify('Đã chọn giọng đọc trên máy');
      };
      if(typeof speechSynthesis !== 'undefined' && speechSynthesis.addEventListener){
        const onVoices = () => {
          if(!document.getElementById('loc-voice-sel')){
            speechSynthesis.removeEventListener('voiceschanged', onVoices);
            return;
          }
          const curVal = locSel.value || getConfig().localVoiceName;
          locSel.innerHTML = renderLocalVoiceOptions(curVal);
        };
        speechSynthesis.addEventListener('voiceschanged', onVoices);
      }
    }
    if(locTest){
      locTest.onclick = () => {
        if(locSel) saveConfig({ localVoiceName: locSel.value });
        speakLocal('你好，欢迎学习汉语！', 0.95);
      };
    }

    // Gemini handlers
    const gmKeyInp = document.getElementById('gm-key');
    const gmModelSel = document.getElementById('gm-model');
    const gmEnChk = document.getElementById('gm-enabled');
    const gmStatusEl = document.getElementById('gm-status-pill');
    const readGeminiForm = () => ({
      key: gmKeyInp ? gmKeyInp.value.trim() : '',
      model: gmModelSel ? gmModelSel.value : GEMINI_DEFAULT_CFG.model,
      enabled: gmEnChk ? gmEnChk.checked : true
    });

    const gmTog = document.getElementById('gm-toggle-key');
    if(gmTog && gmKeyInp){
      gmTog.onclick = () => {
        const show = gmKeyInp.type === 'password';
        gmKeyInp.type = show ? 'text' : 'password';
        gmTog.textContent = show ? 'Ẩn' : 'Hiện';
      };
    }
    const gmClose = document.getElementById('gm-close');
    if(gmClose) gmClose.onclick = hideModal;

    const gmTestBtn = document.getElementById('gm-test-key');
    if(gmTestBtn){
      gmTestBtn.onclick = async () => {
        const f = readGeminiForm();
        if(!isGeminiConfigured(f)){
          if(gmStatusEl){
            gmStatusEl.className = 'az-status err';
            gmStatusEl.textContent = 'Vui lòng dán Gemini API Key hợp lệ (bắt đầu bằng AQ... hoặc AIza...)';
          }
          return;
        }
        gmTestBtn.disabled = true;
        gmTestBtn.textContent = 'Đang kiểm tra...';
        try{
          await testGeminiKey(f.key, f.model);
          if(gmStatusEl){
            gmStatusEl.className = 'az-status ok';
            gmStatusEl.textContent = `Kết nối Gemini thành công (${f.model})`;
          }
          notify('Key Gemini hoạt động tốt!');
        }catch(err){
          if(gmStatusEl){
            gmStatusEl.className = 'az-status err';
            const detail = err && err.message ? (' — ' + err.message) : '';
            gmStatusEl.textContent = err.code === 'AUTH_ERROR'
              ? 'Key Gemini không đúng hoặc bị từ chối' + detail
              : err.code === 'RATE_LIMIT'
                ? 'Key hợp lệ nhưng đang chạm giới hạn gọi phút này'
                : 'Không kết nối được Gemini' + detail;
          }
          notify('Kiểm tra Key Gemini thất bại');
        }finally{
          gmTestBtn.disabled = false;
          gmTestBtn.textContent = '✅ Kiểm tra Key';
        }
      };
    }

    const gmSaveBtn = document.getElementById('gm-save');
    if(gmSaveBtn){
      gmSaveBtn.onclick = () => {
        if(locSel) saveConfig({ localVoiceName: locSel.value });
        const saved = saveGeminiConfig(readGeminiForm());
        syncAfterConfigChange();
        hideModal();
        notify(isGeminiConfigured(saved) ? 'Đã lưu cấu hình Google Gemini' : 'Đã lưu tùy chọn (chưa có Gemini Key)');
      };
    }

    const gmClearBtn = document.getElementById('gm-clear');
    if(gmClearBtn){
      gmClearBtn.onclick = () => {
        clearGeminiConfig();
        if(gmKeyInp) gmKeyInp.value = '';
        if(gmStatusEl){
          gmStatusEl.className = 'az-status';
          gmStatusEl.textContent = 'Đã xóa Key Gemini';
        }
        syncAfterConfigChange();
        notify('Đã xóa Gemini Key khỏi trình duyệt');
      };
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', syncAfterConfigChange);
  }else{
    setTimeout(syncAfterConfigChange, 0);
  }

  window.TonePerfectSpeech = {
    ENDPOINT: TONEPERFECT_ENDPOINT,
    getConfig: getTonePerfectConfig,
    saveConfig: saveTonePerfectConfig,
    clearConfig: clearTonePerfectConfig,
    isConfigured: isTonePerfectConfigured,
    isAssessEnabled: isTonePerfectAssessEnabled,
    assessPronunciation: assessWithTonePerfect
  };

  window.ChivoxSpeech = {
    ENDPOINT: CHIVOX_ENDPOINT,
    getConfig: getChivoxConfig,
    saveConfig: saveChivoxConfig,
    clearConfig: clearChivoxConfig,
    isConfigured: isChivoxConfigured,
    isAssessEnabled: isChivoxAssessEnabled,
    testKey: testChivoxKey,
    assessPronunciation: assessWithChivox
  };

  window.GeminiSpeech = {
    MODELS: GEMINI_MODELS,
    getConfig: getGeminiConfig,
    saveConfig: saveGeminiConfig,
    clearConfig: clearGeminiConfig,
    isConfigured: isGeminiConfigured,
    isAssessEnabled: isGeminiAssessEnabled,
    normalizeAudioMime,
    blobToBase64,
    testKey: testGeminiKey,
    assessPronunciation: assessWithGemini
  };

  window.AzureSpeech = {
    VOICES,
    REGIONS,
    getConfig,
    saveConfig,
    clearConfig,
    isConfigured,
    isTtsEnabled,
    isAssessEnabled,
    getLocalZhVoices,
    pickBestZhVoice,
    speakLocal,
    speak,
    stopAudio,
    synthesizeToUrl,
    encodeWav16kMono,
    blobToPcm16k,
    loadSdk,
    assessPronunciation,
    openSettingsModal
  };
})();
