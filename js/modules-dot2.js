/* ==========================================================================
   ĐỢT 2: Bài khóa (tra từ bấm chọn), Chép bài khóa (ô kẻ viết tay),
   Luyện dịch (viết tay Apple Pencil / S Pen & Bàn phím), Bảng Ghi chú 3 cột
   ========================================================================== */

(function(){
  const esc = s => (typeof escHtml === 'function')
    ? escHtml(s)
    : String(s == null ? '' : s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  /* ---------- 1. BỘ VIẾT TAY STYLUS DÙNG CHUNG (Apple Pencil / S Pen) ---------- */
  function createStylusPad(canvas, opts){
    opts = opts || {};
    let tool = 'pen';
    let strokes = [];
    let activeStroke = null;
    let activePtrId = null;
    let lastPenAt = 0;
    let cssW = 0, cssH = 0, dpr = 1;
    const ctx = canvas.getContext('2d');
    canvas.style.touchAction = 'none';

    function emitChange(){
      if(typeof opts.onChange === 'function') opts.onChange(strokes);
    }
    function pointFromEvent(e){
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || cssW || 1, h = rect.height || cssH || 1;
      const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / w));
      const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / h));
      let p = 0.55;
      if(e.pointerType === 'pen'){
        p = Number.isFinite(e.pressure) && e.pressure > 0 ? Math.min(1, Math.max(0.28, e.pressure)) : 0.62;
      }
      return [Number(nx.toFixed(4)), Number(ny.toFixed(4)), Number(p.toFixed(2))];
    }
    function strokeSegment(s, i){
      if(!s || !s.pts.length || !cssW || !cssH) return;
      const pts = s.pts;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if(s.tool === 'eraser'){
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = s.size || (opts.eraserWidth || 18);
      }else{
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = opts.color || '#2B1B15';
        const p = pts[i] ? pts[i][2] : 0.55;
        ctx.lineWidth = (s.size || opts.baseWidth || 2.8) * (0.68 + p * 0.68);
      }
      if(pts.length === 1){
        const x = pts[0][0] * cssW, y = pts[0][1] * cssH;
        ctx.beginPath();
        ctx.arc(x, y, ctx.lineWidth * 0.5, 0, Math.PI * 2);
        if(s.tool === 'eraser'){
          ctx.fillStyle = 'rgba(0,0,0,1)';
        }else{
          ctx.fillStyle = ctx.strokeStyle;
        }
        ctx.fill();
        ctx.restore();
        return;
      }
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i];
      const x0 = p0[0] * cssW, y0 = p0[1] * cssH;
      const x1 = p1[0] * cssW, y1 = p1[1] * cssH;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      if(i >= 2){
        const pm = pts[i - 2];
        const xm = (pm[0] * cssW + x0) / 2, ym = (pm[1] * cssH + y0) / 2;
        const xc = (x0 + x1) / 2, yc = (y0 + y1) / 2;
        ctx.moveTo(xm, ym);
        ctx.quadraticCurveTo(x0, y0, xc, yc);
        ctx.lineTo(x1, y1);
      }else{
        ctx.lineTo(x1, y1);
      }
      ctx.stroke();
      ctx.restore();
    }
    function redraw(){
      if(!cssW || !cssH) return;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      for(let si = 0; si < strokes.length; si++){
        const s = strokes[si];
        if(!s || !s.pts || !s.pts.length) continue;
        if(s.pts.length === 1){ strokeSegment(s, 0); continue; }
        for(let pi = 1; pi < s.pts.length; pi++){ strokeSegment(s, pi); }
      }
      ctx.restore();
    }
    function resize(){
      const rect = canvas.getBoundingClientRect();
      if(rect.width < 8 || rect.height < 8) return false;
      dpr = Math.min(2.5, window.devicePixelRatio || 1);
      cssW = rect.width;
      cssH = rect.height;
      const targetW = Math.round(cssW * dpr), targetH = Math.round(cssH * dpr);
      if(canvas.width !== targetW || canvas.height !== targetH){
        canvas.width = targetW;
        canvas.height = targetH;
      }
      redraw();
      return true;
    }

    canvas.addEventListener('pointerdown', e => {
      if(e.button && e.button !== 0) return;
      if(e.pointerType === 'pen') lastPenAt = Date.now();
      else if(e.pointerType === 'touch' && (Date.now() - lastPenAt < 10000) && ((e.width && e.width > 24) || (e.height && e.height > 24))){
        return; // Palm rejection khi mới sử dụng bút cảm ứng
      }
      if(!cssW || !cssH) resize();
      activePtrId = e.pointerId;
      try{ canvas.setPointerCapture(e.pointerId); }catch(_){}
      const pt = pointFromEvent(e);
      activeStroke = {
        tool,
        size: tool === 'eraser' ? (opts.eraserWidth || 18) : (opts.baseWidth || 2.8),
        pts: [pt]
      };
      strokes.push(activeStroke);
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      strokeSegment(activeStroke, 0);
      ctx.restore();
      if(typeof opts.onInteract === 'function') opts.onInteract();
    });
    canvas.addEventListener('pointermove', e => {
      if(!activeStroke || e.pointerId !== activePtrId) return;
      const pt = pointFromEvent(e);
      const last = activeStroke.pts[activeStroke.pts.length - 1];
      if(last && Math.hypot((pt[0] - last[0]) * cssW, (pt[1] - last[1]) * cssH) < 1.3) return;
      activeStroke.pts.push(pt);
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      strokeSegment(activeStroke, activeStroke.pts.length - 1);
      ctx.restore();
    });
    function finishPtr(e){
      if(!activeStroke || e.pointerId !== activePtrId) return;
      try{ canvas.releasePointerCapture(e.pointerId); }catch(_){}
      activeStroke = null;
      activePtrId = null;
      emitChange();
    }
    canvas.addEventListener('pointerup', finishPtr);
    canvas.addEventListener('pointercancel', finishPtr);

    return {
      resize,
      redraw,
      setTool(t){ tool = (t === 'eraser') ? 'eraser' : 'pen'; },
      getTool(){ return tool; },
      undo(){ if(!strokes.length) return false; strokes.pop(); redraw(); emitChange(); return true; },
      clear(){ strokes = []; redraw(); emitChange(); },
      getStrokes(){ return strokes.map(s => ({tool: s.tool, size: s.size, pts: s.pts.map(p => p.slice())})); },
      setStrokes(arr){
        strokes = Array.isArray(arr) ? arr.filter(s => s && Array.isArray(s.pts) && s.pts.length).map(s => ({tool: s.tool === 'eraser' ? 'eraser' : 'pen', size: Number(s.size) || 2.8, pts: s.pts})) : [];
        if(!resize()) redraw();
      },
      hasInk(){ return strokes.some(s => s.tool !== 'eraser' && s.pts && s.pts.length); }
    };
  }

  /* ---------- 2. TỪ ĐIỂN & TÁCH TỪ BÀI KHÓA (100% DỮ LIỆU THẬT) ---------- */
  const POS_MAP = {
    'danh': 'danh từ', 'động': 'động từ', 'tính': 'tính từ', 'đại': 'đại từ',
    'phó': 'phó từ', 'trợ': 'trợ từ', 'lượng': 'lượng từ', 'số': 'số từ',
    'liên': 'liên từ', 'giới': 'giới từ', 'thán': 'thán từ', 'cụm': 'cụm từ'
  };
  const CORE_POS_MAP = {
    '你好':'cụm từ','你':'đại từ','好':'tính từ','一':'số từ','五':'số từ','八':'số từ',
    '大':'tính từ','不':'phó từ','口':'danh từ','白':'tính từ','女':'danh từ','马':'danh từ',
    '忙':'tính từ','吗':'trợ từ nghi vấn','很':'phó từ','汉语':'danh từ','难':'tính từ','太':'phó từ',
    '爸爸':'danh từ','妈妈':'danh từ','他':'đại từ','她':'đại từ','男':'tính từ',
    '哥哥':'danh từ','弟弟':'danh từ','妹妹':'danh từ','学':'động từ','英语':'danh từ',
    '对':'tính từ','明天':'danh từ','见':'động từ','去':'động từ','邮局':'danh từ',
    '寄':'động từ','信':'danh từ','银行':'danh từ','取':'động từ','钱':'danh từ',
    '六':'số từ','七':'số từ','九':'số từ','北京':'danh từ riêng',
    '今天':'danh từ','昨天':'danh từ','星期':'danh từ','几':'đại từ','二':'số từ',
    '三':'số từ','四':'số từ','哪儿':'đại từ','那儿':'đại từ','我':'đại từ',
    '回':'động từ','学校':'danh từ','再见':'cụm từ','对不起':'cụm từ','没关系':'cụm từ',
    '天安门':'danh từ riêng','这':'đại từ','是':'động từ','老师':'danh từ','您':'đại từ',
    '请':'động từ','进':'động từ','坐':'động từ','喝':'động từ','茶':'danh từ',
    '谢谢':'động từ','不客气':'cụm từ','工作':'danh từ / động từ','身体':'danh từ','十':'số từ','日':'danh từ',
    '喜欢':'động từ','爱好':'danh từ','运动':'động từ / danh từ','电影':'danh từ','音乐':'danh từ',
    '看书':'động từ','喝茶':'động từ','唱歌':'động từ','游泳':'động từ','旅游':'động từ',
    '什么':'đại từ','和':'liên từ','也':'phó từ','都':'phó từ','经常':'phó từ',
    '看':'động từ','书':'danh từ','中文':'danh từ','小说':'danh từ','有':'động từ','的':'trợ từ',
    '没':'phó từ','没有':'động từ / phó từ','在':'động từ / giới từ','想':'động từ','能':'động từ năng nguyện'
  };
  function formatPos(rawPos, zh){
    const raw = String(rawPos || '').trim();
    if(raw){
      return raw.split('/').map(p => POS_MAP[p.trim()] || p.trim()).join(' / ');
    }
    return CORE_POS_MAP[zh] || 'từ vựng';
  }
  function buildLessonLexicon(){
    const map = new Map();
    const put = (zh, py, vi, pos, prio) => {
      if(!zh) return;
      const cur = map.get(zh);
      if(cur && cur.prio > prio && cur.py && cur.vi) return;
      map.set(zh, {
        zh,
        py: py || (cur && cur.py) || '',
        vi: vi || (cur && cur.vi) || '',
        pos: formatPos(pos, zh),
        prio
      });
    };
    // 1. Từ vựng trong bài đang học (ưu tiên cao nhất)
    (typeof WORDS !== 'undefined' ? WORDS : []).forEach(w => put(w.zh, w.py, w.vi, w.pos, 10));
    // 2. Kho từ vựng toàn app
    try{
      Object.values((store && store.vocabBank) || {}).forEach(w => put(w.zh, w.py, w.vi, w.pos, 7));
    }catch(_){}
    // 3. Các gói starter & full
    const ingestVol = obj => {
      if(!obj || typeof obj !== 'object') return;
      Object.values(obj).forEach(vol => {
        if(!vol || typeof vol !== 'object') return;
        Object.values(vol).forEach(ls => {
          (ls && ls.words || []).forEach(w => put(w.zh, w.py, w.vi, w.pos, 6));
        });
      });
    };
    if(typeof HN_STARTER_DATA !== 'undefined') ingestVol(HN_STARTER_DATA);
    if(typeof HN1_FULL_DATA !== 'undefined') ingestVol({1: HN1_FULL_DATA});
    if(typeof HN2_FULL_DATA !== 'undefined') ingestVol({2: HN2_FULL_DATA});
    // 4. Dữ liệu chữ Hán & từ ghép trong Hack não / Sơ đồ tư duy
    if(typeof HANZI_HACKNAO_DB !== 'undefined'){
      Object.entries(HANZI_HACKNAO_DB).forEach(([ch, e]) => {
        put(ch, e.py, e.meaning, CORE_POS_MAP[ch], 4);
        (e.compounds || []).forEach(cp => put(cp.zh, cp.py, cp.vi, CORE_POS_MAP[cp.zh], 3));
      });
    }
    if(typeof HANZI_MINDMAP_DB !== 'undefined'){
      Object.entries(HANZI_MINDMAP_DB).forEach(([ch, e]) => {
        put(ch, e.py, e.meaning, CORE_POS_MAP[ch], 4);
        (e.groups || []).forEach(g => (g.items || []).forEach(it => put(it.zh, it.py, it.vi, CORE_POS_MAP[it.zh], 3)));
      });
    }
    // Bổ sung các từ cấu trúc cốt lõi xuất hiện thường xuyên trong hội thoại
    [
      ['有什么','yǒu shénme','có ... gì','cụm từ'],
      ['喝茶','hē chá','uống trà','động từ'],
      ['看书','kàn shū','đọc sách','động từ'],
      ['中文小说','Zhōngwén xiǎoshuō','tiểu thuyết tiếng Trung','cụm từ'],
      ['有意思','yǒuyìsi','thú vị, hay','tính từ'],
      ['觉得','juéde','cảm thấy, cho rằng','động từ'],
      ['周末','zhōumò','cuối tuần','danh từ'],
      ['经常','jīngcháng','thường xuyên','phó từ'],
      ['常常','chángcháng','thường thường','phó từ'],
      ['太难','tài nán','khó quá','cụm từ'],
      ['不太难','bú tài nán','không khó lắm','cụm từ']
    ].forEach(([zh, py, vi, pos]) => {
      if(!map.has(zh)) put(zh, py, vi, pos, 5);
    });
    return map;
  }
  function tokenizeDialogLine(zh, lexMap){
    const s = String(zh || '');
    const out = [];
    const isHan = c => /[\u4e00-\u9fff]/.test(c);
    let idx = 0;
    while(idx < s.length){
      if(!isHan(s[idx])){
        out.push({type:'sep', text:s[idx]});
        idx++;
        continue;
      }
      let matched = '';
      for(let len = Math.min(4, s.length - idx); len >= 2; len--){
        const cand = s.slice(idx, idx + len);
        if([...cand].every(isHan) && lexMap.has(cand)){
          matched = cand;
          break;
        }
      }
      if(!matched) matched = s[idx];
      out.push({type:'word', text:matched});
      idx += matched.length;
    }
    return out;
  }

  /* ---------- 3. MODULE BÀI KHÓA (#dialog) ---------- */
  const dialogCtrl = (function(){
    let curTab = 'content';
    let showPinyin = true;
    let speed = 1.0;
    let playing = false;
    let shadowMode = false;
    let playSeqToken = 0;
    let activeAudioEl = null;
    let curLineIdx = -1;
    let curPopWord = null;
    let lexMap = new Map();

    function curLesson(){
      return (typeof LESSONS !== 'undefined') ? (LESSONS.find(x => x.id === store.activeLessonId) || null) : null;
    }
    function stopPlayback(){
      playSeqToken++;
      playing = false;
      shadowMode = false;
      curLineIdx = -1;
      try{ if(activeAudioEl){ activeAudioEl.pause(); activeAudioEl = null; } }catch(_){}
      try{ if(typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); }catch(_){}
      const btn = $('#bk-play-btn');
      if(btn) btn.innerHTML = '<svg class="ic f"><use href="#i-play"></use></svg>';
      const actP = $('#bk-act-play'), actS = $('#bk-act-shadow');
      if(actP) actP.classList.add('on');
      if(actS) actS.classList.remove('on');
      $$('#bk-lines .bk-line').forEach(el => el.classList.remove('speaking'));
    }
    function fmtTime(sec){
      if(!Number.isFinite(sec) || sec < 0) return '0:00';
      const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    }
    async function findLessonAudioBlob(){
      const l = curLesson();
      if(!l || !Array.isArray(l.audioTracks) || !l.audioTracks.length || typeof HanyuIDB === 'undefined') return null;
      for(const tr of l.audioTracks){
        let rec = await HanyuIDB.get('media', normMediaName(tr.fileName));
        if(!rec && tr.fileName && tr.fileName.includes('/')){
          rec = await HanyuIDB.get('media', normMediaName(tr.fileName.split('/').pop()));
        }
        if(rec && rec.blob) return { blob: rec.blob, label: tr.label || tr.fileName };
      }
      return null;
    }
    function syncPlayerUI(){
      const l = curLesson();
      const dlgs = LISTEN_DIALOG && LISTEN_DIALOG.length ? LISTEN_DIALOG : SENT;
      const tTitle = $('#bk-track-title');
      if(tTitle) tTitle.textContent = l ? `Bài khóa · ${l.code || l.titleVi || 'Bài học'}` : 'Bài khóa';
      const spdBtn = $('#bk-speed-btn');
      if(spdBtn) spdBtn.textContent = speed.toFixed(speed === 0.75 ? 2 : 1) + '×';
      const timeEl = $('#bk-time');
      if(timeEl && !activeAudioEl && !playing){
        timeEl.textContent = `0 / ${dlgs.length} câu`;
      }
      const volBtn = $('#bk-vol-btn');
      if(volBtn) volBtn.classList.toggle('off', !showPinyin);
      const saveBtn = $('#bk-act-save');
      if(saveBtn && l){
        const saved = Array.isArray(store.savedLessonIds) && store.savedLessonIds.includes(l.id);
        saveBtn.classList.toggle('saved', saved);
        const sp = saveBtn.querySelector('span');
        if(sp) sp.textContent = saved ? 'Đã lưu bài' : 'Lưu bài';
      }
    }
    async function startPlay(shadow){
      const dlgs = LISTEN_DIALOG && LISTEN_DIALOG.length ? LISTEN_DIALOG : SENT;
      if(!dlgs.length){ toast('Bài này chưa có nội dung bài khóa'); return; }
      if(playing && shadow === shadowMode){
        stopPlayback();
        return;
      }
      stopPlayback();
      playing = true;
      shadowMode = !!shadow;
      const myToken = ++playSeqToken;
      const playBtn = $('#bk-play-btn');
      if(playBtn) playBtn.innerHTML = '<svg class="ic" viewBox="0 0 24 24"><rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/></svg>';
      const actP = $('#bk-act-play'), actS = $('#bk-act-shadow');
      if(actP) actP.classList.toggle('on', !shadowMode);
      if(actS) actS.classList.toggle('on', shadowMode);

      if(typeof markLessonSectionDone === 'function' && store.activeLessonId){
        markLessonSectionDone(store.activeLessonId, 'dialog', true);
      }

      if(!shadowMode){
        const media = await findLessonAudioBlob();
        if(myToken !== playSeqToken) return;
        if(media && media.blob){
          const url = URL.createObjectURL(media.blob);
          const audio = new Audio(url);
          activeAudioEl = audio;
          audio.playbackRate = speed;
          const seek = $('#bk-seek'), tEl = $('#bk-time');
          audio.ontimeupdate = () => {
            if(myToken !== playSeqToken) return;
            const dur = audio.duration || 0, cur = audio.currentTime || 0;
            if(seek && dur > 0) seek.value = String(Math.round(cur / dur * 100));
            if(tEl) tEl.textContent = `${fmtTime(cur)} / ${fmtTime(dur)}`;
          };
          audio.onended = () => {
            URL.revokeObjectURL(url);
            if(myToken === playSeqToken) stopPlayback();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            activeAudioEl = null;
            playTtsSeq(0, myToken);
          };
          audio.play().catch(() => {
            URL.revokeObjectURL(url);
            activeAudioEl = null;
            playTtsSeq(0, myToken);
          });
          return;
        }
      }
      playTtsSeq(0, myToken);
    }
    function playTtsSeq(startIdx, myToken){
      const dlgs = LISTEN_DIALOG && LISTEN_DIALOG.length ? LISTEN_DIALOG : SENT;
      let idx = startIdx;
      const step = () => {
        if(myToken !== playSeqToken || idx >= dlgs.length){
          if(myToken === playSeqToken) stopPlayback();
          return;
        }
        curLineIdx = idx;
        const line = dlgs[idx];
        $$('#bk-lines .bk-line').forEach((el, i) => el.classList.toggle('speaking', i === idx));
        const seek = $('#bk-seek'), tEl = $('#bk-time');
        if(seek) seek.value = String(Math.round((idx + 1) / dlgs.length * 100));
        if(tEl) tEl.textContent = `${idx + 1} / ${dlgs.length} câu`;
        const effSpeed = shadowMode ? Math.min(speed, 0.8) : speed;
        const delayMs = shadowMode ? 1100 : 280;
        let doneCalled = false;
        const nextLine = () => {
          if(doneCalled) return;
          doneCalled = true;
          idx++;
          setTimeout(step, delayMs);
        };
        if(typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined' && line.zh){
          try{
            const u = new SpeechSynthesisUtterance(line.zh);
            u.lang = 'zh-CN';
            u.rate = effSpeed;
            const vs = speechSynthesis.getVoices() || [];
            const v = vs.find(x => x.lang && x.lang.toLowerCase().startsWith('zh'));
            if(v) u.voice = v;
            u.onend = nextLine;
            u.onerror = nextLine;
            speechSynthesis.cancel();
            speechSynthesis.speak(u);
            setTimeout(nextLine, Math.max(2400, (line.zh.length || 6) * 450));
          }catch(_){
            setTimeout(nextLine, 1800);
          }
        }else{
          setTimeout(nextLine, 1800);
        }
      };
      step();
    }

    function openTokenPop(tokText, lineEl, tokBtn){
      const pop = $('#bk-pop');
      if(!pop) return;
      const info = lexMap.get(tokText) || { zh: tokText, py: '', vi: 'Chưa có nghĩa đối chiếu cho từ này', pos: formatPos('', tokText) };
      curPopWord = info;
      $$('#bk-lines .bk-tok').forEach(b => b.classList.toggle('on', b === tokBtn));
      $('#bk-pop-zh').textContent = info.zh;
      $('#bk-pop-py').textContent = info.py || '—';
      $('#bk-pop-vi').textContent = info.vi || '—';
      $('#bk-pop-pos').textContent = info.pos || 'từ vựng';
      if(lineEl && lineEl.parentNode) lineEl.after(pop);
      pop.classList.remove('hide');
    }
    function closePop(){
      const pop = $('#bk-pop');
      if(pop) pop.classList.add('hide');
      $$('#bk-lines .bk-tok').forEach(b => b.classList.remove('on'));
      curPopWord = null;
    }

    function render(){
      const l = curLesson();
      lexMap = buildLessonLexicon();
      const subEl = $('#bk-sub');
      if(subEl) subEl.textContent = l ? `${l.code || 'Bài học'} · ${l.titleVi || l.titleZh || ''}` : 'Hội thoại mẫu';
      const pop = $('#bk-pop'), paneContent = $('#bk-pane-content');
      if(pop && paneContent && pop.parentNode !== paneContent) paneContent.appendChild(pop);
      closePop();

      const dlgs = LISTEN_DIALOG && LISTEN_DIALOG.length ? LISTEN_DIALOG : SENT;
      const linesEl = $('#bk-lines');
      if(linesEl){
        if(!dlgs.length){
          linesEl.innerHTML = '<p class="muted small" style="padding:12px">Bài học này chưa có hội thoại bài khóa.</p>';
        }else{
          linesEl.innerHTML = dlgs.map((d, i) => {
            const spk = esc(d.speaker || (i % 2 === 0 ? 'A' : 'B'));
            const isB = spk === 'B' || i % 2 === 1;
            const toks = tokenizeDialogLine(d.zh, lexMap).map(tk =>
              tk.type === 'word'
                ? `<button class="bk-tok" data-bktok="${esc(tk.text)}" type="button">${esc(tk.text)}</button>`
                : `<span class="bk-sep">${esc(tk.text)}</span>`
            ).join('');
            return `<div class="bk-line" data-bkline="${i}">
              <button aria-label="Nghe câu ${i + 1}" class="bk-spk${isB ? ' b' : ''}" data-say="${esc(d.zh)}" type="button">${spk}</button>
              <div class="bk-line-body">
                <div class="bk-zh-row">${toks}</div>
                ${showPinyin && d.py ? `<div class="bk-py">${esc(d.py)}</div>` : ''}
                ${d.vi ? `<div class="bk-vi">${esc(d.vi)}</div>` : ''}
              </div>
              <button aria-label="Đọc câu ${i + 1}" class="bk-line-say" data-say="${esc(d.zh)}" type="button"><svg class="ic"><use href="#i-vol"></use></svg></button>
            </div>`;
          }).join('');
        }
      }

      // Tab Từ mới
      const wBox = $('#bk-pane-words');
      if(wBox){
        if(!WORDS.length){
          wBox.innerHTML = '<p class="muted small" style="padding:12px">Bài học chưa có danh sách từ mới.</p>';
        }else{
          wBox.innerHTML = `<div class="bk-wlist">${WORDS.map(w => `<div class="bk-wrow" data-say="${esc(w.zh)}">
            <div class="bk-wzh">${esc(w.zh)}</div>
            <div class="bk-wmid"><b>${esc(w.py || '')}</b><span>${esc(w.vi || '')}</span></div>
            <span class="bk-wpos">${esc(formatPos(w.pos, w.zh))}</span>
          </div>`).join('')}</div>`;
        }
      }

      // Tab Ngữ pháp
      const gBox = $('#bk-pane-grammar');
      if(gBox){
        const gList = Object.values(GRAMMAR_POINTS || {});
        if(!gList.length){
          gBox.innerHTML = '<p class="muted small" style="padding:12px">Bài học chưa có ghi chú ngữ pháp.</p>';
        }else{
          gBox.innerHTML = `<div class="bk-glist">${gList.map(g => `<div class="bk-gitem">
            <b>${esc(g.title || '')}</b>
            ${g.explain ? `<p>${esc(g.explain)}</p>` : ''}
            ${g.ex ? `<div class="bk-gex" data-say="${esc(g.ex)}">${esc(g.ex)}</div>` : ''}
            ${Array.isArray(g.examples) ? g.examples.map(ex => `<div class="bk-gex" data-say="${esc(ex.zh)}"><b>${esc(ex.zh)}</b>${ex.py ? ' · ' + esc(ex.py) : ''}${ex.vi ? ' — ' + esc(ex.vi) : ''}</div>`).join('') : ''}
          </div>`).join('')}</div>`;
        }
      }

      if(paneContent) paneContent.classList.toggle('hide', curTab !== 'content');
      if(wBox) wBox.classList.toggle('hide', curTab !== 'words');
      if(gBox) gBox.classList.toggle('hide', curTab !== 'grammar');
      $$('#bk-tabs button').forEach(b => b.classList.toggle('on', b.dataset.bktab === curTab));
      syncPlayerUI();
    }

    if($('#bk-tabs')) $('#bk-tabs').addEventListener('click', e => {
      const b = e.target.closest('button[data-bktab]');
      if(!b) return;
      curTab = b.dataset.bktab;
      render();
    });
    if($('#bk-lines')) $('#bk-lines').addEventListener('click', e => {
      const tb = e.target.closest('[data-bktok]');
      if(!tb) return;
      const lineEl = tb.closest('.bk-line');
      openTokenPop(tb.dataset.bktok, lineEl, tb);
      if(typeof speak === 'function') speak(tb.dataset.bktok, speed);
    });
    if($('#bk-pop-close')) $('#bk-pop-close').onclick = closePop;
    if($('#bk-pop-spk')) $('#bk-pop-spk').onclick = () => { if(curPopWord && typeof speak === 'function') speak(curPopWord.zh, speed); };
    if($('#bk-pop-note-btn')) $('#bk-pop-note-btn').onclick = () => {
      if(!curPopWord) return;
      const line = `• ${curPopWord.zh}${curPopWord.py ? ' (' + curPopWord.py + ')' : ''}: ${curPopWord.vi}${curPopWord.pos ? ' [' + curPopWord.pos + ']' : ''}`;
      if(typeof appendLessonNote === 'function') appendLessonNote(line);
      toast(`Đã lưu "${curPopWord.zh}" vào Ghi chú`);
    };
    if($('#bk-play-btn')) $('#bk-play-btn').onclick = () => startPlay(false);
    if($('#bk-act-play')) $('#bk-act-play').onclick = () => startPlay(false);
    if($('#bk-act-shadow')) $('#bk-act-shadow').onclick = () => startPlay(true);
    if($('#bk-speed-btn')) $('#bk-speed-btn').onclick = () => {
      const order = [1.0, 0.75, 1.25];
      speed = order[(order.indexOf(speed) + 1) % order.length];
      if(activeAudioEl) activeAudioEl.playbackRate = speed;
      syncPlayerUI();
    };
    if($('#bk-vol-btn')) $('#bk-vol-btn').onclick = () => {
      showPinyin = !showPinyin;
      render();
    };
    if($('#bk-seek')) $('#bk-seek').addEventListener('input', e => {
      const pct = Number(e.target.value) || 0;
      if(activeAudioEl && Number.isFinite(activeAudioEl.duration) && activeAudioEl.duration > 0){
        activeAudioEl.currentTime = activeAudioEl.duration * pct / 100;
      }else if(playing){
        const dlgs = LISTEN_DIALOG && LISTEN_DIALOG.length ? LISTEN_DIALOG : SENT;
        const target = Math.min(dlgs.length - 1, Math.floor(dlgs.length * pct / 100));
        const wasShadow = shadowMode;
        stopPlayback();
        playing = true;
        shadowMode = wasShadow;
        playTtsSeq(target, ++playSeqToken);
      }
    });
    if($('#bk-act-save')) $('#bk-act-save').onclick = () => {
      const lid = store.activeLessonId;
      if(!lid) return;
      if(!Array.isArray(store.savedLessonIds)) store.savedLessonIds = [];
      const idx = store.savedLessonIds.indexOf(lid);
      if(idx >= 0){
        store.savedLessonIds.splice(idx, 1);
        saveStore(store);
        toast('Đã bỏ lưu bài khóa');
      }else{
        store.savedLessonIds.push(lid);
        if(typeof markLessonSectionDone === 'function') markLessonSectionDone(lid, 'dialog', true);
        else saveStore(store);
        toast('Đã lưu bài khóa để xem lại nhanh');
      }
      syncPlayerUI();
    };

    window._stopDialog = stopPlayback;
    return {
      render,
      enter(){
        render();
        if(typeof notesCtrl !== 'undefined') notesCtrl.sync();
      },
      stop: stopPlayback
    };
  })();

  /* ---------- 4. MODULE CHÉP BÀI KHÓA (#copy) ---------- */
  const copyCtrl = (function(){
    let rowPads = [];
    let activeRow = 0;
    let curTool = 'pen';
    let showGuide = true;

    function getLines(){
      const src = (LISTEN_DIALOG && LISTEN_DIALOG.length) ? LISTEN_DIALOG : SENT;
      return (src || []).filter(x => x && x.zh);
    }
    function updateProg(){
      const lines = getLines();
      const total = lines.length;
      const filled = rowPads.filter(p => p && p.hasInk()).length;
      const bar = $('#cp-bar'), cnt = $('#cp-cnt');
      if(bar) bar.style.width = total ? Math.round(filled / total * 100) + '%' : '0%';
      if(cnt) cnt.textContent = `${filled} / ${total} dòng`;
    }
    function persistDrafts(silent){
      const lid = store.activeLessonId;
      if(!lid) return;
      if(!store.copyDrafts || typeof store.copyDrafts !== 'object') store.copyDrafts = {};
      const out = {};
      rowPads.forEach((p, idx) => {
        if(!p) return;
        const st = p.getStrokes();
        if(st.length) out[idx] = st;
      });
      store.copyDrafts[lid] = out;
      saveStore(store);
      if(!silent) toast('Đã lưu nét chép bài khóa vào máy');
    }
    let draftTimer = null;
    function scheduleSave(){
      clearTimeout(draftTimer);
      draftTimer = setTimeout(() => persistDrafts(true), 600);
    }
    function setActiveTool(t){
      curTool = (t === 'eraser') ? 'eraser' : 'pen';
      const pBtn = $('#cp-tool-pen'), eBtn = $('#cp-tool-eraser');
      if(pBtn) pBtn.classList.toggle('on', curTool === 'pen');
      if(eBtn) eBtn.classList.toggle('on', curTool === 'eraser');
      rowPads.forEach(p => { if(p) p.setTool(curTool); });
    }
    function syncRowFocus(){
      $$('#cp-rows .cp-card').forEach((c, idx) => c.classList.toggle('active', idx === activeRow));
    }

    function render(){
      const l = (typeof LESSONS !== 'undefined') ? LESSONS.find(x => x.id === store.activeLessonId) : null;
      const sub = $('#cp-sub');
      if(sub) sub.textContent = l ? `${l.code || 'Bài học'} · ${l.titleVi || l.titleZh || ''}` : 'Chép bài khóa';
      const guideBtn = $('#cp-guide-btn');
      if(guideBtn) guideBtn.classList.toggle('on', showGuide);

      const box = $('#cp-rows');
      if(!box) return;
      const lines = getLines();
      rowPads = [];
      activeRow = 0;
      if(!lines.length){
        box.innerHTML = '<div class="card"><p class="muted small" style="margin:0">Bài học này chưa có câu bài khóa để chép.</p></div>';
        updateProg();
        return;
      }
      const lid = store.activeLessonId;
      const savedDrafts = (store.copyDrafts && lid && store.copyDrafts[lid]) || {};

      box.innerHTML = lines.map((line, idx) => {
        const chars = [...String(line.zh || '')].filter(c => !/\s/.test(c));
        const cols = Math.min(14, Math.max(10, chars.length));
        const rowsCnt = chars.length > 14 ? Math.ceil(chars.length / cols) : 1;
        const cellCount = cols * rowsCnt;
        const cellsHtml = Array.from({length: cellCount}, (_, ci) => {
          const ch = chars[ci] || '';
          return `<span class="cp-cell">${showGuide && ch ? `<i>${esc(ch)}</i>` : ''}</span>`;
        }).join('');
        return `<div class="cp-card${idx === 0 ? ' active' : ''}" data-cprow="${idx}">
          <div class="cp-head">
            <div class="cp-model">
              ${line.py ? `<div class="cp-py">${esc(line.py)}</div>` : ''}
              <div class="cp-zh">${esc(line.zh)}</div>
            </div>
            <button aria-label="Nghe câu ${idx + 1}" class="cp-say" data-say="${esc(line.zh)}" type="button"><svg class="ic"><use href="#i-vol"></use></svg></button>
          </div>
          <div class="cp-grid-box${rowsCnt > 1 ? ' multi' : ''}" data-cols="${cols}" style="--cp-cols:${cols};--cp-rows:${rowsCnt}">
            <div aria-hidden="true" class="cp-cells">${cellsHtml}</div>
            <canvas class="cp-cv" id="cp-cv-${idx}"></canvas>
          </div>
        </div>`;
      }).join('');

      lines.forEach((_, idx) => {
        const cvEl = $(`#cp-cv-${idx}`);
        if(!cvEl) return;
        const pad = createStylusPad(cvEl, {
          baseWidth: 2.6,
          eraserWidth: 16,
          onInteract(){
            activeRow = idx;
            syncRowFocus();
          },
          onChange(){
            updateProg();
            scheduleSave();
          }
        });
        pad.setTool(curTool);
        if(Array.isArray(savedDrafts[idx])) pad.setStrokes(savedDrafts[idx]);
        rowPads[idx] = pad;
      });
      updateProg();
    }

    function resizeAll(){
      rowPads.forEach(p => { if(p) p.resize(); });
    }

    if($('#cp-guide-btn')) $('#cp-guide-btn').onclick = () => {
      persistDrafts(true);
      showGuide = !showGuide;
      render();
      requestAnimationFrame(resizeAll);
    };
    if($('#cp-tool-pen')) $('#cp-tool-pen').onclick = () => setActiveTool('pen');
    if($('#cp-tool-eraser')) $('#cp-tool-eraser').onclick = () => setActiveTool('eraser');
    if($('#cp-tool-undo')) $('#cp-tool-undo').onclick = () => {
      const p = rowPads[activeRow] || rowPads.find(x => x && x.hasInk());
      if(p) p.undo();
    };
    if($('#cp-tool-clear')) $('#cp-tool-clear').onclick = () => {
      const p = rowPads[activeRow];
      if(p){ p.clear(); persistDrafts(true); toast(`Đã xóa nét ở dòng ${activeRow + 1}`); }
    };
    if($('#cp-tool-save')) $('#cp-tool-save').onclick = () => persistDrafts(false);
    if($('#cp-info-btn')) $('#cp-info-btn').onclick = () => toast('Khung viết hỗ trợ Apple Pencil / S Pen (lực nhấn & chống chạm lòng bàn tay)');
    if($('#cp-done-btn')) $('#cp-done-btn').onclick = () => {
      persistDrafts(true);
      const lid = store.activeLessonId;
      const lines = getLines();
      const filled = rowPads.filter(p => p && p.hasInk()).length;
      if(typeof markLessonSectionDone === 'function' && lid){
        markLessonSectionDone(lid, 'copy', false);
      }
      if(typeof recordLearningEvent === 'function'){
        recordLearningEvent({type:'write', skill:'write', title:'Chép bài khóa', result:`${filled}/${lines.length} dòng`, view:'copy'});
      }
      toast('Đã hoàn thành Chép bài khóa!');
    };
    window.addEventListener('resize', () => {
      if(typeof curView !== 'undefined' && curView === 'copy') requestAnimationFrame(resizeAll);
    });

    return {
      render,
      enter(){
        render();
        requestAnimationFrame(resizeAll);
        if(typeof notesCtrl !== 'undefined') notesCtrl.sync();
      },
      getPads(){ return rowPads; }
    };
  })();

  /* ---------- 5. MODULE LUYỆN DỊCH (#trans) ---------- */
  const transCtrl = (function(){
    let dir = 'vi2zh';
    let inputMode = 'draw';
    let tool = 'pen';
    let qi = 0;
    let pad = null;
    let doneSet = new Set();

    function getItems(){
      const out = [], seen = new Set();
      (LISTEN_DIALOG || []).concat(SENT || []).forEach(x => {
        if(!x || !x.zh || !x.vi || seen.has(x.zh)) return;
        seen.add(x.zh);
        out.push({ zh: x.zh, py: x.py || '', vi: x.vi });
      });
      return out;
    }
    function syncWatermark(){
      const wm = $('#tr-watermark');
      if(!wm) return;
      const hide = inputMode !== 'draw' || (pad && pad.hasInk());
      wm.classList.toggle('hide', !!hide);
      const pEl = wm.querySelector('p');
      if(pEl) pEl.textContent = dir === 'vi2zh' ? 'Viết câu dịch bằng chữ Hán vào đây' : 'Viết câu dịch bằng tiếng Việt vào đây';
    }
    function initPad(){
      const cv = $('#tr-cv');
      if(!cv || pad) return;
      pad = createStylusPad(cv, {
        baseWidth: 2.9,
        eraserWidth: 18,
        onChange(){ syncWatermark(); }
      });
    }
    function markTransComplete(){
      const lid = store.activeLessonId;
      const items = getItems();
      if(typeof markLessonSectionDone === 'function' && lid){
        markLessonSectionDone(lid, 'trans', false);
      }
      if(typeof recordLearningEvent === 'function'){
        recordLearningEvent({type:'exercise', skill:'read', title:'Luyện dịch Việt ↔ Trung', result:`${doneSet.size || 1}/${items.length} câu`, view:'trans'});
      }
    }

    function render(){
      const l = (typeof LESSONS !== 'undefined') ? LESSONS.find(x => x.id === store.activeLessonId) : null;
      const sub = $('#tr-sub');
      if(sub) sub.textContent = l ? `${l.code || 'Bài học'} · ${l.titleVi || l.titleZh || ''}` : 'Luyện dịch';
      $$('#tr-dir-tabs button').forEach(b => b.classList.toggle('on', b.dataset.trdir === dir));
      $$('#tr-input-tabs button').forEach(b => b.classList.toggle('on', b.dataset.trmode === inputMode));
      const drawWrap = $('#tr-draw-wrap'), typeWrap = $('#tr-type-wrap');
      if(drawWrap) drawWrap.classList.toggle('hide', inputMode !== 'draw');
      if(typeWrap) typeWrap.classList.toggle('hide', inputMode !== 'type');
      const tp = $('#tr-tool-pen'), te = $('#tr-tool-eraser');
      if(tp) tp.classList.toggle('on', tool === 'pen');
      if(te) te.classList.toggle('on', tool === 'eraser');

      const items = getItems();
      const cnt = $('#tr-cnt'), lbl = $('#tr-prompt-lbl'), txt = $('#tr-prompt-txt'), pyEl = $('#tr-prompt-py'), spk = $('#tr-prompt-spk');
      const ansMain = $('#tr-ans-main'), ansPy = $('#tr-ans-py'), ta = $('#tr-textarea');
      $('#tr-hint-box').classList.add('hide');
      $('#tr-fb-box').classList.add('hide');

      if(!items.length){
        if(cnt) cnt.textContent = '0 / 0';
        if(txt) txt.textContent = 'Bài học này chưa có câu ví dụ để luyện dịch.';
        if(pyEl) pyEl.classList.add('hide');
        if(ansMain) ansMain.textContent = '—';
        if(ansPy) ansPy.textContent = '';
        return;
      }
      if(qi >= items.length) qi = 0;
      if(qi < 0) qi = items.length - 1;
      const cur = items[qi];
      if(cnt) cnt.textContent = `${qi + 1} / ${items.length}`;
      const lblSpan = lbl && lbl.querySelector('span:last-child');
      if(dir === 'vi2zh'){
        if(lblSpan) lblSpan.textContent = 'Dịch sang tiếng Trung:';
        if(txt) txt.textContent = cur.vi;
        if(pyEl) pyEl.classList.add('hide');
        if(spk) spk.classList.add('hide');
        if(ansMain) ansMain.textContent = cur.zh;
        if(ansPy){ ansPy.textContent = cur.py; ansPy.classList.toggle('hide', !cur.py); }
        if(ta) ta.placeholder = 'Nhập câu dịch bằng chữ Hán (ví dụ: 我喜欢喝茶。)...';
      }else{
        if(lblSpan) lblSpan.textContent = 'Dịch sang tiếng Việt:';
        if(txt) txt.textContent = cur.zh;
        if(pyEl){ pyEl.textContent = cur.py; pyEl.classList.toggle('hide', !cur.py); }
        if(spk) spk.classList.remove('hide');
        if(ansMain) ansMain.textContent = cur.vi;
        if(ansPy) ansPy.classList.add('hide');
        if(ta) ta.placeholder = 'Nhập câu dịch tiếng Việt...';
      }
      syncWatermark();
    }

    function showHint(){
      const items = getItems(), hb = $('#tr-hint-box');
      if(!items.length || !hb) return;
      const cur = items[qi];
      const lex = buildLessonLexicon();
      const hints = [];
      const seen = new Set();
      tokenizeDialogLine(cur.zh, lex).forEach(tk => {
        if(tk.type !== 'word' || seen.has(tk.text)) return;
        seen.add(tk.text);
        const info = lex.get(tk.text);
        if(info) hints.push(`<b>${esc(info.zh)}</b> (${esc(info.py)}): ${esc(info.vi)}`);
      });
      hb.innerHTML = `<div class="small"><b>Gợi ý từ vựng trong câu:</b><div class="tr-hint-chips">${hints.length ? hints.map(h => `<span>${h}</span>`).join('') : esc(cur.py || cur.vi)}</div></div>`;
      hb.classList.remove('hide');
    }

    function normViText(s){
      return String(s || '').toLowerCase().replace(/[.,!?;:"'“”‘’。，！？、\-()]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function checkAnswer(){
      const items = getItems(), fb = $('#tr-fb-box'), ansCard = $('#tr-ans-card');
      if(!items.length || !fb) return;
      const cur = items[qi];
      if(ansCard) ansCard.classList.add('open');

      if(inputMode === 'type'){
        const val = ($('#tr-textarea').value || '').trim();
        if(!val){ toast('Hãy nhập câu dịch trước khi kiểm tra'); return; }
        let ok = false, detail = '';
        if(dir === 'vi2zh'){
          const clean = s => String(s || '').replace(/[.,!?;:"'“”‘’。，！？、\s]/g, '');
          const gotClean = clean(val), expClean = clean(cur.zh);
          if(typeof diffChars === 'function'){
            const r = diffChars(gotClean, expClean);
            ok = r.exact;
            detail = `<div class="diff-line">${r.ops.map(op => op.t === 'ok' ? `<span class="dc ok">${esc(op.ch)}</span>` : op.t === 'sub' ? `<span class="dc sub">${esc(op.got)}→${esc(op.ch)}</span>` : op.t === 'miss' ? `<span class="dc miss">${esc(op.ch)}</span>` : `<span class="dc extra">${esc(op.ch)}</span>`).join('')}</div>`;
          }else{
            ok = gotClean === expClean;
          }
        }else{
          const a = normViText(val), b = normViText(cur.vi);
          const aWords = new Set(a.split(' ').filter(Boolean)), bWords = b.split(' ').filter(Boolean);
          const hit = bWords.filter(w => aWords.has(w)).length;
          ok = a === b || (bWords.length > 0 && hit / bWords.length >= 0.7);
          detail = `<div class="small" style="margin-top:4px">Đáp án mẫu: <b>${esc(cur.vi)}</b></div>`;
        }
        fb.className = 'tr-fb-box ' + (ok ? 'ok' : 'no');
        fb.innerHTML = `<b>${ok ? '✓ Chính xác!' : 'Gần đúng — đối chiếu lại với đáp án nhé:'}</b>${detail}`;
        fb.classList.remove('hide');
        if(ok){
          doneSet.add(qi);
          markTransComplete();
        }
        return;
      }

      // Chế độ Viết tay (không bịa chấm điểm OCR AI — đối chiếu đáp án tham khảo & tự xác nhận)
      if(!pad || !pad.hasInk()){ toast('Hãy viết câu dịch lên khung trước khi kiểm tra'); return; }
      fb.className = 'tr-fb-box self';
      fb.innerHTML = `<div class="tr-self-txt"><b>Đối chiếu với đáp án tham khảo bên dưới</b><span class="small muted">App chạy offline nên không tự chấm điểm chữ viết tay.</span></div>
        <div class="tr-self-btns">
          <button class="btn ghost sm" id="tr-self-retry" type="button">Viết lại</button>
          <button class="btn sm" id="tr-self-ok" type="button">Tôi viết đúng · Câu tiếp ›</button>
        </div>`;
      fb.classList.remove('hide');
      $('#tr-self-retry').onclick = () => { if(pad) pad.clear(); fb.classList.add('hide'); };
      $('#tr-self-ok').onclick = () => {
        doneSet.add(qi);
        markTransComplete();
        const itemsNow = getItems();
        if(qi + 1 < itemsNow.length) qi += 1;
        else { qi = 0; toast('Bạn đã hoàn thành đủ các câu luyện dịch của bài!'); }
        if(pad) pad.clear();
        render();
      };
    }

    if($('#tr-dir-tabs')) $('#tr-dir-tabs').addEventListener('click', e => {
      const b = e.target.closest('button[data-trdir]');
      if(!b) return;
      dir = b.dataset.trdir;
      if(pad) pad.clear();
      if($('#tr-textarea')) $('#tr-textarea').value = '';
      render();
    });
    if($('#tr-input-tabs')) $('#tr-input-tabs').addEventListener('click', e => {
      const b = e.target.closest('button[data-trmode]');
      if(!b) return;
      inputMode = b.dataset.trmode;
      render();
      if(inputMode === 'draw') requestAnimationFrame(() => { initPad(); if(pad) pad.resize(); });
    });
    if($('#tr-prev')) $('#tr-prev').onclick = () => { qi--; if(pad) pad.clear(); if($('#tr-textarea')) $('#tr-textarea').value = ''; render(); };
    if($('#tr-next')) $('#tr-next').onclick = () => { qi++; if(pad) pad.clear(); if($('#tr-textarea')) $('#tr-textarea').value = ''; render(); };
    if($('#tr-prompt-spk')) $('#tr-prompt-spk').onclick = () => { const cur = getItems()[qi]; if(cur && typeof speak === 'function') speak(cur.zh, 0.9); };
    if($('#tr-ans-spk')) $('#tr-ans-spk').onclick = () => { const cur = getItems()[qi]; if(cur && typeof speak === 'function') speak(cur.zh, 0.9); };
    if($('#tr-tool-pen')) $('#tr-tool-pen').onclick = () => { tool = 'pen'; if(pad) pad.setTool('pen'); render(); };
    if($('#tr-tool-eraser')) $('#tr-tool-eraser').onclick = () => { tool = 'eraser'; if(pad) pad.setTool('eraser'); render(); };
    if($('#tr-tool-undo')) $('#tr-tool-undo').onclick = () => { if(pad) pad.undo(); };
    if($('#tr-tool-clear')) $('#tr-tool-clear').onclick = () => { if(pad) pad.clear(); };
    if($('#tr-type-clr')) $('#tr-type-clr').onclick = () => { const ta = $('#tr-textarea'); if(ta){ ta.value = ''; ta.focus(); } };
    if($('#tr-hint-btn')) $('#tr-hint-btn').onclick = showHint;
    if($('#tr-check-btn')) $('#tr-check-btn').onclick = checkAnswer;
    if($('#tr-ans-toggle')) $('#tr-ans-toggle').onclick = () => { const c = $('#tr-ans-card'); if(c) c.classList.toggle('open'); };
    window.addEventListener('resize', () => {
      if(typeof curView !== 'undefined' && curView === 'trans' && pad) requestAnimationFrame(() => pad.resize());
    });

    return {
      render,
      enter(){
        initPad();
        render();
        requestAnimationFrame(() => { if(pad) pad.resize(); });
        if(typeof notesCtrl !== 'undefined') notesCtrl.sync();
      },
      resetSession(){ qi = 0; doneSet.clear(); if(pad) pad.clear(); }
    };
  })();

  /* ---------- 6. BẢNG GHI CHÚ BÀI HỌC 3 CỘT (TEXT + BÚT CẢM ỨNG) ---------- */
  const notesCtrl = (function(){
    const panels = [];
    let noteMode = 'text';
    let saveTimer = null;

    function getNoteRec(lid){
      if(!store.lessonNotes || typeof store.lessonNotes !== 'object') store.lessonNotes = {};
      if(!lid) return { text: '', strokes: [] };
      const r = store.lessonNotes[lid];
      return (r && typeof r === 'object') ? r : { text: '', strokes: [] };
    }
    function setNoteText(lid, text){
      if(!lid) return;
      const cur = getNoteRec(lid);
      store.lessonNotes[lid] = { text: String(text || ''), strokes: Array.isArray(cur.strokes) ? cur.strokes : [] };
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveStore(store), 320);
    }
    function setNoteStrokes(lid, strokes){
      if(!lid) return;
      const cur = getNoteRec(lid);
      store.lessonNotes[lid] = { text: cur.text || '', strokes };
      saveStore(store);
    }

    function initHosts(){
      if(panels.length) return;
      $$('.d2-notes-panel[data-notes-host]').forEach(host => {
        const hostId = host.dataset.notesHost;
        host.innerHTML = `<div class="d2-np-head">
          <b>Ghi chú bài học</b>
          <div class="d2-np-tabs">
            <button class="on" data-nptab="text" type="button">Ghi chú</button>
            <button data-nptab="draw" type="button">Viết tay</button>
          </div>
          <button aria-label="Đóng ghi chú" class="d2-np-close" type="button"><svg class="ic"><use href="#i-x"></use></svg></button>
        </div>
        <div class="d2-np-body">
          <textarea class="d2-np-ta" placeholder="Ghi chép từ vựng, ngữ pháp, lưu ý phát âm..."></textarea>
          <div class="d2-np-draw hide">
            <div class="d2-np-paper"><canvas class="d2-np-cv"></canvas></div>
            <div class="d2-np-tools">
              <button class="on" data-nptool="pen" type="button">Bút</button>
              <button data-nptool="eraser" type="button">Tẩy</button>
              <button data-nptool="undo" type="button">Hoàn tác</button>
              <button data-nptool="clear" type="button">Xóa</button>
            </div>
          </div>
        </div>
        <div class="d2-np-foot">Tự động lưu cục bộ theo từng bài học</div>`;

        const ta = host.querySelector('.d2-np-ta');
        const drawBox = host.querySelector('.d2-np-draw');
        const cv = host.querySelector('.d2-np-cv');
        const pad = createStylusPad(cv, {
          baseWidth: 2.3,
          eraserWidth: 15,
          onChange(st){ setNoteStrokes(store.activeLessonId, st); }
        });

        ta.addEventListener('input', () => {
          setNoteText(store.activeLessonId, ta.value);
          panels.forEach(p => { if(p.ta !== ta) p.ta.value = ta.value; });
        });
        host.querySelectorAll('[data-nptab]').forEach(b => b.addEventListener('click', () => {
          noteMode = b.dataset.nptab;
          sync();
        }));
        host.querySelector('.d2-np-close').onclick = () => host.classList.remove('open');
        host.querySelectorAll('[data-nptool]').forEach(b => b.addEventListener('click', () => {
          const act = b.dataset.nptool;
          if(act === 'pen' || act === 'eraser'){
            pad.setTool(act);
            host.querySelectorAll('[data-nptool="pen"],[data-nptool="eraser"]').forEach(x => x.classList.toggle('on', x.dataset.nptool === act));
          }else if(act === 'undo'){
            pad.undo();
          }else if(act === 'clear'){
            pad.clear();
          }
        }));
        panels.push({ hostId, host, ta, drawBox, pad });
      });
    }

    function sync(){
      initHosts();
      const rec = getNoteRec(store.activeLessonId);
      panels.forEach(p => {
        p.ta.value = rec.text || '';
        p.ta.classList.toggle('hide', noteMode !== 'text');
        p.drawBox.classList.toggle('hide', noteMode !== 'draw');
        p.host.querySelectorAll('[data-nptab]').forEach(b => b.classList.toggle('on', b.dataset.nptab === noteMode));
        if(noteMode === 'draw'){
          requestAnimationFrame(() => p.pad.setStrokes(rec.strokes || []));
        }
      });
    }

    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-toggle-notes]');
      if(!btn) return;
      initHosts();
      const host = $(`.d2-notes-panel[data-notes-host="${btn.dataset.toggleNotes}"]`);
      if(!host) return;
      host.classList.toggle('open');
      if(host.classList.contains('open')) sync();
    });

    return { sync, initHosts };
  })();

  window.appendLessonNote = function(line){
    const lid = store.activeLessonId;
    if(!lid || !line) return;
    if(!store.lessonNotes || typeof store.lessonNotes !== 'object') store.lessonNotes = {};
    const cur = store.lessonNotes[lid] || { text: '', strokes: [] };
    const nextTxt = cur.text ? (cur.text.trimEnd() + '\n' + line) : line;
    store.lessonNotes[lid] = { text: nextTxt, strokes: cur.strokes || [] };
    saveStore(store);
    notesCtrl.sync();
  };

  window.dialogCtrl = dialogCtrl;
  window.copyCtrl = copyCtrl;
  window.transCtrl = transCtrl;
  window.notesCtrl = notesCtrl;
  window.refreshDot2Views = function(){
    try{ dialogCtrl.stop(); }catch(_){}
    try{ dialogCtrl.render(); }catch(_){}
    try{ copyCtrl.render(); }catch(_){}
    try{ transCtrl.resetSession(); transCtrl.render(); }catch(_){}
    try{ notesCtrl.sync(); }catch(_){}
  };

  try{
    notesCtrl.initHosts();
    window.refreshDot2Views();
  }catch(e){ console.error('Dot2 init error:', e); }
})();
