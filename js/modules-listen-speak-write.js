/* ---------- Công đoạn 4: Luyện nghe, Chép chính tả & Hội thoại ---------- */
let activeAudio=null;
function stopListeningAudio(){
  try{if(activeAudio){activeAudio.pause();activeAudio=null;}}catch(_){}
  try{if(typeof speechSynthesis!=='undefined')speechSynthesis.cancel();}catch(_){}
}
function playItemAudio(item,rate,onEnd){
  stopListeningAudio();
  const spd=Number(rate)||1;
  const text=typeof item==='string'?item:(item&&item.zh)||'';
  const url=item&&typeof item==='object'?item.audio:null;
  if(url){
    try{
      const a=new Audio(url);activeAudio=a;a.playbackRate=spd;
      if(onEnd)a.onended=onEnd;
      a.onerror=()=>speak(text,spd);
      const p=a.play();if(p&&p.catch)p.catch(()=>speak(text,spd));
      return;
    }catch(_){}
  }
  if(!text){if(onEnd)onEnd();return;}
  if(typeof speechSynthesis==='undefined'||typeof SpeechSynthesisUtterance==='undefined'){
    toast('Thiết bị chưa hỗ trợ đọc mẫu');if(onEnd)onEnd();return;
  }
  try{
    const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=spd;
    const voices=speechSynthesis.getVoices()||[];
    const v=voices.find(x=>x.lang&&x.lang.toLowerCase().startsWith('zh'));
    if(v)u.voice=v;
    else if(voices.length>0&&!zhWarned){zhWarned=true;toast('Thiết bị chưa có giọng đọc tiếng Trung (zh-CN)');}
    if(onEnd)u.onend=onEnd;
    u.onerror=()=>{if(!zhWarned){zhWarned=true;toast('Không thể phát âm thanh tiếng Trung trên thiết bị này');}if(onEnd)onEnd();};
    speechSynthesis.speak(u);
  }catch(_){toast('Thiết bị chưa hỗ trợ đọc mẫu');if(onEnd)onEnd();}
}

// So sánh ký tự chính tả (LCS) -> phân loại đúng / sai / thiếu / thừa
function diffChars(input,expected){
  const clean=s=>String(s||'').replace(/\s+/g,'').trim();
  const a=[...clean(input)],b=[...clean(expected)];
  const n=a.length,m=b.length;
  const dp=Array.from({length:n+1},()=>new Array(m+1).fill(0));
  for(let i=n-1;i>=0;i--){
    for(let j=m-1;j>=0;j--){
      dp[i][j]=a[i]===b[j]?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);
    }
  }
  const ops=[];
  let i=0,j=0;
  while(i<n&&j<m){
    if(a[i]===b[j]){ops.push({t:'ok',ch:b[j]});i++;j++;}
    else if(dp[i+1][j]>=dp[i][j+1]){ops.push({t:'extra',ch:a[i]});i++;}
    else{ops.push({t:'miss',ch:b[j]});j++;}
  }
  while(i<n){ops.push({t:'extra',ch:a[i++]});}
  while(j<m){ops.push({t:'miss',ch:b[j++]});}
  // Ghép cặp miss+extra liên tiếp thành 'sub' (sai ký tự) cho dễ nhìn
  const merged=[];
  for(let k=0;k<ops.length;k++){
    if(k+1<ops.length&&((ops[k].t==='extra'&&ops[k+1].t==='miss')||(ops[k].t==='miss'&&ops[k+1].t==='extra'))){
      const got=ops[k].t==='extra'?ops[k].ch:ops[k+1].ch;
      const exp=ops[k].t==='miss'?ops[k].ch:ops[k+1].ch;
      merged.push({t:'sub',ch:exp,got});k++;
    }else merged.push(ops[k]);
  }
  const okCount=merged.filter(x=>x.t==='ok').length;
  const exact=clean(input)===clean(expected)&&m>0;
  return {exact,ops:merged,okCount,total:m};
}

let LISTEN_DIALOG=[
  {who:'A',name:'Minh',zh:'你喜欢喝什么？',py:'Nǐ xǐhuan hē shénme?',vi:'Bạn thích uống gì?'},
  {who:'B',name:'Lan',zh:'我喜欢喝茶，也喜欢看书。',py:'Wǒ xǐhuan hē chá, yě xǐhuan kàn shū.',vi:'Tôi thích uống trà, cũng thích đọc sách.'},
  {who:'A',name:'Minh',zh:'你喜欢运动吗？',py:'Nǐ xǐhuan yùndòng ma?',vi:'Bạn có thích thể thao không?'},
  {who:'B',name:'Lan',zh:'我喜欢游泳。',py:'Wǒ xǐhuan yóuyǒng.',vi:'Tôi thích bơi lội.'}
];

let DIALOG_QUESTIONS=[
  {id:'dq1',q:'Lan thích uống gì?',opts:[{t:'Cà phê',ok:false},{t:'Trà',ok:true},{t:'Nước ép',ok:false},{t:'Sữa',ok:false}],exp:'Trong hội thoại, Lan nói: “我喜欢喝茶” (Tôi thích uống trà).'},
  {id:'dq2',q:'Ngoài uống trà, Lan còn thích làm gì?',opts:[{t:'Xem phim',ok:false},{t:'Ca hát',ok:false},{t:'Đọc sách',ok:true},{t:'Du lịch',ok:false}],exp:'Lan nói: “也喜欢看书。” (cũng thích đọc sách).'},
  {id:'dq3',q:'Minh hỏi Lan có thích môn gì?',opts:[{t:'Âm nhạc',ok:false},{t:'Thể thao (运动)',ok:true},{t:'Bơi lội',ok:false},{t:'Nấu ăn',ok:false}],exp:'Minh hỏi: “你喜欢运动吗？” (Bạn có thích thể thao không?).'},
  {id:'dq4',q:'Lan thích môn thể thao nào?',opts:[{t:'Bơi lội (游泳)',ok:true},{t:'Chạy bộ',ok:false},{t:'Đá bóng',ok:false},{t:'Cầu lông',ok:false}],exp:'Lan trả lời: “我喜欢游泳。” (Tôi thích bơi lội).'}
];

function buildListenQuestions(mode){
  if(!WORDS.length&&!SENT.length)return [];
  if(mode==='choice'){
    const ws=shuffle(WORDS);
    const q1={id:'lc_'+ws[0].id,audioText:ws[0].zh,prompt:'Nghe từ và chọn nghĩa đúng:',opts:shuffle([ws[0],...pickDistractors(ws[0],WORDS,3)]).map(x=>({t:x.vi,ok:x.id===ws[0].id})),exp:`${ws[0].zh} (${ws[0].py}): ${ws[0].vi}.`,zh:ws[0].zh};
    const q2={id:'lc_'+ws[1].id,audioText:ws[1].zh,prompt:'Nghe từ và chọn chữ Hán đúng:',opts:shuffle([ws[1],...pickDistractors(ws[1],WORDS,3)]).map(x=>({t:x.zh,ok:x.id===ws[1].id})),exp:`Đáp án là ${ws[1].zh} (${ws[1].py}) — ${ws[1].vi}.`,zh:ws[1].zh};
    const q3={id:'lc_'+ws[2].id,audioText:ws[2].zh,prompt:'Nghe từ và chọn Pinyin đúng:',opts:shuffle([ws[2],...pickDistractors(ws[2],WORDS,3)]).map(x=>({t:x.py,ok:x.id===ws[2].id})),exp:`${ws[2].zh} đọc là ${ws[2].py} (${ws[2].vi}).`,zh:ws[2].zh};
    const q4={id:'lc_'+ws[3].id,audioText:ws[3].ex,prompt:'Nghe câu và chọn nghĩa đúng:',opts:shuffle([ws[3],...pickDistractors(ws[3],WORDS,3)]).map(x=>({t:x.exVi,ok:x.id===ws[3].id})),exp:`${ws[3].ex} (${ws[3].exPy}) — ${ws[3].exVi}`,zh:ws[3].ex};
    const q5={id:'lc_'+ws[4].id,audioText:ws[4].ex,prompt:'Nghe câu và chọn nghĩa đúng:',opts:shuffle([ws[4],...pickDistractors(ws[4],WORDS,3)]).map(x=>({t:x.exVi,ok:x.id===ws[4].id})),exp:`${ws[4].ex} (${ws[4].exPy}) — ${ws[4].exVi}`,zh:ws[4].ex};
    return [q1,q2,q3,q4,q5];
  }
  if(mode==='dict'){
    const pool=SENT.slice(0,4).map((s,idx)=>({id:'ld_'+idx,zh:s.zh,py:s.py,vi:s.vi}));
    return pool;
  }
  return DIALOG_QUESTIONS;
}

