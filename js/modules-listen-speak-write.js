/* ---------- Công đoạn 4: Luyện nghe, Chép chính tả & Hội thoại ---------- */
let activeAudio=null;
function stopListeningAudio(){
  try{if(activeAudio){activeAudio.pause();activeAudio=null;}}catch(_){}
  try{if(typeof speechSynthesis!=='undefined')speechSynthesis.cancel();}catch(_){}
  try{if(typeof AzureSpeech!=='undefined'&&AzureSpeech.stopAudio)AzureSpeech.stopAudio();}catch(_){}
}
function playItemAudio(item,rate,onEnd){
  stopListeningAudio();
  const spd=Number(rate)||1;
  const ttsSpd=(rate===undefined||rate===null||spd===1)?0.65:(spd>=0.9?Math.max(0.4,spd-0.25):Math.max(0.4,spd));
  const text=typeof item==='string'?item:(item&&item.zh)||'';
  const url=item&&typeof item==='object'?item.audio:null;
  if(url){
    try{
      const a=new Audio(url);activeAudio=a;a.playbackRate=spd;a.volume=1.0;
      if(typeof boostAudioEl==='function')boostAudioEl(a,1.75);
      if(onEnd)a.onended=onEnd;
      a.onerror=()=>speak(text,ttsSpd,onEnd);
      const p=a.play();if(p&&p.catch)p.catch(()=>speak(text,ttsSpd,onEnd));
      return;
    }catch(_){}
  }
  if(!text){if(onEnd)onEnd();return;}
  speak(text,ttsSpd,onEnd);
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

/* ---------- Tiện ích phân tách Pinyin & Thanh điệu ---------- */
const PY_VOWEL_CLASS='aāáǎàeēéěèiīíǐìoōóǒòuūúǔùüǖǘǚǜ';
const PY_SYL_RE=new RegExp(`(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?[${PY_VOWEL_CLASS}]+(?:(?:ng|n)(?![${PY_VOWEL_CLASS}]))?r?(?![${PY_VOWEL_CLASS}])`,'gi');
const PY_TONE_REV={
  'ā':['a',1],'á':['a',2],'ǎ':['a',3],'à':['a',4],
  'ē':['e',1],'é':['e',2],'ě':['e',3],'è':['e',4],
  'ī':['i',1],'í':['i',2],'ǐ':['i',3],'ì':['i',4],
  'ō':['o',1],'ó':['o',2],'ǒ':['o',3],'ò':['o',4],
  'ū':['u',1],'ú':['u',2],'ǔ':['u',3],'ù':['u',4],
  'ǖ':['ü',1],'ǘ':['ü',2],'ǚ':['ü',3],'ǜ':['ü',4]
};
const PY_TONE_FWD={
  a:['ā','á','ǎ','à'],e:['ē','é','ě','è'],i:['ī','í','ǐ','ì'],
  o:['ō','ó','ǒ','ò'],u:['ū','ú','ǔ','ù'],'ü':['ǖ','ǘ','ǚ','ǜ']
};
const TONE_SHORT={1:'Thanh 1 · Ngang',2:'Thanh 2 · Lên',3:'Thanh 3 · Vòng',4:'Thanh 4 · Giáng',5:'Thanh nhẹ'};

function splitPinyinSyllables(py){
  const clean=String(py||'').replace(/[.,!?;:"'“”‘’。，！？；：()（）/]/g,' ').trim();
  if(!clean)return [];
  const raw=clean.split(/\s+/).filter(Boolean),out=[];
  for(const tok of raw){
    const m=tok.match(PY_SYL_RE);
    if(m&&m.length)out.push(...m);
    else out.push(tok);
  }
  return out;
}
function parseToneSyllable(syl){
  let tone=5,base='';
  for(const ch of String(syl||'').toLowerCase()){
    if(PY_TONE_REV[ch]){base+=PY_TONE_REV[ch][0];if(tone===5)tone=PY_TONE_REV[ch][1];}
    else if(/[a-zü]/.test(ch))base+=ch;
  }
  return {base,tone};
}
function applyToneMark(base,tone){
  const b=String(base||'').toLowerCase();
  if(tone<1||tone>4)return b;
  const repAt=idx=>{
    const ch=b[idx],arr=PY_TONE_FWD[ch];
    if(!arr)return b;
    return b.slice(0,idx)+arr[tone-1]+b.slice(idx+1);
  };
  let idx=b.indexOf('a');if(idx>=0)return repAt(idx);
  idx=b.indexOf('e');if(idx>=0)return repAt(idx);
  idx=b.indexOf('ou');if(idx>=0)return repAt(idx);
  for(let k=b.length-1;k>=0;k--){if(PY_TONE_FWD[b[k]])return repAt(k);}
  return b;
}
function makeToneVariants(syl){
  const p=parseToneSyllable(syl);
  if(!p.base||p.tone<1||p.tone>4)return null;
  return {
    base:p.base,
    expectedTone:p.tone,
    variants:[1,2,3,4].map(t=>({tone:t,py:applyToneMark(p.base,t),label:TONE_SHORT[t]}))
  };
}
function getListenWordPool(excludeId,need){
  const cur=WORDS.filter(x=>x&&x.id!==excludeId&&x.zh&&x.vi);
  if(cur.length>=need)return cur;
  const seen=new Set(cur.map(x=>x.id));
  if(excludeId)seen.add(excludeId);
  const bank=(store&&store.vocabBank)?Object.values(store.vocabBank):[];
  for(const w of bank){
    if(w&&w.id&&!seen.has(w.id)&&w.zh&&w.vi&&w.py){cur.push(w);seen.add(w.id);if(cur.length>=need+4)break;}
  }
  return cur;
}
function pickListenDistractors(target,pool,count,key){
  const seen=new Set([target[key]]);
  const cands=shuffle(pool.filter(x=>x&&x[key]&&!seen.has(x[key])));
  const picked=[];
  for(const c of cands){
    if(seen.has(c[key]))continue;
    seen.add(c[key]);picked.push(c);
    if(picked.length>=count)break;
  }
  return picked;
}

function buildListenQuestions(mode){
  const hasWords=Array.isArray(WORDS)&&WORDS.length>0;
  const hasSent=Array.isArray(SENT)&&SENT.length>0;
  const hasDlg=Array.isArray(LISTEN_DIALOG)&&LISTEN_DIALOG.length>0;
  if(!hasWords&&!hasSent&&!hasDlg)return [];

  if(mode==='tone'){
    const out=[],usedKeys=new Set();
    const src=shuffle(WORDS);
    for(const w of src){
      const items=analyzeExpectedTones(w.zh,w.py);
      const pick=items.find(s=>s.baseTone>=1&&s.baseTone<=4&&!s.sandhi)||items.find(s=>s.baseTone>=1&&s.baseTone<=4);
      if(!pick)continue;
      const tv=makeToneVariants(pick.py);if(!tv)continue;
      const key=`${tv.base}:${pick.baseTone}`;
      if(usedKeys.has(key))continue;
      usedKeys.add(key);
      out.push({
        id:'lt_'+w.id+'_'+pick.baseTone,
        type:'tone',
        audioText:pick.ch||w.zh,
        targetChar:pick.ch||w.zh,
        targetPy:pick.py,
        base:tv.base,
        expectedTone:pick.baseTone,
        zh:w.zh,
        py:w.py,
        vi:w.vi,
        prompt:'Nghe âm mẫu và chọn thanh điệu đúng:',
        opts:tv.variants.map(v=>({t:v.py,label:v.label,tone:v.tone,ok:v.tone===pick.baseTone})),
        exp:`<b>${pick.ch}</b> (${pick.py}) mang <b>${TONE_NAMES[pick.baseTone]}</b> — trong từ “${w.zh}” (${w.py}: ${w.vi}).`
      });
      if(out.length>=8)break;
    }
    return out;
  }

  if(mode==='choice'){
    const qs=[];
    const ws=shuffle(WORDS);
    const pool=getListenWordPool(null,6);
    if(ws[0]){
      const ds=pickListenDistractors(ws[0],pool,3,'vi');
      qs.push({id:'lc_vi_'+ws[0].id,audioText:ws[0].zh,prompt:'Nghe từ và chọn nghĩa đúng:',opts:shuffle([ws[0],...ds]).map(x=>({t:x.vi,ok:x.id===ws[0].id})),exp:`${ws[0].zh} (${ws[0].py}): ${ws[0].vi}.`,zh:ws[0].zh});
    }
    const w1=ws[1]||ws[0];
    if(w1){
      const ds=pickListenDistractors(w1,pool,3,'zh');
      qs.push({id:'lc_zh_'+w1.id,audioText:w1.zh,prompt:'Nghe từ và chọn chữ Hán đúng:',opts:shuffle([w1,...ds]).map(x=>({t:x.zh,ok:x.id===w1.id})),exp:`Đáp án là ${w1.zh} (${w1.py}) — ${w1.vi}.`,zh:w1.zh});
    }
    const w2=ws[2]||ws[0];
    if(w2){
      const ds=pickListenDistractors(w2,pool,3,'py');
      qs.push({id:'lc_py_'+w2.id,audioText:w2.zh,prompt:'Nghe từ và chọn Pinyin đúng:',opts:shuffle([w2,...ds]).map(x=>({t:x.py,ok:x.id===w2.id})),exp:`${w2.zh} đọc là ${w2.py} (${w2.vi}).`,zh:w2.zh});
    }
    // Câu ví dụ / hội thoại thật (xử lý an toàn cho bài chưa có ex ở từng từ)
    const sentCandidates=[];
    const seenSent=new Set();
    const pushSent=(id,zh,py,vi)=>{
      if(!zh||!vi||seenSent.has(zh))return;
      seenSent.add(zh);sentCandidates.push({id,zh,py:py||'',vi});
    };
    ws.forEach(w=>{if(w.ex&&w.exVi)pushSent('ex_'+w.id,w.ex,w.exPy,w.exVi);});
    (SENT||[]).forEach((s,k)=>pushSent('s_'+k,s.zh,s.py,s.vi));
    (LISTEN_DIALOG||[]).forEach((d,k)=>pushSent('d_'+k,d.zh,d.py,d.vi));
    const distractorPool=[...sentCandidates,...pool.map(x=>({id:'wp_'+x.id,zh:x.zh,py:x.py,vi:x.vi}))];
    sentCandidates.slice(0,2).forEach((sc,k)=>{
      const ds=pickListenDistractors(sc,distractorPool,3,'vi');
      if(ds.length>=2){
        qs.push({id:'lc_sc_'+k+'_'+sc.id,audioText:sc.zh,prompt:'Nghe câu và chọn nghĩa đúng:',opts:shuffle([sc,...ds]).map(x=>({t:x.vi,ok:x.vi===sc.vi})),exp:`${sc.zh}${sc.py?' ('+sc.py+')':''} — ${sc.vi}`,zh:sc.zh});
      }
    });
    // Nếu bài ngắn vẫn chưa đủ 5 câu, bổ sung từ các từ còn lại trong bài
    let extraIdx=3;
    while(qs.length<5&&extraIdx<ws.length){
      const w=ws[extraIdx++];
      const ds=pickListenDistractors(w,pool,3,'vi');
      qs.push({id:'lc_ex_'+w.id,audioText:w.zh,prompt:'Nghe từ và chọn nghĩa đúng:',opts:shuffle([w,...ds]).map(x=>({t:x.vi,ok:x.id===w.id})),exp:`${w.zh} (${w.py}): ${w.vi}.`,zh:w.zh});
    }
    return qs;
  }

  if(mode==='dict'){
    const seen=new Set(),out=[];
    const add=(id,zh,py,vi)=>{if(!zh||seen.has(zh))return;seen.add(zh);out.push({id,zh,py:py||'',vi:vi||''});};
    (SENT||[]).forEach((s,idx)=>add('ld_s_'+idx,s.zh,s.py,s.vi));
    if(out.length<3)(LISTEN_DIALOG||[]).forEach((d,idx)=>add('ld_d_'+idx,d.zh,d.py,d.vi));
    if(out.length<3)(WORDS||[]).forEach((w,idx)=>add('ld_w_'+idx,w.zh,w.py,w.vi));
    return out.slice(0,4);
  }

  if(DIALOG_QUESTIONS&&DIALOG_QUESTIONS.length)return DIALOG_QUESTIONS;
  if(hasDlg){
    const fallbackViPool=[...LISTEN_DIALOG.map(d=>({vi:d.vi})),...(SENT||[]).map(s=>({vi:s.vi})),...getListenWordPool(null,6).map(w=>({vi:w.vi}))].filter(x=>x&&x.vi);
    const seenDlg=new Set(),dlgQs=[];
    LISTEN_DIALOG.forEach((d,idx)=>{
      if(!d.zh||!d.vi||seenDlg.has(d.zh))return;
      seenDlg.add(d.zh);
      const ds=pickListenDistractors({vi:d.vi},fallbackViPool,3,'vi');
      if(ds.length>=2){
        dlgQs.push({
          id:'dq_auto_'+idx,
          audioText:d.zh,
          q:`Câu thứ ${idx+1} (${d.name||'Nhân vật'}) nói gì?`,
          opts:shuffle([{t:d.vi,ok:true},...ds.map(x=>({t:x.vi,ok:false}))]),
          exp:`${d.name||'Nhân vật'}: “${d.zh}” (${d.py}) — ${d.vi}.`
        });
      }
    });
    return dlgQs.slice(0,4);
  }
  return [];
}

const listenCtrl=(function(){
  let mode='choice',qs=[],qi=0,correct=0,wrong=0,wrongQs=[],answered=false,recorded=false,dlgPlaying=false,dlgTimer=null,dlgLoop=false,dlgCurIdx=0;

  function syncHeader(){
    const l=(typeof LESSONS!=='undefined'&&Array.isArray(LESSONS))?LESSONS.find(x=>x.id===store.activeLessonId):null;
    const code=l?(l.code||'Bài học'):'Bài học';
    const sub=$('#ln-sub');
    if(sub)sub.textContent=`${code} • Nghe chọn, thanh điệu, chính tả & hội thoại`;
    const dSub=$('#ln-dlg-sub');
    if(dSub)dSub.textContent=`2 nhân vật • ${code}`;
  }
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
    dlgCurIdx=idx;
    const btn=$('#ln-dlg-play');if(btn)btn.innerHTML='<svg class="ic"><use href="#i-x"/></svg>';
    const st=$('#ln-dlg-status');if(st)st.textContent=`Đang phát câu ${idx+1} / ${LISTEN_DIALOG.length} (${LISTEN_DIALOG[idx].name})`;
    $$('#ln-dlg-list .bub').forEach((b,k)=>{
      const on=k===idx;
      b.classList.toggle('active',on);
      if(on){try{b.scrollIntoView({behavior:'smooth',block:'nearest'});}catch(_){}}
    });
    playItemAudio(LISTEN_DIALOG[idx],store.listening.speed,()=>{
      if(!dlgPlaying)return;
      dlgTimer=setTimeout(()=>playDialogSeq(dlgLoop?idx:idx+1),dlgLoop?650:450);
    });
  }
  function renderDialogList(){
    const dl=$('#ln-dlg-list');if(!dl)return;
    if(!LISTEN_DIALOG.length){dl.innerHTML='<div class="card"><p class="muted small" style="margin:0">Bài học này chưa có hội thoại mẫu.</p></div>';return;}
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
    syncHeader();
    $$('#ln-modes button').forEach(b=>b.classList.toggle('on',b.dataset.lm===mode));
    qs=customQs||buildListenQuestions(mode);
    qi=0;correct=0;wrong=0;wrongQs=[];recorded=false;
    if(mode==='dlg')renderDialogList();
    renderQ();
  }

  function showFb(ok,title,htmlDesc,allowRetry){
    if(typeof playSfx==='function')playSfx(ok?'ok':'no');
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
      if(q.id&&!store.listening.wrongIds.includes(q.id)){store.listening.wrongIds.push(q.id);}
      if(q.type==='tone'&&q.expectedTone>=1&&q.expectedTone<=4){
        if(!store.listening.toneMistakes)store.listening.toneMistakes={1:0,2:0,3:0,4:0};
        store.listening.toneMistakes[q.expectedTone]=(store.listening.toneMistakes[q.expectedTone]||0)+1;
      }
      saveStore(store);
      if(typeof updateReviewFooter==='function')updateReviewFooter();
    }
  }

  function renderQ(){
    const play=$('#ln-play'),em=$('#ln-empty'),sum=$('#ln-summary');
    sum.classList.add('hide');
    $('#ln-audio-card').classList.toggle('hide',mode==='dlg');
    $('#ln-dlg-wrap').classList.toggle('hide',mode!=='dlg');
    const hintEl=$('#ln-audio-hint');
    if(hintEl){
      hintEl.textContent=mode==='tone'?'Nhấn loa để nghe và phân biệt thanh điệu (1–4)':mode==='dict'?'Nghe kỹ câu mẫu rồi gõ lại bằng chữ Hán':'Nhấn loa để nghe và chọn đáp án đúng';
    }

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
    }else if(mode==='tone'){
      stage.innerHTML=`
        <div class="d3-tone-prompt"><span>${q.prompt}</span><span class="d3-tone-char-pill">Âm gốc: <b>${q.base}</b></span></div>
        <div class="d3-tone-grid">${q.opts.map((o,idx)=>`
          <button type="button" class="d3-tone-opt" data-idx="${idx}">
            <i>${ABC[idx]}</i>
            <div class="d3-tone-opt-mid">
              <span class="d3-tone-opt-py">${o.t}</span>
              <span class="d3-tone-opt-lbl">${o.label}</span>
            </div>
            <svg class="d3-tone-mini" viewBox="0 0 30 16" aria-hidden="true"><path d="${TONE_PATHS[o.tone]||TONE_PATHS[1]}"/></svg>
          </button>`).join('')}
        </div>`;
      $$('.d3-tone-opt',stage).forEach(btn=>btn.onclick=()=>{
        if(answered)return;
        const idx=+btn.dataset.idx,ok=q.opts[idx].ok;
        btn.classList.add(ok?'ok':'no');
        if(!ok){const oi=q.opts.findIndex(x=>x.ok);if(oi>=0)$$('.d3-tone-opt',stage)[oi].classList.add('ok');}
        recordAnswer(ok,q);
        showFb(ok,ok?'Phân biệt chuẩn rồi!':'Chưa đúng thanh điệu',q.exp,!ok);
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
      const modeTitle=mode==='dict'?'Chép chính tả':mode==='dlg'?'Nghe hội thoại':mode==='tone'?'Phân biệt thanh điệu':'Nghe chọn đáp án';
      store.listening.sessions.push({at:Date.now(),mode,correct,wrong,total,pct});
      recordLearningEvent({type:mode==='dict'?'dictation':'listen',skill:'listen',title:modeTitle,result:`${correct}/${total} (${pct}%)`,view:'listen',meta:{correct,total,pct}});
      if(store.listening.sessions.length>20)store.listening.sessions=store.listening.sessions.slice(-20);
      saveStore(store);
      updateLessonListenStatus();
      if(typeof markLessonSectionDone==='function')markLessonSectionDone(store.activeLessonId,'listen',true);
      if(typeof updateReviewFooter==='function')updateReviewFooter();
    }
    sum.innerHTML=`<div class="sphead"><svg class="ic"><use href="#i-award"/></svg><div><h3>Hoàn thành bài nghe!</h3><span class="muted small">Độ chính xác: ${pct}% • Kỷ lục: ${store.listening.bestPct}%</span></div></div>
      <div class="sum-grid" style="margin-top:12px"><div><b style="color:var(--good)">${correct}</b><span>Đúng</span></div><div><b>${wrong}</b><span>Sai</span></div><div><b style="color:var(--ink)">${store.listening.attempts}</b><span>Lần luyện</span></div></div>
      ${wrongQs.length?`<div style="margin-top:12px;display:grid;gap:6px"><b class="small">Câu cần nghe lại:</b>${wrongQs.map(w=>`<div class="wrong-item"><b>${w.zh||w.q||''}</b> — ${w.exp||(w.py+' · '+w.vi)}</div>`).join('')}</div>`:''}
      <div class="btnrow" style="margin-top:14px">${wrongQs.length?`<button type="button" class="btn ghost sm" id="ln-retry-wrong">Luyện lại ${wrongQs.length} câu sai</button>`:''}<button type="button" class="btn sm" id="ln-again"><svg class="ic"><use href="#i-refresh"/></svg>Luyện lại</button></div>`;
    const rw=$('#ln-retry-wrong');if(rw)rw.onclick=()=>start(mode,wrongQs.slice());
    $('#ln-again').onclick=()=>start(mode);
    if(total>0&&typeof showSectionSummary==='function'){
      showSectionSummary('listen',{
        doneCount:total,
        totalCount:total,
        unit:'câu',
        errors:wrong,
        accuracy:pct,
        wrongItems:wrongQs.map(w=>({zh:w.zh||w.q||'',py:w.py||'',vi:w.vi||w.exp||'',note:'Nghe chưa chính xác'}))
      },{
        onRetryWrong:wrongQs.length?()=>start(mode,wrongQs.slice()):null,
        onRetryAll:()=>start(mode)
      });
    }
  }

  $('#ln-modes').addEventListener('click',e=>{const b=e.target.closest('button');if(b)start(b.dataset.lm);});
  $$('#ln-speeds,#ln-dlg-speeds').forEach(row=>row.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||!b.dataset.spd)return;
    store.listening.speed=Number(b.dataset.spd);saveStore(store);applySpeedUI();
  }));
  const dlgLoopBtn=$('#ln-dlg-loop');
  if(dlgLoopBtn){
    dlgLoopBtn.onclick=()=>{
      dlgLoop=!dlgLoop;
      dlgLoopBtn.classList.toggle('on',dlgLoop);
      dlgLoopBtn.setAttribute('aria-pressed',String(dlgLoop));
      toast(dlgLoop?'Đã bật lặp lại câu đang phát':'Đã tắt lặp lại câu');
    };
  }
  const dlgRwBtn=$('#ln-dlg-rw');
  if(dlgRwBtn){
    dlgRwBtn.onclick=()=>{
      if(!LISTEN_DIALOG.length)return;
      const target=Math.max(0,dlgCurIdx>0?dlgCurIdx-1:0);
      stopDlg();
      playDialogSeq(target);
    };
  }
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

  return {init(){applySpeedUI();applyDlgToggles();syncHeader();start('choice');},refresh(){syncHeader();start(mode);},syncHeader,stop:stopDlg};
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
  const root=$('#rep');if(!root)return;
  const f=k=>$(`[data-f="${k}"]`,root);let i=1;
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
  let rawSyls=splitPinyinSyllables(pyText);
  if(rawSyls.length!==hanChars.length){
    const spaced=String(pyText||'').replace(/[.,!?;:"'“”‘’。，！？；：]/g,' ').trim().split(/\s+/).filter(Boolean);
    if(spaced.length===hanChars.length)rawSyls=spaced;
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

// Lớp đánh giá phát âm: ưu tiên Chivox MCP, tiếp theo Gemini Free, Azure Speech, cuối cùng endpoint tùy biến
const PronunciationAssessor={
  getEnabledProviders(){
    const list=[];
    if(typeof TonePerfectSpeech!=='undefined'&&TonePerfectSpeech&&TonePerfectSpeech.isAssessEnabled&&TonePerfectSpeech.isAssessEnabled()){
      list.push({configured:true,provider:'toneperfect',mode:'toneperfect-rest',label:'TonePerfect AI (zh-CN)',shortLabel:'TonePerfect'});
    }
    if(typeof ChivoxSpeech!=='undefined'&&ChivoxSpeech&&ChivoxSpeech.isAssessEnabled&&ChivoxSpeech.isAssessEnabled()){
      list.push({configured:true,provider:'chivox',mode:'chivox-mcp',label:'Chivox Mandarin AI',shortLabel:'Chivox'});
    }
    if(typeof GeminiSpeech!=='undefined'&&GeminiSpeech&&GeminiSpeech.isAssessEnabled&&GeminiSpeech.isAssessEnabled()){
      const gm=GeminiSpeech.getConfig();
      list.push({configured:true,provider:'gemini',mode:'gemini-rest',model:gm.model,label:'Google Gemini ('+gm.model+')',shortLabel:'Gemini'});
    }
    const cfg=(typeof window!=='undefined'&&window.HANYU_ASSESS_CONFIG)||null;
    if(cfg&&typeof cfg.endpoint==='string'&&cfg.endpoint.trim()){
      const p=cfg.provider||'custom';
      list.push({configured:true,endpoint:cfg.endpoint.trim(),provider:p,mode:'custom-http',label:p,shortLabel:p});
    }
    return list;
  },
  getConfig(preferredProvider){
    const list=this.getEnabledProviders();
    if(!list.length)return {configured:false,endpoint:null,provider:null,mode:null,label:''};
    if(preferredProvider){
      const hit=list.find(x=>x.provider===preferredProvider);
      if(hit)return hit;
    }
    return list[0];
  },
  normalize(raw,meta){
    if(!raw||typeof raw!=='object')return null;
    const num=v=>(v!==null&&v!==undefined&&Number.isFinite(Number(v)))?Math.round(Number(v)):null;
    const syls=Array.isArray(raw.syllableResults)?raw.syllableResults.map(s=>({
      syllable:s.syllable||'',
      expectedTone:s.expectedTone||null,
      detectedTone:s.detectedTone||null,
      score:num(s.score)
    })):[];
    const wordResults=Array.isArray(raw.wordResults)?raw.wordResults.map(w=>({
      word:w.word||'',
      accuracyScore:num(w.accuracyScore),
      errorType:w.errorType||'None',
      syllables:Array.isArray(w.syllables)?w.syllables:[],
      note:typeof w.note==='string'?w.note:''
    })):[];
    return {
      exerciseId:meta.id,
      referenceText:meta.zh,
      referencePinyin:meta.py,
      recognizedText:typeof raw.recognizedText==='string'?raw.recognizedText:'',
      provider:raw.provider||meta.provider||'unknown',
      assessedAt:Date.now(),
      overallScore:num(raw.overallScore),
      accuracyScore:num(raw.accuracyScore),
      initialScore:num(raw.initialScore),
      finalScore:num(raw.finalScore),
      toneScore:num(raw.toneScore),
      fluencyScore:num(raw.fluencyScore),
      completenessScore:num(raw.completenessScore),
      prosodyScore:num(raw.prosodyScore),
      syllableResults:syls,
      wordResults,
      feedback:typeof raw.feedback==='string'?raw.feedback:'',
      status:'assessed'
    };
  },
  async assess(blob,item,preferredProvider){
    const cfg=this.getConfig(preferredProvider);
    if(!cfg.configured)throw new Error('NOT_CONFIGURED');
    if(cfg.mode==='toneperfect-rest'&&typeof TonePerfectSpeech!=='undefined'){
      const data=await TonePerfectSpeech.assessPronunciation(blob,item.zh,item.py);
      const norm=this.normalize(data,{id:item.id,zh:item.zh,py:item.py,provider:'toneperfect'});
      if(!norm)throw new Error('INVALID_RESPONSE');
      return norm;
    }
    if(cfg.mode==='chivox-mcp'&&typeof ChivoxSpeech!=='undefined'){
      const data=await ChivoxSpeech.assessPronunciation(blob,item.zh,item.py);
      const norm=this.normalize(data,{id:item.id,zh:item.zh,py:item.py,provider:'chivox'});
      if(!norm)throw new Error('INVALID_RESPONSE');
      return norm;
    }
    if(cfg.mode==='gemini-rest'&&typeof GeminiSpeech!=='undefined'){
      const data=await GeminiSpeech.assessPronunciation(blob,item.zh,item.py);
      const norm=this.normalize(data,{id:item.id,zh:item.zh,py:item.py,provider:'gemini'});
      if(!norm)throw new Error('INVALID_RESPONSE');
      return norm;
    }
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

const PY_INITIALS=['zh','ch','sh','b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s','y','w'];
const INITIAL_GUIDE={
  b:'Khép hai môi rồi mở nhẹ, KHÔNG bật hơi (gần với /p/ nhẹ).',
  p:'Khép hai môi rồi BẬT HƠI MẠNH ra ngoài (có luồng gió rõ trước miệng).',
  m:'Khép môi rung mũi như chữ /m/ tiếng Việt.',
  f:'Răng trên chạm nhẹ môi dưới thổi hơi như /ph/ nhẹ.',
  d:'Đầu lưỡi chạm lợi trên rồi thả nhẹ, KHÔNG bật hơi.',
  t:'Đầu lưỡi chạm lợi trên rồi BẬT HƠI MẠNH.',
  n:'Đầu lưỡi chạm lợi trên, luồng hơi đi qua mũi như /n/.',
  l:'Đầu lưỡi chạm lợi trên, luồng hơi thoát hai bên lưỡi như /l/.',
  g:'Cuống lưỡi nâng chạm vòm mềm rồi mở nhẹ, KHÔNG bật hơi.',
  k:'Cuống lưỡi chạm vòm mềm rồi BẬT HƠI MẠNH.',
  h:'Xát nhẹ ở cuống họng, gần giống /kh/ nhẹ trong tiếng Việt.',
  j:'Mặt lưỡi áp vòm cứng, đầu lưỡi sau răng dưới, KHÔNG bật hơi.',
  q:'Vị trí giống j nhưng BẬT HƠI MẠNH và kéo âm xì rõ.',
  x:'Mặt lưỡi nâng gần vòm cứng, thổi luồng hơi xì nhẹ giữa kẽ hẹp.',
  zh:'Uốn cong đầu lưỡi về phía sau, KHÔNG bật hơi.',
  ch:'Uốn cong đầu lưỡi giống zh nhưng BẬT HƠI MẠNH.',
  sh:'Uốn cong đầu lưỡi ra sau và thổi luồng hơi xát đều.',
  r:'Uốn cong đầu lưỡi, dây thanh rung nhẹ (khác /r/ rung tiếng Việt).',
  z:'Đầu lưỡi thẳng chạm sau răng cửa trên rồi thả nhẹ, KHÔNG bật hơi.',
  c:'Đầu lưỡi thẳng sau răng cửa trên, BẬT HƠI MẠNH (xì sắc gọn).',
  s:'Đầu lưỡi gần răng cửa trên, xì hơi mảnh và đều như /x/.',
  y:'Bán nguyên âm /i/, môi kéo hơi dẹt nhẹ.',
  w:'Bán nguyên âm /u/, môi chu tròn rồi mở ra.'
};
const FINAL_GUIDE={
  'ü':'Môi chu tròn giữ nguyên khẩu hình /u/ nhưng phát âm /i/ bên trong (tạo thành /uy/).',
  'üe':'Bắt đầu với /uy/ tròn môi rồi mở sang /ê/ ngắn.',
  'üan':'Bắt đầu với /uy/ tròn môi, trượt sang /en/ (hoặc /an/ gọn).',
  'ün':'Âm /uy/ nối với phụ âm mũi đầu lưỡi /-n/.',
  ang:'Mở rộng miệng hết cỡ ở /a/ rồi đưa cuống lưỡi lên đóng mũi /-ng/.',
  eng:'Phát âm /ơ/ nhẹ rồi kéo dài âm mũi sau /-ng/.',
  ing:'Phát âm /i/ rõ rồi đóng mũi sau /-ng/ (như /i-ng/).',
  ong:'Môi hơi tròn, đọc gần /u-ng/ (âm mũi sau vang hơn /ông/).',
  ian:'Đọc gần /iên/, không bẹt quá sang /ian/.',
  uan:'Chu tròn môi ở /u/ rồi mở sang /an/.',
  ao:'Mở miệng ở /a/ rõ rồi khép dần sang /u/ (/ao/ gọn).',
  ou:'Tròn môi /ô/ rồi khép nhẹ sang /u/ (/âu/).',
  ei:'Mở vừa /ê/ rồi khép lên /i/ (/ây/).',
  ai:'Mở /a/ rồi nâng nhẹ lên /i/ (/ai/).',
  ui:'Đọc đầy đủ là /u-êi/, lướt nhanh qua /ê/ ở giữa.',
  iu:'Đọc đầy đủ là /i-ôu/, không bỏ âm tròn môi cuối.',
  er:'Phát âm /ơ/ đồng thời uốn đầu lưỡi cong lên về phía vòm.',
  a:'Mở miệng rộng và thoáng theo chiều dọc.',
  o:'Môi tròn gọn, giữ ổn định không dẹt miệng.',
  e:'Không tròn môi, âm gần giữa /ơ/ và /ư/.',
  i:'Kéo nhẹ khóe miệng sang hai bên (sau z/c/s/zh/ch/sh/r đọc là âm ư kéo dài).',
  u:'Chu môi tròn nhỏ nhô về phía trước.'
};
const TONE_GUIDE_INFO={
  1:{title:'Thanh 1 ( ¯ · mức 5–5 )',desc:'Giọng ở mức cao, giữ thẳng ngang và ổn định từ đầu đến cuối.',pathBig:'M24 14 L196 14',arrow:'190,9 200,14 190,19',tips:['Giữ hơi đều, không cho giọng bị tuột xuống cuối âm tiết.','Thích hợp khởi động ở độ cao thoải mái nhất của quãng trên.']},
  2:{title:'Thanh 2 ( ˊ · mức 3–5 )',desc:'Giọng đi từ mức trung lên cao dứt khoát như âm sắc/hỏi vút lên.',pathBig:'M24 44 L196 14',arrow:'187,12 200,13 192,23',tips:['Bắt đầu ngang trung bình rồi đẩy nhẹ lên dứt khoát.','Tránh ngắt khựng ở điểm bắt đầu như thanh 3.']},
  3:{title:'Thanh 3 ( ˇ · mức 2–1–4 )',desc:'Giọng hạ xuống thấp nhất rồi nâng nhẹ lên ở cuối, có dạng “võng”.',pathBig:'M24 46 Q96 70 196 24',arrow:'186,23 200,22 192,33',tips:['Hạ giọng xuống vùng trầm và giữ ngắn ở đáy đường cong.','Khi đứng trước âm thanh 1/2/4/nhẹ chỉ đọc nửa thanh 3 (hạ trầm không cần vút cao).']},
  4:{title:'Thanh 4 ( ˋ · mức 5–1 )',desc:'Giọng rơi mạnh và gọn từ cao xuống thấp dứt khoát.',pathBig:'M24 14 L196 62',arrow:'191,53 200,63 187,64',tips:['Bắt đầu từ cao (gần thanh 1) rồi thả xuống thật nhanh và ngắn gọn.','Tránh đọc kéo dài lờ đờ khiến âm bị giống thanh 2/3.']},
  5:{title:'Thanh nhẹ ( ˙ )',desc:'Đọc rất ngắn, nhẹ và lướt, âm lượng nhỏ hơn âm tiết chính.',pathBig:'M68 38 L152 38',arrow:'',tips:['Không gồng thanh quản hoặc nhấn mạnh cao độ.','Độ cao phụ thuộc tự nhiên vào thanh điệu của âm tiết đứng trước.']}
};
function parseInitialFinal(syl){
  const p=parseToneSyllable(syl);
  const b=p.base;
  if(!b)return {syl,base:b,tone:p.tone,initial:'',final:''};
  const init=PY_INITIALS.find(x=>b.startsWith(x))||'';
  const fin=b.slice(init.length);
  return {syl,base:b,tone:p.tone,initial:init,final:fin};
}
function getFinalTip(init,fin){
  if(fin==='i'&&['z','c','s','zh','ch','sh','r'].includes(init)){
    return `Âm “i” đi sau “${init}” KHÔNG đọc là /i/, mà giữ nguyên lưỡi của “${init}” và rung nhẹ âm /ư/ kéo dài.`;
  }
  if(fin==='u'&&['j','q','x','y'].includes(init)){
    return `Sau “${init}”, chữ “u” thực chất là vần “ü” (/uy/): cần chu tròn môi và đọc là /uy/ thay vì /u/.`;
  }
  if(FINAL_GUIDE[fin])return FINAL_GUIDE[fin];
  for(const k of Object.keys(FINAL_GUIDE)){
    if(fin.endsWith(k))return FINAL_GUIDE[k];
  }
  return `Phát âm trọn vẹn vần “-${fin}”, kết nối mượt sau thanh mẫu.`;
}

const speakCtrl=(function(){
  let mode=(store.speaking&&store.speaking.mode)||'sentence';
  let viewTab='practice',guideTab='tone',weakToneFilter=0;
  let idx=0,mediaRec=null,stream=null,audioCtx=null,analyser=null,rafId=null,timerId=null;
  let chunks=[],recBlob=null,recUrl=null,recDuration=0,recStart=0,isRecording=false,recAborted=false;
  let liveRec=null,lastLiveTranscript='',lastLiveAlternatives=[];
  let assessInFlight=false,apiCallsInSession=0;
  const MAX_API_CALLS_SESSION=600;
  const isIOSDevice=()=>(typeof LocalSpeechAnalyzer!=='undefined'&&LocalSpeechAnalyzer.isIOS)?LocalSpeechAnalyzer.isIOS():(/iPhone|iPad|iPod/i.test(navigator.userAgent||'')||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));

  // Render 16 thanh đo tín hiệu âm thanh thật
  const meterEl=$('#sp-meter');
  if(meterEl)meterEl.innerHTML=Array.from({length:16},()=>'<i style="height:4px"></i>').join('');

  function ensureWeakStore(){
    if(!store.speaking)store.speaking={mode:'sentence',maxSec:15,items:{}};
    if(!Array.isArray(store.speaking.weakChars))store.speaking.weakChars=[];
    if(!store.speaking.weakTones||typeof store.speaking.weakTones!=='object')store.speaking.weakTones={};
    [1,2,3,4,5].forEach(t=>{
      if(!store.speaking.weakTones[t]||typeof store.speaking.weakTones[t]!=='object'){
        store.speaking.weakTones[t]={weak:0,ok:0};
      }
    });
    return store.speaking;
  }
  function updateWeakBadge(){
    const sp=ensureWeakStore();
    const n=sp.weakChars.length;
    const el=$('#sp-weak-cnt');
    if(el){
      el.textContent=String(n);
      el.classList.toggle('hide',n===0);
    }
    if(typeof updateReviewFooter==='function')updateReviewFooter();
  }
  function lookupWeakWordMeta(ch){
    const k=String(ch||'').trim();
    if(!k)return {py:'',vi:''};
    const w=(typeof WORDS!=='undefined'&&Array.isArray(WORDS))?WORDS.find(x=>x&&x.zh===k):null;
    if(w)return {py:w.py||'',vi:w.vi||''};
    if(store&&store.vocabBank){
      const vb=Object.values(store.vocabBank).find(x=>x&&x.zh===k);
      if(vb)return {py:vb.py||'',vi:vb.vi||''};
    }
    const idxObj=(typeof window!=='undefined'&&window.HANYU_VOCAB_INDEX)||null;
    if(idxObj&&Array.isArray(idxObj.items)){
      const row=idxObj.items.find(r=>r&&r[0]===k);
      if(row)return {py:row[1]||'',vi:row[2]||''};
    }
    return {py:'',vi:''};
  }
  function upsertWeakChar(entry){
    const sp=ensureWeakStore();
    const ch=String(entry&&entry.ch||'').trim();
    if(!ch)return;
    const prev=sp.weakChars.find(x=>x.ch===ch);
    const meta=(!entry.py||!entry.vi)?lookupWeakWordMeta(ch):{py:'',vi:''};
    const py=entry.py||meta.py||(prev&&prev.py)||'';
    const vi=entry.vi||meta.vi||(prev&&prev.vi)||'';
    let tone=Number(entry.tone);
    if(![1,2,3,4,5].includes(tone))tone=py?detectBaseTone(py.toLowerCase()):((prev&&prev.tone)||5);
    const fails=(prev?(prev.fails||1):0)+1;
    sp.weakChars=sp.weakChars.filter(x=>x.ch!==ch);
    sp.weakChars.unshift({
      ch,py,vi,tone,
      score:(entry.score!==null&&entry.score!==undefined&&Number.isFinite(Number(entry.score)))?Math.round(Number(entry.score)):(prev?prev.score:null),
      fails,
      lessonId:entry.lessonId||(prev&&prev.lessonId)||store.activeLessonId||'',
      sourceZh:entry.sourceZh||(prev&&prev.sourceZh)||'',
      at:Date.now()
    });
    if(sp.weakChars.length>40)sp.weakChars.length=40;
  }
  function recordWeakFromAssessment(item,res,lessonId){
    const sp=ensureWeakStore();
    const expectedMap=new Map();
    analyzeExpectedTones(item.zh,item.py).forEach(s=>{
      if(s&&s.ch&&!expectedMap.has(s.ch))expectedMap.set(s.ch,s);
    });
    const cleared=[];
    const wordList=Array.isArray(res&&res.wordResults)&&res.wordResults.length
      ?res.wordResults
      :(Array.isArray(res&&res.syllableResults)?res.syllableResults.map((sy,k)=>({
          word:[...String(item.zh||'').replace(/[^\u4e00-\u9fff]/g,'')][k]||sy.syllable||'',
          accuracyScore:sy.score,
          errorType:(sy.score!==null&&sy.score!==undefined&&sy.score<70)?'Mispronunciation':'None',
          syllables:[sy]
        })):[]);
    wordList.forEach(w=>{
      const ch=String((w&&w.word)||'').trim();
      if(!ch||!/[\u4e00-\u9fff]/.test(ch))return;
      const sc=(w&&w.accuracyScore!==null&&w.accuracyScore!==undefined)?Number(w.accuracyScore):null;
      const expChar=expectedMap.get(ch);
      const sy0=(Array.isArray(w.syllables)&&w.syllables[0])||{};
      const py=sy0.syllable||(expChar&&expChar.py)||'';
      let tone=Number(sy0.expectedTone)||(expChar&&expChar.tone)||detectBaseTone(py.toLowerCase());
      if(![1,2,3,4,5].includes(tone))tone=5;
      const isWeak=(w&&(w.errorType==='Mispronunciation'||w.errorType==='Omission'))||(sc!==null&&Number.isFinite(sc)&&sc<70);
      const isStrong=(!w||w.errorType==='None'||!w.errorType)&&sc!==null&&Number.isFinite(sc)&&sc>=85;
      if(isWeak){
        sp.weakTones[tone].weak=(sp.weakTones[tone].weak||0)+1;
        upsertWeakChar({ch,py,vi:item.zh===ch?(item.vi||''):'',tone,score:sc,lessonId,sourceZh:item.zh});
      }else if(isStrong){
        sp.weakTones[tone].ok=(sp.weakTones[tone].ok||0)+1;
        if(sp.weakChars.some(x=>x.ch===ch)){
          sp.weakChars=sp.weakChars.filter(x=>x.ch!==ch);
          cleared.push(ch);
        }
      }
    });
    return cleared;
  }

  function getList(m){
    const useMode=m||mode;
    if(useMode==='weak'){
      const sp=ensureWeakStore();
      let arr=sp.weakChars.slice();
      if(weakToneFilter&&[1,2,3,4,5].includes(weakToneFilter)){
        arr=arr.filter(wc=>Number(wc.tone)===weakToneFilter);
      }
      arr.sort((a,b)=>((b.fails||1)-(a.fails||1))||((a.score??999)-(b.score??999))||((b.at||0)-(a.at||0)));
      return arr.map(wc=>{
        const toneLbl=TONE_NAMES[wc.tone]||'Thanh điệu';
        const scorePart=(wc.score!==null&&wc.score!==undefined)?` · ${wc.score}đ`:' · Cần luyện';
        const viPart=wc.vi?`${wc.vi} (${toneLbl}${scorePart})`:`${toneLbl}${scorePart}`;
        return {id:'sp_weak_'+wc.ch,zh:wc.ch,py:wc.py||'',vi:viPart,_isWeak:true,_weakTone:wc.tone,_fails:wc.fails||1};
      });
    }
    if(useMode==='word')return WORDS.map(w=>({id:'sp_w_'+w.id,zh:w.zh,py:w.py,vi:w.vi}));
    if(useMode==='dialog')return LISTEN_DIALOG.map((d,k)=>({id:'sp_d_'+k,zh:d.zh,py:d.py,vi:d.vi}));
    if(SENT&&SENT.length)return SENT.map((s,k)=>({id:'sp_s_'+k,zh:s.zh,py:s.py,vi:s.vi}));
    if(LISTEN_DIALOG&&LISTEN_DIALOG.length)return LISTEN_DIALOG.map((d,k)=>({id:'sp_d_'+k,zh:d.zh,py:d.py,vi:d.vi}));
    const seen=new Set(),out=[];
    WORDS.forEach((w,k)=>{
      const ex=(typeof resolveWordExample==='function')?resolveWordExample(w):{ex:w.ex||w.zh,exPy:w.exPy||w.py,exVi:w.exVi||w.vi};
      if(ex.ex&&!seen.has(ex.ex)){seen.add(ex.ex);out.push({id:'sp_ex_'+k,zh:ex.ex,py:ex.exPy,vi:ex.exVi});}
    });
    return out;
  }
  function getItemRec(id){
    return store.speaking.items[id]||{attempts:0,assessRequests:0,lastPracticedAt:null,lastResult:null,selfStatus:null,needsPractice:false,history:[]};
  }
  function saveItemRec(id,patch){
    const prev=getItemRec(id);
    store.speaking.items[id]=Object.assign({},prev,patch,{lastPracticedAt:Date.now()});
    saveStore(store);
  }

  function destroyMicStream(){
    if(stream){try{stream.getTracks().forEach(t=>t.stop());}catch(_){}stream=null;}
  }
  async function getReusableMicStream(){
    if(isIOSDevice()){
      // Trên iOS Safari, TTS đổi AVAudioSession sang Playback khiến track micro cũ bị ngắt tiếng âm thầm dù readyState === 'live'
      destroyMicStream();
    }else if(stream){
      const tracks=stream.getAudioTracks();
      if(tracks.some(t=>t.readyState==='live')){
        tracks.forEach(t=>{try{t.enabled=true;}catch(_){}});
        return stream;
      }
      destroyMicStream();
    }
    let s;
    try{
      s=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    }catch(_){
      s=await navigator.mediaDevices.getUserMedia({audio:true});
    }
    stream=s;
    try{localStorage.setItem('hanyu_mic_granted','1');}catch(_){}
    return stream;
  }
  function stopRecGracefully(){
    isRecording=false;
    clearInterval(timerId);timerId=null;
    if(typeof cancelAnimationFrame==='function'&&rafId)cancelAnimationFrame(rafId);rafId=null;
    if(liveRec){try{liveRec.stop();}catch(_){}liveRec=null;}
    $('#sp-mic').classList.remove('rec');
    if(meterEl)$$('i',meterEl).forEach(el=>el.style.height='4px');
    if(mediaRec&&mediaRec.state==='recording'){
      $('#sp-rec-state').textContent='Đang xử lý bản ghi…';
      try{if(typeof mediaRec.requestData==='function')mediaRec.requestData();}catch(_){}
      try{mediaRec.stop();}catch(_){releaseMic(isIOSDevice());}
    }else{
      releaseMic(isIOSDevice());
    }
  }
  function releaseMic(hardStop){
    isRecording=false;
    clearInterval(timerId);timerId=null;
    if(typeof cancelAnimationFrame==='function'&&rafId)cancelAnimationFrame(rafId);rafId=null;
    if(liveRec){try{liveRec.stop();}catch(_){}liveRec=null;}
    if(mediaRec&&mediaRec.state!=='inactive'){try{mediaRec.stop();}catch(_){}}
    if(hardStop===true||isIOSDevice()){
      destroyMicStream();
    }else if(stream){
      try{stream.getAudioTracks().forEach(t=>{t.enabled=false;});}catch(_){}
    }
    if(audioCtx){try{audioCtx.close();}catch(_){}audioCtx=null;analyser=null;}
    $('#sp-mic').classList.remove('rec');
    if(meterEl)$$('i',meterEl).forEach(el=>el.style.height='4px');
  }
  if(typeof window!=='undefined'&&!window._hanyuMicUnloadBound){
    window._hanyuMicUnloadBound=true;
    window.addEventListener('pagehide',()=>releaseMic(true));
  }
  function clearRecBlob(){
    if(isRecording)recAborted=true;
    if(recUrl){try{URL.revokeObjectURL(recUrl);}catch(_){}recUrl=null;}
    recBlob=null;recDuration=0;lastLiveTranscript='';lastLiveAlternatives=[];
    const au=$('#sp-audio');if(au){au.pause();au.removeAttribute('src');au.load();}
    $('#sp-player').classList.add('hide');
    $('#sp-rec-meta').textContent='';
    $('#sp-compare').disabled=true;
    $('#sp-assess').disabled=true;
  }
  function stopAll(){
    if(isRecording)recAborted=true;
    releaseMic(isIOSDevice());
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
    $('#sp-sandhi-note').textContent=notes.length?('Biến điệu: '+notes.join(' • ')):'Chạm vào từng âm tiết ở trên để nghe riêng từng chữ.';
  }

  function renderGuide(item){
    const body=$('#sp-guide-body');if(!body)return;
    $$('#sp-guide-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.spg===guideTab));
    if(!item){body.innerHTML='<p class="muted small">Chưa có dữ liệu.</p>';return;}
    const syls=analyzeExpectedTones(item.zh,item.py).map(s=>Object.assign({},s,parseInitialFinal(s.py)));

    if(guideTab==='init'){
      const groups=new Map();
      syls.forEach(s=>{
        const key=s.initial||'_zero';
        if(!groups.has(key))groups.set(key,{init:s.initial,samples:[]});
        groups.get(key).samples.push(s);
      });
      body.innerHTML=[...groups.values()].map(g=>{
        const lbl=g.init?`Âm đầu “${g.init}”`:'Âm tiết không có thanh mẫu (Zero-initial)';
        const tip=g.init?(INITIAL_GUIDE[g.init]||'Đọc rõ khẩu hình của thanh mẫu trước khi nối vần.'):'Mở miệng trực tiếp vào nguyên âm chính, phát âm gọn và rõ từ đầu.';
        const exChips=g.samples.slice(0,4).map(s=>`<button type="button" class="sp-part-ex" data-say="${s.ch}"><b>${s.ch}</b><span>${s.py}</span></button>`).join('');
        return `<div class="sp-part-box"><div class="sp-part-top"><span class="sp-part-pill">${lbl}</span><div style="display:flex;gap:5px;flex-wrap:wrap">${exChips}</div></div><div class="sp-part-tip">${tip}</div></div>`;
      }).join('');
      return;
    }

    if(guideTab==='fin'){
      const groups=new Map();
      syls.forEach(s=>{
        if(!s.final)return;
        const key=s.initial&&((s.final==='i'&&['z','c','s','zh','ch','sh','r'].includes(s.initial))||(s.final==='u'&&['j','q','x','y'].includes(s.initial)))?`${s.initial}+${s.final}`:s.final;
        if(!groups.has(key))groups.set(key,{init:s.initial,fin:s.final,samples:[]});
        groups.get(key).samples.push(s);
      });
      body.innerHTML=groups.size?[...groups.values()].map(g=>{
        const tip=getFinalTip(g.init,g.fin);
        const exChips=g.samples.slice(0,4).map(s=>`<button type="button" class="sp-part-ex" data-say="${s.ch}"><b>${s.ch}</b><span>${s.py}</span></button>`).join('');
        return `<div class="sp-part-box"><div class="sp-part-top"><span class="sp-part-pill">Vần “-${g.fin}”</span><div style="display:flex;gap:5px;flex-wrap:wrap">${exChips}</div></div><div class="sp-part-tip">${tip}</div></div>`;
      }).join(''):'<p class="muted small">Chưa tách được vần cho mục này.</p>';
      return;
    }

    // Tab Thanh điệu: SVG đường cong lớn + mẹo luyện tập
    const focus=syls.find(s=>s.sandhi)||syls.find(s=>s.tone===3)||syls[0];
    const focusTone=focus?focus.tone:1;
    const gInfo=TONE_GUIDE_INFO[focusTone]||TONE_GUIDE_INFO[1];
    const gridLines=[12,24,36,48,60].map(y=>`<line x1="16" y1="${y}" x2="204" y2="${y}" stroke="var(--line)" stroke-width="1" stroke-dasharray="4 4"/>`).join('');
    const focusBtn=focus?`<button type="button" class="sp-part-ex" data-say="${focus.ch}"><b>${focus.ch}</b><span>${focus.py}</span></button>`:'';
    body.innerHTML=`
      <div class="sp-tone-curve-box">
        <div class="sp-tone-curve-hd"><b>${gInfo.title}</b>${focusBtn}</div>
        <div class="sp-tone-curve-desc">${gInfo.desc}</div>
        <div class="sp-tone-svg-wrap">
          <svg class="sp-tone-big-svg" viewBox="0 0 220 74" aria-label="${gInfo.title}">
            ${gridLines}
            <text x="6" y="16" font-size="9" fill="var(--muted)">5</text>
            <text x="6" y="40" font-size="9" fill="var(--muted)">3</text>
            <text x="6" y="64" font-size="9" fill="var(--muted)">1</text>
            <path d="${gInfo.pathBig}" fill="none" stroke="var(--accent)" stroke-width="3.6" stroke-linecap="round"/>
            ${gInfo.arrow?`<polygon points="${gInfo.arrow}" fill="var(--accent)"/>`:''}
          </svg>
        </div>
      </div>
      <div class="sp-tip-callout"><span>💡</span><div><b>Mẹo luyện tập:</b><ul>${gInfo.tips.map(t=>`<li>${t}</li>`).join('')}</ul></div></div>`;
  }

  function renderSelfBox(item){
    const rec=getItemRec(item.id);
    const box=$('#sp-self-row'),badge=$('#sp-self-badge'),okB=$('#sp-mark-ok'),rtB=$('#sp-mark-retry');
    const saved=rec.lastResult;
    const hasScore=Boolean(saved&&saved.status==='assessed'&&saved.overallScore!==null&&saved.overallScore!==undefined);
    if(box)box.classList.toggle('compact',hasScore);
    if(badge){
      if(rec.selfStatus==='ok'||rec.selfStatus==='retry'){
        badge.className='sp-self-badge'+(rec.selfStatus==='ok'?' ok':' retry');
        badge.textContent=rec.selfStatus==='ok'?'Đạt yêu cầu':'Cần luyện lại';
      }else if(hasScore){
        const sc=Number(saved.overallScore);
        badge.className='sp-self-badge '+(sc>=75?'ok':'retry');
        badge.textContent=sc>=75?'AI: Đạt':'AI: Cần luyện lại';
      }else{
        badge.className='sp-self-badge';
        badge.textContent='Chưa đánh dấu';
      }
    }
    if(okB)okB.classList.toggle('on',rec.selfStatus==='ok');
    if(rtB)rtB.classList.toggle('on',rec.selfStatus==='retry');
  }

  function getSelectedSpeakEngine(){
    const apis=(typeof PronunciationAssessor!=='undefined'&&PronunciationAssessor.getEnabledProviders)?PronunciationAssessor.getEnabledProviders():[];
    if(!apis.length)return 'web';
    const cur=(store&&store.speaking&&typeof store.speaking.engine==='string')?store.speaking.engine:'';
    if(cur==='web')return 'web';
    if(apis.some(a=>a.provider===cur))return cur;
    return apis[0].provider;
  }

  function renderSpeakEngineBar(){
    const bar=$('#sp-engine-bar');
    if(!bar)return 'web';
    const apis=(typeof PronunciationAssessor!=='undefined'&&PronunciationAssessor.getEnabledProviders)?PronunciationAssessor.getEnabledProviders():[];
    if(!apis.length){
      bar.innerHTML='';
      bar.classList.add('hide');
      return 'web';
    }
    const sel=getSelectedSpeakEngine();
    const _esc=s=>(typeof escHtml==='function')?escHtml(s):String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const chips=[
      ...apis.map(a=>`<button type="button" class="sp-eng-chip${sel===a.provider?' on':''}" data-sp-eng="${_esc(a.provider)}">${_esc(a.shortLabel||a.label||a.provider)}</button>`),
      `<button type="button" class="sp-eng-chip${sel==='web'?' on':''}" data-sp-eng="web">⚡ Web (nhanh)</button>`
    ].join('');
    bar.innerHTML=`<span class="sp-eng-lbl">Chấm bằng:</span><div class="sp-eng-chips">${chips}</div>`;
    bar.classList.remove('hide');
    bar.querySelectorAll('[data-sp-eng]').forEach(btn=>{
      btn.onclick=()=>{
        const eng=btn.getAttribute('data-sp-eng')||'web';
        if(!store.speaking)store.speaking={};
        store.speaking.engine=eng;
        saveStore(store);
        const curItem=getList()[idx];
        if(curItem)renderAssessmentArea(curItem);
        else renderSpeakEngineBar();
      };
    });
    return sel;
  }

  function renderAssessmentArea(item){
    const selectedEng=renderSpeakEngineBar();
    const useApi=selectedEng!=='web';
    const cfg=useApi?PronunciationAssessor.getConfig(selectedEng):{configured:false};
    const banner=$('#sp-api-banner'),resWrap=$('#sp-result-wrap');
    const saved=getItemRec(item.id).lastResult;
    const _esc=s=>(typeof escHtml==='function')?escHtml(s):String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const canLiveRec=(typeof LocalSpeechAnalyzer!=='undefined'&&LocalSpeechAnalyzer.isSpeechRecSupported&&LocalSpeechAnalyzer.isSpeechRecSupported()&&!LocalSpeechAnalyzer.isIOS());
    const cfgBtn='<button type="button" class="chip" data-open-azure-cfg="1">⚙ Cài đặt AI</button>';
    if(!useApi||!cfg.configured){
      banner.innerHTML=`<div class="sp-api-top"><div><b>Chấm phát âm trực tiếp trên trình duyệt:</b> Miễn phí · Phân tích đường cong thanh điệu giọng thật${canLiveRec?' + Nhận diện zh-CN':''}. Bấm ghi âm rồi nhấn <b>Kiểm tra phát âm</b>.</div>${cfgBtn}</div>`;
    }else{
      banner.innerHTML=`<div class="sp-api-top"><div><b>Chấm phát âm:</b> ${_esc(cfg.label||cfg.provider)}${cfg.region?' · '+_esc(cfg.region):''} • Lượt trong phiên: ${apiCallsInSession}/${MAX_API_CALLS_SESSION}</div>${cfgBtn}</div>`;
    }
    if(saved&&saved.status==='assessed'){
      resWrap.classList.remove('hide');
      const pitchHtml=saved.pitchSvg?`
        <details class="sp-pitch-details">
          <summary>📈 Xem biểu đồ đường cong thanh điệu chi tiết</summary>
          <div class="sp-pitch-card">
            <div class="sp-pitch-hd">
              <b>Đường cong thanh điệu</b>
              <span class="sp-pitch-legend">
                <span><i class="lg-act"></i>Giọng bạn</span>
                <span><i class="lg-ref"></i>Mẫu chuẩn</span>
              </span>
            </div>
            ${saved.pitchSvg}
          </div>
        </details>`:'';

      if((Array.isArray(saved.wordResults)&&saved.wordResults.length)||saved.provider==='local-browser'){
        const fmtVal=v=>(v!==null&&v!==undefined&&Number.isFinite(Number(v)))?(v+'/100'):'—';
        const mBox=(lbl,val)=>`<div class="sp-metric-box"><span>${lbl}</span><b>${fmtVal(val)}</b></div>`;
        const wordsHtml=(Array.isArray(saved.wordResults)?saved.wordResults:[]).map(w=>{
          let cls='ok',scTxt=(w.accuracyScore!==null&&w.accuracyScore!==undefined)?(w.accuracyScore+'đ'):'—';
          if(w.errorType==='Omission'){cls='omit';scTxt='Thiếu';}
          else if(w.errorType==='Insertion'){cls='ins';scTxt='Dư';}
          else if(w.errorType==='Mispronunciation'||(w.accuracyScore!==null&&w.accuracyScore<60)){cls='bad';}
          else if(w.accuracyScore!==null&&w.accuracyScore<80){cls='warn';}
          const syl=(Array.isArray(w.syllables)&&w.syllables.length)?w.syllables.map(sy=>sy.syllable||'').filter(Boolean).join(''):'';
          const tipTitle=w.note?`Chạm để nghe lại âm chuẩn · ${w.note}`:'Chạm để nghe lại âm chuẩn';
          return `<button type="button" class="sp-wchip ${cls}" data-say="${_esc(w.word)}" title="${_esc(tipTitle)}"><span class="sp-wchip-zh">${_esc(w.word)}</span><span class="sp-wchip-sc">${_esc(scTxt)}</span>${syl?`<span class="sp-wchip-syl">${_esc(syl)}</span>`:''}</button>`;
        }).join('');
        const isLocal=saved.provider==='local-browser';
        const sc=saved.overallScore;
        const verdict=sc===null?'':(sc>=80?' · Đạt tốt':(sc>=65?' · Khá, cần chỉnh nhẹ':' · Cần luyện lại'));
        const heroTitle=(isLocal?'Kết quả phân tích trên trình duyệt':'Điểm phát âm tổng')+verdict;
        const heroSub=wordsHtml?'Xanh = Đạt · Cam = Chưa rõ · Đỏ = Sai (chạm thẻ chữ để nghe mẫu)':'Chưa phát hiện rõ giọng nói trong bản ghi';
        const metricsHtml=wordsHtml?(isLocal?`
          <div class="sp-metrics-grid sp-metrics-2">
            ${mBox('Thanh điệu',saved.toneScore!==undefined&&saved.toneScore!==null?saved.toneScore:saved.accuracyScore)}
            ${mBox('Đầy đủ',saved.completenessScore)}
          </div>`:`
          <div class="sp-metrics-grid">
            ${mBox('Chính xác',saved.accuracyScore)}
            ${mBox('Trôi chảy',saved.fluencyScore)}
            ${mBox('Đầy đủ',saved.completenessScore)}
            ${mBox('Ngữ điệu',saved.prosodyScore)}
          </div>`):'';
        resWrap.innerHTML=`
          <div class="sp-score-hero">
            <div><b>${heroTitle}</b><div class="small muted">${heroSub}</div></div>
            <div class="sp-score-num">${saved.overallScore!==null?saved.overallScore:'✓'}<span>${saved.overallScore!==null?' / 100':''}</span></div>
          </div>
          ${metricsHtml}
          ${wordsHtml?`<div class="sp-word-grid">${wordsHtml}</div>`:''}
          ${pitchHtml}
          ${saved.recognizedText?`<div class="sp-recog-txt"><b>Máy nghe được:</b> ${_esc(saved.recognizedText)}</div>`:''}
          ${saved.feedback?`<div class="note"><svg class="ic"><use href="#i-bulb"/></svg><div>${_esc(saved.feedback)}</div></div>`:''}`;
      }else{
        const row=(lbl,val)=>val===null?'':`<div class="barrow" style="justify-content:space-between"><span class="small">${lbl}</span><b>${val} / 100</b></div>`;
        resWrap.innerHTML=`
          <div class="barrow" style="justify-content:space-between"><b>Kết quả đã lưu</b><b style="color:var(--accent)">${saved.overallScore!==null?saved.overallScore+' / 100':'Đã chấm'}</b></div>
          ${row('Âm đầu',saved.initialScore)}${row('Vần',saved.finalScore)}${row('Thanh điệu',saved.toneScore)}${row('Độ trôi chảy',saved.fluencyScore)}
          ${pitchHtml}
          ${saved.feedback?`<div class="note"><svg class="ic"><use href="#i-bulb"/></svg><div>${_esc(saved.feedback)}</div></div>`:''}`;
      }
    }else{
      resWrap.classList.add('hide');resWrap.innerHTML='';
    }
  }

  function renderHistory(){
    const listEl=$('#sp-hist-list');if(!listEl)return;
    const entries=Object.entries(store.speaking.items||{});
    let totalRecs=0,okCnt=0,retryCnt=0;
    const rows=[];
    const lookupItem=id=>{
      const all=[...WORDS.map((w,k)=>({id:'sp_w_'+w.id,m:'word',zh:w.zh,py:w.py})),...SENT.map((s,k)=>({id:'sp_s_'+k,m:'sentence',zh:s.zh,py:s.py})),...LISTEN_DIALOG.map((d,k)=>({id:'sp_d_'+k,m:'dialog',zh:d.zh,py:d.py}))];
      const found=all.find(x=>x.id===id);
      if(found)return found;
      if(id.startsWith('sp_w_')&&store.vocabBank){const w=store.vocabBank[id.slice(5)];if(w)return {id,m:'word',zh:w.zh,py:w.py};}
      return {id,m:'sentence',zh:id.replace(/^sp_[wsd]_/,''),py:''};
    };
    entries.forEach(([id,rec])=>{
      totalRecs+=(rec.attempts||0);
      if(rec.selfStatus==='ok')okCnt++;
      else if(rec.selfStatus==='retry'||rec.needsPractice)retryCnt++;
      if(rec.attempts>0||rec.selfStatus||rec.lastResult){
        const meta=lookupItem(id);
        rows.push({id,rec,meta});
      }
    });
    rows.sort((a,b)=>(b.rec.lastPracticedAt||0)-(a.rec.lastPracticedAt||0));
    if($('#sp-st-recs'))$('#sp-st-recs').textContent=totalRecs;
    if($('#sp-st-ok'))$('#sp-st-ok').textContent=okCnt;
    if($('#sp-st-retry'))$('#sp-st-retry').textContent=retryCnt;
    const _esc=s=>(typeof escHtml==='function')?escHtml(s):String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const spStore=ensureWeakStore();
    const weakArr=spStore.weakChars;
    const toneStats=[1,2,3,4,5].map(t=>{
      const st=spStore.weakTones[t]||{weak:0,ok:0};
      const cnt=weakArr.filter(x=>Number(x.tone)===t).length;
      return {t,weak:st.weak||0,ok:st.ok||0,cnt};
    }).filter(x=>x.weak>0||x.cnt>0);
    const maxToneWeak=toneStats.reduce((m,x)=>Math.max(m,x.weak),0);
    const toneGridHtml=toneStats.length?`<div class="sp-tone-weak-grid">${toneStats.map(x=>`<button type="button" class="sp-tw-pill ${x.weak>0&&x.weak===maxToneWeak?'hot':''}" data-practice-weak-tone="${x.t}" title="Luyện các từ yếu ${TONE_NAMES[x.t]}"><b>${TONE_NAMES[x.t]}</b><span>${x.cnt?`${x.cnt} từ · `:''}${x.weak} lỗi</span></button>`).join('')}</div>`:'';
    const weakHtml=(weakArr.length||toneStats.length)?`<div class="sp-weak-box"><div class="sp-weak-hd"><div><b>Từ & Thanh điệu phát âm yếu</b><div class="small muted">${weakArr.length?`${weakArr.length} từ cần luyện lại (< 70đ)`:'Theo dõi thanh điệu cần chú ý'}</div></div>${weakArr.length?`<button type="button" class="btn sm sp-weak-cta" data-practice-weak="all">Ôn ${weakArr.length} từ yếu</button>`:''}</div>${toneGridHtml}${weakArr.length?`<div class="sp-weak-chips">${weakArr.map(wc=>`<span class="sp-weak-chip"><button type="button" class="sp-wc-play" data-say="${_esc(wc.ch)}" title="Nghe mẫu ${wc.score!==null&&wc.score!==undefined?wc.score+'đ':''}"><b>${_esc(wc.ch)}</b>${wc.py?` <small>${_esc(wc.py)}</small>`:''}${wc.score!==null&&wc.score!==undefined?` <em>${wc.score}đ</em>`:''}</button><button type="button" class="sp-wc-go" data-practice-weak-ch="${_esc(wc.ch)}" title="Luyện lại từ này">Luyện</button><button type="button" class="sp-wc-del" data-del-weak="${_esc(wc.ch)}" aria-label="Xóa ${wc.ch}">×</button></span>`).join('')}</div>`:''}</div>`:'';
    if(!rows.length){
      listEl.innerHTML=weakHtml+'<div class="card" style="text-align:center"><p class="muted small" style="margin:0">Chưa có lịch sử luyện nói nào. Hãy ghi âm hoặc tự đánh dấu ở tab <b>Luyện tập</b>.</p></div>';
      return;
    }
    listEl.innerHTML=weakHtml+rows.slice(0,25).map(({id,rec,meta})=>{
      const d=rec.lastPracticedAt?new Date(rec.lastPracticedAt):null;
      const ts=d?`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} · ${d.getDate()}/${d.getMonth()+1}`:'Gần đây';
      const stCls=rec.selfStatus==='ok'?'ok':rec.selfStatus==='retry'?'retry':'';
      const stTxt=rec.selfStatus==='ok'?'Đạt':rec.selfStatus==='retry'?'Cần luyện':(rec.attempts?`Đã thu ${rec.attempts} lần`:'Đã luyện');
      return `<div class="sp-hist-item">
        <div class="sp-hist-zh">${meta.zh}</div>
        <div class="sp-hist-mid"><b>${meta.py||meta.zh}</b><span>${ts} · ${rec.attempts||0} lượt ghi âm</span></div>
        <div class="sp-hist-act">
          <span class="sp-self-badge ${stCls}">${stTxt}</span>
          <button type="button" class="playbtn" data-say="${meta.zh}" style="width:32px;height:32px" aria-label="Nghe ${meta.zh}"><svg class="ic"><use href="#i-vol"/></svg></button>
          <button type="button" class="chip on" data-sp-jump="${id}" data-sp-jm="${meta.m}" style="padding:5px 10px;font-size:12px">Luyện</button>
        </div>
      </div>`;
    }).join('');
  }

  function renderItem(){
    stopAll();
    clearRecBlob();
    const l=(typeof LESSONS!=='undefined'&&Array.isArray(LESSONS))?LESSONS.find(x=>x.id===store.activeLessonId):null;
    const spSub=$('#sp-sub');
    if(spSub)spSub.textContent=`${l?(l.code||'Bài học'):'Bài học'} • Ghi âm thật & hướng dẫn sửa lỗi`;
    const list=getList();
    if(!list.length){
      if(mode==='weak'){
        $('#sp-zh').textContent=weakToneFilter?`Không có từ yếu ${TONE_NAMES[weakToneFilter]}`:'Chưa có từ phát âm yếu';
        $('#sp-py').textContent='';
        $('#sp-vi').textContent=weakToneFilter?'Thử chuyển sang xem tất cả thanh điệu yếu.':'Ghi âm & bấm "Kiểm tra phát âm" ở mục Từng từ hoặc Câu — các chữ dưới 70đ sẽ tự động được gom vào đây!';
        $('#sp-tones').innerHTML=weakToneFilter?'<button type="button" class="chip on" id="sp-clear-weak-filter">Xem tất cả từ yếu</button>':'';
        const cf=$('#sp-clear-weak-filter');if(cf)cf.onclick=()=>{weakToneFilter=0;idx=0;renderItem();};
      }else{
        $('#sp-zh').textContent='Chưa có dữ liệu luyện tập';
        $('#sp-py').textContent='';$('#sp-vi').textContent='';
      }
      $('#sp-idx').textContent='0 / 0';
      renderGuide(null);
      return;
    }
    if(idx>=list.length)idx=0;
    const item=list[idx];
    const maxSec=Number($('#sp-maxsec').value)||15;
    $('#sp-idx').textContent=`${idx+1} / ${list.length}`;
    if($('#sp-prev'))$('#sp-prev').disabled=(idx<=0);
    if($('#sp-next'))$('#sp-next').title=(idx+1>=list.length)?'Hoàn thành & xem tổng kết':'Mục sau';
    $('#sp-zh').textContent=item.zh;
    $('#sp-py').textContent=item.py;
    $('#sp-vi').textContent=item.vi;
    $('#sp-rec-state').textContent='Sẵn sàng ghi âm';
    $('#sp-timer').textContent=`00:00 / ${fmtSec(maxSec)}`;
    renderSelfBox(item);
    renderTones(item);
    if(mode==='weak'&&weakToneFilter){
      $('#sp-sandhi-note').innerHTML=`Đang lọc: <b>${TONE_NAMES[weakToneFilter]}</b> · <button type="button" class="sp-inline-lnk" id="sp-clear-weak-filter">Xem tất cả thanh</button>`;
      const cf=$('#sp-clear-weak-filter');if(cf)cf.onclick=()=>{weakToneFilter=0;idx=0;renderItem();};
    }
    renderGuide(item);
    renderAssessmentArea(item);
  }

  function setViewTab(t){
    viewTab=t==='history'?'history':'practice';
    $$('#sp-view-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.spv===viewTab));
    $('#sp-pane-practice').classList.toggle('hide',viewTab!=='practice');
    $('#sp-pane-history').classList.toggle('hide',viewTab!=='history');
    if(viewTab==='history'){stopAll();renderHistory();}
  }

  function markSelf(status){
    const it=getList()[idx];if(!it)return;
    const hanLen=[...String(it.zh||'')].filter(ch=>/[\u4e00-\u9fff]/.test(ch)).length;
    if(status==='retry'&&(mode==='word'||(hanLen>=1&&hanLen<=4))){
      const syls=analyzeExpectedTones(it.zh,it.py);
      upsertWeakChar({ch:it.zh,py:it.py,vi:it.vi,tone:(syls[0]&&syls[0].tone)||5,score:null,lessonId:store.activeLessonId,sourceZh:it.zh});
    }else if(status==='ok'&&mode==='weak'){
      const sp=ensureWeakStore();
      sp.weakChars=sp.weakChars.filter(x=>x.ch!==it.zh);
    }
    saveItemRec(it.id,{selfStatus:status,needsPractice:status==='retry'});
    updateWeakBadge();
    recordLearningEvent({type:'assess',skill:'speak',title:`Luyện nói: ${it.zh}`,targetId:it.id,view:'speak',result:status==='ok'?'Tự đánh giá: Đạt':'Cần luyện lại'});
    if(typeof playSfx==='function')playSfx(status==='ok'?'ok':'no');
    if(typeof markLessonSectionDone==='function')markLessonSectionDone(store.activeLessonId,'speak',true);
    renderSelfBox(it);
    toast(status==='ok'?`Đã đánh dấu “${it.zh}” đạt yêu cầu`:`Đã gom “${it.zh}” vào danh sách Ôn yếu`);
  }

  async function startRec(){
    if(isRecording){stopRecGracefully();return;}
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
    recAborted=false;
    const maxSec=Number($('#sp-maxsec').value)||15;
    try{
      stream=await getReusableMicStream();
    }catch(err){
      const msg=err&&err.name==='NotAllowedError'?'Bạn đã từ chối quyền micro':err&&err.name==='NotFoundError'?'Không tìm thấy micro trên thiết bị':'Không thể truy cập micro';
      toast(msg);$('#sp-rec-state').textContent=msg;return;
    }

    const mime=detectSupportedMime();
    try{mediaRec=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);}
    catch(_){mediaRec=new MediaRecorder(stream);}

    chunks=[];recStart=Date.now();isRecording=true;lastLiveTranscript='';lastLiveAlternatives=[];
    $('#sp-mic').classList.add('rec');
    $('#sp-rec-state').textContent='Đang ghi âm… Nhấn lại để dừng';

    if(typeof LocalSpeechAnalyzer!=='undefined'&&LocalSpeechAnalyzer.isSpeechRecSupported&&LocalSpeechAnalyzer.isSpeechRecSupported()&&!LocalSpeechAnalyzer.isIOS()){
      liveRec=LocalSpeechAnalyzer.createLiveRecognizer((txt,alts)=>{
        lastLiveTranscript=txt;
        lastLiveAlternatives=Array.isArray(alts)?alts:(txt?[txt]:[]);
        if(isRecording&&txt){
          const st=$('#sp-rec-state');
          if(st)st.textContent='Đang nghe: '+txt;
        }
      });
    }

    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(AC){
        audioCtx=new AC();
        if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
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
      const aborted=recAborted;
      recAborted=false;
      releaseMic(isIOSDevice());
      if(aborted)return;
      const totalBytes=chunks.reduce((s,c)=>s+(c&&c.size?c.size:0),0);
      if(!chunks.length||totalBytes<80){
        toast('Không thu được âm thanh từ micro, hãy thử ghi âm lại');
        $('#sp-rec-state').textContent='Chưa thu được âm thanh từ micro';
        return;
      }
      if(dur<0.15){
        toast('Bản ghi quá ngắn (< 0,15s), hãy giữ nút lâu hơn một chút');
        $('#sp-rec-state').textContent='Bản ghi quá ngắn';
        return;
      }
      recBlob=new Blob(chunks,{type:finalMime});
      if(!recBlob.size){toast('File âm thanh rỗng');return;}
      recDuration=dur;
      recUrl=URL.createObjectURL(recBlob);
      const au=$('#sp-audio');au.src=recUrl;
      $('#sp-player').classList.remove('hide');
      $('#sp-rec-state').textContent='Đã ghi âm xong';
      $('#sp-rec-meta').textContent=`Đã ghi âm: ${dur.toFixed(1)}s`;
      $('#sp-compare').disabled=false;
      $('#sp-assess').disabled=false;

      const curItem=getList()[idx];
      if(curItem){
        const prev=getItemRec(curItem.id);
        saveItemRec(curItem.id,{attempts:prev.attempts+1});
        recordLearningEvent({type:'record',skill:'speak',title:`Ghi âm: ${curItem.zh}`,targetId:curItem.id,view:'speak',durationSec:Math.round(dur),result:`${dur.toFixed(1)}s`});
      }
    };

    try{mediaRec.start(250);}catch(_){mediaRec.start();}
    timerId=setInterval(()=>{
      const el=(Date.now()-recStart)/1000;
      $('#sp-timer').textContent=`${fmtSec(el)} / ${fmtSec(maxSec)}`;
      if(el>=maxSec)stopRecGracefully();
    },250);
  }

  function openWeakPractice(toneFilter=0,targetCh=''){
    weakToneFilter=Number(toneFilter)||0;
    mode='weak';store.speaking.mode='weak';saveStore(store);
    $$('#sp-modes button').forEach(x=>x.classList.toggle('on',x.dataset.sm==='weak'));
    const list=getList('weak');
    if(targetCh){
      const pos=list.findIndex(x=>x.zh===targetCh);
      idx=pos>=0?pos:0;
    }else idx=0;
    setViewTab('practice');
    renderItem();
  }

  $('#sp-view-tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setViewTab(b.dataset.spv);});
  $('#sp-guide-tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;guideTab=b.dataset.spg;renderGuide(getList()[idx]);});
  $('#sp-mark-ok').onclick=()=>markSelf('ok');
  $('#sp-mark-retry').onclick=()=>markSelf('retry');
  $('#sp-hist-list').addEventListener('click',e=>{
    const db=e.target.closest('[data-del-weak]');
    if(db){
      const ch=db.dataset.delWeak;
      if(Array.isArray(store.speaking.weakChars)){
        store.speaking.weakChars=store.speaking.weakChars.filter(x=>x.ch!==ch);
        saveStore(store);
        updateWeakBadge();
        renderHistory();
      }
      return;
    }
    const pwAll=e.target.closest('[data-practice-weak]');
    if(pwAll){openWeakPractice(0,'');return;}
    const pwTone=e.target.closest('[data-practice-weak-tone]');
    if(pwTone){openWeakPractice(Number(pwTone.dataset.practiceWeakTone)||0,'');return;}
    const pwCh=e.target.closest('[data-practice-weak-ch]');
    if(pwCh){openWeakPractice(0,pwCh.dataset.practiceWeakCh||'');return;}
    const jb=e.target.closest('[data-sp-jump]');if(!jb)return;
    const jm=jb.dataset.spJm||'sentence',jid=jb.dataset.spJump;
    weakToneFilter=0;
    mode=jm;store.speaking.mode=mode;saveStore(store);
    $$('#sp-modes button').forEach(x=>x.classList.toggle('on',x.dataset.sm===mode));
    const list=getList(mode),found=list.findIndex(x=>x.id===jid);
    if(found>=0)idx=found;
    setViewTab('practice');
    renderItem();
  });

  $('#sp-modes').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    weakToneFilter=0;
    mode=b.dataset.sm;idx=0;
    store.speaking.mode=mode;saveStore(store);
    $$('#sp-modes button').forEach(x=>x.classList.toggle('on',x===b));
    renderItem();
  });
  $('#sp-maxsec').onchange=()=>{
    store.speaking.maxSec=Number($('#sp-maxsec').value)||15;saveStore(store);
    if(!isRecording)$('#sp-timer').textContent=`00:00 / ${fmtSec(store.speaking.maxSec)}`;
  };
  $('#sp-prev').onclick=()=>{if(idx>0){idx--;renderItem();}};
  $('#sp-next').onclick=()=>{
    const L=getList();if(!L.length)return;
    if(idx+1<L.length){idx++;renderItem();}
    else openSpeakSummary();
  };
  $('#sp-hear').onclick=()=>{const it=getList()[idx];if(it)playItemAudio(it,.65);};
  $('#sp-slow').onclick=()=>{const it=getList()[idx];if(it)playItemAudio(it,.45);};
  $('#sp-mic').onclick=startRec;
  $('#sp-play-rec').onclick=()=>{const au=$('#sp-audio');if(au&&recUrl){stopListeningAudio();au.currentTime=0;au.play().catch(()=>{});}};
  $('#sp-del-rec').onclick=()=>{clearRecBlob();$('#sp-rec-state').textContent='Đã xóa bản ghi, sẵn sàng thu lại';};
  $('#sp-compare').onclick=()=>{
    const it=getList()[idx],au=$('#sp-audio');
    if(!it||!recUrl)return;
    playItemAudio(it,.65,()=>{if(recUrl&&au){au.currentTime=0;au.play().catch(()=>{});}});
  };
  $('#sp-assess').onclick=async()=>{
    if(assessInFlight)return;
    const it=getList()[idx];if(!it||!recBlob)return;
    const blob=recBlob,transcript=lastLiveTranscript,alternatives=lastLiveAlternatives.slice(),lessonId=store.activeLessonId;
    const selectedEng=getSelectedSpeakEngine();
    const cfg=(selectedEng!=='web')?PronunciationAssessor.getConfig(selectedEng):{configured:false};
    const trimForStore=res=>{
      if(!res||typeof res!=='object')return res;
      const copy=Object.assign({},res);
      if(copy.pitchData){
        copy.pitchData={hasVoice:copy.pitchData.hasVoice,voicedCount:copy.pitchData.voicedCount,durationSec:copy.pitchData.durationSec,minHz:copy.pitchData.minHz,maxHz:copy.pitchData.maxHz};
      }
      return copy;
    };
    const runLocal=async ()=>{
      if(typeof LocalSpeechAnalyzer==='undefined'||!LocalSpeechAnalyzer.assessLocal)throw new Error('LOCAL_ANALYZER_MISSING');
      return await LocalSpeechAnalyzer.assessLocal(blob,it,{text:transcript,alternatives});
    };

    assessInFlight=true;
    const btn=$('#sp-assess');btn.disabled=true;btn.textContent='Đang phân tích…';
    let countedApi=false;
    try{
      const prev=getItemRec(it.id);
      let result=null;
      let fallbackNotice='';

      if(cfg.configured&&apiCallsInSession<MAX_API_CALLS_SESSION){
        apiCallsInSession++;countedApi=true;
        try{
          const assessWithCap = Promise.race([
            PronunciationAssessor.assess(blob,it,selectedEng),
            new Promise((_,reject)=>{
              setTimeout(()=>{
                const te=new Error('Chivox chưa phản hồi sau 10 giây');
                te.code='CHIVOX_TIMEOUT';
                te.status=504;
                reject(te);
              },10000);
            })
          ]);
          const [aiRes,pitchRes]=await Promise.all([
            assessWithCap,
            (typeof LocalSpeechAnalyzer!=='undefined'&&LocalSpeechAnalyzer.extractPitchContour)
              ? LocalSpeechAnalyzer.extractPitchContour(blob).catch(()=>null)
              : Promise.resolve(null)
          ]);
          result=aiRes;
          if(result&&pitchRes&&typeof LocalSpeechAnalyzer!=='undefined'&&LocalSpeechAnalyzer.buildToneContourSvg){
            const syls=(typeof analyzeExpectedTones==='function')?analyzeExpectedTones(it.zh,it.py):[];
            result.pitchData=pitchRes;
            result.pitchSvg=LocalSpeechAnalyzer.buildToneContourSvg(pitchRes,syls);
          }
          // Nếu AI (như Chivox) không trả về điểm tổng hoặc mảng từng chữ, tự bổ sung phân tích chi tiết từ giọng thật
          if(result&&(!Array.isArray(result.wordResults)||!result.wordResults.length||result.overallScore===null)&&typeof LocalSpeechAnalyzer!=='undefined'&&LocalSpeechAnalyzer.assessLocal){
            try{
              const locSupplement=await runLocal();
              if(locSupplement){
                if(result.overallScore===null&&locSupplement.overallScore!==null) result.overallScore=locSupplement.overallScore;
                if(result.accuracyScore===null&&locSupplement.accuracyScore!==null) result.accuracyScore=locSupplement.accuracyScore;
                if(result.completenessScore===null&&locSupplement.completenessScore!==null) result.completenessScore=locSupplement.completenessScore;
                if(result.toneScore===undefined||result.toneScore===null) result.toneScore=locSupplement.toneScore;
                if(!Array.isArray(result.wordResults)||!result.wordResults.length) result.wordResults=locSupplement.wordResults||[];
                if(!result.pitchSvg&&locSupplement.pitchSvg) result.pitchSvg=locSupplement.pitchSvg;
                if(!result.recognizedText&&locSupplement.recognizedText) result.recognizedText=locSupplement.recognizedText;
                if(locSupplement.feedback) result.feedback=locSupplement.feedback;
              }
            }catch(_){}
          }
        }catch(aiErr){
          const code=(aiErr&&aiErr.code)||'';
          const msgStr=String((aiErr&&aiErr.message)||'');
          const statusNum=Number(aiErr&&aiErr.status)||0;
          const isFatalUserErr=(code==='AUTH_ERROR'||code==='NO_MATCH'||msgStr==='EMPTY_AUDIO_BLOB'||msgStr==='NO_AUDIO_CONTEXT'||msgStr==='NOT_CONFIGURED');
          const isFallbackErr=!isFatalUserErr&&(
            code==='CHIVOX_TIMEOUT'||code==='OVERLOADED'||code==='RATE_LIMIT'||code==='NETWORK_ERROR'||code==='CHIVOX_API_ERROR'||
            statusNum===408||statusNum===429||statusNum>=500||
            /\b(500|502|503|504|408)\b|timeout|timed out|INVALID_RESPONSE|SDK_LOAD_ERROR|SDK_TIMEOUT|API_ERROR_/i.test(msgStr)
          );
          if(isFallbackErr&&typeof LocalSpeechAnalyzer!=='undefined'&&LocalSpeechAnalyzer.assessLocal){
            apiCallsInSession=Math.max(0,apiCallsInSession-1);
            countedApi=false;
            fallbackNotice=(code==='CHIVOX_TIMEOUT'||statusNum===504||/\b504\b/.test(msgStr))
              ?'Chivox quá thời gian chờ (10s / HTTP 504). Đã trả kết quả phân tích qua web.'
              :'Dịch vụ AI tạm thời không phản hồi. Đã trả kết quả phân tích qua web.';
            btn.textContent='Đang phân tích qua web…';
            result=await runLocal();
          }else{
            throw aiErr;
          }
        }
      }else{
        result=await runLocal();
      }

      const toStore=trimForStore(result);
      const clearedWeak=recordWeakFromAssessment(it,toStore,lessonId);
      saveItemRec(it.id,{assessRequests:(prev.assessRequests||0)+1,lastResult:toStore,needsPractice:(toStore.overallScore!==null&&toStore.overallScore<80)});
      updateWeakBadge();
      if(typeof recordLearningEvent==='function'){
        recordLearningEvent({type:'assess',skill:'speak',title:`Chấm phát âm: ${it.zh}`,targetId:it.id,view:'speak',result:toStore.overallScore!==null?`${toStore.overallScore}/100`:'Đã phân tích'});
      }
      if(typeof markLessonSectionDone==='function'&&lessonId){
        markLessonSectionDone(lessonId,'speak',true);
      }
      if(lessonId===store.activeLessonId&&getList()[idx]?.id===it.id){renderAssessmentArea(it);renderSelfBox(it);}
      else if(mode==='weak'&&clearedWeak.length){renderAssessmentArea(it);renderSelfBox(it);}
      if(fallbackNotice){
        toast(fallbackNotice);
      }else if(clearedWeak.length&&mode==='weak'){
        toast(`Tuyệt! Đã vượt qua từ yếu “${clearedWeak.join(', ')}” (${toStore.overallScore}/100)`);
      }else if(toStore.overallScore!==null){
        toast(`Điểm phát âm: ${toStore.overallScore}/100`);
      }else{
        toast('Đã hoàn tất phân tích đường cong thanh điệu');
      }
    }catch(err){
      if(countedApi&&err&&(err.message==='SDK_LOAD_ERROR'||err.message==='SDK_TIMEOUT'||err.message==='EMPTY_AUDIO_BLOB'||err.message==='NO_AUDIO_CONTEXT'||err.code==='RATE_LIMIT'||err.code==='OVERLOADED'||err.code==='CHIVOX_TIMEOUT')){
        apiCallsInSession=Math.max(0,apiCallsInSession-1);
      }
      const code=(err&&err.code)||'';
      if(code==='NO_MATCH'){
        toast('Không nghe rõ tiếng Trung trong bản ghi, hãy đọc gần micro và rõ hơn');
      }else if(code==='CHIVOX_TIMEOUT'){
        toast('Chivox quá thời gian chờ. Mi có thể thử lại với một câu ngắn.');
      }else if(code==='RATE_LIMIT'||code==='OVERLOADED'){
        toast('Máy chủ AI đang quá tải hoặc chạm giới hạn, hãy thử lại sau ít giây');
      }else if(code==='AUTH_ERROR'){
        toast('API Key chưa đúng hoặc bị từ chối (401/403), hãy kiểm tra lại trong Cài đặt AI');
      }else if(code==='NETWORK_ERROR'||(err&&(err.message==='SDK_LOAD_ERROR'||err.message==='SDK_TIMEOUT'))){
        toast('Không kết nối được dịch vụ AI, hãy kiểm tra Wi-Fi/mạng');
      }else if(err&&(err.message==='EMPTY_AUDIO_BLOB'||err.message==='NO_AUDIO_CONTEXT')){
        toast('Không giải mã được bản ghi âm trên trình duyệt này');
      }else{
        toast('Lỗi chấm phát âm: '+(err&&err.message?err.message:'không thể xử lý bản ghi'));
      }
    }finally{
      assessInFlight=false;btn.disabled=false;btn.innerHTML='<svg class="ic"><use href="#i-award"/></svg>Kiểm tra phát âm';
    }
  };

  document.addEventListener('click',e=>{
    if(e.target.closest('#btn-azure-speech-cfg,[data-open-azure-cfg]')){
      if(typeof AzureSpeech!=='undefined'&&AzureSpeech.openSettingsModal){
        AzureSpeech.openSettingsModal();
      }else{
        toast('Module Azure Speech chưa sẵn sàng');
      }
    }
  });
  function openSpeakSummary(){
    const list=getList();
    const total=list.length||1;
    let practiced=0,err=0,scoreSum=0,scoreCnt=0;
    const wrongItems=[];
    list.forEach(x=>{
      const r=getItemRec(x.id);
      const has=Boolean(r&&(r.attempts>0||r.selfStatus||r.lastResult));
      if(has)practiced++;
      const sc=r&&r.lastResult&&r.lastResult.overallScore!==undefined&&r.lastResult.overallScore!==null?Number(r.lastResult.overallScore):null;
      if(sc!==null&&Number.isFinite(sc)){scoreSum+=sc;scoreCnt++;}
      if(r&&(r.selfStatus==='retry'||r.needsPractice||(sc!==null&&sc<75))){
        err++;
        wrongItems.push({zh:x.zh,py:x.py||'',vi:x.vi||'',note:sc!==null?`Điểm ${sc}/100`:'Cần luyện lại'});
      }
    });
    const doneCnt=practiced||total;
    const acc=scoreCnt?Math.round(scoreSum/scoreCnt):Math.max(0,Math.min(100,Math.round((doneCnt-err)*100/Math.max(1,doneCnt))));
    if(typeof showSectionSummary==='function'){
      showSectionSummary('speak',{
        doneCount:doneCnt,
        totalCount:total,
        unit:'câu',
        errors:err,
        accuracy:acc,
        scoreLabel:scoreCnt?`Đánh giá AI: ${acc}/100`:'',
        wrongItems
      },{onRetryAll:()=>{idx=0;renderItem();}});
    }
  }

  function syncHeader(){
    const l=(typeof LESSONS!=='undefined'&&Array.isArray(LESSONS))?LESSONS.find(x=>x.id===store.activeLessonId):null;
    const spSub=$('#sp-sub');
    if(spSub)spSub.textContent=`${l?(l.code||'Bài học')+(l.titleVi?' · '+l.titleVi:''):'Bài học'} · Ghi âm thật & sửa lỗi phát âm`;
  }

  return {
    init(){
      $$('#sp-modes button').forEach(x=>x.classList.toggle('on',x.dataset.sm===mode));
      $('#sp-maxsec').value=String(store.speaking.maxSec||15);
      updateWeakBadge();
      syncHeader();
      setViewTab('practice');
      renderItem();
    },
    refresh(){
      idx=0;
      $$('#sp-modes button').forEach(x=>x.classList.toggle('on',x.dataset.sm===mode));
      updateWeakBadge();
      syncHeader();
      if(viewTab==='history')renderHistory();
      else renderItem();
    },
    openWeakPractice,
    updateWeakBadge,
    syncHeader,
    render(){updateWeakBadge();syncHeader();if(viewTab==='history')renderHistory();else renderItem();},
    stop:stopAll
  };
})();
try{
  window._stopSpeak=speakCtrl.stop;
  window.openWeakPronunciation=(tone,ch)=>{goView('speak');speakCtrl.openWeakPractice(tone,ch);};
  speakCtrl.init();
}catch(e){console.error(e);}

/* ---------- Luyện nghe: sóng âm trang trí ---------- */
(function(){const w=$('#wave');const h=[8,14,22,12,18,26,16,10,20,24,14,8,18,22,12,16,24,10,14,20,12,8,16,22,10,14];w.innerHTML=h.map(x=>`<i style="height:${x}px"></i>`).join('')})();

/* ---------- Công đoạn 5 + Đợt 3: Luyện viết chữ Hán (Apple Pencil / S Pen + 2 ô đối chiếu) ---------- */
const cv=$('#cv'),cx=cv.getContext('2d'),pad=$('#pad'),hwBox=$('#hw-target');
let ci=0,wMode=(store.writing&&store.writing.mode)||'trace',wOutline=true,drawing=false,strokesHist=[],curStroke=[],wPenActive=false,hwLibPromise=null,hwWriter=null,hwCharData=null,hwPlaying=false,hwPaused=false,hwStrokeIdx=0,runMistakes=0,runHints=0,runDone=false,loadSeq=0;

function enrichCharMeta(c){
  if(!c)return c;
  let py=c.py||'',vi=c.vi||'',rad=c.rad||'';
  if((!py||!vi)&&typeof HANZI_HACKNAO_DB!=='undefined'&&HANZI_HACKNAO_DB[c.ch]){
    const h=HANZI_HACKNAO_DB[c.ch];
    if(!py&&h.py)py=h.py;
    if(!vi&&h.meaning)vi=String(h.meaning).split(',')[0].trim();
  }
  if((!py||!vi||!rad)&&typeof HANZI_MINDMAP_DB!=='undefined'&&HANZI_MINDMAP_DB[c.ch]){
    const m=HANZI_MINDMAP_DB[c.ch];
    if(!py&&m.py)py=m.py;
    if(!vi&&m.meaning)vi=String(m.meaning).split(',')[0].trim();
    if(!rad&&m.parts&&m.parts[0]){
      const p=m.parts[0];
      rad=`${p.rad}${p.meaning?' ('+p.meaning+')':p.hv?' ('+p.hv.toLowerCase()+')':''}`;
    }
  }
  if(!py||!vi){
    const wMatch=(WORDS||[]).find(w=>w.zh===c.ch)||((store&&store.vocabBank)?Object.values(store.vocabBank).find(w=>w.zh===c.ch):null);
    if(wMatch){if(!py)py=wMatch.py||'';if(!vi)vi=wMatch.vi||'';}
  }
  return Object.assign({},c,{py,vi,rad});
}
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

let wLastPenAt=0;
function getStylusCfg(){
  return (typeof window.HanyuStylus!=='undefined')?window.HanyuStylus.getState():null;
}
function updateStylusPill(){
  const pill=$('#w-stylus-pill');if(!pill)return;
  const st=getStylusCfg();
  if(st){
    const active=(st.inputMode==='pen');
    pill.classList.toggle('pen-on',active||wPenActive);
    if(st.inputMode==='keyboard'){
      pill.textContent='Đang ở chế độ Gõ phím · Bấm “Viết bút” ở bảng bên để viết S-Pen';
    }else if(st.allowTouchDraw){
      pill.textContent=wPenActive?'Đang viết S-Pen · Chống chạm lòng bàn tay':'Cho phép Bút + Ngón tay · Chống chạm lòng bàn tay';
    }else{
      pill.textContent='Chỉ nhận bút S-Pen / Apple Pencil · Chạm tay không hiển thị nét';
    }
    return;
  }
  pill.classList.toggle('pen-on',wPenActive);
  pill.textContent=wPenActive?'Đang viết bằng bút cảm ứng · Đã bật chống chạm lòng bàn tay':'Hỗ trợ chuột, cảm ứng & Apple Pencil / S Pen';
}
function computeWriteWidth(baseW,penType,p){
  if(penType==='ballpoint')return Math.max(1.5,baseW*(0.9+p*0.2));
  if(penType==='brush')return Math.max(1.2,baseW*(0.28+Math.pow(p,1.35)*1.85));
  if(penType==='highlighter')return Math.max(3,baseW*1.9);
  return Math.max(1.8,baseW*(0.45+p*1.1));
}
function drawTaperedWriteCurve(ctx,x0,y0,cx0,cy0,x1,y1,w0,w1){
  const len=Math.hypot(cx0-x0,cy0-y0)+Math.hypot(x1-cx0,y1-cy0);
  if(len<0.05){
    ctx.lineWidth=(w0+w1)*0.5;
    ctx.beginPath();ctx.arc(x0,y0,ctx.lineWidth*0.5,0,Math.PI*2);ctx.fill();
    return;
  }
  const steps=Math.max(1,Math.min(24,Math.ceil(len/2.5)));
  if(steps===1||Math.abs(w1-w0)<0.12){
    ctx.lineWidth=(w0+w1)*0.5;
    ctx.beginPath();ctx.moveTo(x0,y0);ctx.quadraticCurveTo(cx0,cy0,x1,y1);ctx.stroke();
    return;
  }
  let px=x0,py=y0;
  for(let k=1;k<=steps;k++){
    const t=k/steps,mt=1-t;
    const qx=mt*mt*x0+2*mt*t*cx0+t*t*x1;
    const qy=mt*mt*y0+2*mt*t*cy0+t*t*y1;
    const tm=(k-0.5)/steps;
    ctx.lineWidth=Math.max(0.7,w0+(w1-w0)*tm);
    ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(qx,qy);ctx.stroke();
    px=qx;py=qy;
  }
}
function sampleWritePoint(e,rect,prevPt,strokeSize,penType,stateObj){
  const x=e.clientX-rect.left,y=e.clientY-rect.top;
  const nowT=e.timeStamp||performance.now();
  let pr=0.5,real=false;
  if(typeof window.HanyuStylus!=='undefined'&&window.HanyuStylus.extractSamplePressure){
    const res=window.HanyuStylus.extractSamplePressure(e,stateObj.hasRealP);
    pr=res.p;real=res.real;
  }else if(e.pointerType==='pen'&&Number.isFinite(e.pressure)&&e.pressure>0&&e.pressure!==0.5&&e.pressure!==1){
    pr=Math.min(1,Math.max(0.05,e.pressure));real=true;
  }
  if(real)stateObj.hasRealP=true;
  let vel=0.12,ang=0;
  if(prevPt){
    const dx=x-prevPt.x,dy=y-prevPt.y;
    const dist=Math.hypot(dx,dy);
    const dt=Math.max(1,nowT-(prevPt.t||nowT-8));
    vel=dist/dt;
    ang=Math.atan2(dy,dx);
  }
  const targetW=(typeof window.HanyuStylus!=='undefined'&&window.HanyuStylus.computeStrokeWidth)
    ?window.HanyuStylus.computeStrokeWidth(penType,strokeSize,pr,stateObj.hasRealP,vel,ang)
    :computeWriteWidth(strokeSize,penType,pr);
  stateObj.smoothW=stateObj.smoothW?(stateObj.smoothW*0.65+targetW*0.35):targetW;
  return {x,y,p:Number(pr.toFixed(3)),w:Number(stateObj.smoothW.toFixed(2)),t:nowT};
}
function drawPressurePath(ctx,stObj,baseW,color,scaleX=1,scaleY=1){
  const isObj=stObj&&!Array.isArray(stObj)&&Array.isArray(stObj.pts);
  const pts=isObj?stObj.pts:stObj;
  if(!pts||!pts.length)return;
  const tool=isObj?(stObj.tool||'pen'):'pen';
  const penType=isObj?(stObj.penType||'fountain'):'fountain';
  const strokeSize=isObj&&Number(stObj.size)?Number(stObj.size)*scaleX:baseW;
  const strokeCol=isObj&&stObj.color?stObj.color:color;
  const softness=isObj&&Number.isFinite(Number(stObj.softness))?Number(stObj.softness):0;
  const rawOp=isObj&&Number(stObj.opacity)>0?Number(stObj.opacity):1;
  const ptW=pt=>(pt&&Number.isFinite(pt.w)&&pt.w>0)?Math.max(0.7,pt.w*scaleX):computeWriteWidth(strokeSize,penType,pt.p||0.5);

  ctx.save();
  ctx.lineCap='round';ctx.lineJoin='round';
  if(tool==='eraser'){
    ctx.globalCompositeOperation='destination-out';
    ctx.globalAlpha=1;ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(0,0,0,1)';ctx.fillStyle='rgba(0,0,0,1)';
    const ew=Math.max(4,strokeSize);
    if(pts.length===1){
      ctx.beginPath();ctx.arc(pts[0].x*scaleX,pts[0].y*scaleY,ew/2,0,Math.PI*2);ctx.fill();
    }else{
      ctx.lineWidth=ew;
      ctx.beginPath();ctx.moveTo(pts[0].x*scaleX,pts[0].y*scaleY);
      for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k].x*scaleX,pts[k].y*scaleY);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  ctx.globalCompositeOperation='source-over';
  ctx.strokeStyle=strokeCol;ctx.fillStyle=strokeCol;
  if(softness>0){
    ctx.shadowBlur=Math.max(0.5,softness*(strokeSize*0.85+3));
    ctx.shadowColor=strokeCol;
  }
  if(penType==='highlighter'){
    ctx.globalAlpha=Math.min(0.42,rawOp*0.42);
    const hw=computeWriteWidth(strokeSize,'highlighter',0.5);
    if(pts.length===1){
      ctx.beginPath();ctx.arc(pts[0].x*scaleX,pts[0].y*scaleY,hw/2,0,Math.PI*2);ctx.fill();
    }else{
      ctx.lineWidth=hw;
      ctx.beginPath();ctx.moveTo(pts[0].x*scaleX,pts[0].y*scaleY);
      for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k].x*scaleX,pts[k].y*scaleY);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  ctx.globalAlpha=rawOp;
  if(pts.length===1){
    const w=ptW(pts[0]);
    ctx.beginPath();ctx.arc(pts[0].x*scaleX,pts[0].y*scaleY,w/2,0,Math.PI*2);ctx.fill();
    ctx.restore();
    return;
  }
  if(pts.length===2){
    const x0=pts[0].x*scaleX,y0=pts[0].y*scaleY,x1=pts[1].x*scaleX,y1=pts[1].y*scaleY;
    drawTaperedWriteCurve(ctx,x0,y0,(x0+x1)*0.5,(y0+y1)*0.5,x1,y1,ptW(pts[0]),ptW(pts[1]));
    ctx.restore();
    return;
  }
  let prevX=pts[0].x*scaleX,prevY=pts[0].y*scaleY,prevW=ptW(pts[0]);
  for(let k=1;k<pts.length-1;k++){
    const a=pts[k],b=pts[k+1];
    const ax=a.x*scaleX,ay=a.y*scaleY;
    const xc=(ax+b.x*scaleX)*0.5,yc=(ay+b.y*scaleY)*0.5;
    const w1=(ptW(a)+ptW(b))*0.5;
    drawTaperedWriteCurve(ctx,prevX,prevY,ax,ay,xc,yc,prevW,w1);
    prevX=xc;prevY=yc;prevW=w1;
  }
  const last=pts[pts.length-1];
  const lx=last.x*scaleX,ly=last.y*scaleY;
  drawTaperedWriteCurve(ctx,prevX,prevY,(prevX+lx)*0.5,(prevY+ly)*0.5,lx,ly,prevW,ptW(last));
  ctx.restore();
}

function makeWriteStroke(e,ptVal,multiplier,fallbackW){
  const st=getStylusCfg();
  const hwErase=typeof window.HanyuStylus!=='undefined'&&window.HanyuStylus.isHardwareEraser(e);
  const tool=hwErase?'eraser':(st?st.tool:'pen');
  const defaultCol=getComputedStyle(document.body).color||'#2B1B15';
  if(!st){
    return {tool:'pen',penType:'fountain',size:fallbackW,softness:0,opacity:1,color:defaultCol,pts:[ptVal]};
  }
  const sz=tool==='eraser'
    ?Math.max(8,st.eraserSize*(multiplier*0.5))
    :Math.max(2,st.penSize*multiplier);
  return {
    tool,
    penType:st.penType||'fountain',
    size:sz,
    softness:st.softness||0,
    opacity:st.opacity==null?1:st.opacity,
    color:st.color||defaultCol,
    pts:[ptVal]
  };
}

function fitPad(){
  const r=cv.getBoundingClientRect(),d=window.devicePixelRatio||1;if(!r.width)return;
  cv.width=Math.round(r.width*d);cv.height=Math.round(r.height*d);
  cx.setTransform(d,0,0,d,0,0);cx.lineCap='round';cx.lineJoin='round';cx.lineWidth=9;
  redrawFreeCanvas();
}
function redrawFreeCanvas(){
  cx.save();cx.setTransform(1,0,0,1,0,0);cx.clearRect(0,0,cv.width,cv.height);cx.restore();
  const col=getComputedStyle(document.body).color;
  for(const st of strokesHist)drawPressurePath(cx,st,9.5,col);
}
let wActivePtrId=null;
const wStrokeDyn={hasRealP:false,smoothW:0};
const drawLiveWriteSeg=(targetCtx,stObj,ptsArr)=>{
  const n=ptsArr.length;
  if(n<2)return;
  if(n===2){
    drawPressurePath(targetCtx,Object.assign({},stObj,{pts:[ptsArr[0],ptsArr[1]]}),9.5,getComputedStyle(document.body).color);
    return;
  }
  const p2=ptsArr[n-3],p1=ptsArr[n-2],p0=ptsArr[n-1];
  const col=stObj.color||getComputedStyle(document.body).color;
  const ptW=pt=>(pt&&Number.isFinite(pt.w)&&pt.w>0)?Math.max(0.7,pt.w):computeWriteWidth(stObj.size||9.5,stObj.penType||'fountain',pt.p||0.5);
  targetCtx.save();
  targetCtx.lineCap='round';targetCtx.lineJoin='round';
  targetCtx.globalCompositeOperation='source-over';
  targetCtx.strokeStyle=col;targetCtx.fillStyle=col;
  targetCtx.globalAlpha=Number(stObj.opacity)>0?Number(stObj.opacity):1;
  if(stObj.softness>0){targetCtx.shadowBlur=Math.max(0.5,stObj.softness*((stObj.size||9.5)*0.85+3));targetCtx.shadowColor=col;}
  const xm=(p2.x+p1.x)*0.5,ym=(p2.y+p1.y)*0.5,wm=(ptW(p2)+ptW(p1))*0.5;
  const xc=(p1.x+p0.x)*0.5,yc=(p1.y+p0.y)*0.5,wc=(ptW(p1)+ptW(p0))*0.5;
  drawTaperedWriteCurve(targetCtx,xm,ym,p1.x,p1.y,xc,yc,wm,wc);
  drawTaperedWriteCurve(targetCtx,xc,yc,(xc+p0.x)*0.5,(yc+p0.y)*0.5,p0.x,p0.y,wc,ptW(p0));
  targetCtx.restore();
};
cv.addEventListener('pointerdown',e=>{
  const freeCanvasActive=wMode==='free'||!pad.classList.contains('hw-on');
  if(!freeCanvasActive)return;
  if(wActivePtrId!==null&&e.pointerId!==wActivePtrId)return;
  const isPen=(typeof window.HanyuStylus!=='undefined'&&window.HanyuStylus.isStylusLikeEvent)?window.HanyuStylus.isStylusLikeEvent(e):(e.pointerType==='pen');
  if(isPen){wLastPenAt=Date.now();if(!wPenActive){wPenActive=true;updateStylusPill();}}
  if(typeof window.HanyuStylus!=='undefined'){
    if(!window.HanyuStylus.shouldAcceptPointer(e,wLastPenAt))return;
  }else if(e.pointerType==='touch'&&wPenActive)return;
  if(e.pointerType==='mouse'&&wPenActive){wPenActive=false;updateStylusPill();}
  e.preventDefault();drawing=true;wActivePtrId=e.pointerId;
  wStrokeDyn.hasRealP=false;wStrokeDyn.smoothW=0;
  const r=cv.getBoundingClientRect();
  const stCfg=getStylusCfg();
  const hwErase=typeof window.HanyuStylus!=='undefined'&&window.HanyuStylus.isHardwareEraser(e);
  const useTool=hwErase?'eraser':(stCfg?stCfg.tool:'pen');
  const strokeSz=useTool==='eraser'?Math.max(8,(stCfg?stCfg.eraserSize:18)*1.2):Math.max(2,(stCfg?stCfg.penSize:3.2)*2.4);
  const penType=stCfg?(stCfg.penType||'fountain'):'fountain';
  const p=sampleWritePoint(e,r,null,strokeSz,penType,wStrokeDyn);
  curStroke=makeWriteStroke(e,p,2.4,9.5);
  strokesHist.push(curStroke);
  try{cv.setPointerCapture(e.pointerId);}catch(_){}
  if(curStroke.tool==='eraser'||curStroke.penType==='highlighter')redrawFreeCanvas();
  else drawPressurePath(cx,curStroke,9.5,getComputedStyle(document.body).color);
});
cv.addEventListener('pointermove',e=>{
  const freeCanvasActive=wMode==='free'||!pad.classList.contains('hw-on');
  if(!drawing||!freeCanvasActive||e.pointerId!==wActivePtrId)return;
  const isPen=(typeof window.HanyuStylus!=='undefined'&&window.HanyuStylus.isStylusLikeEvent)?window.HanyuStylus.isStylusLikeEvent(e):(e.pointerType==='pen');
  if(isPen)wLastPenAt=Date.now();
  else if(e.pointerType==='touch'){
    if(typeof window.HanyuStylus!=='undefined'){if(!window.HanyuStylus.shouldAcceptPointer(e,wLastPenAt))return;}
    else if(wPenActive)return;
  }
  e.preventDefault();
  const r=cv.getBoundingClientRect();
  const evList=(typeof e.getCoalescedEvents==='function'&&e.getCoalescedEvents().length)?e.getCoalescedEvents():[e];
  const ptsArr=Array.isArray(curStroke)?curStroke:curStroke.pts;
  const penType=Array.isArray(curStroke)?'fountain':(curStroke.penType||'fountain');
  const strokeSz=Array.isArray(curStroke)?9.5:(curStroke.size||9.5);
  for(let ei=0;ei<evList.length;ei++){
    const ev=evList[ei];
    const prev=ptsArr[ptsArr.length-1];
    if(prev&&Math.hypot((ev.clientX-r.left)-prev.x,(ev.clientY-r.top)-prev.y)<1.1)continue;
    const p=sampleWritePoint(ev,r,prev,strokeSz,penType,wStrokeDyn);
    ptsArr.push(p);
    if(!Array.isArray(curStroke)&&(curStroke.penType==='highlighter'||curStroke.tool==='eraser')){
      redrawFreeCanvas();
    }else{
      drawLiveWriteSeg(cx,Array.isArray(curStroke)?{pts:ptsArr,size:9.5,penType:'fountain',opacity:1}:curStroke,ptsArr);
    }
  }
});
['pointerup','pointercancel'].forEach(ev=>cv.addEventListener(ev,e=>{
  if(e.pointerId!==wActivePtrId)return;
  try{cv.releasePointerCapture(e.pointerId);}catch(_){}
  drawing=false;wActivePtrId=null;wStrokeDyn.smoothW=0;wStrokeDyn.hasRealP=false;
}));
['touchstart','touchmove'].forEach(evName=>cv.addEventListener(evName,e=>{
  if(e.touches&&e.touches.length>=2)return;
  const st=getStylusCfg();
  if(wActivePtrId!==null||(st&&st.inputMode==='pen'))e.preventDefault();
},{passive:false}));

if(typeof window.HanyuStylus!=='undefined'){
  window.HanyuStylus.attachHanziWriterGuard(hwBox,()=>wLastPenAt);
  window.HanyuStylus.registerViewActions('writing',{
    onUndo(){
      if(wMode==='free'||!pad.classList.contains('hw-on')){
        if(!strokesHist.length)return;
        strokesHist.pop();redrawFreeCanvas();
      }else if(wMode==='order'&&hwCharData){
        stopOrderAnim();hwStrokeIdx=Math.max(0,hwStrokeIdx-1);renderOrderSvg(hwStrokeIdx);
      }else{
        setupPadForChar();
      }
    },
    onClear(){
      if(wMode==='free'||!pad.classList.contains('hw-on')){
        strokesHist=[];redrawFreeCanvas();
        if($('#w-compare-card'))$('#w-compare-card').classList.add('hide');
      }else{
        setupPadForChar();
      }
    },
    onInputModeChange(){ updateStylusPill(); },
    onZoomResize(){
      if(typeof curView==='undefined'||curView==='writing'){
        requestAnimationFrame(()=>fitPad());
      }
    }
  });
  window.HanyuStylus.subscribe(()=>{ updateStylusPill(); });
  updateStylusPill();
}

function initExtraMiniPads(ch){
  const grid=$('#w-extra-grid');if(!grid)return;
  grid.innerHTML=[0,1,2].map(idx=>`
    <div class="w-extra-cell" data-excell="${idx}">
      <div class="w-extra-ghost">${ch}</div>
      <canvas aria-label="Ô luyện thêm ${idx+1}"></canvas>
      <button type="button" class="w-extra-clr" aria-label="Xóa ô ${idx+1}">×</button>
    </div>`).join('');
  $$('.w-extra-cell',grid).forEach(cell=>{
    const mcv=$('canvas',cell),mcx=mcv.getContext('2d'),clr=$('.w-extra-clr',cell);
    let mDrawing=false,mStrokes=[],mCur=null,mActivePtrId=null;
    const mDyn={hasRealP:false,smoothW:0};
    const col=getComputedStyle(document.body).color;
    const resizeMini=()=>{
      const r=mcv.getBoundingClientRect(),d=window.devicePixelRatio||1;
      if(!r.width)return;
      mcv.width=Math.round(r.width*d);mcv.height=Math.round(r.height*d);
      mcx.setTransform(d,0,0,d,0,0);
      mStrokes.forEach(s=>drawPressurePath(mcx,s,5,col));
    };
    requestAnimationFrame(resizeMini);
    mcv.addEventListener('pointerdown',e=>{
      if(mActivePtrId!==null&&e.pointerId!==mActivePtrId)return;
      const isPen=(typeof window.HanyuStylus!=='undefined'&&window.HanyuStylus.isStylusLikeEvent)?window.HanyuStylus.isStylusLikeEvent(e):(e.pointerType==='pen');
      if(isPen){wLastPenAt=Date.now();if(!wPenActive){wPenActive=true;updateStylusPill();}}
      if(typeof window.HanyuStylus!=='undefined'){
        if(!window.HanyuStylus.shouldAcceptPointer(e,wLastPenAt))return;
      }else if(e.pointerType==='touch'&&wPenActive)return;
      e.preventDefault();
      if(!mcv.width)resizeMini();
      mDrawing=true;mActivePtrId=e.pointerId;mDyn.hasRealP=false;mDyn.smoothW=0;
      const r=mcv.getBoundingClientRect(),stCfg=getStylusCfg();
      const hwErase=typeof window.HanyuStylus!=='undefined'&&window.HanyuStylus.isHardwareEraser(e);
      const useTool=hwErase?'eraser':(stCfg?stCfg.tool:'pen');
      const strokeSz=useTool==='eraser'?Math.max(8,(stCfg?stCfg.eraserSize:18)*0.575):Math.max(2,(stCfg?stCfg.penSize:3.2)*1.15);
      const penType=stCfg?(stCfg.penType||'fountain'):'fountain';
      const p=sampleWritePoint(e,r,null,strokeSz,penType,mDyn);
      mCur=makeWriteStroke(e,p,1.15,5);mStrokes.push(mCur);
      try{mcv.setPointerCapture(e.pointerId);}catch(_){}
      if(mCur.tool==='eraser'||mCur.penType==='highlighter'){
        mcx.save();mcx.setTransform(1,0,0,1,0,0);mcx.clearRect(0,0,mcv.width,mcv.height);mcx.restore();
        mStrokes.forEach(s=>drawPressurePath(mcx,s,5,getComputedStyle(document.body).color));
      }else{
        drawPressurePath(mcx,mCur,5,getComputedStyle(document.body).color);
      }
    });
    mcv.addEventListener('pointermove',e=>{
      if(!mDrawing||!mCur||e.pointerId!==mActivePtrId)return;
      const isPen=(typeof window.HanyuStylus!=='undefined'&&window.HanyuStylus.isStylusLikeEvent)?window.HanyuStylus.isStylusLikeEvent(e):(e.pointerType==='pen');
      if(isPen)wLastPenAt=Date.now();
      else if(e.pointerType==='touch'){
        if(typeof window.HanyuStylus!=='undefined'){if(!window.HanyuStylus.shouldAcceptPointer(e,wLastPenAt))return;}
        else if(wPenActive)return;
      }
      e.preventDefault();
      const r=mcv.getBoundingClientRect();
      const evList=(typeof e.getCoalescedEvents==='function'&&e.getCoalescedEvents().length)?e.getCoalescedEvents():[e];
      const ptsArr=Array.isArray(mCur)?mCur:mCur.pts;
      const penType=Array.isArray(mCur)?'fountain':(mCur.penType||'fountain');
      const strokeSz=Array.isArray(mCur)?5:(mCur.size||5);
      for(let ei=0;ei<evList.length;ei++){
        const ev=evList[ei];
        const prev=ptsArr[ptsArr.length-1];
        if(prev&&Math.hypot((ev.clientX-r.left)-prev.x,(ev.clientY-r.top)-prev.y)<1.0)continue;
        const p=sampleWritePoint(ev,r,prev,strokeSz,penType,mDyn);
        ptsArr.push(p);
        if(!Array.isArray(mCur)&&(mCur.penType==='highlighter'||mCur.tool==='eraser')){
          mcx.save();mcx.setTransform(1,0,0,1,0,0);mcx.clearRect(0,0,mcv.width,mcv.height);mcx.restore();
          mStrokes.forEach(s=>drawPressurePath(mcx,s,5,getComputedStyle(document.body).color));
        }else{
          drawLiveWriteSeg(mcx,Array.isArray(mCur)?{pts:ptsArr,size:5,penType:'fountain',opacity:1}:mCur,ptsArr);
        }
      }
    });
    ['pointerup','pointercancel'].forEach(ev=>mcv.addEventListener(ev,e=>{
      if(e.pointerId!==mActivePtrId)return;
      try{mcv.releasePointerCapture(e.pointerId);}catch(_){}
      mDrawing=false;mActivePtrId=null;mDyn.smoothW=0;mDyn.hasRealP=false;
    }));
    ['touchstart','touchmove'].forEach(evName=>mcv.addEventListener(evName,e=>{
      if(e.touches&&e.touches.length>=2)return;
      const st=getStylusCfg();
      if(mActivePtrId!==null||(st&&st.inputMode==='pen'))e.preventDefault();
    },{passive:false}));
    clr.onclick=()=>{mStrokes=[];mcx.save();mcx.setTransform(1,0,0,1,0,0);mcx.clearRect(0,0,mcv.width,mcv.height);mcx.restore();};
  });
}

function showWriteComparison(sourceMode){
  const card=$('#w-compare-card'),c=CHARS[ci];
  if(!card||!c)return;
  card.classList.remove('hide');
  const sub=$('#w-cmp-sub');
  if(sub)sub.textContent=sourceMode==='guided'?'Bản vừa tô nét vs Chữ mẫu chuẩn':'Bản bạn tự viết vs Chữ mẫu chuẩn';
  const stdBox=$('#wc-std-box');
  if(stdBox){
    stdBox.innerHTML=`<div class="w-std-ch">${c.ch}</div><button type="button" class="w-cmp-std-say" aria-label="Nghe ${c.ch}"><svg class="ic"><use href="#i-vol"/></svg></button>`;
    const sb=$('.w-cmp-std-say',stdBox);if(sb)sb.onclick=()=>speak(c.ch,.65);
  }
  const uWrap=$('#wc-user-wrap');
  if(uWrap){
    const hwSvg=sourceMode==='guided'?$('#hw-target svg'):null;
    if(hwSvg){
      const clone=hwSvg.cloneNode(true);
      clone.removeAttribute('width');clone.removeAttribute('height');
      uWrap.innerHTML='';uWrap.appendChild(clone);
    }else{
      uWrap.innerHTML='<canvas id="wc-user-cv"></canvas>';
      const ucv=$('#wc-user-cv'),ucx=ucv.getContext('2d');
      requestAnimationFrame(()=>{
        const srcRect=cv.getBoundingClientRect(),dstRect=ucv.getBoundingClientRect(),d=window.devicePixelRatio||1;
        if(!dstRect.width||!srcRect.width)return;
        ucv.width=Math.round(dstRect.width*d);ucv.height=Math.round(dstRect.height*d);
        ucx.setTransform(d,0,0,d,0,0);
        const sx=dstRect.width/srcRect.width,sy=dstRect.height/srcRect.height;
        const col=getComputedStyle(document.body).color;
        strokesHist.forEach(st=>drawPressurePath(ucx,st,9.5*sx,col,sx,sy));
      });
    }
  }
  initExtraMiniPads(c.ch);
}

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
  $('#w-strokes-tag').classList.remove('hide');
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
  if($('#w-compare-card'))$('#w-compare-card').classList.add('hide');

  const l=(typeof LESSONS!=='undefined'&&Array.isArray(LESSONS))?LESSONS.find(x=>x.id===store.activeLessonId):null;
  const wSub=$('#w-sub');if(wSub)wSub.textContent=`${l?(l.code||'Bài học'):'Bài học'} • Thứ tự nét & đối chiếu mẫu`;

  if(!CHARS||!CHARS.length){
    $('#wch').textContent='—';$('#wpy').textContent='Bài học chưa có chữ tập viết';
    $('#wghost').textContent='';$('#wcount').textContent='0 / 0';$('#wbar').style.width='0%';
    $('#w-strokes-tag').classList.add('hide');$('#w-rad-tag').classList.add('hide');
    return;
  }
  if(ci>=CHARS.length)ci=0;
  const c=enrichCharMeta(CHARS[ci]);
  CHARS[ci]=c;
  const rec=getWriteRec(c.id);
  $('#wch').textContent=c.ch;
  $('#wpy').textContent=(c.py||c.vi)?`${c.py||''}${c.py&&c.vi?' • ':''}${c.vi||''}`:'Chưa có phiên âm';
  $('#wghost').textContent=c.ch;
  $('#wcount').textContent=`${ci+1} / ${CHARS.length}`;
  $('#wbar').style.width=((ci+1)/CHARS.length*100)+'%';
  if($('#wprev'))$('#wprev').disabled=(ci<=0);
  if($('#wnext'))$('#wnext').title=(ci+1>=CHARS.length)?'Hoàn thành & xem tổng kết':'Chữ sau';
  if($('#wr-next'))$('#wr-next').innerHTML=(ci+1>=CHARS.length)?'Xem tổng kết →':'Chữ tiếp theo <svg class="ic"><use href="#i-chev"></use></svg>';
  $('#w-strokes-tag').textContent=`${c.strokes} nét`;
  $('#w-strokes-tag').classList.toggle('hide',!c.strokes);
  $('#w-rad-tag').textContent=`Bộ: ${c.rad}`;
  $('#w-rad-tag').classList.toggle('hide',!c.rad);
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
    setWriteFb('','Tự viết chữ từ trí nhớ trên khung. Xong bấm “Đối chiếu mẫu” để so 2 ô và luyện thêm.');
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
    $('#w-strokes-tag').classList.remove('hide');

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
        if(typeof playSfx==='function')playSfx('no');
        setWriteFb('no','Nét này chưa đúng hướng hoặc thứ tự, hãy thử lại.');
      },
      onCorrectStroke(info){
        const left=info.strokesRemaining;
        setWriteFb('ok',left>0?`Tốt! Còn ${left} nét nữa.`:'Đủ nét rồi!');
      },
      onComplete(summary){
        if(runDone)return;
        runDone=true;
        if(typeof playSfx==='function')playSfx('ok');
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
        setWriteFb('ok',`Bạn đã hoàn thành chữ “${c.ch}”! Hãy đối chiếu bên dưới hoặc luyện thêm.`);
        $('#wr-strokes').textContent=`${totalSt}/${totalSt}`;
        $('#wr-mistakes').textContent=summary.totalMistakes;
        $('#wr-hints').textContent=runHints;
        $('#w-result-box').classList.remove('hide');
        $('#w-prog-tag').textContent=`Đã viết ${prev.guidedCompleted+1} lần`;
        showWriteComparison('guided');
      }
    });
  }catch(err){
    if(seq!==loadSeq)return;
    // Fallback an toàn khi offline hoặc chữ chưa có dữ liệu nét: cho phép tự viết trên Canvas + đối chiếu 2 ô
    hwCharData=null;pad.classList.remove('hw-on');$('#w-strip').innerHTML='';
    cv.style.pointerEvents='auto';hwBox.style.pointerEvents='none';fitPad();
    setWriteFb('no','Chế độ ngoại tuyến: hãy tự viết trực tiếp trên khung hoặc chuyển sang tab “Tự viết” để đối chiếu mẫu 2 ô.');
  }
}

function syncWriteHeader(){
  const l=(typeof LESSONS!=='undefined'&&Array.isArray(LESSONS))?LESSONS.find(x=>x.id===store.activeLessonId):null;
  const wSub=$('#w-sub');
  if(wSub)wSub.textContent=`${l?(l.code||'Bài học')+(l.titleVi?' · '+l.titleVi:''):'Bài học'} • Thứ tự nét & đối chiếu mẫu`;
}
window.syncWriteHeader=syncWriteHeader;

function refreshWritingForLesson(){
  ci=0;
  syncWriteHeader();
  setupPadForChar();
}
window.refreshWritingForLesson=refreshWritingForLesson;

function openWritingSummary(){
  const total=CHARS.length||1;
  let practiced=0,totalErr=0;
  const wrongItems=[];
  CHARS.forEach(c=>{
    const rec=getWriteRec(c.id);
    const meta=enrichCharMeta(c);
    if(rec&&(rec.attempts>0||rec.guidedCompleted>0||rec.selfStatus)){
      practiced++;
      const err=Number(rec.mistakes)||0;
      totalErr+=err;
      if(rec.needsPractice||rec.selfStatus==='retry'||err>=3){
        wrongItems.push({zh:meta.ch,py:meta.py||'',vi:meta.vi||'',note:err>0?`Sai ${err} nét`:'Cần luyện thêm'});
      }
    }
  });
  const doneCnt=practiced||total;
  const acc=Math.max(0,Math.min(100,Math.round(100 - Math.min(80, Math.round(totalErr*100/Math.max(1,doneCnt*5))))));
  if(typeof showSectionSummary==='function'){
    showSectionSummary('writing',{
      doneCount:doneCnt,
      totalCount:total,
      unit:'chữ',
      errors:totalErr,
      accuracy:acc,
      wrongItems
    },{onRetryAll:()=>{ci=0;setupPadForChar();}});
  }
}
function showChar(){setupPadForChar();}
$('#wprev').onclick=()=>{if(!CHARS.length||ci<=0)return;ci--;showChar();};
const nextChar=()=>{if(!CHARS.length)return;if(ci+1<CHARS.length){ci++;showChar();}else{openWritingSummary();}};
$('#wnext').onclick=nextChar;
$('#wr-next').onclick=nextChar;
$('#wsay').onclick=()=>{if(CHARS[ci])speak(CHARS[ci].ch,.65);};

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

// Điều khiển chế độ Tự viết + Đối chiếu 2 ô
$('#wf-undo').onclick=()=>{if(!strokesHist.length)return;strokesHist.pop();redrawFreeCanvas();};
$('#wf-clear').onclick=()=>{strokesHist=[];redrawFreeCanvas();if($('#w-compare-card'))$('#w-compare-card').classList.add('hide');};
$('#wf-peek').onclick=()=>{
  const on=pad.classList.toggle('peek');
  $('#wf-peek span').textContent=on?'Ẩn mẫu':'Hiện mẫu';
};
if($('#wf-compare'))$('#wf-compare').onclick=()=>{
  if(!strokesHist.length){toast('Hãy viết chữ vào khung trước khi đối chiếu');return;}
  showWriteComparison('free');
  const cc=$('#w-compare-card');if(cc)cc.scrollIntoView({behavior:'smooth',block:'nearest'});
};
$('#wf-mark-retry').onclick=()=>{
  const c=CHARS[ci];if(!c)return;
  if(typeof playSfx==='function')playSfx('no');
  const prev=getWriteRec(c.id);
  saveWriteRec(c.id,{attempts:prev.attempts+1,selfStatus:'retry',needsPractice:true});
  toast(`Đã đánh dấu “${c.ch}” cần luyện lại`);
  setupPadForChar();
};
$('#wf-mark-ok').onclick=()=>{
  const c=CHARS[ci];if(!c)return;
  if(typeof playSfx==='function')playSfx('ok');
  const prev=getWriteRec(c.id);
  saveWriteRec(c.id,{attempts:prev.attempts+1,selfStatus:'ok',needsPractice:false});
  if(typeof markLessonSectionDone==='function')markLessonSectionDone(store.activeLessonId,'writing',true);
  recordLearningEvent({type:'writing',skill:'write',title:`Tự viết: ${c.ch}`,targetId:c.id,view:'writing',result:'Đã viết được'});
  toast(`Đã lưu thực hành chữ “${c.ch}”`);
  if(CHARS.length&&ci===CHARS.length-1){openWritingSummary();return;}
  nextChar();
};

let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if($('.view.on')?.dataset.view==='writing'){fitPad();}},150)});

