/* ==========================================================================
   Hanyu AI — Module Học phát âm Pinyin (7 chương · 40 bài · Tiến độ độc lập)
   Thiết kế bám sát bộ 10 tài liệu Hanyu AI Pinyin & giao diện demo chuẩn.
   ========================================================================== */
(function(){
  const STORAGE_KEY = 'hanyu_pinyin_progress';
  const esc = s => (typeof escHtml === 'function')
    ? escHtml(s)
    : String(s == null ? '' : s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function getData(){
    return window.HANYU_PINYIN_DATA || {
      PHONEMES:{}, CHAPTERS:[], ALL_LESSONS:[], CONFUSABLE_PAIRS:[],
      VERIFIED_SYLLABLES:[], QUESTION_BANK:[], TONE_CONTOUR_LIST:[]
    };
  }

  function defaultProgress(){
    return {
      courseId: 'pinyin-foundation',
      lastScreen: 'overview',
      lastChapterId: 'ch1',
      lastLessonId: 'py_1_1',
      lastLessonTab: 'learn',
      lessons: {},
      attempts: [],
      weakPhonemes: {},
      wrongQuestions: []
    };
  }

  function loadProgress(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return defaultProgress();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultProgress(), parsed && typeof parsed === 'object' ? parsed : {});
    }catch(_){
      return defaultProgress();
    }
  }

  let prog = loadProgress();
  function saveProgress(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(prog)); }catch(_){}
  }

  function getLessonState(lessonId){
    return prog.lessons[lessonId] || {
      learned: false, practiced: false, tested: false,
      bestScore: null, latestScore: null, completedAt: null
    };
  }
  function isLessonDone(lessonId){
    const s = getLessonState(lessonId);
    return !!(s.completedAt || (s.learned && (s.practiced || s.tested)));
  }

  function getStats(){
    const D = getData();
    const total = D.ALL_LESSONS.length || 1;
    const done = D.ALL_LESSONS.filter(l => isLessonDone(l.id)).length;
    const pct = Math.round((done / total) * 100);
    const weakCnt = Object.keys(prog.weakPhonemes || {}).length + (prog.wrongQuestions || []).length;
    return { total, done, pct, weakCnt };
  }

  function playText(text, rate, labelEl){
    if(!text){
      if(typeof toast === 'function') toast('Chưa có dữ liệu âm thanh cho mục này');
      return;
    }
    if(typeof speak === 'function'){
      speak(text, rate || 0.65);
    }else if(typeof toast === 'function'){
      toast('Chưa có giọng đọc tiếng Trung trên trình duyệt này');
    }
    if(labelEl){
      labelEl.textContent = rate && rate < 0.7 ? 'Đang đọc chậm (TTS trình duyệt)…' : 'Đang phát mẫu (TTS trình duyệt)…';
      setTimeout(() => { if(labelEl.isConnected) labelEl.textContent = ''; }, 1600);
    }
  }

  function shuffle(arr){
    const a = arr.slice();
    for(let i = a.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Phân tích đặc trưng cấu âm từng âm theo tài liệu ngữ âm (dây thanh, luồng hơi, vị trí lưỡi, khẩu hình môi)
  function getArticProfile(ph){
    const id = (ph && ph.id) || 'zh';
    const isFinal = ph && ph.kind === 'final';
    const voiced = isFinal || ['m','n','l','r'].includes(id);

    let airflow = isFinal ? 'vowel' : 'unaspirated';
    let airLbl = isFinal ? 'Luồng hơi thoáng' : 'Không bật hơi';
    if(['m','n','an','en','in','un','ün','ian','uan','üan','ang','eng','ing','ong','iang','uang','iong'].includes(id)){
      airflow = 'nasal'; airLbl = 'Âm mũi (khí qua mũi)';
    }else if(['p','t','k','q','ch','c'].includes(id)){
      airflow = 'aspirated'; airLbl = 'Bật hơi mạnh';
    }else if(['f','h','x','sh','s','r'].includes(id)){
      airflow = 'fricative'; airLbl = 'Âm xát qua khe hẹp';
    }else if(id === 'l'){
      airflow = 'lateral'; airLbl = 'Âm bên (hai bên lưỡi)';
    }

    let tongueKey = 'alveolar';
    if(['b','p','m'].includes(id)) tongueKey = 'lips';
    else if(id === 'f') tongueKey = 'labiodental';
    else if(['z','c','s'].includes(id)) tongueKey = 'dental';
    else if(['d','t','n','l'].includes(id)) tongueKey = 'alveolar';
    else if(['zh','ch','sh','r','er'].includes(id)) tongueKey = 'retroflex';
    else if(['j','q','x'].includes(id)) tongueKey = 'palatal';
    else if(['g','k','h'].includes(id)) tongueKey = 'velar';
    else if(['an','en','in','un','ün','ian','uan','üan'].includes(id)) tongueKey = 'nasal_n';
    else if(['ang','eng','ing','ong','iang','uang','iong'].includes(id)) tongueKey = 'nasal_ng';
    else if(['a','ai','ao','ia','ua','uai','iao'].includes(id)) tongueKey = 'vowel_a';
    else if(['o','ou','uo'].includes(id)) tongueKey = 'vowel_o';
    else if(['e','ei','ie','üe'].includes(id)) tongueKey = 'vowel_e';
    else if(id === 'i') tongueKey = 'vowel_i';
    else if(['u','iu','ui'].includes(id)) tongueKey = 'vowel_u';
    else if(id === 'ü') tongueKey = 'vowel_ü';

    let mouthKey = 'spread';
    if(['b','p','m'].includes(id)) mouthKey = 'closed';
    else if(id === 'f') mouthKey = 'bite';
    else if(['a','ai','ao','an','ang','ia','ian','iang'].includes(id)) mouthKey = 'open';
    else if(['o','ou','uo','ong','zh','ch','sh','r','er'].includes(id)) mouthKey = 'round_wide';
    else if(['u','ü','iu','ui','un','ün','üe','üan','ua','uan','uai','uang','iong'].includes(id)) mouthKey = 'round_tight';

    const labels = {
      lips:'Hai môi khép mở',
      labiodental:'Răng trên chạm môi dưới',
      dental:'Đầu lưỡi sau răng trên',
      alveolar:'Đầu lưỡi chạm vùng lợi',
      retroflex:'Đầu lưỡi uốn vùng sau lợi',
      palatal:'Mặt lưỡi áp ngạc cứng',
      velar:'Gốc lưỡi nâng ngạc mềm',
      nasal_n:'Đầu lưỡi lợi + khí qua mũi',
      nasal_ng:'Gốc lưỡi ngạc mềm + khí qua mũi',
      vowel_a:'Miệng mở rộng, lưỡi hạ thấp',
      vowel_o:'Môi tròn, lưỡi hơi lùi sau',
      vowel_e:'Lưỡi sau nâng, môi không tròn',
      vowel_i:'Mặt trước lưỡi cao, khóe dẹt',
      vowel_u:'Lưỡi cao sau, môi chu tròn nhỏ',
      vowel_ü:'Lưỡi cao trước như i, môi tròn như u'
    };
    return {
      voiced,
      airflow,
      airLbl,
      tongueKey,
      mouthKey,
      zoneLbl: labels[tongueKey] || 'Vị trí cấu âm'
    };
  }

  // Sơ đồ mặt cắt dọc khoang miệng (hướng trái) + luồng hơi + dây thanh + khẩu hình môi nhìn thẳng
  function renderArticDiagram(ph){
    const prof = getArticProfile(ph);
    const sym = (ph && ph.symbol) || '';

    // Đường lưỡi đặc trưng bên trong khoang miệng (tọa độ hướng trái)
    const tonguePaths = {
      lips:        'M54 96 Q84 86 122 88 Q144 92 150 124 L112 124 Q96 106 54 96 Z',
      labiodental: 'M56 94 Q86 84 124 88 Q144 92 150 124 L112 124 Q94 106 56 94 Z',
      dental:      'M46 77 Q74 82 118 86 Q142 90 150 124 L112 124 Q90 102 46 77 Z',
      alveolar:    'M56 64 Q82 78 122 86 Q142 92 150 124 L112 124 Q92 98 56 64 Z',
      retroflex:   'M74 58 Q68 74 114 84 Q142 90 150 124 L112 124 Q94 98 74 58 Z',
      palatal:     'M54 88 Q82 58 124 72 Q144 82 150 124 L112 124 Q90 100 54 88 Z',
      velar:       'M64 96 Q98 90 126 60 Q146 68 150 124 L112 124 Q92 104 64 96 Z',
      nasal_n:     'M56 64 Q82 78 120 86 Q140 94 148 124 L112 124 Q92 98 56 64 Z',
      nasal_ng:    'M64 96 Q98 90 126 62 Q144 74 148 124 L112 124 Q92 104 64 96 Z',
      vowel_a:     'M52 104 Q88 100 124 98 Q144 100 150 124 L112 124 Q90 112 52 104 Z',
      vowel_o:     'M60 98 Q96 86 126 76 Q144 82 150 124 L112 124 Q92 106 60 98 Z',
      vowel_e:     'M62 96 Q96 82 128 70 Q146 78 150 124 L112 124 Q92 104 62 96 Z',
      vowel_i:     'M52 88 Q80 62 120 74 Q142 84 150 124 L112 124 Q90 100 52 88 Z',
      vowel_u:     'M64 98 Q98 86 128 66 Q146 76 150 124 L112 124 Q92 106 64 98 Z',
      vowel_ü:     'M52 88 Q80 62 120 74 Q142 84 150 124 L112 124 Q90 100 52 88 Z'
    };
    const focusPts = {
      lips:[40,78], labiodental:[46,82], dental:[50,74], alveolar:[58,64],
      retroflex:[75,58], palatal:[92,62], velar:[126,60], nasal_n:[58,64],
      nasal_ng:[126,60], vowel_a:[92,100], vowel_o:[118,78], vowel_e:[124,72],
      vowel_i:[86,65], vowel_u:[124,68], vowel_ü:[86,65]
    };
    const fp = focusPts[prof.tongueKey] || [75, 62];
    const tPath = tonguePaths[prof.tongueKey] || tonguePaths.alveolar;
    const isNasal = prof.airflow === 'nasal';
    const isLipsClosed = prof.mouthKey === 'closed';
    const isBite = prof.mouthKey === 'bite';

    // Vòm cứng + vòm mềm (hạ mở nối mũi khi isNasal)
    const palatePath = isNasal
      ? 'M48 64 Q86 48 124 56 L132 70 Q106 58 56 72 Z'
      : 'M48 64 Q92 48 142 62 L148 72 Q108 58 56 72 Z';

    // Mũi tên luồng hơi kiểu sách Emotional Chinese
    let airSvg = '';
    if(prof.airflow === 'aspirated'){
      airSvg = `
        <path d="M136 118 Q138 80 108 74 Q74 70 40 76" fill="none" stroke="#8B2E2E" stroke-width="1.6" stroke-dasharray="3 2"/>
        <path d="M38 76 L14 68 M14 68 L22 65 M14 68 L20 74" fill="none" stroke="#B93F34" stroke-width="2" stroke-linecap="round"/>
        <path d="M36 78 L10 78 M10 78 L18 74 M10 78 L18 82" fill="none" stroke="#B93F34" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M38 80 L14 88 M14 88 L20 82 M14 88 L22 91" fill="none" stroke="#B93F34" stroke-width="2" stroke-linecap="round"/>`;
    }else if(prof.airflow === 'nasal'){
      airSvg = `
        <path d="M138 118 Q144 68 122 44 Q94 28 52 38 L22 38" fill="none" stroke="#B93F34" stroke-width="2" stroke-dasharray="4 2.5" stroke-linecap="round"/>
        <path d="M22 38 L30 34 M22 38 L30 42" fill="none" stroke="#B93F34" stroke-width="2" stroke-linecap="round"/>`;
    }else if(prof.airflow === 'fricative'){
      airSvg = `
        <path d="M138 118 Q138 78 106 72 Q76 70 50 76 L16 76" fill="none" stroke="#B93F34" stroke-width="1.8" stroke-dasharray="3 2"/>
        <path d="M16 76 L24 72 M16 76 L24 80" fill="none" stroke="#B93F34" stroke-width="2" stroke-linecap="round"/>`;
    }else if(prof.airflow === 'lateral'){
      airSvg = `
        <path d="M138 118 Q138 82 96 76 Q66 78 40 78 L14 78" fill="none" stroke="#B93F34" stroke-width="1.8"/>
        <path d="M14 78 L22 74 M14 78 L22 82" fill="none" stroke="#B93F34" stroke-width="2" stroke-linecap="round"/>
        <path d="M72 78 Q56 88 38 84" fill="none" stroke="#B93F34" stroke-width="1.4" stroke-dasharray="2.5 2"/>`;
    }else{
      // unaspirated hoặc vowel: 1 mũi tên đơn gọn đi thẳng
      airSvg = `
        <path d="M138 118 Q138 80 104 75 Q72 72 44 77 L14 77" fill="none" stroke="#B93F34" stroke-width="1.9" stroke-linecap="round"/>
        <path d="M14 77 L22 73 M14 77 L22 81" fill="none" stroke="#B93F34" stroke-width="2" stroke-linecap="round"/>`;
    }

    // Khẩu hình môi chính diện theo 6 kiểu
    let mouthInner = '';
    if(prof.mouthKey === 'closed'){
      mouthInner = '<path d="M16 28 Q32 22 45 25 Q58 22 74 28 Q58 35 45 34 Q32 35 16 28 Z" fill="#D95E57" stroke="#8B2E2E" stroke-width="1.5"/><line x1="18" y1="28" x2="72" y2="28" stroke="#6E1E19" stroke-width="1.6" stroke-linecap="round"/>';
    }else if(prof.mouthKey === 'bite'){
      mouthInner = '<path d="M16 27 Q32 17 45 21 Q58 17 74 27 Q58 38 45 37 Q32 38 16 27 Z" fill="#D95E57" stroke="#8B2E2E" stroke-width="1.5"/><rect x="28" y="21" width="34" height="6" rx="1.5" fill="#FFFDFB" stroke="#B93F34" stroke-width=".8"/><path d="M22 30 Q45 34 68 30" fill="none" stroke="#6E1E19" stroke-width="1.4"/>';
    }else if(prof.mouthKey === 'open'){
      mouthInner = '<ellipse cx="45" cy="27" rx="22" ry="16" fill="#D95E57" stroke="#8B2E2E" stroke-width="1.5"/><ellipse cx="45" cy="27" rx="15" ry="11" fill="#631C18"/><path d="M31 20 Q45 18 59 20 L57 24 L33 24 Z" fill="#FFFDFB"/><path d="M33 34 Q45 36 57 34 L58 31 L32 31 Z" fill="#FFFDFB"/>';
    }else if(prof.mouthKey === 'round_wide'){
      mouthInner = '<ellipse cx="45" cy="27" rx="18" ry="13" fill="#D95E57" stroke="#8B2E2E" stroke-width="1.5"/><ellipse cx="45" cy="27" rx="10" ry="8" fill="#631C18"/>';
    }else if(prof.mouthKey === 'round_tight'){
      mouthInner = '<ellipse cx="45" cy="27" rx="14" ry="11" fill="#D95E57" stroke="#8B2E2E" stroke-width="1.5"/><circle cx="45" cy="27" r="5.5" fill="#631C18"/>';
    }else{
      mouthInner = '<path d="M14 27 Q32 17 45 22 Q58 17 76 27 Q58 38 45 36 Q32 38 14 27 Z" fill="#D95E57" stroke="#8B2E2E" stroke-width="1.5"/><path d="M21 27 Q45 23 69 27 Q45 31 21 27 Z" fill="#FFFDFB" stroke="#8B2E2E" stroke-width=".8"/>';
    }

    return `<div class="py-diag-pair">
      <div class="py-diag-box" title="Sơ đồ minh họa cấu âm & luồng hơi">
        <svg viewBox="0 0 186 142" class="py-sagittal-svg" aria-hidden="true">
          <!-- Khoang mũi & khối sọ/vòm trên -->
          <path d="M46 18 L156 18 L166 130 L150 130 L146 66 Q104 52 54 64 L40 62 L32 48 L44 36 Z" fill="#D34B42" opacity=".92"/>
          <path d="M52 30 Q92 22 132 36 Q136 48 118 52 Q84 46 52 48 Z" fill="#FFF8F3"/>
          <!-- Vòm cứng/mềm -->
          <path d="${palatePath}" fill="#C7463B" stroke="#9F3128" stroke-width="1.1"/>
          <!-- Môi trên, môi dưới & cằm -->
          <path d="M48 64 Q36 68 ${isLipsClosed ? '38 77' : '40 73'}" fill="none" stroke="#9F3128" stroke-width="4.5" stroke-linecap="round"/>
          <path d="M${isLipsClosed ? '38 79' : (isBite ? '42 81' : '40 86')} Q36 96 42 114 L74 130 L112 130" fill="#D34B42" opacity=".9" stroke="#9F3128" stroke-width="1.4"/>
          <!-- Răng cửa trên & dưới -->
          <rect x="46" y="66" width="5" height="9" rx="1.5" fill="#FFFDFB" stroke="#A66B5D" stroke-width=".8"/>
          <rect x="46" y="${isLipsClosed ? '78' : '86'}" width="5" height="8" rx="1.5" fill="#FFFDFB" stroke="#A66B5D" stroke-width=".8"/>
          <!-- Đường cong lưỡi -->
          <path d="${tPath}" fill="#E97D74" stroke="#8B2E2E" stroke-width="1.8" stroke-linejoin="round"/>
          <!-- Điểm tiếp xúc / khe hẹp -->
          <circle cx="${fp[0]}" cy="${fp[1]}" r="7.5" fill="rgba(199,70,59,.22)" stroke="#8B2E2E" stroke-width="1.6"/>
          <circle cx="${fp[0]}" cy="${fp[1]}" r="2.6" fill="#8B2E2E"/>
          <!-- Mũi tên luồng hơi -->
          ${airSvg}
        </svg>

        <div class="py-mouth-panel">
          <div class="py-mouth-card">
            <svg viewBox="0 0 90 54" class="py-mouth-svg" aria-hidden="true">
              <rect x="2" y="2" width="86" height="50" rx="12" fill="#FFF7F2" stroke="#EAD3C4"/>
              ${mouthInner}
            </svg>
            <span>${esc(prof.zoneLbl)}</span>
          </div>
          <div class="py-diag-badges">
            <span class="py-dbadge ${prof.voiced ? 'voiced' : 'voiceless'}">
              <svg viewBox="0 0 28 16" class="py-vc-ic" aria-hidden="true">${prof.voiced
                ? '<path d="M2 8 Q7 2 11 8 T20 8 T26 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
                : '<path d="M2 10 Q14 6 26 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'}</svg>
              ${prof.voiced ? 'Rung dây thanh' : 'Không rung dây thanh'}
            </span>
            <span class="py-dbadge air">${esc(prof.airLbl)}</span>
          </div>
        </div>
      </div>
      <div class="py-diag-note">Minh họa vị trí lưỡi, môi và luồng hơi cho âm <b>${esc(sym)}</b></div>
    </div>`;
  }

  // Trạng thái điều hướng cục bộ bên trong Pinyin View
  let ui = {
    screen: prog.lastScreen || 'overview',   // overview | chapter | lesson | result | chart | weak
    chapterId: prog.lastChapterId || 'ch1',
    lessonId: prog.lastLessonId || 'py_1_1',
    lessonTab: prog.lastLessonTab || 'learn', // learn | practice | test
    subTab: 'artic',                          // artic | compare
    targetIdx: 0,
    practiceList: [], practiceIdx: 0, practiceOk: 0, practiceWrong: 0, practiceAnswered: false, practiceWrongItems: [],
    testList: [], testIdx: 0, testOk: 0, testWrong: 0, testAnswered: false, testWrongItems: [],
    lastResult: null,
    chartInitial: 'zh',
    weakList: [], weakIdx: 0, weakOk: 0, weakAnswered: false
  };

  function persistRoute(){
    prog.lastScreen = ui.screen;
    prog.lastChapterId = ui.chapterId;
    prog.lastLessonId = ui.lessonId;
    prog.lastLessonTab = ui.lessonTab;
    saveProgress();
  }

  function findChapter(cid){
    const D = getData();
    return D.CHAPTERS.find(c => c.id === cid) || D.CHAPTERS[0];
  }
  function findLesson(lid){
    const D = getData();
    return D.ALL_LESSONS.find(l => l.id === lid) || D.ALL_LESSONS[0];
  }

  function getLessonPhonemes(lesson){
    const D = getData();
    return (lesson.targets || []).map(id => D.PHONEMES[id]).filter(Boolean);
  }

  function buildPracticeForLesson(lesson){
    const D = getData();
    const targets = getLessonPhonemes(lesson);
    const qs = [];
    // Nếu bài về cặp âm dễ nhầm
    if(lesson.pairId){
      const pair = D.CONFUSABLE_PAIRS.find(p => p.id === lesson.pairId);
      if(pair){
        const items = [
          { ask:pair.exA.zh, ans:pair.a, label:`${pair.a} (${pair.exA.zh} · ${pair.exA.py})`, tip:pair.diff, ex:pair.exA },
          { ask:pair.exB.zh, ans:pair.b, label:`${pair.b} (${pair.exB.zh} · ${pair.exB.py})`, tip:pair.diff, ex:pair.exB }
        ];
        for(let i = 0; i < 5; i++){
          const pick = items[i % 2];
          qs.push({
            promptVi: 'Nghe và chọn âm đúng trong cặp dễ nhầm:',
            audioText: pick.ask,
            ans: pick.ans,
            opts: shuffle([pair.a, pair.b, ...(targets.map(t => t.symbol).filter(s => s !== pair.a && s !== pair.b))]).slice(0, 4),
            explain: `${pick.tip} Ví dụ: ${pick.ex.zh} (${pick.ex.py} – ${pick.ex.vi}).`,
            phonemeId: pick.ans,
            confusedWith: pick.ans === pair.a ? pair.b : pair.a
          });
        }
        return qs;
      }
    }
    // Nếu bài về thanh điệu
    if(lesson.toneLesson){
      const sets = [
        { zh:'妈', py:'mā', ans:'Thanh 1', vi:'mẹ' },
        { zh:'麻', py:'má', ans:'Thanh 2', vi:'cây gai' },
        { zh:'马', py:'mǎ', ans:'Thanh 3', vi:'con ngựa' },
        { zh:'骂', py:'mà', ans:'Thanh 4', vi:'mắng' },
        { zh:'你好', py:'nǐ hǎo → ní hǎo', ans:'Thanh 2 + Thanh 3 (biến điệu)', vi:'xin chào' }
      ];
      return shuffle(sets).slice(0, 5).map(s => ({
        promptVi: 'Nghe mẫu và nhận diện thanh điệu đúng:',
        audioText: s.zh,
        ans: s.ans,
        opts: s.ans.includes('biến điệu')
          ? ['Thanh 2 + Thanh 3 (biến điệu)', 'Thanh 1 + Thanh 1', 'Thanh 4 + Thanh 4', 'Thanh nhẹ']
          : ['Thanh 1', 'Thanh 2', 'Thanh 3', 'Thanh 4'],
        explain: `${s.zh} (${s.py}) — ${s.vi}.`,
        phonemeId: 'tone'
      }));
    }
    // Mặc định theo thanh mẫu / vận mẫu mục tiêu
    const pool = targets.length ? targets : [D.PHONEMES.zh, D.PHONEMES.ch, D.PHONEMES.sh, D.PHONEMES.z].filter(Boolean);
    const allSyms = Object.values(D.PHONEMES).filter(p => p.kind === pool[0].kind).map(p => p.symbol);
    for(let i = 0; i < 5; i++){
      const ph = pool[i % pool.length];
      const ex = (ph.examples && ph.examples[i % ph.examples.length]) || { hanzi:ph.symbol, underlying_pinyin:ph.symbol, spoken_reading:ph.symbol, meaningVi:'' };
      const distract = shuffle(allSyms.filter(s => s !== ph.symbol && !ph.compareIds.includes(s)));
      const cmp = (ph.compareIds || []).map(id => D.PHONEMES[id] && D.PHONEMES[id].symbol).filter(Boolean);
      const opts = shuffle([ph.symbol, ...cmp, ...distract].filter((v, idx, a) => a.indexOf(v) === idx).slice(0, 4));
      qs.push({
        promptVi: 'Nghe và chọn âm đúng:',
        audioText: ex.hanzi,
        ans: ph.symbol,
        opts,
        explain: `Đây là âm ${ph.symbol} — ví dụ ${ex.hanzi} (${ex.spoken_reading} · ${ex.meaningVi}).`,
        phonemeId: ph.id,
        confusedWith: cmp[0] || ''
      });
    }
    return qs;
  }

  function buildTestForLesson(lesson){
    const D = getData();
    const chQs = D.QUESTION_BANK.filter(q => q.ch === lesson.chapterId);
    const targetSyms = new Set(lesson.targets || []);
    const matched = chQs.filter(q => !q.phonemeId || targetSyms.has(q.phonemeId));
    const base = matched.length >= 5 ? matched : chQs.concat(D.QUESTION_BANK.filter(q => q.ch !== lesson.chapterId));
    const unique = [];
    const seen = new Set();
    for(const q of base){
      if(!seen.has(q.id)){ seen.add(q.id); unique.push(q); }
      if(unique.length >= 6) break;
    }
    return unique.map(q => Object.assign({}, q, { opts: shuffle(q.opts) }));
  }

  function enterLesson(lessonId, tabName){
    const ls = findLesson(lessonId);
    ui.screen = 'lesson';
    ui.chapterId = ls.chapterId;
    ui.lessonId = ls.id;
    ui.lessonTab = tabName || 'learn';
    ui.subTab = 'artic';
    ui.targetIdx = 0;
    ui.practiceList = buildPracticeForLesson(ls);
    ui.practiceIdx = 0; ui.practiceOk = 0; ui.practiceWrong = 0; ui.practiceAnswered = false; ui.practiceWrongItems = [];
    ui.testList = buildTestForLesson(ls);
    ui.testIdx = 0; ui.testOk = 0; ui.testWrong = 0; ui.testAnswered = false; ui.testWrongItems = [];
    persistRoute();
    render();
  }

  function recordAttempt(lesson, kind, okCnt, totalCnt, wrongItems){
    const score = totalCnt > 0 ? Math.round((okCnt / totalCnt) * 100) : 0;
    const prev = getLessonState(lesson.id);
    const next = Object.assign({}, prev, {
      learned: prev.learned || kind === 'practice' || kind === 'test',
      practiced: prev.practiced || kind === 'practice',
      tested: prev.tested || kind === 'test',
      latestScore: score,
      bestScore: prev.bestScore === null ? score : Math.max(prev.bestScore, score),
      completedAt: prev.completedAt || Date.now()
    });
    prog.lessons[lesson.id] = next;
    prog.attempts.push({
      lessonId: lesson.id,
      kind,
      score,
      correct: okCnt,
      total: totalCnt,
      at: Date.now()
    });
    (wrongItems || []).forEach(w => {
      if(w.phonemeId){
        prog.weakPhonemes[w.phonemeId] = {
          id: w.phonemeId,
          confusedWith: w.confusedWith || '',
          count: ((prog.weakPhonemes[w.phonemeId] && prog.weakPhonemes[w.phonemeId].count) || 0) + 1,
          lastAt: Date.now()
        };
      }
      if(w.question){
        const exists = prog.wrongQuestions.some(x => x.promptVi === w.question.promptVi && x.ans === w.question.ans);
        if(!exists){
          prog.wrongQuestions.push(Object.assign({}, w.question, { savedAt: Date.now() }));
        }
      }
    });
    saveProgress();
  }

  function renderHeader(title, showBackToHome){
    return `<div class="py-hd">
      <button type="button" class="back" data-py-back="${showBackToHome ? 'home' : 'up'}" aria-label="Quay lại"><svg class="ic"><use href="#i-back"></use></svg></button>
      <div class="py-hd-txt"><b>${esc(title)}</b></div>
    </div>`;
  }

  function renderOverview(){
    const D = getData();
    const st = getStats();
    const r = 24, circ = 2 * Math.PI * r, off = circ * (1 - st.pct / 100);
    const chHtml = D.CHAPTERS.map(ch => {
      const doneInCh = ch.lessons.filter(l => isLessonDone(l.id)).length;
      const allDone = doneInCh >= ch.lessons.length && ch.lessons.length > 0;
      return `<button type="button" class="py-ch-row" data-py-ch="${esc(ch.id)}">
        <span class="py-ch-num ${allDone ? 'done' : ''}">${ch.num}</span>
        <div class="py-ch-mid">
          <b>${esc(ch.title)}</b>
          <span>${doneInCh}/${ch.lessons.length} bài · ${esc(ch.subtitle)}</span>
        </div>
        <span class="py-ch-cnt">${ch.lessons.length} bài</span>
        <span class="hm-tr-chev">›</span>
      </button>`;
    }).join('');

    return `${renderHeader('Học phát âm Pinyin', true)}
    <div class="py-hero-intro">
      <h1>Học phát âm Pinyin</h1>
      <p>Nền tảng phát âm tiếng Trung: nghe – luyện – kiểm tra, độc lập với giáo trình chính.</p>
    </div>
    <div class="card py-prog-card" data-py-resume="1" role="button" tabindex="0">
      <svg class="py-ring" viewBox="0 0 60 60" aria-hidden="true">
        <circle cx="30" cy="30" r="${r}" fill="none" stroke="var(--line)" stroke-width="5"/>
        <circle cx="30" cy="30" r="${r}" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round"
          stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 30 30)"/>
        <text x="30" y="34" text-anchor="middle" font-size="13" font-weight="800" fill="var(--accent)">${st.pct}%</text>
      </svg>
      <div class="py-prog-mid">
        <div class="small muted">Tiến độ khóa học</div>
        <b>${st.done} / ${st.total} bài</b>
      </div>
      <span class="hm-tr-chev">›</span>
    </div>
    <div class="py-util-row">
      <button type="button" class="chip" data-py-go="chart">Bảng ghép âm tiết Pinyin</button>
      <button type="button" class="chip" data-py-go="weak">Âm cần luyện thêm (${st.weakCnt})</button>
    </div>
    <div class="py-sec-title">7 chương học (40 bài)</div>
    <div class="py-ch-list">${chHtml}</div>`;
  }

  function renderChapter(){
    const ch = findChapter(ui.chapterId);
    const doneCnt = ch.lessons.filter(l => isLessonDone(l.id)).length;
    const pct = Math.round((doneCnt / Math.max(1, ch.lessons.length)) * 100);
    const firstTodo = ch.lessons.find(l => !isLessonDone(l.id)) || ch.lessons[0];

    const listHtml = ch.lessons.map(ls => {
      const done = isLessonDone(ls.id);
      const isNext = firstTodo && firstTodo.id === ls.id && !done;
      return `<button type="button" class="py-ls-row ${done ? 'done' : (isNext ? 'cur' : '')}" data-py-lesson="${esc(ls.id)}">
        <span class="py-ls-ic">${done ? '✓' : '▶'}</span>
        <div class="py-ls-mid">
          <b>Bài ${esc(ls.code)}: ${esc(ls.title)}</b>
          ${getLessonState(ls.id).bestScore !== null ? `<small>Điểm cao nhất: ${getLessonState(ls.id).bestScore}/100</small>` : ''}
        </div>
        <span class="py-ls-tail">${done ? '<span class="py-ls-ok">✓</span>' : '›'}</span>
      </button>`;
    }).join('');

    return `${renderHeader(`${ch.num}. ${ch.title}`, false)}
    <div class="py-ch-prog">
      <div class="small muted">${doneCnt} / ${ch.lessons.length} bài hoàn thành (chọn học tự do)</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
    </div>
    <div class="py-ls-list">${listHtml}</div>`;
  }

  function renderLesson(){
    const D = getData();
    const ls = findLesson(ui.lessonId);
    const targets = getLessonPhonemes(ls);
    if(ui.targetIdx >= targets.length) ui.targetIdx = 0;
    const curPh = targets[ui.targetIdx] || D.PHONEMES.zh;

    const tabsHtml = `<div class="seg py-ls-tabs">
      <button type="button" class="${ui.lessonTab === 'learn' ? 'on' : ''}" data-py-ltab="learn">Học</button>
      <button type="button" class="${ui.lessonTab === 'practice' ? 'on' : ''}" data-py-ltab="practice">Luyện tập</button>
      <button type="button" class="${ui.lessonTab === 'test' ? 'on' : ''}" data-py-ltab="test">Kiểm tra</button>
    </div>`;

    let body = '';
    if(ui.lessonTab === 'learn'){
      const mainEx = (ls.examples && ls.examples[0]) || (curPh.examples && curPh.examples[0]) || { hanzi:curPh.symbol, underlying_pinyin:curPh.symbol, spoken_reading:curPh.symbol, meaningVi:'' };
      const allExamples = ls.examples || curPh.examples || [];
      const bullets = ls.theoryBullets || curPh.bullets || [];
      const tipText = ls.tipVi || curPh.tipVi || '';
      const cmpId = (curPh.compareIds && curPh.compareIds[0]) || 'z';
      const cmpPh = D.PHONEMES[cmpId];
      const pairObj = (ls.pairId && D.CONFUSABLE_PAIRS.find(p => p.id === ls.pairId)) || D.CONFUSABLE_PAIRS.find(p => (p.a === curPh.id && p.b === cmpId) || (p.b === curPh.id && p.a === cmpId));

      body = `
        <div class="card py-main-card">
          <div class="py-card-nav">
            <button type="button" class="py-nav-circle" data-py-tstep="-1" ${targets.length <= 1 ? 'disabled' : ''} aria-label="Âm trước">‹</button>
            <div class="py-card-center">
              <div class="py-big-sym">${esc(curPh.symbol)}</div>
              <div class="py-ipa-line">${esc(curPh.ipa || '')} · <span>${esc(curPh.group || '')}</span></div>
              <div class="py-main-ex">
                <span>${esc(mainEx.underlying_pinyin)}${mainEx.spoken_reading && mainEx.spoken_reading !== mainEx.underlying_pinyin ? ` → ${esc(mainEx.spoken_reading)}` : ''}</span>
                <div class="py-main-han">${esc(mainEx.hanzi)} <button type="button" class="py-mini-vol" data-py-say="${esc(mainEx.hanzi)}" data-py-rate="0.85" aria-label="Nghe ví dụ"><svg class="ic"><use href="#i-vol"></use></svg></button></div>
                <small>${esc(mainEx.meaningVi || '')}</small>
              </div>
            </div>
            <button type="button" class="py-nav-circle" data-py-tstep="1" ${targets.length <= 1 ? 'disabled' : ''} aria-label="Âm sau">›</button>
          </div>
          <button type="button" class="btn py-btn-sample" data-py-say="${esc(mainEx.hanzi)}" data-py-rate="0.85">
            <svg class="ic f"><use href="#i-play"></use></svg>Nghe mẫu
          </button>
          <div class="py-audio-stat" id="py-audio-stat"></div>
        </div>

        <div class="card py-subcard">
          <div class="py-subtabs">
            <button type="button" class="${ui.subTab === 'artic' ? 'on' : ''}" data-py-sub="artic">Cách phát âm</button>
            <button type="button" class="${ui.subTab === 'compare' ? 'on' : ''}" data-py-sub="compare">So sánh âm</button>
          </div>
          ${ui.subTab === 'artic' ? `
            ${ls.toneLesson ? `
              <div class="py-tone-strip">
                ${D.TONE_CONTOUR_LIST.map(t => `<button type="button" class="py-ts-item" data-py-say="${esc(t.ex.zh)}" data-py-rate="0.8">
                  <svg viewBox="0 0 130 58" class="py-ts-svg" aria-hidden="true">
                    <text x="6" y="13" font-size="8" fill="var(--muted)">5</text><line x1="16" y1="10" x2="122" y2="10" stroke="var(--line)" stroke-dasharray="2.5 2.5"/>
                    <text x="6" y="24" font-size="8" fill="var(--muted)">4</text><line x1="16" y1="20" x2="122" y2="20" stroke="var(--line)" stroke-dasharray="2.5 2.5"/>
                    <text x="6" y="34" font-size="8" fill="var(--muted)">3</text><line x1="16" y1="30" x2="122" y2="30" stroke="var(--line)" stroke-dasharray="2.5 2.5"/>
                    <text x="6" y="43" font-size="8" fill="var(--muted)">2</text><line x1="16" y1="40" x2="122" y2="40" stroke="var(--line)" stroke-dasharray="2.5 2.5"/>
                    <text x="6" y="52" font-size="8" fill="var(--muted)">1</text><line x1="16" y1="50" x2="122" y2="50" stroke="var(--line)" stroke-dasharray="2.5 2.5"/>
                    <path d="${t.path}" transform="translate(10, 2)" fill="none" stroke="var(--accent)" stroke-width="3.6" stroke-linecap="round"/>
                  </svg>
                  <b>${esc(t.label)} (${esc(t.chao)})</b><small>${esc(t.ex.zh)} (${esc(t.ex.py)})</small>
                </button>`).join('')}
              </div>` : renderArticDiagram(curPh)}
            <ul class="py-bullets">
              ${bullets.map(b => `<li><span class="py-chk">✓</span><span>${esc(b)}</span></li>`).join('')}
            </ul>
          ` : `
            <div class="py-compare-wrap">
              ${pairObj ? `<p class="py-cmp-diff">${esc(pairObj.diff)}</p>
              <div class="py-cmp-cols">
                <button type="button" class="py-cmp-box" data-py-say="${esc(pairObj.exA.zh)}" data-py-rate="0.8">
                  <b>${esc(pairObj.a)}</b><span>${esc(pairObj.exA.zh)} · ${esc(pairObj.exA.py)}</span><small>${esc(pairObj.exA.vi)} 🔊</small>
                </button>
                <button type="button" class="py-cmp-box" data-py-say="${esc(pairObj.exB.zh)}" data-py-rate="0.8">
                  <b>${esc(pairObj.b)}</b><span>${esc(pairObj.exB.zh)} · ${esc(pairObj.exB.py)}</span><small>${esc(pairObj.exB.vi)} 🔊</small>
                </button>
              </div>` : (cmpPh ? `<div class="py-cmp-cols">
                <button type="button" class="py-cmp-box" data-py-say="${esc(mainEx.hanzi)}" data-py-rate="0.8">
                  <b>${esc(curPh.symbol)}</b><span>${esc(curPh.group)}</span><small>${esc(curPh.asp ? 'Bật hơi' : 'Không bật hơi')} 🔊</small>
                </button>
                <button type="button" class="py-cmp-box" data-py-say="${esc((cmpPh.examples && cmpPh.examples[0] && cmpPh.examples[0].hanzi) || '')}" data-py-rate="0.8">
                  <b>${esc(cmpPh.symbol)}</b><span>${esc(cmpPh.group)}</span><small>${esc(cmpPh.asp ? 'Bật hơi' : 'Không bật hơi')} 🔊</small>
                </button>
              </div>` : '<p class="small muted">Không có cặp đối chiếu trực tiếp cho âm này.</p>')}
            </div>
          `}
        </div>

        <div class="card py-ex-card">
          <div class="py-card-hd"><span class="py-heart">♥</span><b>Ví dụ</b></div>
          <div class="py-ex-list">
            ${allExamples.map(ex => `<button type="button" class="py-ex-row" data-py-say="${esc(ex.hanzi)}" data-py-rate="0.85">
              <span class="py-ex-play">▶</span>
              <span class="py-ex-py">${esc(ex.underlying_pinyin)}${ex.spoken_reading && ex.spoken_reading !== ex.underlying_pinyin ? ` <small>(đọc ${esc(ex.spoken_reading)})</small>` : ''}</span>
              <span class="py-ex-han">${esc(ex.hanzi)}</span>
              <span class="py-ex-vi">${esc(ex.meaningVi)}</span>
            </button>`).join('')}
          </div>
          ${tipText ? `<div class="py-tip-box"><div class="py-tip-hd">💡 <b>Mẹo luyện</b></div><p>${esc(tipText)}</p></div>` : ''}
        </div>

        <div class="card py-extra-card">
          <div class="py-card-hd"><b>Luyện thêm</b></div>
          <div class="py-extra-3">
            <button type="button" class="py-ex-tile" data-py-say="${esc(mainEx.hanzi)}" data-py-rate="0.55">
              <svg class="ic"><use href="#i-head"></use></svg><span>Nghe chậm</span>
            </button>
            <button type="button" class="py-ex-tile" data-py-go="chart">
              <svg class="ic"><use href="#i-book"></use></svg><span>Bảng ghép âm</span>
            </button>
            <button type="button" class="py-ex-tile" data-py-sub="compare">
              <svg class="ic"><use href="#i-refresh"></use></svg><span>So sánh ${esc(curPh.symbol)} – ${esc(cmpId)}</span>
            </button>
          </div>
        </div>

        <button type="button" class="btn py-cta-full" data-py-finish-learn="1">Đã nắm lý thuyết → Luyện tập</button>
      `;
    }else if(ui.lessonTab === 'practice'){
      const q = ui.practiceList[ui.practiceIdx];
      const pct = Math.round(((ui.practiceIdx + (ui.practiceAnswered ? 1 : 0)) / Math.max(1, ui.practiceList.length)) * 100);
      body = `<div class="card py-qwrap">
        <div class="py-q-prog"><span>${ui.practiceIdx + 1} / ${ui.practiceList.length}</span><div class="bar"><i style="width:${pct}%"></i></div></div>
        <h3 class="py-q-title">${esc(q.promptVi)}</h3>
        <div class="py-q-speaker">
          <button type="button" class="py-big-spk" data-py-say="${esc(q.audioText)}" data-py-rate="0.85" aria-label="Nghe câu hỏi"><svg class="ic"><use href="#i-vol"></use></svg></button>
          <button type="button" class="chip" data-py-say="${esc(q.audioText)}" data-py-rate="0.55">🐢 Nghe chậm</button>
        </div>
        <div class="py-q-sub">Âm bạn nghe là:</div>
        <div class="py-opts-2x2">
          ${q.opts.map(opt => `<button type="button" class="py-opt-btn" data-py-popt="${esc(opt)}">${esc(opt)}</button>`).join('')}
        </div>
        <div id="py-p-fb" class="py-qfb hide"></div>
        <button type="button" class="btn py-cta-full hide" id="py-p-next" data-py-pnext="1">${ui.practiceIdx + 1 < ui.practiceList.length ? 'Câu tiếp theo →' : 'Chuyển sang Kiểm tra →'}</button>
      </div>`;
    }else{
      const q = ui.testList[ui.testIdx];
      const pct = Math.round(((ui.testIdx + (ui.testAnswered ? 1 : 0)) / Math.max(1, ui.testList.length)) * 100);
      body = `<div class="card py-qwrap">
        <div class="py-q-prog"><span>${ui.testIdx + 1} / ${ui.testList.length}</span><div class="bar"><i style="width:${pct}%"></i></div></div>
        <h3 class="py-q-title">${esc(q.promptVi)}</h3>
        ${q.hanzi ? `<div class="py-test-han">${esc(q.hanzi)} <button type="button" class="py-mini-vol" data-py-say="${esc(q.hanzi)}" data-py-rate="0.85" aria-label="Nghe từ"><svg class="ic"><use href="#i-vol"></use></svg></button></div>` : ''}
        <div class="py-opts-col">
          ${q.opts.map(opt => `<button type="button" class="py-opt-row" data-py-topt="${esc(opt)}">${esc(opt)}</button>`).join('')}
        </div>
        <div id="py-t-fb" class="py-qfb hide"></div>
        <button type="button" class="btn py-cta-full hide" id="py-t-next" data-py-tnext="1">${ui.testIdx + 1 < ui.testList.length ? 'Câu tiếp theo →' : 'Xem kết quả bài học →'}</button>
      </div>`;
    }

    return `${renderHeader(`Bài ${ls.code} · ${ls.title}`, false)}
      ${tabsHtml}
      ${body}`;
  }

  function renderResult(){
    const D = getData();
    const res = ui.lastResult || { lesson: findLesson(ui.lessonId), ok:0, wrong:0, total:0, pct:100, wrongItems:[] };
    const ls = res.lesson;
    const allLs = D.ALL_LESSONS;
    const curIdx = allLs.findIndex(x => x.id === ls.id);
    const nextLs = (curIdx >= 0 && curIdx + 1 < allLs.length) ? allLs[curIdx + 1] : null;
    const weakList = (res.wrongItems || []).filter(w => w.phonemeId || w.question);

    return `${renderHeader('Kết quả bài học', false)}
    <div class="card py-res-card">
      <div class="py-trophy">🏆</div>
      <h2>Kết quả bài học</h2>
      <div class="py-res-okpill">✓ Bạn đã hoàn thành bài ${esc(ls.code)}!</div>
      <div class="py-res-3">
        <div><b>${res.ok}/${res.total}</b><span>Câu đúng</span></div>
        <div><b>${res.wrong}</b><span>Câu sai</span></div>
        <div><b>${res.pct}%</b><span>Độ chính xác</span></div>
      </div>
      <div class="py-res-weak">
        <div class="py-rw-hd"><b>Những âm cần luyện thêm</b></div>
        ${weakList.length ? weakList.map(w => `<div class="py-rw-item">• <b>${esc(w.phonemeId || (w.question && w.question.ans) || '')}</b> — ${esc(w.explain || (w.question && w.question.explain) || '')}</div>`).join('') : '<div class="py-rw-none">✓ Không có. Phát âm của bạn rất tốt!</div>'}
      </div>
      <div class="py-res-btns">
        <button type="button" class="chip py-btn-retry" data-py-lesson="${esc(ls.id)}">↻ Ôn lại bài này</button>
        ${nextLs ? `<button type="button" class="btn py-cta-full" data-py-lesson="${esc(nextLs.id)}">→ Học bài tiếp theo (${esc(nextLs.code)})</button>` : `<button type="button" class="btn py-cta-full" data-py-go="overview">Về tổng quan khóa học</button>`}
      </div>
    </div>`;
  }

  function renderChart(){
    const D = getData();
    const grp = D.VERIFIED_SYLLABLES.find(x => x.initial === ui.chartInitial) || D.VERIFIED_SYLLABLES[0];
    return `${renderHeader('Bảng ghép âm tiết Pinyin', false)}
    <div class="card py-chart-note">
      <b>Quy tắc chính tả quan trọng (Tài liệu 05):</b>
      <p class="small muted" style="margin:4px 0 0">Chỉ hiển thị âm tiết hợp lệ đã kiểm tra (không nhân 21 thanh mẫu × toàn bộ vần). Nhớ quy tắc: <code>j/q/x + ü → ju/qu/xu</code>, <code>n/l</code> giữ <code>ü (nü/lü)</code>, <code>iou→iu</code>, <code>uei→ui</code>, <code>uen→un</code>.</p>
    </div>
    <div class="py-init-pills">
      ${D.VERIFIED_SYLLABLES.map(g => `<button type="button" class="chip ${g.initial === grp.initial ? 'on' : ''}" data-py-cinit="${esc(g.initial)}">${esc(g.initial)}</button>`).join('')}
    </div>
    <div class="card">
      <h3 style="margin:0 0 8px">Nhóm thanh mẫu “${esc(grp.initial)}” (${grp.list.length} âm tiết mẫu)</h3>
      <div class="py-syl-grid">
        ${grp.list.map(s => `<button type="button" class="py-syl-cell" data-py-say="${esc(s.han)}" data-py-rate="0.8">
          <b>${esc(s.py)}</b>
          <span>${esc(s.han)}</span>
          <small>${esc(s.vi)}</small>
        </button>`).join('')}
      </div>
    </div>`;
  }

  function renderWeak(){
    const wPh = Object.values(prog.weakPhonemes || {});
    const wQs = prog.wrongQuestions || [];
    if(!ui.weakList.length && wQs.length){
      ui.weakList = wQs.slice(); ui.weakIdx = 0; ui.weakOk = 0; ui.weakAnswered = false;
    }
    const phHtml = wPh.length ? wPh.map(w => `<button type="button" class="chip" data-py-say="${esc((getData().PHONEMES[w.id] && getData().PHONEMES[w.id].examples[0].hanzi) || '')}" data-py-rate="0.75">
      <b>${esc(w.id)}</b>${w.confusedWith ? ` (nhầm với ${esc(w.confusedWith)})` : ''} · ${w.count} lần
    </button>`).join('') : '<span class="small muted">Chưa có âm yếu nào được ghi nhận.</span>';

    let quizHtml = '<div class="card"><p class="small muted" style="margin:0">Khi bạn làm sai câu Luyện tập hoặc Kiểm tra, câu đó sẽ tự động vào danh sách ôn ở đây.</p></div>';
    if(ui.weakList.length){
      const q = ui.weakList[ui.weakIdx] || ui.weakList[0];
      quizHtml = `<div class="card py-qwrap">
        <div class="py-q-prog"><span>Ôn câu sai ${ui.weakIdx + 1}/${ui.weakList.length}</span><button type="button" class="chip" data-py-clearweak="1">Xóa danh sách ôn</button></div>
        <h3 class="py-q-title">${esc(q.promptVi)}</h3>
        ${q.hanzi ? `<div class="py-test-han">${esc(q.hanzi)}</div>` : ''}
        ${q.audioText ? `<div class="py-q-speaker"><button type="button" class="py-big-spk" data-py-say="${esc(q.audioText)}" data-py-rate="0.8"><svg class="ic"><use href="#i-vol"></use></svg></button></div>` : ''}
        <div class="py-opts-col">
          ${q.opts.map(opt => `<button type="button" class="py-opt-row" data-py-wopt="${esc(opt)}">${esc(opt)}</button>`).join('')}
        </div>
        <div id="py-w-fb" class="py-qfb hide"></div>
        <button type="button" class="btn py-cta-full hide" id="py-w-next" data-py-wnext="1">Câu tiếp theo →</button>
      </div>`;
    }

    return `${renderHeader('Âm & câu cần luyện thêm', false)}
    <div class="card"><h3 style="margin:0 0 8px">Âm hay nhầm gần đây</h3><div style="display:flex;flex-wrap:wrap;gap:6px">${phHtml}</div></div>
    ${quizHtml}`;
  }

  function render(){
    const root = document.getElementById('py-root');
    if(!root) return;
    if(ui.screen === 'overview') root.innerHTML = renderOverview();
    else if(ui.screen === 'chapter') root.innerHTML = renderChapter();
    else if(ui.screen === 'lesson') root.innerHTML = renderLesson();
    else if(ui.screen === 'result') root.innerHTML = renderResult();
    else if(ui.screen === 'chart') root.innerHTML = renderChart();
    else if(ui.screen === 'weak') root.innerHTML = renderWeak();
  }

  let bound = false;
  function bindEvents(){
    if(bound) return;
    bound = true;
    const view = document.getElementById('pinyin-view');
    if(!view) return;
    view.addEventListener('click', e => {
      const backBtn = e.target.closest('[data-py-back]');
      if(backBtn){
        if(backBtn.dataset.pyBack === 'home'){
          if(typeof goView === 'function') goView('home');
          return;
        }
        if(ui.screen === 'lesson' || ui.screen === 'result') ui.screen = 'chapter';
        else ui.screen = 'overview';
        persistRoute(); render(); return;
      }

      const goScreen = e.target.closest('[data-py-go]');
      if(goScreen){
        ui.screen = goScreen.dataset.pyGo;
        persistRoute(); render(); return;
      }

      if(e.target.closest('[data-py-resume]')){
        enterLesson(prog.lastLessonId || 'py_1_1', 'learn');
        return;
      }

      const chBtn = e.target.closest('[data-py-ch]');
      if(chBtn){
        ui.chapterId = chBtn.dataset.pyCh;
        ui.screen = 'chapter';
        persistRoute(); render(); return;
      }

      const lsBtn = e.target.closest('[data-py-lesson]');
      if(lsBtn){
        enterLesson(lsBtn.dataset.pyLesson, 'learn');
        return;
      }

      const ltab = e.target.closest('[data-py-ltab]');
      if(ltab){
        ui.lessonTab = ltab.dataset.pyLtab;
        persistRoute(); render();
        if(ui.lessonTab === 'practice' && ui.practiceList[ui.practiceIdx]){
          playText(ui.practiceList[ui.practiceIdx].audioText, 0.85);
        }
        return;
      }

      const sub = e.target.closest('[data-py-sub]');
      if(sub){
        ui.subTab = sub.dataset.pySub;
        render(); return;
      }

      const step = e.target.closest('[data-py-tstep]');
      if(step){
        const ls = findLesson(ui.lessonId);
        const len = (ls.targets || []).length || 1;
        ui.targetIdx = (ui.targetIdx + Number(step.dataset.pyTstep) + len) % len;
        render(); return;
      }

      const sayEl = e.target.closest('[data-py-say]');
      if(sayEl){
        playText(sayEl.dataset.pySay, Number(sayEl.dataset.pyRate) || 0.85, document.getElementById('py-audio-stat'));
        return;
      }

      if(e.target.closest('[data-py-finish-learn]')){
        const ls = findLesson(ui.lessonId);
        const cur = getLessonState(ls.id);
        prog.lessons[ls.id] = Object.assign({}, cur, { learned:true });
        saveProgress();
        ui.lessonTab = 'practice';
        persistRoute(); render();
        if(ui.practiceList[0]) playText(ui.practiceList[0].audioText, 0.85);
        return;
      }

      const pOpt = e.target.closest('[data-py-popt]');
      if(pOpt && !ui.practiceAnswered){
        ui.practiceAnswered = true;
        const q = ui.practiceList[ui.practiceIdx];
        const picked = pOpt.dataset.pyPopt;
        const isOk = picked === q.ans;
        if(isOk) ui.practiceOk++;
        else{
          ui.practiceWrong++;
          ui.practiceWrongItems.push({ phonemeId:q.phonemeId, confusedWith:q.confusedWith, explain:q.explain, question:q });
        }
        if(typeof playSfx === 'function') playSfx(isOk ? 'ok' : 'no');
        view.querySelectorAll('[data-py-popt]').forEach(b => {
          b.disabled = true;
          if(b.dataset.pyPopt === q.ans) b.classList.add('ok');
          else if(b === pOpt && !isOk) b.classList.add('no');
        });
        const fb = document.getElementById('py-p-fb');
        if(fb){
          fb.className = 'py-qfb ' + (isOk ? 'ok' : 'no');
          fb.innerHTML = (isOk ? '<b>Chính xác!</b> ' : '<b>Chưa đúng!</b> ') + esc(q.explain);
        }
        const nx = document.getElementById('py-p-next');
        if(nx) nx.classList.remove('hide');
        return;
      }

      if(e.target.closest('[data-py-pnext]')){
        if(ui.practiceIdx + 1 < ui.practiceList.length){
          ui.practiceIdx++; ui.practiceAnswered = false;
          render();
          if(ui.practiceList[ui.practiceIdx]) playText(ui.practiceList[ui.practiceIdx].audioText, 0.85);
        }else{
          const ls = findLesson(ui.lessonId);
          recordAttempt(ls, 'practice', ui.practiceOk, ui.practiceList.length, ui.practiceWrongItems);
          ui.lessonTab = 'test';
          persistRoute(); render();
        }
        return;
      }

      const tOpt = e.target.closest('[data-py-topt]');
      if(tOpt && !ui.testAnswered){
        ui.testAnswered = true;
        const q = ui.testList[ui.testIdx];
        const picked = tOpt.dataset.pyTopt;
        const isOk = picked === q.ans;
        if(isOk) ui.testOk++;
        else{
          ui.testWrong++;
          ui.testWrongItems.push({ phonemeId:q.phonemeId, confusedWith:q.confusedWith, explain:q.explain, question:q });
        }
        if(typeof playSfx === 'function') playSfx(isOk ? 'ok' : 'no');
        view.querySelectorAll('[data-py-topt]').forEach(b => {
          b.disabled = true;
          if(b.dataset.pyTopt === q.ans) b.classList.add('ok');
          else if(b === tOpt && !isOk) b.classList.add('no');
        });
        const fb = document.getElementById('py-t-fb');
        if(fb){
          fb.className = 'py-qfb ' + (isOk ? 'ok' : 'no');
          fb.innerHTML = (isOk ? '<b>Chính xác!</b> ' : '<b>Chưa đúng!</b> ') + esc(q.explain);
        }
        const nx = document.getElementById('py-t-next');
        if(nx) nx.classList.remove('hide');
        return;
      }

      if(e.target.closest('[data-py-tnext]')){
        if(ui.testIdx + 1 < ui.testList.length){
          ui.testIdx++; ui.testAnswered = false;
          render();
        }else{
          const ls = findLesson(ui.lessonId);
          recordAttempt(ls, 'test', ui.testOk, ui.testList.length, ui.testWrongItems);
          const total = ui.testList.length || 1;
          ui.lastResult = {
            lesson: ls,
            ok: ui.testOk,
            wrong: ui.testWrong,
            total,
            pct: Math.round((ui.testOk / total) * 100),
            wrongItems: ui.testWrongItems.slice()
          };
          ui.screen = 'result';
          if(typeof playSfx === 'function') playSfx('done');
          persistRoute(); render();
        }
        return;
      }

      const cInit = e.target.closest('[data-py-cinit]');
      if(cInit){
        ui.chartInitial = cInit.dataset.pyCinit;
        render(); return;
      }

      if(e.target.closest('[data-py-clearweak]')){
        prog.weakPhonemes = {}; prog.wrongQuestions = [];
        ui.weakList = []; saveProgress(); render(); return;
      }

      const wOpt = e.target.closest('[data-py-wopt]');
      if(wOpt && !ui.weakAnswered){
        ui.weakAnswered = true;
        const q = ui.weakList[ui.weakIdx];
        const isOk = wOpt.dataset.pyWopt === q.ans;
        if(typeof playSfx === 'function') playSfx(isOk ? 'ok' : 'no');
        view.querySelectorAll('[data-py-wopt]').forEach(b => {
          b.disabled = true;
          if(b.dataset.pyWopt === q.ans) b.classList.add('ok');
          else if(b === wOpt && !isOk) b.classList.add('no');
        });
        const fb = document.getElementById('py-w-fb');
        if(fb){ fb.className = 'py-qfb ' + (isOk ? 'ok' : 'no'); fb.innerHTML = esc(q.explain || ''); }
        const nx = document.getElementById('py-w-next');
        if(nx) nx.classList.remove('hide');
        return;
      }

      if(e.target.closest('[data-py-wnext]')){
        ui.weakIdx = (ui.weakIdx + 1) % Math.max(1, ui.weakList.length);
        ui.weakAnswered = false;
        render();
      }
    });
  }

  window.initPinyinView = function(){
    bindEvents();
    if(ui.screen === 'lesson' && (!ui.practiceList.length || !ui.testList.length)){
      enterLesson(ui.lessonId, ui.lessonTab);
      return;
    }
    render();
  };
})();