const listenCtrl=(function(){
  let mode='choice',qs=[],qi=0,correct=0,wrong=0,wrongQs=[],answered=false,recorded=false,dlgPlaying=false,dlgTimer=null;

  function applySpeedUI(){
    const spd=store.listening.speed;
    $$('#ln-speeds button,#ln-dlg-speeds button').forEach(b=>b.classList.toggle('on',Number(b.dataset.spd)===spd));
  }
  function applyDlgToggles(){
    const L=store.listening;
    const dl=$('#ln-dlg-list');
    if(dl){
      dl.classList.toggle('hide-zh',!L.showZh);
      dl.classList.toggle('hide-py',!L.showPy);
      dl.classList.toggle('hide-vi',!L.showVi);
    }
    $$('#ln-toggles button').forEach(b=>{
      const k=b.dataset.lt;
      const v=k==='zh'?L.showZh:k==='py'?L.showPy:L.showVi;
      b.setAttribute('aria-checked',String(v));
    });
  }
  function stopDlg(){
    dlgPlaying=false;
    clearTimeout(dlgTimer);
    stopListeningAudio();
    const btn=$('#ln-dlg-play');if(btn)btn.innerHTML='<svg class="ic f"><use href="#i-play"/></svg>';
    const st=$('#ln-dlg-status');if(st)st.textContent='Phát cả đoạn hội thoại';
    $$('#ln-dlg-list .bub').forEach(b=>b.classList.remove('active'));
  }
  function playDialogSeq(idx=0){
    if(idx>=LISTEN_DIALOG.length){stopDlg();return;}
    dlgPlaying=true;
    const btn=$('#ln-dlg-play');if(btn)btn.innerHTML='<svg class="ic"><use href="#i-x"/></svg>';
    const st=$('#ln-dlg-status');if(st)st.textContent=`Đang phát câu ${idx+1} / ${LISTEN_DIALOG.length} (${LISTEN_DIALOG[idx].name})`;
    $$('#ln-dlg-list .bub').forEach((b,k)=>b.classList.toggle('active',k===idx));
    playItemAudio(LISTEN_DIALOG[idx],store.listening.speed,()=>{
      if(!dlgPlaying)return;
      dlgTimer=setTimeout(()=>playDialogSeq(idx+1),450);
    });
  }
  function renderDialogList(){
    const dl=$('#ln-dlg-list');if(!dl)return;
    dl.innerHTML=LISTEN_DIALOG.map((line,idx)=>`
      <div class="bub" data-dl="${idx}">
        <span class="who ${line.who==='B'?'f':''}">${line.who}</span>
        <div class="body">
          <div class="mid">
            <div class="zh">${line.zh}</div>
            <div class="py">${line.py}</div>
            <span class="vi">${line.vi}</span>
          </div>
          <button class="playbtn" type="button" data-dsay="${idx}" aria-label="Nghe câu ${idx+1}"><svg class="ic f"><use href="#i-play"/></svg></button>
        </div>
      </div>`).join('');
    applyDlgToggles();
  }

  function start(newMode,customQs){
    stopDlg();
    mode=newMode||mode;
    $$('#ln-modes button').forEach(b=>b.classList.toggle('on',b.dataset.lm===mode));
    qs=customQs||buildListenQuestions(mode);
    qi=0;correct=0;wrong=0;wrongQs=[];recorded=false;
    if(mode==='dlg')renderDialogList();
    renderQ();
  }

  function showFb(ok,title,htmlDesc,allowRetry){
    const fb=$('#ln-fb'),act=$('#ln-actions'),rb=$('#ln-retry');
    fb.className='fb-card '+(ok?'ok':'no');
    fb.innerHTML=`<b><svg class="ic" style="width:1.1em;height:1.1em"><use href="#i-${ok?'check':'x'}"/></svg>${title}</b><div>${htmlDesc}</div>`;
    fb.classList.remove('hide');
    act.classList.remove('hide');
    rb.classList.toggle('hide',ok||!allowRetry);
    $('#ln-next').textContent=(qi+1>=qs.length)?'Xem tổng kết':'Câu tiếp theo →';
  }

  function recordAnswer(ok,q){
    if(answered)return;
    answered=true;
    if(ok)correct++;
    else{
      wrong++;
      if(!wrongQs.includes(q))wrongQs.push(q);
      if(q.id&&!store.listening.wrongIds.includes(q.id)){store.listening.wrongIds.push(q.id);saveStore(store);}
    }
  }

  function renderQ(){
    const play=$('#ln-play'),em=$('#ln-empty'),sum=$('#ln-summary');
    sum.classList.add('hide');
    $('#ln-audio-card').classList.toggle('hide',mode==='dlg');
    $('#ln-dlg-wrap').classList.toggle('hide',mode!=='dlg');

    if(!qs.length){
      play.classList.add('hide');em.classList.remove('hide');
      em.innerHTML=`<h3>Danh sách bài nghe hiện đang trống</h3><p class="muted small" style="margin-top:6px">Hãy thử chuyển sang chế độ khác.</p><div class="btnrow" style="margin-top:12px"><button type="button" class="btn sm" id="ln-em-rst">Về Nghe chọn</button></div>`;
      $('#ln-em-rst').onclick=()=>start('choice');
      return;
    }
    if(qi>=qs.length){renderSummary();return;}
    em.classList.add('hide');play.classList.remove('hide');
    answered=false;
    $('#ln-fb').classList.add('hide');$('#ln-actions').classList.add('hide');
    $('#ln-count').textContent=`${qi+1} / ${qs.length}`;
    $('#ln-bar').style.width=((qi+1)/qs.length*100)+'%';

    const q=qs[qi],stage=$('#ln-stage'),ABC=['A','B','C','D'];
    if(mode==='choice'||mode==='dlg'){
      const title=mode==='choice'?q.prompt:`Câu hỏi: ${q.q}`;
      stage.innerHTML=`<h3 style="margin-bottom:8px">${title}</h3><div class="opt-list">${q.opts.map((o,idx)=>`<button type="button" class="opt" data-idx="${idx}"><i>${ABC[idx]}</i><span>${o.t}</span><span class="st-ic"></span></button>`).join('')}</div>`;
      $$('.opt',stage).forEach(btn=>btn.onclick=()=>{
        if(answered)return;
        const idx=+btn.dataset.idx,ok=q.opts[idx].ok;
        btn.classList.add(ok?'ok':'no');
        $('.st-ic',btn).textContent=ok?'✓':'✕';
        if(!ok){const oi=q.opts.findIndex(x=>x.ok);if(oi>=0){const ob=$$('.opt',stage)[oi];ob.classList.add('ok');$('.st-ic',ob).textContent='✓';}}
        recordAnswer(ok,q);
        showFb(ok,ok?'Chính xác!':'Chưa đúng rồi!',q.exp,!ok);
      });
    }else if(mode==='dict'){
      stage.innerHTML=`
        <p class="muted small" style="margin-bottom:6px">Nghe và gõ lại câu tiếng Trung (có thể dùng bàn phím tiếng Trung hoặc dán chữ Hán):</p>
        <div class="dict-box"><input id="dict-in" type="text" placeholder="Nhập câu tiếng Trung..." autocomplete="off" autocorrect="off" spellcheck="false"><button type="button" id="dict-clr" aria-label="Xóa" style="color:var(--muted)"><svg class="ic" style="width:1.1em;height:1.1em"><use href="#i-x"/></svg></button></div>
        <div class="btnrow" style="margin-top:10px"><button type="button" class="btn ghost sm" id="dict-hint">Gợi ý (${q.zh.length} ký tự)</button><button type="button" class="btn sm" id="dict-chk">Kiểm tra</button></div>`;
      $('#dict-clr').onclick=()=>{$('#dict-in').value='';$('#dict-in').focus();};
      $('#dict-hint').onclick=()=>toast(`Pinyin: ${q.py}`);
      $('#dict-chk').onclick=()=>{
        if(answered)return;
        const val=$('#dict-in').value.trim();
        if(!val){toast('Hãy nhập câu bạn nghe được trước khi kiểm tra');return;}
        const res=diffChars(val,q.zh);
        const diffHtml=`<div class="diff-line">${res.ops.map(op=>op.t==='ok'?`<span class="dc ok">${op.ch}</span>`:op.t==='sub'?`<span class="dc sub" title="Bạn nhập: ${op.got}">${op.got}→${op.ch}</span>`:op.t==='miss'?`<span class="dc miss" title="Thiếu">${op.ch}</span>`:`<span class="dc extra" title="Thừa">${op.ch}</span>`).join('')}</div><div class="small"><b>Đáp án:</b> ${q.zh} (${q.py})<br><b>Nghĩa:</b> ${q.vi}</div>`;
        recordAnswer(res.exact,q);
        showFb(res.exact,res.exact?'Chính xác tuyệt đối!':`Đúng ${res.okCount}/${res.total} ký tự`,diffHtml,!res.exact);
      };
    }
  }

  function renderSummary(){
    stopDlg();
    $('#ln-play').classList.add('hide');$('#ln-empty').classList.add('hide');
    const sum=$('#ln-summary');sum.classList.remove('hide');
    const total=correct+wrong,pct=total?Math.round(correct/total*100):0;
    if(!recorded&&total>0){
      recorded=true;
      store.listening.attempts+=1;
      if(pct>store.listening.bestPct)store.listening.bestPct=pct;
      store.listening.sessions.push({at:Date.now(),mode,correct,wrong,total,pct});recordLearningEvent({type:mode==='dict'?'dictation':'listen',skill:'listen',title:mode==='dict'?'Chép chính tả':mode==='dlg'?'Nghe hội thoại':'Nghe chọn đáp án',result:`${correct}/${total} (${pct}%)`,view:'listen',meta:{correct,total,pct}});
      if(store.listening.sessions.length>20)store.listening.sessions=store.listening.sessions.slice(-20);
      saveStore(store);
      updateLessonListenStatus();
    }
    sum.innerHTML=`<div class="sphead"><svg class="ic"><use href="#i-award"/></svg><div><h3>Hoàn thành bài nghe!</h3><span class="muted small">Độ chính xác: ${pct}% • Kỷ lục: ${store.listening.bestPct}%</span></div></div>
      <div class="sum-grid" style="margin-top:12px"><div><b style="color:var(--good)">${correct}</b><span>Đúng</span></div><div><b>${wrong}</b><span>Sai</span></div><div><b style="color:var(--ink)">${store.listening.attempts}</b><span>Lần luyện</span></div></div>
      ${wrongQs.length?`<div style="margin-top:12px;display:grid;gap:6px"><b class="small">Câu cần nghe lại:</b>${wrongQs.map(w=>`<div class="wrong-item"><b>${w.zh||w.q||''}</b> — ${w.exp||(w.py+' · '+w.vi)}</div>`).join('')}</div>`:''}
      <div class="btnrow" style="margin-top:14px">${wrongQs.length?`<button type="button" class="btn ghost sm" id="ln-retry-wrong">Luyện lại ${wrongQs.length} câu sai</button>`:''}<button type="button" class="btn sm" id="ln-again"><svg class="ic"><use href="#i-refresh"/></svg>Luyện lại</button></div>`;
    const rw=$('#ln-retry-wrong');if(rw)rw.onclick=()=>start(mode,wrongQs.slice());
    $('#ln-again').onclick=()=>start(mode);
  }

  $('#ln-modes').addEventListener('click',e=>{const b=e.target.closest('button');if(b)start(b.dataset.lm);});
  $$('#ln-speeds,#ln-dlg-speeds').forEach(row=>row.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    store.listening.speed=Number(b.dataset.spd);saveStore(store);applySpeedUI();
  }));
  $('#ln-play-btn').onclick=()=>{const q=qs[qi];if(q)playItemAudio({zh:q.audioText||q.zh,audio:q.audio},store.listening.speed);};
  $('#ln-dlg-play').onclick=()=>{if(dlgPlaying)stopDlg();else playDialogSeq(0);};
  $('#ln-dlg-list').addEventListener('click',e=>{
    const b=e.target.closest('[data-dsay]');if(!b)return;
    stopDlg();
    const idx=+b.dataset.dsay;
    playItemAudio(LISTEN_DIALOG[idx],store.listening.speed);
  });
  $('#ln-toggles').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    const k=b.dataset.lt;
    if(k==='zh')store.listening.showZh=!store.listening.showZh;
    else if(k==='py')store.listening.showPy=!store.listening.showPy;
    else store.listening.showVi=!store.listening.showVi;
    saveStore(store);applyDlgToggles();
  });
  $('#ln-next').onclick=()=>{qi+=1;renderQ();};
  $('#ln-retry').onclick=()=>{if(answered&&wrong>0){wrong--;const idx=wrongQs.indexOf(qs[qi]);if(idx>=0)wrongQs.splice(idx,1);}renderQ();};

  return {init(){applySpeedUI();applyDlgToggles();start('choice');},stop:stopDlg};
})();