/* ---------- Thư viện: tìm kiếm và lọc ---------- */
let flt='all';
function applyFilter(){
  const flts=$$('.filterable');
  if(!flts.length){$('#noresult')?.classList.add('hide');return;}
  const q=$('#q').value.trim().toLowerCase();let any=false;
  flts.forEach(el=>{const ok=(flt==='all'||el.dataset.tags.split(' ').includes(flt))&&(!q||el.textContent.toLowerCase().includes(q));el.classList.toggle('hide',!ok);if(ok)any=true});
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
  else if(rec.type==='listen'||rec.type==='dictation'||rec.type==='tone')d.listen=(d.listen||0)+1;
  else if(rec.type==='record'||rec.type==='assess')d.speak=(d.speak||0)+1;
  else if(rec.type==='writing'||rec.type==='write'||rec.type==='copy')d.write=(d.write||0)+1;
  if(rec.meta&&Number.isFinite(rec.meta.correct))d.correct=(d.correct||0)+rec.meta.correct;
  if(typeof markLessonSectionDone==='function'&&store.activeLessonId){
    const mapType={exercise:'exercise',grammar:'grammar',listen:'listen',dictation:'listen',record:'speak',assess:'speak',writing:'writing'};
    const secKey=mapType[rec.type];
    if(secKey){
      markLessonSectionDone(store.activeLessonId,secKey,true);
    }else if((rec.type==='vocab'||rec.type==='srs')&&typeof WORDS!=='undefined'&&WORDS.length&&WORDS.every(w=>store.words&&store.words[w.id]&&store.words[w.id].status!=='new')){
      markLessonSectionDone(store.activeLessonId,'vocab',true);
    }
  }
  saveStore(store);
  refreshDashboards();
  if(curView==='lesson'&&typeof renderLessonDetail==='function')renderLessonDetail();
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

const XP_PER_LEVEL=250;
function formatDurationVi(min){
  const m=Math.max(0,Math.round(Number(min)||0));
  if(m<60)return `${m} phút`;
  const h=Math.floor(m/60),rem=m%60;
  return rem?`${h}g ${rem}p`:`${h} giờ`;
}

function computeXpStats(s){
  const xp=(s.totalLearnedWords*10)+(s.totalSrsReviews*5)+(s.totalCompletedLessons*50)
    +(s.lisSessCnt*15)+(s.quizSessCnt*15)+(s.spkOk*15)+(s.spkRecs*5)
    +(s.wriTotalPracticed*10)+(s.wriTotalGuided*5);
  const level=Math.floor(xp/XP_PER_LEVEL)+1;
  const inLevel=xp%XP_PER_LEVEL;
  const toNext=XP_PER_LEVEL-inLevel;
  const pct=Math.min(100,Math.round(inLevel*100/XP_PER_LEVEL));
  const ranks=['Nhập môn','Sơ cấp','Tiến bộ','Vững vàng','Thành thạo','Tinh thông','Cao thủ'];
  const rank=ranks[Math.min(ranks.length-1,Math.floor((level-1)/2))];
  return {xp,level,inLevel,toNext,pct,rank};
}

function computeStats(){
  const now=Date.now(),todayKey=localDateKey(now);
  const td=store.daily[todayKey]||{minutes:0,seconds:0,newWords:0,reviews:0,listen:0,speak:0,write:0,events:0};
  const allWordStates=Object.values(store.words||{});
  const totalLearnedWords=allWordStates.filter(s=>s&&s.status&&s.status!=='new').length;
  const totalWellKnownWords=allWordStates.filter(s=>s&&s.status==='review'&&s.intervalDays>=3&&s.ease>=2.3).length;
  const activeLessonLearnedWords=WORDS.filter(w=>getWordState(w.id).status!=='new').length;

  const pool=typeof getReviewWordPool==='function'?getReviewWordPool():WORDS;
  const dueWords=pool.filter(w=>isDue(w.id,now)).length;

  let srsTotalRatings=0,srsGoodRatings=0;
  const wordHistSrc=allWordStates.length?allWordStates:WORDS.map(w=>getWordState(w.id));
  wordHistSrc.forEach(s=>{
    const h=(s&&s.history)||[];
    h.forEach(x=>{srsTotalRatings++;if(x.rating>=1)srsGoodRatings++;});
  });
  const retentionPct=srsTotalRatings>0?Math.round(srsGoodRatings/srsTotalRatings*100):null;

  // Tổng số bài đã hoàn thành độc lập trên tất cả giáo trình
  const cpMap=store.courseProgress||{};
  let totalCompletedLessons=0;
  Object.values(cpMap).forEach(cp=>{
    const ids=(cp&&Array.isArray(cp.completedLessonIds))?cp.completedLessonIds:[];
    totalCompletedLessons+=ids.filter(id=>!/^lesson_hsk30_\d+_mock$/.test(id)).length;
  });

  // Tiến độ giáo trình đang chọn và bài học đang chọn
  const actL=(typeof LESSONS!=='undefined'&&Array.isArray(LESSONS))?LESSONS.find(x=>x.id===store.activeLessonId):null;
  const activeLessonProg=(typeof getLessonSectionProgress==='function'&&actL)
    ?getLessonSectionProgress(actL)
    :{totalDone:0,pct:0};
  const activeCourseStats=(typeof getCourseProgressStats==='function'&&store.activeCourseId)
    ?getCourseProgressStats(store.activeCourseId)
    :{doneCnt:0,total:0,pct:0};

  const wriStoreAll=Object.values((store.writing&&store.writing.chars)||{});
  const wriTotalPracticed=wriStoreAll.filter(x=>x&&x.attempts>0).length;
  const wriTotalGuided=wriStoreAll.reduce((s,x)=>s+((x&&x.guidedCompleted)||0),0);

  const totalSec=Object.values(store.daily).reduce((s,d)=>s+(d.seconds||0),0);
  const totalMin=Math.round(totalSec/60);

  const spkItemsObj=store.speaking.items||{};
  const spkItems=Object.values(spkItemsObj);
  const spkRecs=spkItems.reduce((s,x)=>s+(x.attempts||0),0);
  const spkAssessed=spkItems.filter(x=>x.lastResult&&x.lastResult.overallScore!==null);
  const spkOk=spkItems.filter(x=>x&&x.selfStatus==='ok').length;
  const spkRetryList=Object.entries(spkItemsObj).filter(([,v])=>v&&v.selfStatus==='retry');
  const spkSelfTotal=spkOk+spkRetryList.length;
  let spkPct=null,spkIsSelf=false;
  if(spkAssessed.length){
    spkPct=Math.round(spkAssessed.reduce((s,x)=>s+x.lastResult.overallScore,0)/spkAssessed.length);
  }else if(spkSelfTotal>0){
    spkPct=Math.round(spkOk*100/spkSelfTotal);
    spkIsSelf=true;
  }

  const lisSessions=store.listening.sessions||[];
  const lisTotalQ=lisSessions.reduce((s,x)=>s+(x.total||0),0);
  const lisOkQ=lisSessions.reduce((s,x)=>s+(x.correct||0),0);
  const lisPct=lisTotalQ>0?Math.round(lisOkQ/lisTotalQ*100):null;
  const toneMistakes=(store.listening&&store.listening.toneMistakes)||{};

  const exSess=store.exercises.sessions||[];
  const grSess=store.grammarQuiz.sessions||[];
  const readSess=[...exSess,...grSess];
  const readTotalQ=readSess.reduce((s,x)=>s+(x.total||0),0);
  const readOkQ=readSess.reduce((s,x)=>s+(x.correct||0),0);
  const readPct=readTotalQ>0?Math.round(readOkQ/readTotalQ*100):null;

  const wriPracticed=CHARS.filter(c=>getWriteRec(c.id).attempts>0).length;
  const wriGuided=CHARS.reduce((s,c)=>s+getWriteRec(c.id).guidedCompleted,0);
  const wriRetry=CHARS.filter(c=>getWriteRec(c.id).needsPractice);
  const wriPct=CHARS.length?Math.round(wriPracticed/CHARS.length*100):null;

  const totalSessions=store.exercises.attempts+store.grammarQuiz.attempts+store.listening.attempts+wriStoreAll.reduce((s,x)=>s+((x&&x.attempts)||0),0)+spkRecs;

  const xp=computeXpStats({
    totalLearnedWords,
    totalSrsReviews:srsTotalRatings,
    totalCompletedLessons,
    lisSessCnt:lisSessions.length,
    quizSessCnt:readSess.length,
    spkOk,
    spkRecs,
    wriTotalPracticed,
    wriTotalGuided
  });

  return {
    todayKey,td,streak:computeStreak(now),xp,
    learnedWords:totalLearnedWords,
    activeLessonLearnedWords,
    dueWords,
    wellKnownWords:totalWellKnownWords,
    retentionPct,
    totalCompletedLessons,
    activeCourseStats,
    lessonDone:activeCourseStats.total?activeCourseStats.doneCnt:activeLessonProg.totalDone,
    lessonTotal:activeCourseStats.total?activeCourseStats.total:9,
    lessonPct:activeCourseStats.total?activeCourseStats.pct:activeLessonProg.pct,
    activeLessonProg,
    totalMin,totalSessions,
    skills:{
      listen:{pct:lisPct,attempts:store.listening.attempts,ok:lisOkQ,total:lisTotalQ,toneMistakes,wrongCount:(store.listening.wrongIds||[]).length},
      speak:{pct:spkPct,isSelfCheck:spkIsSelf,recs:spkRecs,practiced:spkItems.length,assessed:spkAssessed.length,okCount:spkOk,retryCount:spkRetryList.length,retryList:spkRetryList},
      read:{pct:readPct,attempts:readSess.length,ok:readOkQ,total:readTotalQ,words:activeLessonLearnedWords},
      write:{pct:wriPracticed>0?wriPct:null,practiced:wriPracticed,totalPracticed:wriTotalPracticed,guided:wriGuided,retry:wriRetry}
    }
  };
}

let chartRange='7',chartMetric='minutes',hiSkill='all',hiDate='all',focusedSkillKey='';

function renderHomeStreakStrip(st){
  const box=$('#hm-streak-strip');
  if(!box)return;
  box.innerHTML='';
  box.classList.add('hide');
  return;
  const now=new Date();
  const dow=now.getDay(); // 0=CN, 1=T2..6=T7
  const diffToMon=dow===0?-6:1-dow;
  const mon=new Date(now.getFullYear(),now.getMonth(),now.getDate()+diffToMon);
  const labels=['T2','T3','T4','T5','T6','T7','CN'];
  const todayDk=st.todayKey;
  const dayFlags=[];
  let activeThisWeek=0;
  for(let i=0;i<7;i++){
    const d=new Date(mon.getFullYear(),mon.getMonth(),mon.getDate()+i);
    const dk=localDateKey(d.getTime());
    const rec=store.daily[dk];
    const hasAct=Boolean(rec&&(rec.events>0||rec.newWords>0||rec.reviews>0||rec.listen>0||rec.speak>0||rec.write>0));
    if(hasAct)activeThisWeek++;
    dayFlags.push({lbl:labels[i],dk,hasAct,isToday:dk===todayDk,isFuture:dk>todayDk,isLast:i===6});
  }
  // Vẽ từng đoạn nối ray chính xác từ tâm ngày i đến tâm ngày i+1 (6 khoảng trên left:7.14%..right:7.14%)
  let railSegs='';
  for(let i=0;i<6;i++){
    if(dayFlags[i].hasAct&&dayFlags[i+1].hasAct){
      railSegs+=`<i style="left:${(i*100/6).toFixed(2)}%;width:${(100/6).toFixed(2)}%"></i>`;
    }
  }
  const starSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 L14.7 9.3 L21.5 12 L14.7 14.7 L12 21.5 L9.3 14.7 L2.5 12 L9.3 9.3 Z"/></svg>';
  const flameMilestoneSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.2 2c.6 3.1 4.2 5.4 5.5 9.2 1 2.9.2 6.8-2.6 8.6-1.8 1.2-4.6 1.2-6.4 0-3-1.9-3.9-5.9-2.2-9.2.7-1.4 1.8-2.4 2.8-3.3-.2 1.6.4 2.9 1.4 3.5-.3-2.6.2-5.7 1.5-8.8z"/></svg>';
  const bigFlameSvg=`<svg class="hm-ss-bigflame ${st.streak>0?'lit':''}" viewBox="0 0 48 56" aria-hidden="true">
    <path class="fl-out" d="M24 3c2 9 13 14 16 24 2.4 8.2-1.8 18.8-10.2 22.8C22 53.6 11.4 50.6 7.5 42.6 3.5 34.4 6.7 23.2 13 17.5c.7 4.2 2.9 7.2 5.4 8.4-.7-7.2.9-15 5.6-22.9z"/>
    <path class="fl-in" d="M24 22c1.2 4.8 6.5 7.8 7.8 13.1 1 4.2-1.6 9.5-6 10.8-4.5 1.3-9.5-1.5-10.6-6-.9-3.7.7-8.1 3.6-10.9.5 2.1 1.6 3.6 3 4.3-.4-3.7.4-7.6 2.2-11.3z"/>
  </svg>`;
  const weekNum=Math.max(1,Math.floor(st.streak/7)+1);
  const perfectWeeks=Math.floor(st.streak/7);
  let footMsg='Học 1 bài hôm nay để thắp sáng <b>Streak</b> của bạn!';
  if(perfectWeeks>=1){
    footMsg=`Bạn đã giữ được <b>Streak hoàn hảo</b> trong ${perfectWeeks} tuần liên tiếp!`;
  }else if(activeThisWeek>=7){
    footMsg='Bạn đã hoàn thành <b>Streak hoàn hảo</b> tuần này!';
  }else if(st.streak>0){
    const remain=Math.max(1,7-activeThisWeek);
    footMsg=`Bạn đang giữ chuỗi <b>${st.streak} ngày</b> — còn <b>${remain} ngày</b> đạt <b>Streak hoàn hảo</b> tuần ${weekNum}!`;
  }
  const labelsHtml=dayFlags.map(df=>`<span class="hm-ss-wday ${df.hasAct?'lit':''} ${df.isToday?'today':''}">${df.lbl}</span>`).join('');
  const nodesHtml=dayFlags.map(df=>{
    if(df.isLast){
      const cnLit=df.hasAct||(activeThisWeek>=7);
      return `<div class="hm-ss-node ${df.hasAct?'done':''} ${df.isToday?'today':''}" title="${df.dk}">
        <span class="hm-ss-mile ${cnLit?'lit':''}">${flameMilestoneSvg}</span>
        <span class="hm-ss-wktag">TUẦN ${weekNum}</span>
      </div>`;
    }
    return `<div class="hm-ss-node ${df.hasAct?'done':''} ${df.isToday?'today':''} ${df.isFuture?'future':''}" title="${df.dk}">
      <span class="hm-ss-orb">${df.hasAct?starSvg:''}</span>
    </div>`;
  }).join('');
  box.innerHTML=`
    <div class="hm-ss-hero">
      <div class="hm-ss-hero-l">
        ${bigFlameSvg}
        <div>
          <div class="hm-ss-count">${st.streak} ngày streak!</div>
          <div class="hm-ss-sub">Tuần ${weekNum} · Đã học ${activeThisWeek}/7 ngày</div>
        </div>
      </div>
      <span class="hm-ss-xp">Cấp ${st.xp.level} · ${st.xp.xp} XP ›</span>
    </div>
    <div class="hm-ss-card-in">
      <div class="hm-ss-wdays">${labelsHtml}</div>
      <div class="hm-ss-track">
        <div class="hm-ss-rail">${railSegs}</div>
        <div class="hm-ss-nodes">${nodesHtml}</div>
      </div>
      <div class="hm-ss-foot">${footMsg}</div>
    </div>`;
}

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

function formatDayGroupTitle(dk){
  const now=new Date();
  const todayDk=localDateKey(now.getTime());
  const yest=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);
  const yestDk=localDateKey(yest.getTime());
  const [y,m,d]=dk.split('-').map(Number);
  const dtStr=`${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
  if(dk===todayDk)return `Hôm nay · ${dtStr}`;
  if(dk===yestDk)return `Hôm qua · ${dtStr}`;
  const dt=new Date(y,m-1,d);
  const wd=['Chủ nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'][dt.getDay()];
  return `${wd} · ${dtStr}`;
}

function renderHistory(){
  const el=$('#me-hist-list'),sumEl=$('#me-hi-summary');if(!el)return;
  const today=localDateKey(),now=Date.now();
  let list=store.events.slice().reverse();
  if(hiDate==='today')list=list.filter(e=>localDateKey(e.endedAt)===today);
  else if(hiDate==='7')list=list.filter(e=>now-e.endedAt<=7*DAY_MS);
  if(hiSkill!=='all'){
    const map={
      vocab:['vocab','srs'],
      read:['exercise','grammar','dialog','trans'],
      listen:['listen','dictation','tone'],
      write:['writing','write','copy'],
      speak:['record','assess']
    };
    const allowed=map[hiSkill]||[];
    list=list.filter(e=>allowed.includes(e.type)||e.skill===hiSkill);
  }
  if(sumEl)sumEl.textContent=list.length?`Hiển thị ${Math.min(60,list.length)} / ${list.length} hoạt động gần nhất`:'';
  if(!list.length){el.innerHTML='<p class="muted small" style="text-align:center;padding:14px 0">Chưa có hoạt động nào khớp bộ lọc. Hãy học một bài để ghi nhận nhật ký thật.</p>';return;}
  const iconOf={vocab:'book',srs:'refresh',exercise:'pencil',grammar:'layers',dialog:'book',trans:'lang',listen:'head',dictation:'pencil',tone:'head',writing:'brush',write:'brush',copy:'brush',record:'mic',assess:'award'};
  const groups=[];
  const groupMap=new Map();
  list.slice(0,60).forEach(e=>{
    const dk=localDateKey(e.endedAt);
    if(!groupMap.has(dk)){const g={dk,items:[]};groupMap.set(dk,g);groups.push(g);}
    groupMap.get(dk).items.push(e);
  });
  el.innerHTML=groups.map(g=>{
    const itemsHtml=g.items.map(e=>{
      const d=new Date(e.endedAt);
      const hhmm=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      const dur=e.durationSec?`${e.durationSec}s`:'';
      const titleSafe=typeof escHtml==='function'?escHtml(e.title||''):e.title;
      const resSafe=typeof escHtml==='function'?escHtml(e.result||''):e.result;
      return `<div class="me-tl-item" data-go="${e.view||'home'}">
        <span class="me-tl-dot" aria-hidden="true"></span>
        <span class="me-tl-ic"><svg class="ic"><use href="#i-${iconOf[e.type]||'book'}"/></svg></span>
        <div class="me-tl-mid"><b>${titleSafe}</b><span>${resSafe||'Đã ghi nhận hoạt động'}</span></div>
        <div class="me-tl-right"><em>${hhmm}</em>${dur?`<small>${dur}</small>`:'<small>Mở</small>'}</div>
      </div>`;
    }).join('');
    return `<div class="me-tl-group"><div class="me-tl-day"><b>${formatDayGroupTitle(g.dk)}</b><span>${g.items.length} hoạt động</span></div><div class="me-tl-list">${itemsHtml}</div></div>`;
  }).join('');
}

function refreshDashboards(){
  const st=computeStats(),g=store.goals;
  // Header streak & Home 7-day streak strip
  const hs=$('#hdr-streak');if(hs)hs.innerHTML=`<svg class="ic f"><use href="#i-flame"/></svg>${st.streak} ngày`;
  renderHomeStreakStrip(st);

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

  const cp=st.activeCourseStats;
  const cPct=cp&&cp.total>0?cp.pct:st.lessonPct;
  const cDoneStr=cp&&cp.total>0?`${cp.doneCnt}/${cp.total}`:`${st.lessonDone}/${st.lessonTotal}`;
  const cDoneLbl=cp&&cp.total>0?'bài đã học':'hoạt động';
  if($('#hm-prog-bar'))$('#hm-prog-bar').style.width=cPct+'%';
  if($('#hm-prog-pct'))$('#hm-prog-pct').textContent=cPct+'%';
  if($('#hm-lessons'))$('#hm-lessons').textContent=cDoneStr;
  if($('#hm-lessons-lbl'))$('#hm-lessons-lbl').textContent=cDoneLbl;
  if($('#hm-words'))$('#hm-words').textContent=st.learnedWords;
  if($('#hm-ret'))$('#hm-ret').textContent=st.retentionPct!==null?st.retentionPct+'%':'—';

  // Me Overview — Profile, XP, KPIs, Active course progress
  const setup=store.learningSetup||{level:1,mode:'hanngu'};
  const actC=(typeof COURSES!=='undefined'&&Array.isArray(COURSES))?COURSES.find(x=>x.id===store.activeCourseId):null;
  const actL=(typeof LESSONS!=='undefined'&&Array.isArray(LESSONS))?LESSONS.find(x=>x.id===store.activeLessonId):null;
  if($('#me-level-badge'))$('#me-level-badge').textContent=`Cấp ${st.xp.level}`;
  if($('#me-profile-sub'))$('#me-profile-sub').textContent=`HSK ${setup.level||1} · ${st.xp.rank} · ${(setup.mode==='parallel'?'Song song Hán ngữ & HSK 3.0':(actC?actC.title:'Hanyu AI'))}`;
  if($('#me-streak-pill'))$('#me-streak-pill').innerHTML=`<svg class="ic f"><use href="#i-flame"/></svg><span>${st.streak} ngày</span>`;
  if($('#me-xp-txt'))$('#me-xp-txt').textContent=`${st.xp.xp} XP · Còn ${st.xp.toNext} XP lên Cấp ${st.xp.level+1}`;
  if($('#me-xp-bar'))$('#me-xp-bar').style.width=st.xp.pct+'%';

  if($('#me-done-lessons'))$('#me-done-lessons').textContent=`${st.totalCompletedLessons} bài`;
  if($('#me-sessions'))$('#me-sessions').textContent=st.totalSessions;
  if($('#me-learned'))$('#me-learned').textContent=`${st.learnedWords}`;
  if($('#me-learned-sub'))$('#me-learned-sub').textContent=`${st.wellKnownWords} ghi nhớ tốt`;
  if($('#me-streak'))$('#me-streak').textContent=`${st.streak} ngày`;
  if($('#me-time'))$('#me-time').textContent=formatDurationVi(st.totalMin);
  if($('#me-time-sub'))$('#me-time-sub').textContent=`Hôm nay: ${st.td.minutes||0} phút`;

  if($('#me-pct'))$('#me-pct').textContent=st.lessonPct+'%';
  if($('#me-ring'))$('#me-ring').setAttribute('stroke-dashoffset',String((326.7*(1-st.lessonPct/100)).toFixed(1)));
  if($('#me-active-lvl')){
    const lvlTitle=actC?actC.title:'Giáo trình hiện tại';
    const lTag=actL?(actL.code||''):'';
    $('#me-active-lvl').innerHTML=`<svg class="ic"><use href="#i-bars"/></svg><span>${typeof escHtml==='function'?escHtml(lvlTitle+(lTag?' · '+lTag:'')):lvlTitle}</span>`;
  }
  if($('#me-lesson-txt')){
    $('#me-lesson-txt').textContent=(cp&&cp.total>0)
      ?`Hoàn thành ${cp.doneCnt} / ${cp.total} bài (${actL&&actL.code?actL.code+': '+st.activeLessonProg.totalDone+'/9 phần':cp.pct+'%'})`
      :`Đã hoàn thành ${st.activeLessonProg.totalDone} / 9 phần bài học`;
  }
  if($('#me-lesson-bar'))$('#me-lesson-bar').style.width=st.lessonPct+'%';
  if($('#me-due-txt'))$('#me-due-txt').textContent=`${st.dueWords} từ đến hạn • ${st.wellKnownWords} từ ghi nhớ tốt`;

  // Parallel mini comparison inside #me overview
  const pmEl=$('#me-parallel-mini');
  if(pmEl){
    if(setup.mode==='parallel'&&typeof getCourseIdForTrack==='function'&&typeof getCourseProgressStats==='function'){
      const lv=Math.min(6,Math.max(1,Number(setup.level)||1));
      const hnId=getCourseIdForTrack(lv,'hanngu'),hskId=getCourseIdForTrack(lv,'hsk30');
      const hnSt=getCourseProgressStats(hnId),hskSt=getCourseProgressStats(hskId);
      pmEl.classList.remove('hide');
      pmEl.innerHTML=`
        <div class="me-pm-item ${store.activeCourseId===hnId?'on':''}">
          <div class="me-pm-row"><span>Hán ngữ · Quyển ${lv}</span><b>${hnSt.doneCnt}/${hnSt.total} (${hnSt.pct}%)</b></div>
          <div class="me-pm-bar"><i style="width:${hnSt.pct}%"></i></div>
        </div>
        <div class="me-pm-item ${store.activeCourseId===hskId?'on':''}">
          <div class="me-pm-row"><span>NEW HSK 3.0 · Cấp ${lv}</span><b>${hskSt.doneCnt}/${hskSt.total} (${hskSt.pct}%)</b></div>
          <div class="me-pm-bar"><i style="width:${hskSt.pct}%"></i></div>
        </div>`;
    }else{
      pmEl.classList.add('hide');
      pmEl.innerHTML='';
    }
  }

  // Daily goals — dedicated Mục tiêu tab (#me data-pane="gl")
  const glDate=$('#me-gl-date');
  if(glDate){
    const dNow=new Date();
    const wd=['Chủ nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'][dNow.getDay()];
    glDate.textContent=`${wd}, ${String(dNow.getDate()).padStart(2,'0')}/${String(dNow.getMonth()+1).padStart(2,'0')}/${dNow.getFullYear()}`;
  }
  const goalRows=[
    ['Thời gian học',st.td.minutes||0,g.minutes,'phút','vocab','clock'],
    ['Học từ mới',st.td.newWords||0,g.newWords,'từ','vocab','book'],
    ['Ôn tập SRS',st.td.reviews||0,g.reviews,'lượt','review','refresh'],
    ['Luyện nghe',st.td.listen||0,g.listen,'bài','listen','head'],
    ['Luyện nói',st.td.speak||0,g.speak,'lượt','speak','mic'],
    ['Luyện viết',st.td.write||0,g.write,'chữ','writing','brush']
  ];
  const doneGoals=goalRows.filter(([,cur,tgt])=>cur>=tgt).length;
  const glPct=Math.round(doneGoals*100/goalRows.length);
  if($('#me-gl-pct'))$('#me-gl-pct').textContent=glPct+'%';
  if($('#me-gl-done'))$('#me-gl-done').textContent=`${doneGoals} / ${goalRows.length}`;
  if($('#me-gl-ring'))$('#me-gl-ring').setAttribute('stroke-dashoffset',String((263.9*(1-glPct/100)).toFixed(1)));
  if($('#me-gl-sum3')){
    $('#me-gl-sum3').innerHTML=`
      <div class="me-gl-pill"><b>${st.td.minutes||0}/${g.minutes}p</b><span>Phút học</span></div>
      <div class="me-gl-pill"><b>${st.td.newWords||0}/${g.newWords}</b><span>Từ mới</span></div>
      <div class="me-gl-pill"><b>${st.td.reviews||0}/${g.reviews}</b><span>Ôn SRS</span></div>`;
  }
  const gl=$('#me-goal-list');
  if(gl){
    gl.innerHTML=goalRows.map(([lbl,cur,tgt,unit,go,ic])=>{
      const pct=tgt?Math.min(100,Math.round(cur*100/tgt)):0;
      const isDone=cur>=tgt;
      const cls=isDone?'done':cur>0?'doing':'todo';
      const status=isDone?'✓ Đã xong':cur>0?'Đang làm':'Bắt đầu ›';
      return `<div class="me-gl-row ${isDone?'done':''}" data-go="${go}">
        <span class="me-gl-ic"><svg class="ic"><use href="#i-${ic}"/></svg></span>
        <div class="me-gl-mid">
          <div class="me-gl-lbl"><b>${lbl}</b><span>${cur} / ${tgt} ${unit}</span></div>
          <div class="me-gl-bar"><i style="width:${pct}%"></i></div>
        </div>
        <span class="me-gl-st ${cls}">${status}</span>
      </div>`;
    }).join('');
  }

  // Recommendations (rule-based from real data)
  const recs=[];
  if(st.dueWords>0)recs.push({t:'Ôn tập từ vựng đến hạn',d:`Có ${st.dueWords} từ đến hạn theo lịch SRS`,go:'review',btn:'Ôn ngay'});
  const toneEntries=Object.entries(st.skills.listen.toneMistakes||{}).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  if(toneEntries.length)recs.push({t:'Củng cố phân biệt thanh điệu',d:`Hay nhầm nhóm thanh ${toneEntries[0][0].replace('->',' ↔ ')} (${toneEntries[0][1]} lần)`,go:'listen',btn:'Luyện thanh'});
  if(store.listening.wrongIds.length)recs.push({t:'Luyện lại câu nghe sai',d:`${store.listening.wrongIds.length} câu nghe cần củng cố`,go:'listen',btn:'Mở Nghe'});
  if(st.skills.write.retry.length)recs.push({t:'Chữ Hán cần luyện viết thêm',d:st.skills.write.retry.map(c=>c.ch).join(' · '),go:'writing',btn:'Luyện viết'});
  const _actTitle=actL?`Tiếp tục ${actL.code||''}${actL.titleVi?' · '+actL.titleVi:''}`:'Tiếp tục bài học hôm nay';
  if(!recs.length)recs.push({t:_actTitle,d:'Học từ mới, làm bài tập hoặc luyện nghe/viết để tích lũy tiến độ',go:'lesson',btn:'Vào học'});
  const recEl=$('#me-recs');
  if(recEl)recEl.innerHTML=recs.map(r=>`<div class="rec-item"><div class="mid"><b>${r.t}</b><span>${r.d}</span></div><button type="button" class="chip on" data-go="${r.go}">${r.btn}</button></div>`).join('');

  // 4 Skills pane (#me data-pane="sk")
  const s=st.skills;
  const ringsEl=$('#me-sk-rings');
  if(ringsEl){
    const rList=[
      ['listen','Nghe',s.listen.pct,`${s.listen.attempts} phiên`,'#C7463B'],
      ['speak','Nói',s.speak.pct,s.speak.assessed?'Chấm điểm':(s.speak.isSelfCheck?'Tự kiểm tra':`${s.speak.recs} ghi âm`),'#E0852B'],
      ['read','Đọc & NP',s.read.pct,`${s.read.words}/${WORDS.length} từ`,'#9E3228'],
      ['write','Viết',s.write.pct,`${s.write.practiced}/${CHARS.length} chữ`,'#5C8A38']
    ];
    ringsEl.innerHTML=rList.map(([key,lbl,pct,sub,col])=>{
      const valPct=pct!==null?pct:0;
      const off=(163.4*(1-valPct/100)).toFixed(1);
      const disp=pct!==null?pct+'%':'—';
      return `<button type="button" class="me-sk-ring-btn ${focusedSkillKey===key?'on':''}" data-sk-focus="${key}">
        <div class="me-sk-ring-svg">
          <svg viewbox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="none" stroke="var(--surface)" stroke-width="6"/><circle cx="32" cy="32" r="26" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="163.4" stroke-dashoffset="${off}"/></svg>
          <b>${disp}</b>
        </div>
        <span class="me-sk-ring-lbl">${lbl}</span>
        <span class="me-sk-ring-sub">${sub}</span>
      </button>`;
    }).join('');
  }

  const skEl=$('#me-skills-pane');
  if(skEl){
    const card=(key,ic,name,pct,subPctLbl,lines,go)=>`<div class="card me-sk-card ${focusedSkillKey===key?'focus':''}" data-sk-card="${key}">
      <div class="barrow" style="justify-content:space-between"><div class="head" style="align-items:center"><svg class="ic" style="width:1.4em;height:1.4em"><use href="#i-${ic}"/></svg><h3>${name}</h3></div><b>${pct!==null?(pct+'%'+(subPctLbl?' <small class="muted">('+subPctLbl+')</small>':'')):'Chưa có dữ liệu'}</b></div>
      <div class="bar"><i style="width:${pct||0}%"></i></div>
      <div class="sk-detail">${lines.map(([a,b])=>`<div class="sk-row"><span class="muted">${a}</span><b>${b}</b></div>`).join('')}</div>
      <button type="button" class="btn ghost sm" data-go="${go}">Luyện ${name.toLowerCase()}</button>
    </div>`;
    const toneMistakeCnt=Object.values(s.listen.toneMistakes||{}).reduce((a,b)=>a+(b||0),0);
    skEl.innerHTML=
      card('listen','head','Nghe',s.listen.pct,'',[
        ['Bài nghe đã làm',`${s.listen.attempts} phiên`],
        ['Câu trả lời đúng',`${s.listen.ok} / ${s.listen.total}`],
        ['Nhầm thanh điệu',toneMistakeCnt?`${toneMistakeCnt} lượt`:'Chưa ghi nhận']
      ],'listen')+
      card('speak','mic','Nói',s.speak.pct,s.speak.isSelfCheck?'tự đánh giá':'',[
        ['Lượt ghi âm thật',`${s.speak.recs} lượt`],
        ['Tự đánh giá đạt / luyện lại',`${s.speak.okCount} đạt · ${s.speak.retryCount} luyện lại`],
        ['Chấm điểm tự động',s.speak.assessed?`${s.speak.assessed} lượt (TB ${s.speak.pct}%)`:'Ngoại tuyến (tự nghe & đối chiếu)']
      ],'speak')+
      card('read','book','Đọc & Ngữ pháp',s.read.pct,'',[
        ['Bài tập & ngữ pháp',`${s.read.attempts} phiên`],
        ['Câu đúng',`${s.read.ok} / ${s.read.total}`],
        ['Từ vựng bài này',`${s.read.words} / ${WORDS.length} từ`]
      ],'exercise')+
      card('write','brush','Viết',s.write.pct,'',[
        ['Chữ Hán bài này',`${s.write.practiced} / ${CHARS.length} chữ`],
        ['Tổng số chữ đã luyện',`${s.write.totalPracticed} chữ · ${s.write.guided} lần hướng dẫn`],
        ['Cần luyện lại',s.write.retry.length?s.write.retry.map(c=>c.ch).join(' '):'Không có']
      ],'writing');
  }

  const impEl=$('#me-sk-improve');
  if(impEl){
    const imps=[];
    if(toneEntries.length)imps.push({b:'Thanh điệu dễ nhầm (Luyện nghe)',d:`Nhầm nhiều nhất: ${toneEntries.slice(0,2).map(([k,v])=>k.replace('->',' → ')+` (${v})`).join(', ')}`,go:'listen',cta:'Luyện thanh'});
    if(s.listen.wrongCount>0)imps.push({b:`${s.listen.wrongCount} câu nghe từng trả lời sai`,d:'Mở Luyện nghe để nghe lại và củng cố phản xạ.',go:'listen',cta:'Nghe lại'});
    if(s.write.retry.length)imps.push({b:`Chữ Hán đánh dấu luyện lại`,d:s.write.retry.map(c=>`${c.ch} (${c.py||''})`).join(' · '),go:'writing',cta:'Viết ngay'});
    if(s.speak.retryCount>0)imps.push({b:`${s.speak.retryCount} mục phát âm tự đánh dấu cần luyện lại`,d:'Mở Hướng dẫn sửa lỗi 3 tab để luyện âm đầu, vần và thanh điệu.',go:'speak',cta:'Luyện nói'});
    if(st.dueWords>0)imps.push({b:`${st.dueWords} thẻ từ vựng đã đến hạn SRS`,d:'Ôn đúng hạn giúp giữ tỷ lệ ghi nhớ dài hạn.',go:'review',cta:'Ôn SRS'});
    impEl.innerHTML=`<div class="me-imp-hd"><h3>Cần cải thiện (từ dữ liệu thật)</h3><span class="small muted">${imps.length?imps.length+' mục ưu tiên':'Tốt lắm!'}</span></div>`+
      (imps.length
        ?`<div class="me-imp-list">${imps.map(x=>`<div class="me-imp-row"><div class="me-imp-txt"><b>${x.b}</b><span>${x.d}</span></div><button type="button" class="chip on" data-go="${x.go}">${x.cta}</button></div>`).join('')}</div>`
        :'<div class="me-imp-empty">Chưa ghi nhận lỗi thanh điệu hay mục đánh dấu luyện lại. Hãy tiếp tục học để hệ thống theo dõi chi tiết hơn.</div>');
  }

  renderChart(st);
  renderHistory();
  if(typeof window.HanyuAuth!=='undefined'&&typeof window.HanyuAuth.syncProfileUI==='function'){
    window.HanyuAuth.syncProfileUI();
  }
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
  $$('#mtabs button').forEach(x=>x.classList.toggle('on',x===b));$$('#me [data-pane]').forEach(p=>p.classList.toggle('hide',p.dataset.pane!==b.dataset.m));});
const _skRings=$('#me-sk-rings');
if(_skRings)_skRings.addEventListener('click',e=>{
  const b=e.target.closest('[data-sk-focus]');if(!b)return;
  const k=b.dataset.skFocus||'';
  focusedSkillKey=focusedSkillKey===k?'':k;
  $$('#me-sk-rings .me-sk-ring-btn').forEach(x=>x.classList.toggle('on',x.dataset.skFocus===focusedSkillKey));
  $$('#me-skills-pane [data-sk-card]').forEach(x=>x.classList.toggle('focus',x.dataset.skCard===focusedSkillKey));
  const target=focusedSkillKey?$(`#me-skills-pane [data-sk-card="${focusedSkillKey}"]`):null;
  if(target&&target.scrollIntoView)target.scrollIntoView({behavior:'smooth',block:'nearest'});
});
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
if($('#me-goal-reset'))$('#me-goal-reset').onclick=()=>{
  store.goals={minutes:20,newWords:5,reviews:10,listen:1,speak:3,write:2};
  saveStore(store);$('#me-goal-form').classList.add('hide');refreshDashboards();toast('Đã đặt lại mục tiêu mặc định');
};
function syncSidebarThemeLabel(){
  const r=document.documentElement;
  const isDark=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
  const sp=$('#sb-theme-btn span');
  if(sp)sp.textContent=isDark?'Giao diện Sáng':'Giao diện Tối';
}
$('#themebtn').onclick=()=>{const r=document.documentElement,dark=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;r.dataset.theme=dark?'light':'dark';syncSidebarThemeLabel();};