function updateLessonListenStatus(){
  const st=$('#lesson-listen-st');if(!st)return;
  if(store.listening&&store.listening.attempts>0){
    st.className='st done';
    st.innerHTML=`<svg class="ic"><use href="#i-check"/></svg>${store.listening.bestPct}% (${store.listening.attempts} lần)`;
  }
}

try{
  applySettingsUI();
  vocab.render();
  renderReviewDash();
  renderWordbook();
  exCtrl.init();
  gramCtrl.init();
  updateLessonExerciseStatus();
  window._stopListen=listenCtrl.stop;listenCtrl.init();
  updateLessonListenStatus();
  updateLessonWriteStatus();
}catch(err){console.error('Init error:',err);}

/* ---------- Hội thoại ---------- */
(function(){
  const root=$('#rep'),f=k=>$(`[data-f="${k}"]`,root);let i=1;
  const page=$('[data-view="dialog"]');
  function render(){const s=SENT[i];f('zh').textContent=s.zh;f('vi').textContent=s.vi;f('n').textContent=i+1;
    $('[data-f="count"]',page).textContent=`${i+1} / 5`;$('[data-f="bar"]',page).style.width=((i+1)/5*100)+'%';f('score').textContent='--/100'}
  f('prev').onclick=()=>{i=(i+4)%5;render()};f('nxt').onclick=()=>{i=(i+1)%5;render()};
  f('again').onclick=()=>speak(SENT[i].zh,f('speed').value);
  f('mic').onclick=()=>fakeRecord(f('mic'),f('micl'),s=>{f('score').textContent=s.total+'/100'});
})();

/* ---------- Công đoạn 6: Ghi âm thật, Thanh điệu & Adapter đánh giá phát âm ---------- */
// Phân biệt 5 loại thanh điệu (1,2,3,4, nhẹ=5) + biến điệu ngữ cảnh (hai thanh 3, 一, 不)
function detectBaseTone(syllable){
  if(/[āēīōūǖ]/.test(syllable))return 1;
  if(/[áéíóúǘ]/.test(syllable))return 2;
  if(/[ǎěǐǒǔǚ]/.test(syllable))return 3;
  if(/[àèìòùǜ]/.test(syllable))return 4;
  return 5; // Thanh nhẹ
}
function analyzeExpectedTones(zhText,pyText){
  const hanChars=[...String(zhText||'')].filter(ch=>/[\u4e00-\u9fff]/.test(ch));
  let rawSyls=String(pyText||'').replace(/[.,!?;:"'“”‘’。，！？；：]/g,' ').trim().split(/\s+/).filter(Boolean);
  if(rawSyls.length<hanChars.length){
    const sylRe=/(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?[aāáǎàeēéěèiīíǐìoōóǒòuūúǔùüǖǘǚǜ]+(?:ng|n|r)?/gi;
    const expanded=[];
    for(const tok of rawSyls){const m=tok.match(sylRe);if(m&&m.length)expanded.push(...m);else expanded.push(tok);}
    if(expanded.length===hanChars.length)rawSyls=expanded;
  }
  const items=hanChars.map((ch,idx)=>{
    const py=rawSyls[idx]||'';
    const baseTone=detectBaseTone(py.toLowerCase());
    return {ch,py,baseTone,tone:baseTone,sandhi:null};
  });
  // Áp dụng quy tắc biến điệu ngữ cảnh
  for(let i=0;i<items.length;i++){
    const cur=items[i],nxt=items[i+1];
    if(cur.ch==='一'&&nxt){
      if(nxt.baseTone===4){cur.tone=2;cur.sandhi='“一” trước thanh 4 đọc thành thanh 2 (yí)';}
      else if([1,2,3].includes(nxt.baseTone)){cur.tone=4;cur.sandhi='“一” trước thanh 1/2/3 đọc thành thanh 4 (yì)';}
    }else if(cur.ch==='不'&&nxt&&nxt.baseTone===4){
      cur.tone=2;cur.sandhi='“不” trước thanh 4 đọc thành thanh 2 (bú)';
    }else if(cur.baseTone===3&&nxt&&nxt.baseTone===3){
      cur.tone=2;cur.sandhi='Hai thanh 3 liền nhau: âm trước biến thành thanh 2';
    }else if(cur.baseTone===5){
      cur.sandhi='Thanh nhẹ: đọc ngắn và nhẹ';
    }
  }
  return items;
}

const TONE_NAMES={1:'Thanh 1',2:'Thanh 2',3:'Thanh 3',4:'Thanh 4',5:'Thanh nhẹ'};
const TONE_PATHS={
  1:'M2 4 L28 4',
  2:'M2 11 L28 3',
  3:'M2 6 L13 12 L28 3',
  4:'M2 3 L28 12',
  5:'M12 8 A2 2 0 1 0 16 8 A2 2 0 1 0 12 8'
};

// Lớp đánh giá phát âm độc lập (sẵn sàng cho SpeechSuper / TonePerfect qua backend proxy)
const PronunciationAssessor={
  getConfig(){
    const cfg=(typeof window!=='undefined'&&window.HANYU_ASSESS_CONFIG)||null;
    if(cfg&&typeof cfg.endpoint==='string'&&cfg.endpoint.trim()){
      return {configured:true,endpoint:cfg.endpoint.trim(),provider:cfg.provider||'custom'};
    }
    return {configured:false,endpoint:null,provider:null};
  },
  normalize(raw,meta){
    if(!raw||typeof raw!=='object')return null;
    const num=v=>Number.isFinite(Number(v))?Math.round(Number(v)):null;
    const syls=Array.isArray(raw.syllableResults)?raw.syllableResults.map(s=>({
      syllable:s.syllable||'',
      expectedTone:s.expectedTone||null,
      detectedTone:s.detectedTone||null,
      score:num(s.score)
    })):[];
    return {
      exerciseId:meta.id,
      referenceText:meta.zh,
      referencePinyin:meta.py,
      provider:raw.provider||meta.provider||'unknown',
      assessedAt:Date.now(),
      overallScore:num(raw.overallScore),
      initialScore:num(raw.initialScore),
      finalScore:num(raw.finalScore),
      toneScore:num(raw.toneScore),
      fluencyScore:num(raw.fluencyScore),
      syllableResults:syls,
      feedback:typeof raw.feedback==='string'?raw.feedback:'',
      status:'assessed'
    };
  },
  async assess(blob,item){
    const cfg=this.getConfig();
    if(!cfg.configured)throw new Error('NOT_CONFIGURED');
    const fd=new FormData();
    fd.append('audio',blob,'recording');
    fd.append('referenceText',item.zh);
    fd.append('referencePinyin',item.py);
    fd.append('exerciseId',item.id);
    fd.append('provider',cfg.provider);
    const res=await fetch(cfg.endpoint,{method:'POST',body:fd});
    if(!res.ok)throw new Error('API_ERROR_'+res.status);
    const data=await res.json();
    const norm=this.normalize(data,{id:item.id,zh:item.zh,py:item.py,provider:cfg.provider});
    if(!norm)throw new Error('INVALID_RESPONSE');
    return norm;
  }
};

function detectSupportedMime(){
  if(typeof MediaRecorder==='undefined'||!MediaRecorder.isTypeSupported)return '';
  const candidates=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/ogg'];
  return candidates.find(t=>{try{return MediaRecorder.isTypeSupported(t);}catch(_){return false;}})||'';
}

const speakCtrl=(function(){
  let mode=(store.speaking&&store.speaking.mode)||'sentence';
  let idx=0,mediaRec=null,stream=null,audioCtx=null,analyser=null,rafId=null,timerId=null;
  let chunks=[],recBlob=null,recUrl=null,recDuration=0,recStart=0,isRecording=false;
  let assessInFlight=false,apiCallsInSession=0;
  const MAX_API_CALLS_SESSION=10;

  // Render 16 thanh đo tín hiệu âm thanh thật
  const meterEl=$('#sp-meter');
  if(meterEl)meterEl.innerHTML=Array.from({length:16},()=>'<i style="height:4px"></i>').join('');

  function getList(){
    if(mode==='word')return WORDS.map(w=>({id:'sp_w_'+w.id,zh:w.zh,py:w.py,vi:w.vi}));
    if(mode==='dialog')return LISTEN_DIALOG.map((d,k)=>({id:'sp_d_'+k,zh:d.zh,py:d.py,vi:d.vi}));
    return SENT.map((s,k)=>({id:'sp_s_'+k,zh:s.zh,py:s.py,vi:s.vi}));
  }
  function getItemRec(id){
    return store.speaking.items[id]||{attempts:0,assessRequests:0,lastPracticedAt:null,lastResult:null,needsPractice:false,history:[]};
  }
  function saveItemRec(id,patch){
    const prev=getItemRec(id);
    store.speaking.items[id]=Object.assign({},prev,patch,{lastPracticedAt:Date.now()});
    saveStore(store);
  }

  function releaseMic(){
    isRecording=false;
    clearInterval(timerId);timerId=null;
    if(typeof cancelAnimationFrame==='function'&&rafId)cancelAnimationFrame(rafId);rafId=null;
    if(mediaRec&&mediaRec.state!=='inactive'){try{mediaRec.stop();}catch(_){}}
    if(stream){try{stream.getTracks().forEach(t=>t.stop());}catch(_){}stream=null;}
    if(audioCtx){try{audioCtx.close();}catch(_){}audioCtx=null;analyser=null;}
    $('#sp-mic').classList.remove('rec');
    if(meterEl)$$('i',meterEl).forEach(el=>el.style.height='4px');
  }
  function clearRecBlob(){
    if(recUrl){try{URL.revokeObjectURL(recUrl);}catch(_){}recUrl=null;}
    recBlob=null;recDuration=0;
    const au=$('#sp-audio');if(au){au.pause();au.removeAttribute('src');au.load();}
    $('#sp-player').classList.add('hide');
    $('#sp-rec-meta').textContent='';
    $('#sp-compare').disabled=true;
    $('#sp-assess').disabled=true;
  }
  function stopAll(){
    releaseMic();
    stopListeningAudio();
    const au=$('#sp-audio');if(au)try{au.pause();}catch(_){}
  }

  function fmtSec(s){const n=Math.max(0,Math.floor(s));return '00:'+String(n).padStart(2,'0');}

  function renderTones(item){
    const syls=analyzeExpectedTones(item.zh,item.py);
    const notes=[...new Set(syls.map(s=>s.sandhi).filter(Boolean))];
    $('#sp-tones').innerHTML=syls.map(s=>`
      <button type="button" class="syl-btn ${s.sandhi?'sandhi':''}" data-say="${s.ch}" aria-label="Nghe ${s.ch}">
        <span class="sz">${s.ch}</span>
        <span class="sp">${s.py||'—'}</span>
        <svg class="tone-svg" viewBox="0 0 30 16"><path d="${TONE_PATHS[s.tone]||TONE_PATHS[5]}"/></svg>
        <span class="st">${TONE_NAMES[s.tone]}</span>
      </button>`).join('');
    $('#sp-sandhi-note').textContent=notes.length?('Biến điệu: '+notes.join(' • ')):'Không có biến điệu đặc biệt trong mục này.';
  }

  function renderAssessmentArea(item){
    const cfg=PronunciationAssessor.getConfig();
    const banner=$('#sp-api-banner'),resWrap=$('#sp-result-wrap');
    const saved=getItemRec(item.id).lastResult;
    if(!cfg.configured){
      banner.innerHTML='<b>Chế độ luyện tập miễn phí:</b> Chưa kết nối dịch vụ chấm phát âm (cần backend bảo mật cho TonePerfect / SpeechSuper). Bạn vẫn có thể ghi âm thật, nghe lại, so sánh và xem thanh điệu.';
    }else{
      banner.innerHTML=`<b>Dịch vụ chấm:</b> ${cfg.provider} • Lượt gọi trong phiên: ${apiCallsInSession}/${MAX_API_CALLS_SESSION}`;
    }
    if(saved&&saved.status==='assessed'){
      resWrap.classList.remove('hide');
      const row=(lbl,val)=>val===null?'':`<div class="barrow" style="justify-content:space-between"><span class="small">${lbl}</span><b>${val} / 100</b></div>`;
      resWrap.innerHTML=`
        <div class="barrow" style="justify-content:space-between"><b>Kết quả đã lưu</b><b style="color:var(--accent)">${saved.overallScore!==null?saved.overallScore+' / 100':'Đã chấm'}</b></div>
        ${row('Âm đầu',saved.initialScore)}${row('Vần',saved.finalScore)}${row('Thanh điệu',saved.toneScore)}${row('Độ trôi chảy',saved.fluencyScore)}
        ${saved.feedback?`<div class="note"><svg class="ic"><use href="#i-bulb"/></svg><div>${saved.feedback}</div></div>`:''}`;
    }else{
      resWrap.classList.add('hide');resWrap.innerHTML='';
    }
  }

  function renderItem(){
    stopAll();
    clearRecBlob();
    const list=getList();
    if(!list.length){$('#sp-zh').textContent='Chưa có dữ liệu luyện tập';return;}
    if(idx>=list.length)idx=0;
    const item=list[idx];
    const maxSec=Number($('#sp-maxsec').value)||15;
    $('#sp-idx').textContent=`${idx+1} / ${list.length}`;
    $('#sp-zh').textContent=item.zh;
    $('#sp-py').textContent=item.py;
    $('#sp-vi').textContent=item.vi;
    $('#sp-rec-state').textContent='Sẵn sàng ghi âm';
    $('#sp-timer').textContent=`00:00 / ${fmtSec(maxSec)}`;
    renderTones(item);
    renderAssessmentArea(item);
  }

  async function startRec(){
    if(isRecording){releaseMic();return;}
    if(!window.isSecureContext&&location.hostname!=='localhost'&&location.hostname!=='127.0.0.1'){
      toast('Cần chạy qua HTTPS hoặc localhost để truy cập micro');
      $('#sp-rec-state').textContent='Môi trường hiện tại không hỗ trợ quyền micro (cần HTTPS)';
      return;
    }
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||typeof MediaRecorder==='undefined'){
      toast('Trình duyệt không hỗ trợ ghi âm MediaRecorder');
      $('#sp-rec-state').textContent='Trình duyệt không hỗ trợ ghi âm';
      return;
    }
    stopListeningAudio();
    clearRecBlob();
    const maxSec=Number($('#sp-maxsec').value)||15;
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
    }catch(err){
      const msg=err&&err.name==='NotAllowedError'?'Bạn đã từ chối quyền micro':err&&err.name==='NotFoundError'?'Không tìm thấy micro trên thiết bị':'Không thể truy cập micro';
      toast(msg);$('#sp-rec-state').textContent=msg;return;
    }

    const mime=detectSupportedMime();
    try{mediaRec=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);}
    catch(_){mediaRec=new MediaRecorder(stream);}

    chunks=[];recStart=Date.now();isRecording=true;
    $('#sp-mic').classList.add('rec');
    $('#sp-rec-state').textContent='Đang ghi âm… Nhấn lại để dừng';

    // Phân tích tín hiệu micro thật bằng Web Audio API
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(AC){
        audioCtx=new AC();
        const srcNode=audioCtx.createMediaStreamSource(stream);
        analyser=audioCtx.createAnalyser();analyser.fftSize=64;
        srcNode.connect(analyser);
        const buf=new Uint8Array(analyser.frequencyBinCount);
        const bars=$$('i',meterEl);
        const tick=()=>{
          if(!isRecording||!analyser)return;
          analyser.getByteFrequencyData(buf);
          bars.forEach((b,k)=>{const v=buf[k%buf.length]||0;b.style.height=Math.max(4,Math.round(v/255*26))+'px';});
          rafId=requestAnimationFrame(tick);
        };
        tick();
      }
    }catch(_){}

    mediaRec.ondataavailable=e=>{if(e.data&&e.data.size>0)chunks.push(e.data);};
    mediaRec.onstop=()=>{
      const dur=(Date.now()-recStart)/1000;
      const finalMime=(mediaRec&&mediaRec.mimeType)||mime||'audio/webm';
      releaseMic();
      if(dur<0.4||!chunks.length){
        toast('Bản ghi quá ngắn hoặc rỗng, hãy thử nói lâu hơn');
        $('#sp-rec-state').textContent='Bản ghi quá ngắn hoặc rỗng';
        return;
      }
      recBlob=new Blob(chunks,{type:finalMime});
      if(!recBlob.size){toast('File âm thanh rỗng');return;}
      recDuration=dur;
      recUrl=URL.createObjectURL(recBlob);
      const au=$('#sp-audio');au.src=recUrl;
      $('#sp-player').classList.remove('hide');
      $('#sp-rec-state').textContent='Đã ghi âm xong';
      $('#sp-rec-meta').textContent=`Thời lượng: ${dur.toFixed(1)}s • Định dạng: ${finalMime} • ${(recBlob.size/1024).toFixed(1)} KB`;
      $('#sp-compare').disabled=false;
      $('#sp-assess').disabled=false;

      const curItem=getList()[idx];
      if(curItem){
        const prev=getItemRec(curItem.id);
        saveItemRec(curItem.id,{attempts:prev.attempts+1});recordLearningEvent({type:'record',skill:'speak',title:`Ghi âm: ${curItem.zh}`,targetId:curItem.id,view:'speak',durationSec:Math.round(dur),result:`${dur.toFixed(1)}s`});
      }
    };

    mediaRec.start();
    timerId=setInterval(()=>{
      const el=(Date.now()-recStart)/1000;
      $('#sp-timer').textContent=`${fmtSec(el)} / ${fmtSec(maxSec)}`;
      if(el>=maxSec)releaseMic();
    },250);
  }

  $('#sp-modes').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    mode=b.dataset.sm;idx=0;
    store.speaking.mode=mode;saveStore(store);
    $$('#sp-modes button').forEach(x=>x.classList.toggle('on',x===b));
    renderItem();
  });
  $('#sp-maxsec').onchange=()=>{
    store.speaking.maxSec=Number($('#sp-maxsec').value)||15;saveStore(store);
    if(!isRecording)$('#sp-timer').textContent=`00:00 / ${fmtSec(store.speaking.maxSec)}`;
  };
  $('#sp-prev').onclick=()=>{const L=getList();if(L.length){idx=(idx+L.length-1)%L.length;renderItem();}};
  $('#sp-next').onclick=()=>{const L=getList();if(L.length){idx=(idx+1)%L.length;renderItem();}};
  $('#sp-hear').onclick=()=>{const it=getList()[idx];if(it)playItemAudio(it,.9);};
  $('#sp-slow').onclick=()=>{const it=getList()[idx];if(it)playItemAudio(it,.55);};
  $('#sp-mic').onclick=startRec;
  $('#sp-play-rec').onclick=()=>{const au=$('#sp-audio');if(au&&recUrl){stopListeningAudio();au.currentTime=0;au.play().catch(()=>{});}};
  $('#sp-del-rec').onclick=()=>{clearRecBlob();$('#sp-rec-state').textContent='Đã xóa bản ghi, sẵn sàng thu lại';};
  $('#sp-compare').onclick=()=>{
    const it=getList()[idx],au=$('#sp-audio');
    if(!it||!recUrl)return;
    playItemAudio(it,.9,()=>{if(recUrl&&au){au.currentTime=0;au.play().catch(()=>{});}});
  };
  $('#sp-assess').onclick=async()=>{
    if(assessInFlight)return;
    const it=getList()[idx];if(!it||!recBlob)return;
    const cfg=PronunciationAssessor.getConfig();
    if(!cfg.configured){
      toast('Chưa cấu hình endpoint chấm phát âm (đang dùng chế độ miễn phí)');
      return;
    }
    if(apiCallsInSession>=MAX_API_CALLS_SESSION){
      toast('Đã đạt giới hạn số lần chấm trong phiên để tiết kiệm chi phí');
      return;
    }
    assessInFlight=true;apiCallsInSession++;
    const btn=$('#sp-assess');btn.disabled=true;btn.textContent='Đang chấm…';
    try{
      const prev=getItemRec(it.id);
      const result=await PronunciationAssessor.assess(recBlob,it);
      saveItemRec(it.id,{assessRequests:prev.assessRequests+1,lastResult:result,needsPractice:(result.overallScore!==null&&result.overallScore<80)});
      renderAssessmentArea(it);
    }catch(err){
      toast('Không thể kết nối dịch vụ chấm phát âm');
    }finally{
      assessInFlight=false;btn.disabled=false;btn.innerHTML='<svg class="ic"><use href="#i-award"/></svg>Chấm phát âm';
    }
  };

  return {
    init(){
      $$('#sp-modes button').forEach(x=>x.classList.toggle('on',x.dataset.sm===mode));
      $('#sp-maxsec').value=String(store.speaking.maxSec||15);
      renderItem();
    },
    stop:stopAll
  };
})();
try{window._stopSpeak=speakCtrl.stop;speakCtrl.init();}catch(e){console.error(e);}

/* ---------- Luyện nghe: sóng âm trang trí ---------- */
(function(){const w=$('#wave');const h=[8,14,22,12,18,26,16,10,20,24,14,8,18,22,12,16,24,10,14,20,12,8,16,22,10,14];w.innerHTML=h.map(x=>`<i style="height:${x}px"></i>`).join('')})();

/* ---------- Công đoạn 5: Luyện viết chữ Hán (Hanzi Writer + Canvas tự viết) ---------- */
const cv=$('#cv'),cx=cv.getContext('2d'),pad=$('#pad'),hwBox=$('#hw-target');
let ci=0,wMode=(store.writing&&store.writing.mode)||'trace',wOutline=true,drawing=false,strokesHist=[],curStroke=[],hwLibPromise=null,hwWriter=null,hwCharData=null,hwPlaying=false,hwPaused=false,hwStrokeIdx=0,runMistakes=0,runHints=0,runDone=false,loadSeq=0;

function getWriteRec(id){
  return store.writing.chars[id]||{attempts:0,guidedCompleted:0,acceptedStrokes:0,mistakes:0,hintsUsed:0,lastPracticedAt:null,selfStatus:null,needsPractice:false};
}
function saveWriteRec(id,patch){
  const cur=getWriteRec(id);
  store.writing.chars[id]=Object.assign({},cur,patch,{lastPracticedAt:Date.now()});
  saveStore(store);
  updateLessonWriteStatus();
}
function updateLessonWriteStatus(){
  const st=$('#lesson-write-st');if(!st)return;
  const practiced=CHARS.filter(c=>getWriteRec(c.id).attempts>0).length;
  if(practiced>0){
    st.className='st done';
    st.innerHTML=`<svg class="ic"><use href="#i-check"/></svg>${practiced} / ${CHARS.length} chữ`;
  }
}

// Tải Hanzi Writer từ CDN chỉ khi cần sử dụng (có fallback khi offline)
function ensureHanziWriter(){
  if(typeof window.HanziWriter!=='undefined')return Promise.resolve(window.HanziWriter);
  if(hwLibPromise)return hwLibPromise;
  const loadScript=url=>new Promise((res,rej)=>{
    const s=document.createElement('script');s.src=url;s.async=true;
    s.onload=()=>typeof window.HanziWriter!=='undefined'?res(window.HanziWriter):rej(new Error('No HanziWriter'));
    s.onerror=()=>rej(new Error('CDN failed'));
    document.head.appendChild(s);
  });
  hwLibPromise=loadScript('https://cdn.jsdelivr.net/npm/hanzi-writer@3.5.0/dist/hanzi-writer.min.js')
    .catch(()=>loadScript('https://unpkg.com/hanzi-writer@3.5.0/dist/hanzi-writer.min.js'))
    .catch(err=>{hwLibPromise=null;throw err;});
  return hwLibPromise;
}

function fitPad(){
  const r=cv.getBoundingClientRect(),d=window.devicePixelRatio||1;if(!r.width)return;
  cv.width=Math.round(r.width*d);cv.height=Math.round(r.height*d);
  cx.setTransform(d,0,0,d,0,0);cx.lineCap='round';cx.lineJoin='round';cx.lineWidth=9;
  redrawFreeCanvas();
}
function redrawFreeCanvas(){
  cx.save();cx.setTransform(1,0,0,1,0,0);cx.clearRect(0,0,cv.width,cv.height);cx.restore();
  cx.strokeStyle=getComputedStyle(document.body).color;
  for(const st of strokesHist){
    if(!st.length)continue;
    cx.beginPath();cx.moveTo(st[0].x,st[0].y);
    if(st.length===1)cx.lineTo(st[0].x+.01,st[0].y);
    else for(let k=1;k<st.length;k++)cx.lineTo(st[k].x,st[k].y);
    cx.stroke();
  }
}
const pt=e=>{const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
cv.addEventListener('pointerdown',e=>{
  if(wMode!=='free')return;
  e.preventDefault();drawing=true;const p=pt(e);curStroke=[p];strokesHist.push(curStroke);
  try{cv.setPointerCapture(e.pointerId);}catch(_){}
  cx.strokeStyle=getComputedStyle(document.body).color;
  cx.beginPath();cx.moveTo(p.x,p.y);cx.lineTo(p.x+.01,p.y);cx.stroke();
});
cv.addEventListener('pointermove',e=>{
  if(!drawing||wMode!=='free')return;
  e.preventDefault();const p=pt(e);curStroke.push(p);
  cx.beginPath();cx.moveTo(curStroke[curStroke.length-2].x,curStroke[curStroke.length-2].y);cx.lineTo(p.x,p.y);cx.stroke();
});
['pointerup','pointercancel'].forEach(ev=>cv.addEventListener(ev,()=>{drawing=false;}));

function setWriteFb(kind,msg){
  const fb=$('#w-fb');
  fb.className='w-fb'+(kind==='ok'?' ok':kind==='no'?' no':'');
  fb.textContent=msg;
}

function renderStrokeStrip(){
  const strip=$('#w-strip');if(!strip)return;
  if(!hwCharData||!Array.isArray(hwCharData.strokes)){strip.innerHTML='';return;}
  const total=hwCharData.strokes.length;
  $('#w-strokes-tag').textContent=`${total} nét`;
  $('#w-stroke-cur').textContent=`Nét ${Math.min(hwStrokeIdx+1,total)} / ${total}`;
  strip.innerHTML=hwCharData.strokes.map((_,idx)=>{
    const paths=hwCharData.strokes.slice(0,idx+1).map((d,k)=>`<path d="${d}" fill="${k===idx?'var(--accent)':'var(--ink)'}" opacity="${k===idx?1:.45}"/>`).join('');
    return `<button type="button" class="st-mini ${idx<hwStrokeIdx?'done':idx===hwStrokeIdx?'now':''}" data-si="${idx}" aria-label="Nét ${idx+1}"><svg viewBox="0 0 1024 1024" style="width:100%;height:100%;transform:scaleY(-1)"><g transform="translate(0,900) scale(1,-1)">${paths}</g></svg><span>${idx+1}</span></button>`;
  }).join('');
}

// Render SVG thứ tự nét thủ công để highlight chính xác từng nét (đã học / hiện tại / chưa học)
function renderOrderSvg(activeIdx){
  if(!hwCharData)return;
  const total=hwCharData.strokes.length;
  $('#w-stroke-cur').textContent=`Nét ${Math.min(activeIdx+1,total)} / ${total}`;
  const paths=hwCharData.strokes.map((d,k)=>{
    const color=k===activeIdx?'var(--accent)':k<activeIdx?'var(--ink)':'var(--line)';
    const op=k<=activeIdx?1:.55;
    return `<path d="${d}" fill="${color}" opacity="${op}"/>`;
  }).join('');
  hwBox.innerHTML=`<svg viewBox="0 0 1024 1024" aria-label="Thứ tự nét ${CHARS[ci].ch}"><g transform="scale(1,-1) translate(0,-900)">${paths}</g></svg>`;
  renderStrokeStrip();
}

function stopWriter(){
  if(hwWriter){try{if(hwWriter.cancelQuiz)hwWriter.cancelQuiz();if(hwWriter.pauseAnimation)hwWriter.pauseAnimation();}catch(_){}}
  hwWriter=null;hwPlaying=false;hwPaused=false;
  const pb=$('#wo-play');if(pb)pb.innerHTML='<svg class="ic f"><use href="#i-play"/></svg>Phát';
}

async function setupPadForChar(){
  const seq=++loadSeq;
  stopWriter();
  hwBox.innerHTML='';
  runMistakes=0;runHints=0;runDone=false;
  $('#w-result-box').classList.add('hide');

  const c=CHARS[ci];if(!c)return;
  const rec=getWriteRec(c.id);
  $('#wch').textContent=c.ch;
  $('#wpy').textContent=`${c.py} • ${c.vi}`;
  $('#wghost').textContent=c.ch;
  $('#wcount').textContent=`${ci+1} / ${CHARS.length}`;
  $('#wbar').style.width=((ci+1)/CHARS.length*100)+'%';
  $('#w-strokes-tag').textContent=`${c.strokes} nét`;
  $('#w-rad-tag').textContent=`Bộ: ${c.rad}`;
  $('#w-prog-tag').textContent=rec.guidedCompleted>0?`Đã viết ${rec.guidedCompleted} lần`:rec.selfStatus==='ok'?'Đã viết được':rec.needsPractice?'Cần luyện lại':'Chưa luyện';

  $$('#wmode button').forEach(b=>b.classList.toggle('on',b.dataset.m===wMode));
  $('#w-order-panel').classList.toggle('hide',wMode!=='order');
  $('#w-quiz-tools').classList.toggle('hide',wMode!=='trace'&&wMode!=='guided');
  $('#w-free-tools').classList.toggle('hide',wMode!=='free');
  $('#w-self-box').classList.toggle('hide',wMode!=='free');

  if(wMode==='free'){
    pad.classList.add('free');pad.classList.remove('peek','hw-on');
    $('#wf-peek span').textContent='Hiện mẫu';
    hwBox.style.pointerEvents='none';cv.style.pointerEvents='auto';
    strokesHist=[];fitPad();
    setWriteFb('','Tự viết chữ từ trí nhớ trên khung. Dùng “Hiện mẫu” để tự đối chiếu.');
    return;
  }

  pad.classList.remove('free','peek','hw-on');
  hwBox.style.pointerEvents='auto';cv.style.pointerEvents='none';
  strokesHist=[];redrawFreeCanvas();

  // Tải Hanzi Writer & dữ liệu nét chữ (chỉ tải khi mở màn hình viết)
  setWriteFb('','Đang tải dữ liệu thứ tự nét…');
  try{
    const HW=await ensureHanziWriter();
    if(seq!==loadSeq)return;
    const data=await HW.loadCharacterData(c.ch);
    if(seq!==loadSeq)return;
    if(!data||!Array.isArray(data.strokes)||!data.strokes.length)throw new Error('No stroke data');
    hwCharData=data;pad.classList.add('hw-on');
    c.strokes=data.strokes.length;
    $('#w-strokes-tag').textContent=`${c.strokes} nét`;

    if(wMode==='order'){
      hwStrokeIdx=0;
      renderOrderSvg(0);
      setWriteFb('','Bấm “Phát” để xem hoạt ảnh từ nét đầu đến nét cuối hoặc chạm từng nét.');
      return;
    }

    const size=Math.round(pad.getBoundingClientRect().width)||300;
    const outlineVisible=wMode==='trace'?true:wOutline;
    $('#w-outline span').textContent=outlineVisible?'Ẩn mẫu':'Hiện mẫu';
    hwWriter=HW.create('hw-target',c.ch,{
      width:size,height:size,padding:16,
      showOutline:outlineVisible,
      showCharacter:false,
      strokeColor:'#4B1E17',
      outlineColor:'#D9C2BA',
      highlightColor:'#B3412C',
      drawingColor:'#B3412C',
      drawingWidth:16,
      strokeAnimationSpeed:1,
      delayBetweenStrokes:220
    });
    setWriteFb('',wMode==='trace'?'Tô theo chữ mẫu mờ đúng thứ tự từng nét.':'Viết chữ theo trí nhớ; hệ thống sẽ kiểm tra từng nét.');
    hwWriter.quiz({
      showHintAfterMisses:2,
      highlightOnComplete:true,
      onMistake(){
        runMistakes++;
        setWriteFb('no','Nét này chưa đúng hướng hoặc thứ tự, hãy thử lại.');
      },
      onCorrectStroke(info){
        const left=info.strokesRemaining;
        setWriteFb('ok',left>0?`Tốt! Còn ${left} nét nữa.`:'Đủ nét rồi!');
      },
      onComplete(summary){
        if(runDone)return;
        runDone=true;
        const totalSt=c.strokes;
        const prev=getWriteRec(c.id);
        recordLearningEvent({type:'writing',skill:'write',title:`Luyện viết: ${c.ch}`,targetId:c.id,view:'writing',result:`Sai ${summary.totalMistakes} nét`});
        saveWriteRec(c.id,{
          attempts:prev.attempts+1,
          guidedCompleted:prev.guidedCompleted+1,
          acceptedStrokes:prev.acceptedStrokes+totalSt,
          mistakes:prev.mistakes+summary.totalMistakes,
          hintsUsed:prev.hintsUsed+runHints,
          needsPractice:summary.totalMistakes>=3
        });
        setWriteFb('ok',`Bạn đã hoàn thành chữ “${c.ch}”!`);
        $('#wr-strokes').textContent=`${totalSt}/${totalSt}`;
        $('#wr-mistakes').textContent=summary.totalMistakes;
        $('#wr-hints').textContent=runHints;
        $('#w-result-box').classList.remove('hide');
        $('#w-prog-tag').textContent=`Đã viết ${prev.guidedCompleted+1} lần`;
      }
    });
  }catch(err){
    if(seq!==loadSeq)return;
    // Fallback an toàn khi offline hoặc chữ chưa có dữ liệu nét: cho phép tự viết trên Canvas
    hwCharData=null;pad.classList.remove('hw-on');$('#w-strip').innerHTML='';
    cv.style.pointerEvents='auto';hwBox.style.pointerEvents='none';fitPad();
    setWriteFb('no','Không tải được dữ liệu thứ tự nét (cần mạng hoặc chữ chưa có dữ liệu). Bạn có thể tự viết trên khung hoặc chuyển sang chế độ Tự viết.');
  }
}

function showChar(){setupPadForChar();}
$('#wprev').onclick=()=>{ci=(ci+CHARS.length-1)%CHARS.length;showChar();};
const nextChar=()=>{ci=(ci+1)%CHARS.length;showChar();};
$('#wnext').onclick=nextChar;$('#wr-next').onclick=nextChar;
$('#wsay').onclick=()=>speak(CHARS[ci].ch,.7);

$('#wmode').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  wMode=b.dataset.m;
  store.writing.mode=wMode;saveStore(store);
  setupPadForChar();
});

// Điều khiển chế độ Xem nét
let orderTimer=null;
function stopOrderAnim(){clearInterval(orderTimer);orderTimer=null;hwPlaying=false;$('#wo-play').innerHTML='<svg class="ic f"><use href="#i-play"/></svg>Phát';}
$('#wo-play').onclick=()=>{
  if(!hwCharData){toast('Chưa có dữ liệu nét cho chữ này');return;}
  if(hwPlaying){stopOrderAnim();return;}
  hwPlaying=true;
  $('#wo-play').innerHTML='<svg class="ic"><use href="#i-x"/></svg>Tạm dừng';
  if(hwStrokeIdx>=hwCharData.strokes.length-1)hwStrokeIdx=0;
  renderOrderSvg(hwStrokeIdx);
  orderTimer=setInterval(()=>{
    if(hwStrokeIdx<hwCharData.strokes.length-1){hwStrokeIdx++;renderOrderSvg(hwStrokeIdx);}
    else stopOrderAnim();
  },750);
};
$('#wo-prev').onclick=()=>{stopOrderAnim();if(!hwCharData)return;hwStrokeIdx=Math.max(0,hwStrokeIdx-1);renderOrderSvg(hwStrokeIdx);};
$('#wo-next').onclick=()=>{stopOrderAnim();if(!hwCharData)return;hwStrokeIdx=Math.min(hwCharData.strokes.length-1,hwStrokeIdx+1);renderOrderSvg(hwStrokeIdx);};
$('#wo-replay').onclick=()=>{stopOrderAnim();if(!hwCharData)return;hwStrokeIdx=0;renderOrderSvg(0);$('#wo-play').click();};
$('#w-strip').addEventListener('click',e=>{
  const b=e.target.closest('[data-si]');if(!b||!hwCharData)return;
  stopOrderAnim();hwStrokeIdx=+b.dataset.si;renderOrderSvg(hwStrokeIdx);
});

// Điều khiển chế độ Tô mẫu / Hướng dẫn
$('#w-hint').onclick=()=>{
  if(!hwWriter||runDone)return;
  runHints++;
  try{hwWriter.highlightStroke(Math.min((hwCharData?hwCharData.strokes.length-1:0),hwWriter._quiz?hwWriter._quiz._currentStrokeIndex:0));}
  catch(_){try{hwWriter.showOutline();}catch(__){}}
  toast('Đã hiện gợi ý nét tiếp theo');
};
$('#w-outline').onclick=()=>{
  if(!hwWriter)return;
  wOutline=!wOutline;
  if(wOutline)hwWriter.showOutline();else hwWriter.hideOutline();
  $('#w-outline span').textContent=wOutline?'Ẩn mẫu':'Hiện mẫu';
};
$('#w-reset-quiz').onclick=()=>setupPadForChar();
$('#wr-again').onclick=()=>setupPadForChar();

// Điều khiển chế độ Tự viết
$('#wf-undo').onclick=()=>{if(!strokesHist.length)return;strokesHist.pop();redrawFreeCanvas();};
$('#wf-clear').onclick=()=>{strokesHist=[];redrawFreeCanvas();};
$('#wf-peek').onclick=()=>{
  const on=pad.classList.toggle('peek');
  $('#wf-peek span').textContent=on?'Ẩn mẫu':'Hiện mẫu';
};
$('#wf-mark-retry').onclick=()=>{
  const c=CHARS[ci],prev=getWriteRec(c.id);
  saveWriteRec(c.id,{attempts:prev.attempts+1,selfStatus:'retry',needsPractice:true});
  toast(`Đã đánh dấu “${c.ch}” cần luyện lại`);
  setupPadForChar();
};
$('#wf-mark-ok').onclick=()=>{
  const c=CHARS[ci],prev=getWriteRec(c.id);
  saveWriteRec(c.id,{attempts:prev.attempts+1,selfStatus:'ok',needsPractice:false});
  toast(`Đã lưu thực hành chữ “${c.ch}”`);
  nextChar();
};

let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if($('.view.on')?.dataset.view==='writing'){fitPad();}},150)});

/* ---------- Thư viện: tìm kiếm và lọc ---------- */
let flt='all';
function applyFilter(){
  const q=$('#q').value.trim().toLowerCase();let any=false;
  $$('.filterable').forEach(el=>{const ok=(flt==='all'||el.dataset.tags.split(' ').includes(flt))&&(!q||el.textContent.toLowerCase().includes(q));el.classList.toggle('hide',!ok);if(ok)any=true});
  $$('[data-sec]').forEach(s=>s.classList.toggle('hide',!$$('.filterable',s).some(x=>!x.classList.contains('hide'))));
  $('#noresult').classList.toggle('hide',any);
}
$('#q').addEventListener('input',applyFilter);
$('#filters').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;flt=b.dataset.filter;$$('#filters .chip').forEach(x=>x.classList.toggle('on',x===b));applyFilter()});

/* ---------- Công đoạn 7: Nhật ký sự kiện, Streak, Mục tiêu ngày & Thống kê thật ---------- */
function localDateKey(ts=Date.now()){
  const d=new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function ensureDaily(dk){
  if(!store.daily[dk])store.daily[dk]={minutes:0,seconds:0,newWords:0,reviews:0,listen:0,speak:0,write:0,correct:0,events:0};
  return store.daily[dk];
}
const LEARNING_VIEWS=new Set(['vocab','review','exercise','grammar','listen','writing','speak']);
let lastActivePing=Date.now();
window._activeTimeReady=true;
function touchActiveTime(){
  const now=Date.now();
  const deltaSec=Math.round((now-lastActivePing)/1000);
  lastActivePing=now;
  // Chỉ cộng thời gian thực tế khi người học đang ở màn hình học và không treo máy > 90s
  if(deltaSec>=3&&deltaSec<=90&&LEARNING_VIEWS.has(curView)){
    const d=ensureDaily(localDateKey(now));
    d.seconds=(d.seconds||0)+deltaSec;
    d.minutes=Math.round(d.seconds/60);
  }
}

let lastEvSig='';
function recordLearningEvent(ev){
  touchActiveTime();
  const now=Date.now(),dk=localDateKey(now);
  const sig=`${ev.type}:${ev.targetId||''}:${ev.result||''}`;
  const prev=store.events[store.events.length-1];
  if(prev&&sig===lastEvSig&&now-prev.endedAt<1200)return;
  lastEvSig=sig;
  const rec={
    id:ev.id||(`ev_${now}_${Math.random().toString(36).slice(2,7)}`),
    type:ev.type,
    skill:ev.skill||'vocab',
    title:ev.title||ev.type,
    targetId:ev.targetId||null,
    view:ev.view||curView,
    startedAt:ev.startedAt||now,
    endedAt:now,
    durationSec:Number.isFinite(ev.durationSec)?ev.durationSec:0,
    result:ev.result||'',
    completed:ev.completed!==false,
    meta:ev.meta||{}
  };
  if(store.events.some(x=>x.id===rec.id))return;
  store.events.push(rec);
  if(store.events.length>200)store.events=store.events.slice(-200);

  const d=ensureDaily(dk);
  d.events=(d.events||0)+1;
  if(rec.type==='vocab')d.newWords=(d.newWords||0)+1;
  else if(rec.type==='srs')d.reviews=(d.reviews||0)+1;
  else if(rec.type==='listen'||rec.type==='dictation')d.listen=(d.listen||0)+1;
  else if(rec.type==='record'||rec.type==='assess')d.speak=(d.speak||0)+1;
  else if(rec.type==='writing')d.write=(d.write||0)+1;
  if(rec.meta&&Number.isFinite(rec.meta.correct))d.correct=(d.correct||0)+rec.meta.correct;
  saveStore(store);
  refreshDashboards();
}

function computeStreak(now=Date.now()){
  const activeDays=new Set(Object.entries(store.daily).filter(([,v])=>v&&(v.events>0||v.newWords>0||v.reviews>0||v.listen>0||v.speak>0||v.write>0)).map(([k])=>k));
  if(!activeDays.size)return 0;
  let cur=new Date(now);
  let key=localDateKey(cur.getTime());
  if(!activeDays.has(key)){
    cur.setDate(cur.getDate()-1);
    key=localDateKey(cur.getTime());
    if(!activeDays.has(key))return 0;
  }
  let streak=0;
  while(activeDays.has(key)){
    streak++;
    cur.setDate(cur.getDate()-1);
    key=localDateKey(cur.getTime());
  }
  return streak;
}

function computeStats(){
  const now=Date.now(),todayKey=localDateKey(now);
  const td=store.daily[todayKey]||{minutes:0,seconds:0,newWords:0,reviews:0,listen:0,speak:0,write:0,events:0};
  const learnedWords=WORDS.filter(w=>getWordState(w.id).status!=='new').length;
  const dueWords=WORDS.filter(w=>isDue(w.id,now)).length;
  const wellKnownWords=WORDS.filter(w=>{const s=getWordState(w.id);return s.status==='review'&&s.intervalDays>=3&&s.ease>=2.3;}).length;

  let srsTotalRatings=0,srsGoodRatings=0;
  WORDS.forEach(w=>{
    const h=getWordState(w.id).history||[];
    h.forEach(x=>{srsTotalRatings++;if(x.rating>=1)srsGoodRatings++;});
  });
  const retentionPct=srsTotalRatings>0?Math.round(srsGoodRatings/srsTotalRatings*100):null;

  // Bài 4 có 5 phần thực hành đo được: từ vựng, bài tập, ngữ pháp, nghe, viết
  const lessonParts=[
    learnedWords>0,
    store.exercises.attempts>0,
    store.grammarQuiz.attempts>0,
    store.listening.attempts>0,
    CHARS.some(c=>getWriteRec(c.id).attempts>0)
  ];
  const lessonDone=lessonParts.filter(Boolean).length;
  const lessonPct=Math.round(lessonDone/lessonParts.length*100);

  const totalSec=Object.values(store.daily).reduce((s,d)=>s+(d.seconds||0),0);
  const totalMin=Math.round(totalSec/60);
  const totalSessions=store.exercises.attempts+store.grammarQuiz.attempts+store.listening.attempts+CHARS.reduce((s,c)=>s+getWriteRec(c.id).attempts,0)+Object.values(store.speaking.items).reduce((s,v)=>s+(v.attempts||0),0);

  // 4 kỹ năng từ dữ liệu thật
  const lisSessions=store.listening.sessions||[];
  const lisTotalQ=lisSessions.reduce((s,x)=>s+(x.total||0),0);
  const lisOkQ=lisSessions.reduce((s,x)=>s+(x.correct||0),0);
  const lisPct=lisTotalQ>0?Math.round(lisOkQ/lisTotalQ*100):null;

  const spkItems=Object.values(store.speaking.items||{});
  const spkRecs=spkItems.reduce((s,x)=>s+(x.attempts||0),0);
  const spkAssessed=spkItems.filter(x=>x.lastResult&&x.lastResult.overallScore!==null);
  const spkAvg=spkAssessed.length?Math.round(spkAssessed.reduce((s,x)=>s+x.lastResult.overallScore,0)/spkAssessed.length):null;

  const readSess=[...(store.exercises.sessions||[]),...(store.grammarQuiz.sessions||[])];
  const readTotalQ=readSess.reduce((s,x)=>s+(x.total||0),0);
  const readOkQ=readSess.reduce((s,x)=>s+(x.correct||0),0);
  const readPct=readTotalQ>0?Math.round(readOkQ/readTotalQ*100):null;

  const wriPracticed=CHARS.filter(c=>getWriteRec(c.id).attempts>0).length;
  const wriGuided=CHARS.reduce((s,c)=>s+getWriteRec(c.id).guidedCompleted,0);
  const wriRetry=CHARS.filter(c=>getWriteRec(c.id).needsPractice);
  const wriPct=CHARS.length?Math.round(wriPracticed/CHARS.length*100):null;

  return {
    todayKey,td,streak:computeStreak(now),
    learnedWords,dueWords,wellKnownWords,retentionPct,
    lessonDone,lessonTotal:lessonParts.length,lessonPct,
    totalMin,totalSessions,
    skills:{
      listen:{pct:lisPct,attempts:store.listening.attempts,ok:lisOkQ,total:lisTotalQ},
      speak:{pct:spkAvg,recs:spkRecs,practiced:spkItems.length,assessed:spkAssessed.length},
      read:{pct:readPct,attempts:readSess.length,ok:readOkQ,total:readTotalQ,words:learnedWords},
      write:{pct:wriPracticed>0?wriPct:null,practiced:wriPracticed,guided:wriGuided,retry:wriRetry}
    }
  };
}

let chartRange='7',chartMetric='minutes',hiSkill='all',hiDate='all';

function renderChart(st){
  const colsEl=$('#wk-cols'),yaxEl=$('#wk-yax');if(!colsEl||!yaxEl)return;
  const days=[];
  const now=new Date();
  if(chartRange==='7'||chartRange==='30'){
    const n=chartRange==='7'?7:30;
    for(let k=n-1;k>=0;k--){
      const d=new Date(now);d.setDate(d.getDate()-k);
      const dk=localDateKey(d.getTime());
      const rec=store.daily[dk]||{};
      const val=chartMetric==='minutes'?(rec.minutes||0):chartMetric==='reviews'?(rec.reviews||0):chartMetric==='correct'?(rec.correct||0):(rec.events||0);
      days.push({dk,lbl:chartRange==='7'?`${d.getDate()}/${d.getMonth()+1}`:String(d.getDate()),val,today:k===0});
    }
  }else{
    const keys=Object.keys(store.daily).sort();
    const list=keys.length?keys:[st.todayKey];
    list.forEach(dk=>{
      const rec=store.daily[dk]||{};
      const val=chartMetric==='minutes'?(rec.minutes||0):chartMetric==='reviews'?(rec.reviews||0):chartMetric==='correct'?(rec.correct||0):(rec.events||0);
      days.push({dk,lbl:dk.slice(5),val,today:dk===st.todayKey});
    });
  }
  const tot=days.reduce((s,x)=>s+x.val,0);
  const activeDays=days.filter(x=>x.val>0).length;
  const maxVal=Math.max(4,...days.map(x=>x.val));
  const unit=chartMetric==='minutes'?'p':'';
  $('#wk-total').textContent=chartMetric==='minutes'?`${tot} phút`:`${tot}`;
  $('#wk-days').textContent=`${activeDays} ngày`;
  $('#wk-avg').textContent=activeDays?`${Math.round(tot/activeDays)}${unit}/ngày`:`0${unit}`;
  yaxEl.innerHTML=[0,1,2,3,4].map(i=>`<span>${Math.round(maxVal*i/4)}${unit}</span>`).join('');
  colsEl.classList.toggle('m30',days.length>10);
  colsEl.style.gridTemplateColumns=`repeat(${days.length},minmax(0,1fr))`;
  colsEl.innerHTML=days.map(x=>`<div class="col${x.today?' today':''}"><div class="z"><span>${x.val}${unit}</span><i style="height:${Math.round(x.val/maxVal*100)}%"></i></div><div class="d">${x.lbl}</div></div>`).join('');
}

function renderHistory(){
  const el=$('#me-hist-list');if(!el)return;
  const today=localDateKey(),now=Date.now();
  let list=store.events.slice().reverse();
  if(hiDate==='today')list=list.filter(e=>localDateKey(e.endedAt)===today);
  else if(hiDate==='7')list=list.filter(e=>now-e.endedAt<=7*DAY_MS);
  if(hiSkill!=='all'){
    const map={vocab:['vocab','srs'],read:['exercise','grammar'],listen:['listen','dictation'],write:['writing'],speak:['record','assess']};
    const allowed=map[hiSkill]||[];
    list=list.filter(e=>allowed.includes(e.type));
  }
  if(!list.length){el.innerHTML='<p class="muted small" style="text-align:center;padding:12px 0">Chưa có hoạt động nào khớp bộ lọc.</p>';return;}
  const iconOf={vocab:'book',srs:'refresh',exercise:'pencil',grammar:'layers',listen:'head',dictation:'pencil',writing:'brush',record:'mic',assess:'award'};
  el.innerHTML=list.slice(0,40).map(e=>{
    const d=new Date(e.endedAt);
    const ts=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} · ${d.getDate()}/${d.getMonth()+1}`;
    return `<div class="hi" data-go="${e.view||'home'}" style="cursor:pointer"><span class="ib"><svg class="ic"><use href="#i-${iconOf[e.type]||'book'}"/></svg></span><div><b>${e.title}</b><span>${ts}${e.result?' • '+e.result:''}</span></div><em>${e.durationSec?e.durationSec+'s':'Xem'}</em></div>`;
  }).join('');
}

function refreshDashboards(){
  const st=computeStats(),g=store.goals;
  // Header streak
  const hs=$('#hdr-streak');if(hs)hs.innerHTML=`<svg class="ic f"><use href="#i-flame"/></svg>${st.streak} ngày`;

  // Home cards
  const gm=Math.min(100,Math.round((st.td.minutes||0)/g.minutes*100));
  if($('#hm-goal-txt'))$('#hm-goal-txt').textContent=`${st.td.minutes||0} / ${g.minutes} phút`;
  if($('#hm-goal-bar'))$('#hm-goal-bar').style.width=gm+'%';
  if($('#hm-t1'))$('#hm-t1').textContent=`Học ${g.newWords} từ mới (${st.td.newWords||0}/${g.newWords})`;
  if($('#hm-t2'))$('#hm-t2').textContent=`Ôn ${g.reviews} từ (${st.td.reviews||0}/${g.reviews})`;
  if($('#hm-t3'))$('#hm-t3').textContent=`Luyện nói ${g.speak} lượt (${st.td.speak||0}/${g.speak})`;
  const taskLis=$$('#hm-tasks li');
  if(taskLis[0])taskLis[0].classList.toggle('done',(st.td.newWords||0)>=g.newWords);
  if(taskLis[1])taskLis[1].classList.toggle('done',(st.td.reviews||0)>=g.reviews);
  if(taskLis[2])taskLis[2].classList.toggle('done',(st.td.speak||0)>=g.speak);

  if($('#hm-prog-bar'))$('#hm-prog-bar').style.width=st.lessonPct+'%';
  if($('#hm-prog-pct'))$('#hm-prog-pct').textContent=st.lessonPct+'%';
  if($('#hm-lessons'))$('#hm-lessons').textContent=`${st.lessonDone}/${st.lessonTotal}`;
  if($('#hm-words'))$('#hm-words').textContent=st.learnedWords;
  if($('#hm-ret'))$('#hm-ret').textContent=st.retentionPct!==null?st.retentionPct+'%':'—';

  // Me Overview
  if($('#me-pct'))$('#me-pct').textContent=st.lessonPct+'%';
  if($('#me-ring'))$('#me-ring').setAttribute('stroke-dashoffset',String((326.7*(1-st.lessonPct/100)).toFixed(1)));
  if($('#me-lesson-txt'))$('#me-lesson-txt').textContent=`Đã hoàn thành ${st.lessonDone} / ${st.lessonTotal} phần`;
  if($('#me-lesson-bar'))$('#me-lesson-bar').style.width=st.lessonPct+'%';
  if($('#me-due-txt'))$('#me-due-txt').textContent=`${st.dueWords} từ đến hạn • ${st.wellKnownWords} từ ghi nhớ tốt`;
  if($('#me-streak'))$('#me-streak').textContent=`${st.streak} ngày`;
  if($('#me-sessions'))$('#me-sessions').textContent=st.totalSessions;
  if($('#me-learned'))$('#me-learned').textContent=`${st.learnedWords} / ${WORDS.length}`;
  if($('#me-time'))$('#me-time').textContent=`${st.totalMin} phút`;

  // Daily goals checklist in #me
  const gl=$('#me-goal-list');
  if(gl){
    const rows=[
      ['Thời gian học',st.td.minutes||0,g.minutes,'phút','vocab'],
      ['Từ mới',st.td.newWords||0,g.newWords,'từ','vocab'],
      ['Ôn tập SRS',st.td.reviews||0,g.reviews,'lượt','review'],
      ['Luyện nghe',st.td.listen||0,g.listen,'bài','listen'],
      ['Luyện nói',st.td.speak||0,g.speak,'lượt','speak'],
      ['Luyện viết',st.td.write||0,g.write,'chữ','writing']
    ];
    gl.innerHTML=rows.map(([lbl,cur,tgt,unit,go])=>{
      const status=cur>=tgt?'Đã hoàn thành':cur>0?'Đang thực hiện':'Chưa bắt đầu';
      const cls=cur>=tgt?'done':cur>0?'doing':'todo';
      return `<div class="barrow" style="justify-content:space-between;cursor:pointer" data-go="${go}"><span class="small"><b>${lbl}:</b> ${cur} / ${tgt} ${unit}</span><span class="st ${cls}">${status}</span></div>`;
    }).join('');
  }

  // Recommendations (rule-based from real data)
  const recs=[];
  if(st.dueWords>0)recs.push({t:'Ôn tập từ vựng đến hạn',d:`Có ${st.dueWords} từ đến hạn theo lịch SRS`,go:'review',btn:'Ôn ngay'});
  if(store.listening.wrongIds.length)recs.push({t:'Luyện lại câu nghe sai',d:`${store.listening.wrongIds.length} câu nghe cần củng cố`,go:'listen',btn:'Mở Nghe'});
  if(st.skills.write.retry.length)recs.push({t:'Chữ Hán cần luyện viết thêm',d:st.skills.write.retry.map(c=>c.ch).join(' · '),go:'writing',btn:'Luyện viết'});
  if(!recs.length)recs.push({t:'Tiếp tục Bài 4 · Sở thích',d:'Học từ mới, làm bài tập hoặc luyện nghe/viết để tích lũy tiến độ',go:'lesson',btn:'Vào học'});
  const recEl=$('#me-recs');
  if(recEl)recEl.innerHTML=recs.map(r=>`<div class="rec-item"><div class="mid"><b>${r.t}</b><span>${r.d}</span></div><button type="button" class="chip on" data-go="${r.go}">${r.btn}</button></div>`).join('');

  // 4 Skills pane
  const skEl=$('#me-skills-pane');
  if(skEl){
    const s=st.skills;
    const card=(ic,name,pct,lines,go)=>`<div class="card">
      <div class="barrow" style="justify-content:space-between"><div class="head" style="align-items:center"><svg class="ic" style="width:1.4em;height:1.4em"><use href="#i-${ic}"/></svg><h3>${name}</h3></div><b>${pct!==null?pct+'%':'Chưa có dữ liệu'}</b></div>
      <div class="bar"><i style="width:${pct||0}%"></i></div>
      <div class="sk-detail">${lines.map(([a,b])=>`<div class="sk-row"><span class="muted">${a}</span><b>${b}</b></div>`).join('')}</div>
      <button type="button" class="btn ghost sm" data-go="${go}">Luyện ${name.toLowerCase()}</button>
    </div>`;
    skEl.innerHTML=
      card('head','Nghe',s.listen.pct,[['Bài nghe đã làm',`${s.listen.attempts} phiên`],['Câu trả lời đúng',`${s.listen.ok} / ${s.listen.total}`]],'listen')+
      card('mic','Nói',s.speak.pct,[['Lượt ghi âm thật',`${s.speak.recs} lượt`],['Từ/câu đã luyện',`${s.speak.practiced} mục`],['Đánh giá dịch vụ',s.speak.assessed?`${s.speak.assessed} lượt (TB ${s.speak.pct}%)`:'Chưa kết nối dịch vụ chấm']],'speak')+
      card('book','Đọc & Ngữ pháp',s.read.pct,[['Bài tập & ngữ pháp',`${s.read.attempts} phiên`],['Câu đúng',`${s.read.ok} / ${s.read.total}`],['Từ vựng đã học',`${s.read.words} / ${WORDS.length}`]],'exercise')+
      card('brush','Viết',s.write.pct,[['Chữ Hán đã luyện',`${s.write.practiced} / ${CHARS.length} chữ`],['Hoàn thành có hướng dẫn',`${s.write.guided} lần`],['Cần luyện lại',s.write.retry.length?s.write.retry.map(c=>c.ch).join(' '):'Không có']],'writing');
  }

  renderChart(st);
  renderHistory();
}

// Hook real learning events into recordWord, exercises, grammar, listening, writing, speaking
const _origRecordWord=recordWord;
recordWord=function(id,rating,mode){
  const wasNew=getWordState(id).status==='new';
  const res=_origRecordWord(id,rating,mode);
  const w=wordById(id);
  recordLearningEvent({type:wasNew?'vocab':'srs',skill:'vocab',title:`${wasNew?'Học từ mới':'Ôn SRS'}: ${w?w.zh:id}`,targetId:id,view:wasNew?'vocab':'review',result:rating===2?'Đã thuộc':rating===1?'Hơi nhớ':'Chưa nhớ'});
  return res;
};

$('#mtabs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  $$('#mtabs button').forEach(x=>x.classList.toggle('on',x===b));$$('[data-pane]').forEach(p=>p.classList.toggle('hide',p.dataset.pane!==b.dataset.m));});
$('#ch-range').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;chartRange=b.dataset.cr;$$('#ch-range button').forEach(x=>x.classList.toggle('on',x===b));renderChart(computeStats());});
$('#ch-metric').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;chartMetric=b.dataset.cm;$$('#ch-metric button').forEach(x=>x.classList.toggle('on',x===b));renderChart(computeStats());});
$('#hi-skill-flt').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;hiSkill=b.dataset.hs;$$('#hi-skill-flt button').forEach(x=>x.classList.toggle('on',x===b));renderHistory();});
$('#hi-date-flt').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;hiDate=b.dataset.hd;$$('#hi-date-flt button').forEach(x=>x.classList.toggle('on',x===b));renderHistory();});
$('#me-goal-edit').onclick=()=>{
  const f=$('#me-goal-form'),show=f.classList.toggle('hide');
  if(!show){const g=store.goals;$('#g-min').value=g.minutes;$('#g-new').value=g.newWords;$('#g-rev').value=g.reviews;$('#g-lis').value=g.listen;$('#g-spk').value=g.speak;$('#g-wri').value=g.write;}
};
$('#me-goal-save').onclick=()=>{
  const g=store.goals;
  const v=(s,min,max,def)=>{const n=Math.round(Number($(s).value));return Number.isFinite(n)?Math.min(max,Math.max(min,n)):def;};
  g.minutes=v('#g-min',5,180,20);g.newWords=v('#g-new',1,50,5);g.reviews=v('#g-rev',1,100,10);
  g.listen=v('#g-lis',1,20,1);g.speak=v('#g-spk',1,30,3);g.write=v('#g-wri',1,30,2);
  saveStore(store);$('#me-goal-form').classList.add('hide');refreshDashboards();toast('Đã lưu mục tiêu hằng ngày');
};
$('#themebtn').onclick=()=>{const r=document.documentElement,dark=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;r.dataset.theme=dark?'light':'dark'};


