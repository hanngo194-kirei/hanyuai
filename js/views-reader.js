/* ---------- Kết nối bài học đang chọn vào 8 module hiện có ---------- */
function applyActiveLesson(){
  const l=LESSONS.find(x=>x.id===store.activeLessonId)||null;
  if(!l){
    WORDS=[];SENT=[];CHARS=[];GRAMMAR_POINTS={};GRAMMAR_QUIZ=[];ORDER_BANK=[];LISTEN_DIALOG=[];DIALOG_QUESTIONS=[];
  }else if(l.id==='lesson_sample_b4'){
    WORDS=JSON.parse(JSON.stringify(DEFAULT_WORDS_SNAP));
    SENT=JSON.parse(JSON.stringify(DEFAULT_SENT_SNAP));
    CHARS=JSON.parse(JSON.stringify(DEFAULT_CHARS_SNAP));
    GRAMMAR_POINTS=JSON.parse(JSON.stringify(DEFAULT_GRAMMAR_POINTS_SNAP));
    GRAMMAR_QUIZ=JSON.parse(JSON.stringify(DEFAULT_GRAMMAR_QUIZ_SNAP));
    ORDER_BANK=JSON.parse(JSON.stringify(DEFAULT_ORDER_BANK_SNAP));
    LISTEN_DIALOG=JSON.parse(JSON.stringify(DEFAULT_LISTEN_DIALOG_SNAP));
    DIALOG_QUESTIONS=JSON.parse(JSON.stringify(DEFAULT_DIALOG_QUESTIONS_SNAP));
  }else{
    WORDS=getLessonVocab(l);
    const dlg=(l.dialog||[]);
    LISTEN_DIALOG=dlg.map((d,i)=>({section:d.section||'',context:d.context||'',audio:d.audio||'',speaker:d.speaker||(i%2===0?'A':'B'),name:d.name||(i%2===0?'Người A':'Người B'),zh:d.zh||'',py:d.py||'',vi:d.vi||''})).filter(d=>d.zh);
    SENT=(l.sentences&&l.sentences.length)?l.sentences:LISTEN_DIALOG.map(d=>({zh:d.zh,py:d.py,vi:d.vi}));
    DIALOG_QUESTIONS=l.dialogQuestions||[];
    GRAMMAR_POINTS=l.grammarPoints||{};
    GRAMMAR_QUIZ=l.grammarQuiz||[];
    ORDER_BANK=l.orderBank||[];
    if(l.chars&&l.chars.length){
      CHARS=l.chars;
    }else if(WORDS.length){
      const seenCh=new Set(),autoChars=[];
      WORDS.forEach(w=>{
        for(const ch of String(w.zh||'')){
          if(/[\u4e00-\u9fff]/.test(ch)&&!seenCh.has(ch)&&autoChars.length<12){
            seenCh.add(ch);
            autoChars.push({id:'c_'+ch.charCodeAt(0),ch,py:w.zh===ch?w.py:'',vi:w.zh===ch?w.vi:'',rad:'',strokes:0});
          }
        }
      });
      CHARS=autoChars;
    }else{
      CHARS=[];
    }
  }
  renderLessonDetail();
  refreshModulesForLesson();
}

function refreshModulesForLesson(){
  // Safe refresh of ALL modules for active lesson so zero stale Bài 4 data remains
  try{
    const l=LESSONS.find(x=>x.id===store.activeLessonId);
    const lbl=l?`${l.code||'Bài học'} • ${l.titleVi||l.titleZh||''}`:'Bài học';
    const vSub=$('#vocab [data-f="subtitle"]');
    if(vSub&&l)vSub.textContent=`${l.code||'Bài học'} · ${l.titleVi||l.titleZh||''}`;
    const grSub=$('#gr-sub');if(grSub)grSub.textContent=lbl;
    const exSub=$('#ex-sub');if(exSub)exSub.textContent=lbl;
    const wSub=$('#w-sub');if(wSub)wSub.textContent=`${l?(l.code||'Bài học'):'Bài học'} • Thứ tự nét & đối chiếu mẫu`;
    const spSub=$('#sp-sub');if(spSub)spSub.textContent=`${l?(l.code||'Bài học'):'Bài học'} • Ghi âm thật & hướng dẫn sửa lỗi`;
  }catch(_){}
  try{if(typeof renderFlash==='function')renderFlash();}catch(_){}
  try{
    if(typeof gramCtrl!=='undefined'&&gramCtrl.refresh)gramCtrl.refresh();
  }catch(_){}
  try{if(typeof exCtrl!=='undefined'&&exCtrl.refresh)exCtrl.refresh();}catch(_){}
  try{if(typeof window.refreshDot2Views==='function')window.refreshDot2Views();}catch(_){}
  try{if(typeof listenCtrl!=='undefined'&&listenCtrl.refresh)listenCtrl.refresh();}catch(_){}
  try{
    if(typeof speakCtrl!=='undefined'){
      if(speakCtrl.refresh)speakCtrl.refresh();
      else if(speakCtrl.init)speakCtrl.init();
    }
  }catch(_){}
  try{if(typeof refreshWritingForLesson==='function')refreshWritingForLesson();else if(typeof setupPadForChar==='function'&&CHARS.length)setupPadForChar();}catch(_){}
  try{if(typeof renderReviewDash==='function')renderReviewDash();}catch(_){}
  try{if(typeof renderWordbook==='function')renderWordbook();}catch(_){}
}

/* ---------- Chi tiết bài học #lesson ---------- */
const LS_REQ_KEYS=['vocab','grammar','listen','speak','exercise'];
const LS_EXT_KEYS=['dialog','copy','writing','trans'];
const LS_ALL_SECTIONS=[
  {key:'vocab',label:'Từ vựng',req:true,unit:'từ',icon:'#i-book'},
  {key:'grammar',label:'Ngữ pháp',req:true,unit:'câu',icon:'#i-layers'},
  {key:'listen',label:'Luyện nghe',req:true,unit:'câu',icon:'#i-head'},
  {key:'speak',label:'Luyện nói',req:true,unit:'câu',icon:'#i-mic'},
  {key:'exercise',label:'Bài tập & Kiểm tra',req:true,unit:'câu',icon:'#i-check'},
  {key:'dialog',label:'Bài khóa',req:false,unit:'câu',icon:'#i-book'},
  {key:'copy',label:'Chép bài khóa',req:false,unit:'dòng',icon:'#i-pencil'},
  {key:'writing',label:'Luyện viết',req:false,unit:'chữ',icon:'#i-brush'},
  {key:'trans',label:'Luyện dịch',req:false,unit:'câu',icon:'#i-lang'}
];
function getLessonSectionProgress(l){
  const sec=(store.lessonSections&&l&&l.id&&store.lessonSections[l.id])||{};
  const wList=getLessonVocab(l);
  const allWordsStudied=Boolean(l&&l.id==='lesson_sample_b4')&&wList.length>0&&wList.every(w=>store.words&&store.words[w.id]&&store.words[w.id].status!=='new');
  const doneMap={
    vocab:!!(sec.vocab||allWordsStudied),
    grammar:!!sec.grammar,
    listen:!!sec.listen,
    speak:!!sec.speak,
    exercise:!!sec.exercise,
    dialog:!!sec.dialog,
    copy:!!sec.copy,
    writing:!!sec.writing,
    trans:!!sec.trans
  };
  const reqDone=LS_REQ_KEYS.filter(k=>doneMap[k]).length;
  const extDone=LS_EXT_KEYS.filter(k=>doneMap[k]).length;
  const totalDone=reqDone+extDone;
  return {doneMap,reqDone,extDone,totalDone,pct:Math.round(totalDone*100/9)};
}
function saveLessonSectionStats(lessonId,key,stats){
  const lid=lessonId||store.activeLessonId;
  if(!lid||!key)return null;
  if(!store.lessonSectionStats||typeof store.lessonSectionStats!=='object')store.lessonSectionStats={};
  if(!store.lessonSectionStats[lid]||typeof store.lessonSectionStats[lid]!=='object')store.lessonSectionStats[lid]={};
  const meta=LS_ALL_SECTIONS.find(s=>s.key===key)||{label:key,unit:'mục'};
  const totalCount=Math.max(1,Number(stats&&stats.totalCount)||Number(stats&&stats.doneCount)||1);
  const doneCount=Math.max(0,Math.min(totalCount,Number(stats&&stats.doneCount!==undefined?stats.doneCount:totalCount)||0));
  const errors=Math.max(0,Number(stats&&stats.errors)||0);
  let acc=stats&&stats.accuracy!==undefined&&Number.isFinite(Number(stats.accuracy))?Math.round(Number(stats.accuracy)):null;
  if(acc===null){
    const denom=Math.max(1,doneCount+errors);
    acc=Math.max(0,Math.min(100,Math.round(doneCount*100/denom)));
  }
  const dur=(stats&&Number(stats.durationSec)>0)?Math.round(Number(stats.durationSec)):((typeof getSectionElapsedSec==='function')?getSectionElapsedSec(key):15);
  const rawWrong=Array.isArray(stats&&stats.wrongItems)?stats.wrongItems:[];
  const wrongItems=rawWrong.slice(0,15).map(w=>({
    zh:String((w&&w.zh)||'').trim(),
    py:String((w&&w.py)||'').trim(),
    vi:String((w&&w.vi)||'').trim(),
    note:String((w&&w.note)||'').trim()
  })).filter(w=>w.zh||w.vi||w.note);
  const saved={
    key,
    label:meta.label,
    unit:String((stats&&stats.unit)||meta.unit||'mục'),
    doneCount,
    totalCount,
    errors,
    accuracy:Math.max(0,Math.min(100,acc)),
    durationSec:dur,
    scoreLabel:stats&&stats.scoreLabel?String(stats.scoreLabel):'',
    wrongItems,
    updatedAt:Date.now()
  };
  store.lessonSectionStats[lid][key]=saved;
  markLessonSectionDone(lid,key,true);
  saveStore(store);
  return saved;
}
window.saveLessonSectionStats=saveLessonSectionStats;

function _fmtHsumDur(sec){
  const s=Math.max(0,Math.round(Number(sec)||0));
  if(!s||s<60)return '< 1 phút';
  return `${Math.round(s/60)} phút`;
}
function _hsumTrophySvg(){
  return '<svg class="hsum-trophy" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="hsum-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFE082"/><stop offset="55%" stop-color="#F6B22E"/><stop offset="100%" stop-color="#C97A12"/></linearGradient></defs><path d="M18 14h28v13c0 8.8-6.3 16-14 16s-14-7.2-14-16V14z" fill="url(#hsum-gold)" stroke="#B5680A" stroke-width="2"/><path d="M18 18H10c0 8.5 3.6 13.5 9.5 14.5M46 18h8c0 8.5-3.6 13.5-9.5 14.5" fill="none" stroke="#DF8E1B" stroke-width="3" stroke-linecap="round"/><rect x="29" y="42" width="6" height="8" rx="2" fill="#D48417"/><rect x="20" y="50" width="24" height="5" rx="2.5" fill="#9A3B23"/><polygon points="32,20 34.4,25.2 40,26 35.8,29.8 36.9,35.4 32,32.6 27.1,35.4 28.2,29.8 24,26 29.6,25.2" fill="#FFF8DC"/></svg>';
}
function _hsumRingSvg(pct,bigTxt,subTxt){
  const p=Math.max(0,Math.min(100,Math.round(Number(pct)||0)));
  const r=34,c=2*Math.PI*r,off=c*(1-p/100);
  return `<div class="hsum-ring"><svg viewBox="0 0 88 88"><circle class="hr-bg" cx="44" cy="44" r="${r}"/><circle class="hr-fg" cx="44" cy="44" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg><div class="hr-in"><b>${bigTxt}</b><span>${subTxt}</span></div></div>`;
}
function _hsumFeedback(acc,errors){
  if(acc>=95&&errors===0)return 'Xuất sắc! Bạn đã nắm rất chắc toàn bộ nội dung của phần học này.';
  if(acc>=80)return `Bạn nắm vững phần lớn nội dung của mục học, chỉ còn ${errors} lỗi nhỏ cần xem lại để nhớ thật chắc nhé!`;
  if(acc>=60)return `Bạn đã hoàn thành phần học khá tốt! Mình gợi ý bạn ôn lại ${errors||'các'} nội dung chưa chắc để tự tin hơn nhé.`;
  return 'Bạn đã cố gắng hoàn thành phần học! Hãy chạm "Ôn lại" để xem kỹ lại các phần còn nhầm và luyện thêm cùng mình nhé.';
}
function showSectionSummary(secKey,rawStats,opts){
  const options=opts||{};
  const lid=options.lessonId||store.activeLessonId;
  const l=(typeof LESSONS!=='undefined'&&Array.isArray(LESSONS))?LESSONS.find(x=>x.id===lid):null;
  const prevProg=getLessonSectionProgress(l||{id:lid});
  const wasFull=prevProg.totalDone>=9;
  const saved=saveLessonSectionStats(lid,secKey,rawStats||{});
  const meta=LS_ALL_SECTIONS.find(s=>s.key===secKey)||{key:secKey,label:secKey,unit:'mục'};
  const prog=getLessonSectionProgress(l||{id:lid});
  if(prog.totalDone>=9&&!wasFull){
    showLessonSummary(lid);
    return;
  }
  const s=saved||{doneCount:1,totalCount:1,unit:meta.unit,errors:0,accuracy:100,durationSec:15,wrongItems:[]};
  const lessonTitle=l?((l.code?l.code+' · ':'')+(l.titleVi||l.titleZh||'Bài học')):'Bài học hiện tại';
  const secIdx=LS_ALL_SECTIONS.findIndex(x=>x.key===secKey);
  const nextSec=LS_ALL_SECTIONS.find((s,i)=>i>secIdx&&!prog.doneMap[s.key])||LS_ALL_SECTIONS.find(s=>!prog.doneMap[s.key])||null;
  const wrongList=s.wrongItems||[];
  const wrongHtml=wrongList.length
    ? wrongList.map(w=>`<div class="hsum-wrow"><span class="hsum-wzh">${escHtml(w.zh||'—')}</span><span class="hsum-wpy">${escHtml(w.py||'')}</span><span class="hsum-wvi">${escHtml(w.vi||'')}</span><span class="hsum-wtag">✕ ${escHtml(w.note||'Bạn đã trả lời sai')}</span></div>`).join('')
    : '<div class="hsum-ok-note">✓ Bạn đã hoàn thành chính xác phần này, chưa ghi nhận lỗi cần sửa!</div>';
  const retryLabel=wrongList.length&&options.onRetryWrong?'Ôn lại phần sai':'Làm lại phần này';
  const showNextBtn=!nextSec;
  const primaryTxt=showNextBtn?'Xem tổng kết bài học →':`Tiếp tục: ${nextSec.label} →`;

  if(typeof playSfx==='function')playSfx('done');
  if(typeof openModal==='function'){
    openModal(`
      <div class="hsum-wrap">
        <div class="hsum-top-pill">${escHtml(lessonTitle)}</div>
        <div class="hsum-hero">
          ${_hsumTrophySvg()}
          <div class="hsum-hero-txt">
            <h3>Bạn đã hoàn thành ${escHtml(meta.label)} của bài học “${escHtml(lessonTitle)}”!</h3>
            <p>Đây là kết quả của riêng phần học này.</p>
          </div>
        </div>
        <div class="hsum-stats4">
          <div class="hsum-st"><span>Tiến độ</span><b>${s.doneCount}/${s.totalCount} ${escHtml(s.unit)}</b></div>
          <div class="hsum-st"><span>Thời gian</span><b>${_fmtHsumDur(s.durationSec)}</b></div>
          <div class="hsum-st"><span>Số lỗi</span><b>${s.errors}</b></div>
          <div class="hsum-st"><span>Độ chính xác</span><b>${s.accuracy}%</b></div>
        </div>
        <div class="hsum-eval-card">
          ${_hsumRingSvg(s.accuracy,`${s.accuracy}<small>/100</small>`,'điểm')}
          <div class="hsum-eval-txt">
            <b>Đánh giá</b>
            <p>${escHtml(_hsumFeedback(s.accuracy,s.errors))}</p>
          </div>
        </div>
        <div class="hsum-wrong-card">
          <div class="hsum-whead"><b>Cần ôn lại</b><span class="hsum-cnt-pill">${wrongList.length} ${escHtml(s.unit)}</span></div>
          <div class="hsum-wlist">${wrongHtml}</div>
        </div>
        <div class="hsum-btns">
          <div class="hsum-btn-pair">
            <button type="button" class="btn ghost sm" id="hsum-retry-btn"><svg class="ic"><use href="#i-refresh"/></svg>${retryLabel}</button>
            <button type="button" class="btn ghost sm" id="hsum-lesson-btn"><svg class="ic"><use href="#i-book"/></svg>Chi tiết bài học</button>
          </div>
          ${prog.reqDone>=5?`<button type="button" class="btn ghost sm" id="hsum-lesson-sum-btn">🏆 Xem tổng kết cả bài (${prog.totalDone}/9)</button>`:''}
          <button type="button" class="btn sm" id="hsum-next-btn">${escHtml(primaryTxt)}</button>
        </div>
      </div>
    `);
    const rb=$('#hsum-retry-btn');
    if(rb)rb.onclick=()=>{
      if(typeof closeModal==='function')closeModal();
      if(wrongList.length&&typeof options.onRetryWrong==='function')options.onRetryWrong();
      else if(typeof options.onRetryAll==='function')options.onRetryAll();
    };
    const lb=$('#hsum-lesson-btn');
    if(lb)lb.onclick=()=>{if(typeof closeModal==='function')closeModal();goView('lesson');};
    const lsb=$('#hsum-lesson-sum-btn');
    if(lsb)lsb.onclick=()=>showLessonSummary(lid);
    const nb=$('#hsum-next-btn');
    if(nb)nb.onclick=()=>{
      if(typeof closeModal==='function')closeModal();
      if(showNextBtn){showLessonSummary(lid);return;}
      if(nextSec&&typeof goView==='function')goView(nextSec.key);
    };
  }
}
window.showSectionSummary=showSectionSummary;

function showLessonSummary(lessonId){
  const lid=lessonId||store.activeLessonId;
  const l=(typeof LESSONS!=='undefined'&&Array.isArray(LESSONS))?LESSONS.find(x=>x.id===lid):null;
  if(!l)return;
  const prog=getLessonSectionProgress(l);
  const statsMap=(store.lessonSectionStats&&store.lessonSectionStats[lid])||{};
  const showSections=LS_ALL_SECTIONS.filter(s=>s.req||prog.doneMap[s.key]||statsMap[s.key]);
  let totalDur=0,totalErr=0,scoreSum=0,scoreCnt=0;
  const allWrong=[];
  const rowsHtml=showSections.map(s=>{
    const st=statsMap[s.key];
    const isDone=!!prog.doneMap[s.key];
    if(st){
      totalDur+=(Number(st.durationSec)||0);
      totalErr+=(Number(st.errors)||0);
      scoreSum+=(Number(st.accuracy)||0);
      scoreCnt++;
      if(Array.isArray(st.wrongItems)&&st.wrongItems.length){
        allWrong.push({label:s.label,items:st.wrongItems});
      }
    }
    const leftTxt=st?`${st.doneCount}/${st.totalCount} ${s.unit}`:(isDone?'Đã hoàn thành':'Chưa học');
    const rightTxt=st?(st.scoreLabel?`${st.scoreLabel} · Sai ${st.errors} lỗi`:`Sai ${st.errors} lỗi (Độ chính xác: ${st.accuracy}%)`):(isDone?'Đã hoàn thành (100%)':'Chưa có thống kê');
    const barW=st?st.accuracy:(isDone?100:0);
    return `<div class="hls-row ${isDone?'done':''}">
      <span class="hls-ic"><svg class="ic"><use href="${s.icon}"/></svg></span>
      <div class="hls-mid">
        <div class="hls-top"><b>${escHtml(s.label)}</b><span>${escHtml(leftTxt)}</span><span class="hls-err">${escHtml(rightTxt)}</span></div>
        <div class="bar hls-bar"><i style="width:${barW}%"></i></div>
      </div>
      <span class="hls-chk ${isDone?'done':''}">${isDone?'✓':'○'}</span>
    </div>`;
  }).join('');

  const avgScore=scoreCnt?Math.round(scoreSum/scoreCnt):(prog.reqDone>=5?100:prog.pct);
  const overallMsg=prog.reqDone>=5
    ?`Tốt! Bạn đã nắm vững nội dung bài học.${totalErr>0?` Hãy ôn lại ${totalErr} lỗi nhỏ để ghi nhớ chắc hơn nhé.`:' Mình chúc mừng bạn đã đạt kết quả rất ấn tượng!'}`
    :`Bạn đã hoàn thành ${prog.reqDone}/5 mục bắt buộc (${prog.totalDone}/9 mục toàn bài). Hãy học nốt các mục còn lại để mở khóa bài tiếp theo nhé.`;
  const wrongGroupsHtml=allWrong.length
    ? `<div class="hls-wrong-grid">${allWrong.slice(0,4).map(g=>`<div class="hls-wg"><b>${escHtml(g.label)} (${g.items.length})</b><span>${g.items.slice(0,3).map(w=>escHtml(w.zh||w.vi||w.note)).join(', ')}</span></div>`).join('')}</div>`
    : '<div class="hsum-ok-note">✓ Bạn chưa có lỗi cần ôn lại trong bài học này!</div>';

  const list=(typeof getCourseLessons==='function'&&l.courseId)?getCourseLessons(l.courseId,true):[];
  const idx=list.findIndex(x=>x.id===l.id);
  const nextL=(idx>=0&&idx+1<list.length)?list[idx+1]:null;

  if(typeof playSfx==='function')playSfx('done');
  if(typeof openModal==='function'){
    openModal(`
      <div class="hsum-wrap hls-wrap">
        <div class="hls-banner">
          ${_hsumTrophySvg()}
          <div>
            <span class="hls-badge">Tổng kết bài học</span>
            <h3>${escHtml(l.code||'Bài học')}${l.titleZh?': '+escHtml(l.titleZh):''}</h3>
            <p>${escHtml(l.titleVi||'')}</p>
          </div>
        </div>
        <div class="hls-status-card">
          <div class="hls-st-l">
            <b>${prog.reqDone>=5?'✓ Hoàn thành bài học!':'Tiến độ bài học'}</b>
            <span>Bạn đã hoàn thành ${prog.reqDone}/5 mục bắt buộc (${prog.totalDone}/9 toàn bài)${prog.reqDone>=5?' và có thể chuyển sang bài tiếp theo.':'.'}</span>
          </div>
          ${_hsumRingSvg(prog.pct,`${prog.pct}<small>%</small>`,'Tiến độ')}
        </div>
        <div class="hls-detail-card">
          <div class="hsum-whead"><b>Kết quả chi tiết</b><span class="hsum-cnt-pill">Thời gian học: ${_fmtHsumDur(totalDur)}</span></div>
          <div class="hls-rows">${rowsHtml}</div>
        </div>
        <div class="hls-pair">
          <div class="hls-score-box"><span>Điểm tổng kết bài</span><b>${avgScore}<small> / 100</small></b></div>
          <div class="hls-eval-box"><b>Đánh giá chung</b><p>${escHtml(overallMsg)}</p></div>
        </div>
        <div class="hsum-wrong-card">
          <div class="hsum-whead"><b>Những nội dung cần ôn lại</b><span class="hsum-cnt-pill">${totalErr} lỗi</span></div>
          ${wrongGroupsHtml}
        </div>
        <div class="hsum-btns">
          <div class="hsum-btn-pair">
            <button type="button" class="btn ghost sm" id="hls-review-btn"><svg class="ic"><use href="#i-refresh"/></svg>Ôn lại bài học</button>
            <button type="button" class="btn ghost sm" id="hls-close-btn">Đóng</button>
          </div>
          ${nextL?`<button type="button" class="btn sm" id="hls-next-btn">Học bài tiếp theo: ${escHtml(nextL.code||nextL.titleVi||'Bài mới')} →</button>`:''}
        </div>
      </div>
    `);
    const rb=$('#hls-review-btn');
    if(rb)rb.onclick=()=>{if(typeof closeModal==='function')closeModal();goView('lesson');};
    const cb=$('#hls-close-btn');
    if(cb)cb.onclick=()=>{if(typeof closeModal==='function')closeModal();};
    const nb=$('#hls-next-btn');
    if(nb&&nextL){
      nb.onclick=async ()=>{
        if(typeof closeModal==='function')closeModal();
        if(typeof getLessonDownloadState==='function'&&getLessonDownloadState(nextL)==='available'&&typeof downloadLessonOnDemand==='function'){
          await downloadLessonOnDemand(nextL.id);
        }
        if(typeof setActiveLesson==='function')setActiveLesson(nextL.id);
        if(typeof goView==='function')goView('lesson');
      };
    }
  }
}
window.showLessonSummary=showLessonSummary;
function markLessonSectionDone(lessonId,key,silent){
  const lid=lessonId||store.activeLessonId;
  if(!lid||!key)return;
  if(!store.lessonSections||typeof store.lessonSections!=='object')store.lessonSections={};
  const prev=store.lessonSections[lid]||{};
  if(prev[key])return;
  store.lessonSections[lid]=Object.assign({},prev,{[key]:Date.now()});
  const l=LESSONS.find(x=>x.id===lid);
  const prog=getLessonSectionProgress(l||{id:lid});
  if(prog.reqDone>=LS_REQ_KEYS.length&&typeof markLessonCompleted==='function'){
    markLessonCompleted(lid);
  }else{
    saveStore(store);
  }
  if(!silent&&curView==='lesson'&&typeof renderLessonDetail==='function'){
    renderLessonDetail();
  }
}

function renderLessonDetail(){
  const l=LESSONS.find(x=>x.id===store.activeLessonId);
  const hero=$('#ls-hero-txt'),heroZh=$('#ls-hero-zh');
  const dlCard=$('#ls-download-card');
  const pill=$('#ls-status-pill'),topDl=$('#ls-top-dl-btn'),tbBtn=$('#ls-read-tb-btn'),progBar=$('#ls-prog-bar'),progCnt=$('#ls-prog-cnt'),progIc=$('#ls-prog-ic'),progNote=$('#ls-prog-note'),reqCnt=$('#ls-req-cnt'),extCnt=$('#ls-ext-cnt'),nextBtn=$('#ls-next-lesson-cta');
  if(!l){
    if(hero)hero.innerHTML='<span class="ls-course-pill">Chưa có bài</span><h1>Chưa chọn bài học</h1><div class="ls-stats-row"><span class="ls-stat-pill">Hãy chọn bài trong Thư viện</span></div>';
    if(heroZh)heroZh.textContent='你好!';
    if(dlCard){dlCard.classList.add('hide');dlCard.innerHTML='';}
    if(pill){pill.className='ls-status-pill na';delete pill.dataset.dlLesson;pill.innerHTML='<span class="ls-na-dot">•</span><span class="ls-sp-txt"><b>Chưa chọn bài</b><small>Vào Thư viện</small></span>';}
    if(topDl){topDl.className='ls-ic-btn ls-dl-pill';delete topDl.dataset.dlLesson;}
    if(tbBtn)tbBtn.classList.add('hide');
    if(progBar)progBar.style.width='0%';
    if(progCnt)progCnt.innerHTML='0/9 · <b class="ls-prog-pct">0%</b>';
    if(progIc){progIc.className='ls-prog-ic';progIc.textContent='';}
    if(reqCnt){reqCnt.textContent='Đã hoàn thành: 0/5';reqCnt.classList.remove('done');}
    if(extCnt)extCnt.textContent='Tùy chọn · Tính vào 100%';
    if(progNote)progNote.textContent='Hãy chọn một bài học trong Thư viện để bắt đầu.';
    if(nextBtn)nextBtn.classList.add('hide');
    return;
  }
  const dlState=typeof getLessonDownloadState==='function'?getLessonDownloadState(l):(isLessonContentLoaded(l)?'downloaded':'unavailable');
  const prog=getLessonSectionProgress(l);
  if(pill){
    if(dlState==='available'){
      pill.className='ls-status-pill dl';
      pill.dataset.dlLesson=l.id;
      pill.innerHTML='<span class="ls-dl-dot">⬇</span><span class="ls-sp-txt"><b>Chưa tải về</b><small>Nhấn để tải ngay</small></span><svg class="ic ls-sp-chv"><use href="#i-chev"></use></svg>';
    }else if(dlState==='unavailable'){
      pill.className='ls-status-pill na';
      delete pill.dataset.dlLesson;
      pill.innerHTML='<span class="ls-na-dot">•</span><span class="ls-sp-txt"><b>Chưa có dữ liệu</b><small>Đang cập nhật</small></span>';
    }else{
      pill.className='ls-status-pill ok';
      delete pill.dataset.dlLesson;
      pill.innerHTML='<span class="ls-ok-dot">✓</span><span class="ls-sp-txt"><b>Đã tải về</b><small>Học offline được</small></span><svg class="ic ls-sp-chv"><use href="#i-chev"></use></svg>';
    }
  }
  if(topDl){
    if(dlState==='available'){topDl.className='ls-ic-btn ls-dl-pill dl';topDl.dataset.dlLesson=l.id;topDl.title='Nhấn để tải bài offline';}
    else if(dlState==='downloaded'){topDl.className='ls-ic-btn ls-dl-pill ok';delete topDl.dataset.dlLesson;topDl.title='Đã tải về · Học offline được';}
    else{topDl.className='ls-ic-btn ls-dl-pill';delete topDl.dataset.dlLesson;topDl.title='Chưa có dữ liệu';}
  }
  if(tbBtn){
    if(l.courseId){tbBtn.classList.remove('hide');tbBtn.dataset.courseId=l.courseId;tbBtn.dataset.lessonId=l.id;}
    else tbBtn.classList.add('hide');
  }
  if(progBar)progBar.style.width=prog.pct+'%';
  if(progCnt)progCnt.innerHTML=`${prog.totalDone}/9 · <b class="ls-prog-pct">${prog.pct}%</b>`;
  if(progIc){
    if(prog.reqDone>=5){progIc.className='ls-prog-ic done';progIc.textContent='✓';}
    else{progIc.className='ls-prog-ic';progIc.textContent='';}
  }
  if(reqCnt){
    reqCnt.innerHTML=`Đã hoàn thành: ${prog.reqDone}/5${prog.reqDone>=5?' <span class="ls-ok-dot" aria-hidden="true">✓</span>':''}`;
    reqCnt.classList.toggle('done',prog.reqDone>=5);
  }
  if(extCnt)extCnt.textContent=prog.extDone>0?`Tùy chọn · ${prog.extDone}/4 · Tính vào 100%`:'Tùy chọn · Tính vào 100%';
  if(progNote){
    if(dlState==='available')progNote.textContent='Nhấn Tải về để mở khóa đầy đủ 9 phần học của bài.';
    else if(prog.reqDone>=5)progNote.textContent='Đã hoàn thành 5 mục bắt buộc · Có thể qua bài tiếp theo';
    else progNote.textContent=`Hoàn thành ${prog.reqDone}/5 mục bắt buộc · Còn ${5-prog.reqDone} mục để qua bài tiếp theo`;
  }
  const wList=getLessonVocab(l);
  const gList=Object.values(l.grammarPoints||{});
  const cList=l.chars||[];
  if(heroZh){
    const rawZh=(l.titleZh||'你好').replace(/[。？！?!\s]+$/,'').slice(0,4);
    heroZh.textContent=(rawZh||'你好')+'!';
  }
  const illusImg=$('#ls-illus-img'),illusSvg=$('#ls-illus svg');
  const coverUrl=(typeof LESSON_COVERS!=='undefined'&&LESSON_COVERS&&l.id)?LESSON_COVERS[l.id]:'';
  if(illusImg){
    if(coverUrl){
      illusImg.dataset.fallbackUsed='';
      illusImg.onerror=()=>{
        if(!illusImg.dataset.fallbackUsed&&typeof window.getLessonCoverFallback==='function'){
          illusImg.dataset.fallbackUsed='1';
          const fb=window.getLessonCoverFallback(l.id);
          if(fb){illusImg.src=fb;return;}
        }
        illusImg.classList.add('hide');
        if(illusSvg)illusSvg.classList.remove('hide');
      };
      illusImg.onload=()=>{
        illusImg.classList.remove('hide');
        if(illusSvg)illusSvg.classList.add('hide');
      };
      illusImg.src=coverUrl;
      illusImg.alt=l.titleVi||l.titleZh||'Minh họa bài học';
      illusImg.classList.remove('hide');
      if(illusSvg)illusSvg.classList.add('hide');
    }else{
      illusImg.onerror=null;
      illusImg.removeAttribute('src');
      illusImg.classList.add('hide');
      if(illusSvg)illusSvg.classList.remove('hide');
    }
  }
  if(hero){
    const c=(typeof COURSES!=='undefined')?COURSES.find(x=>x.id===l.courseId):null;
    const courseLabel=c?(c.group==='hanngu'?(c.title||'Giáo trình').replace(/\s+(\d+)$/,' · Quyển $1'):(c.title||'Giáo trình')):'Giáo trình Hán ngữ';
    const baseVi=l.titleVi||'Chưa đặt tên';
    const fullTitle=(l.code&&!baseVi.includes(l.code))?`${l.code} · ${baseVi}`:baseVi;
    hero.innerHTML=`<span class="ls-course-pill">${escHtml(courseLabel)}</span><h1>${escHtml(fullTitle)}</h1><div class="ls-stats-row"><span class="ls-stat-pill"><svg class="ic" style="width:12px;height:12px"><use href="#i-book"></use></svg>${wList.length} từ mới</span><span class="ls-stat-pill"><svg class="ic" style="width:12px;height:12px"><use href="#i-bolt"></use></svg>${gList.length} ngữ pháp</span><span class="ls-stat-pill"><svg class="ic" style="width:12px;height:12px"><use href="#i-brush"></use></svg>${cList.length} chữ Hán</span></div>`;
  }
  if(dlCard){
    if(dlState==='available'){
      dlCard.classList.remove('hide');
      dlCard.style.background='var(--surface2)';
      dlCard.style.borderColor='var(--accent)';
      dlCard.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div style="flex:1;min-width:190px"><b>Bài học chưa được tải xuống</b><div class="small muted" style="margin-top:2px">Dữ liệu có sẵn trong ứng dụng (Từ mới, Bài khóa, Ngữ pháp, Chữ Hán). Tải bài này khi cần học để giữ ứng dụng luôn nhẹ.</div></div><button type="button" class="btn sm" data-dl-lesson="${escHtml(l.id)}" style="white-space:nowrap">⬇ Tải bài này</button></div>`;
    }else{
      dlCard.classList.add('hide');
      dlCard.innerHTML='';
    }
  }
  const gUl=$('#ls-goals');
  if(gUl){
    const gs=(l.goals&&l.goals.length)?l.goals:['Học từ vựng trọng tâm','Nắm vững ngữ pháp chính','Nghe và nói theo bài khóa'];
    gUl.innerHTML=gs.slice(0,3).map(g=>`<li><span class="gchk">✓</span><span>${escHtml(g)}</span></li>`).join('');
  }
  const subV=$('#ls-sub-vocab');if(subV)subV.textContent=wList.length?`${wList.length} từ mới · Flashcard · Ghi nhớ`:'Học từ vựng · Flashcard · Ghi nhớ';
  const pvV=$('#ls-pv-vocab');
  if(pvV)pvV.innerHTML=wList.slice(0,3).map(w=>`<i>${escHtml(w.zh)}</i>`).join('')+(wList.length>3?'<span class="small muted">…</span>':'');
  const subG=$('#ls-sub-gram');if(subG)subG.textContent=gList[0]?gList[0].title:'Cấu trúc và cách sử dụng';
  const pvG=$('#ls-pv-gram');
  if(pvG){const ex=gList[0]?(gList[0].ex||gList[0].title):l.titleZh;pvG.innerHTML=ex?`<i>${escHtml(ex.split(/[。！？]/)[0])}</i>`:'';}
  const pvS=$('#ls-pv-spk');
  if(pvS){
    const pys=(l.py||'').split(/\s+/).filter(Boolean).slice(0,3);
    const fallbackPys=wList.slice(0,3).map(w=>w.py).filter(Boolean);
    const showPys=pys.length?pys:fallbackPys;
    pvS.innerHTML=showPys.map(p=>`<i>${escHtml(p)}</i>`).join('');
  }
  const subW=$('#ls-sub-wri');if(subW)subW.textContent=cList.length?`${cList.length} chữ Hán · Thứ tự nét`:'Thứ tự nét · Ô viết chữ Hán';
  const pvW=$('#ls-pv-wri');
  if(pvW)pvW.innerHTML=cList.slice(0,4).map(ch=>`<i>${escHtml(typeof ch==='string'?ch:(ch.ch||''))}</i>`).join('')+(cList.length>4?'<span class="small muted">…</span>':'');
  const startCta=$('#ls-start-cta'),ctaSpan=$('#ls-start-cta span');
  if(startCta){
    if(dlState==='available'){
      startCta.removeAttribute('data-go');
      startCta.dataset.dlAndStart=l.id;
      if(ctaSpan)ctaSpan.textContent=`Tải & bắt đầu học ${(l.code||'bài').toLowerCase()}`;
    }else{
      startCta.setAttribute('data-go','vocab');
      delete startCta.dataset.dlAndStart;
      if(ctaSpan)ctaSpan.textContent=`Bắt đầu học ${(l.code||'bài').toLowerCase()}`;
    }
  }
  // Audio đối chiếu (8D)
  const audioCard=$('#ls-audio-card');
  if(audioCard){audioCard.classList.add('hide');audioCard.innerHTML='';}
  // SBT & Đáp án (8D) — bỏ hiển thị khối rườm rà ở màn chi tiết bài học
  const wbCard=$('#ls-workbook-card');
  if(wbCard){wbCard.classList.add('hide');wbCard.innerHTML='';}
  // Mở rộng tùy chọn Hack não & Sơ đồ tư duy (8D)
  const extCard=$('#ls-ext-card');
  if(extCard){
    const ext=l.optionalExtensions||{};
    const hn=Array.isArray(ext.hackNaoIds)?ext.hackNaoIds:[];
    const mm=Array.isArray(ext.mindMapRootChars)?ext.mindMapRootChars:[];
    const hasVocabExt=hasCurriculumVocabExtensions(l.id)&&wList.some(w=>extractUniqueHanzi(w.zh).length);
    if(!hasVocabExt&&!hn.length&&!mm.length){extCard.classList.add('hide');extCard.innerHTML='';}
    else{
      extCard.classList.remove('hide');
      const show=store.settings.showOptionalExt!==false;
      const info=hasVocabExt?'Mở Từ vựng để xem Hack não và Sơ đồ tư duy theo từng thẻ.':`${hn.length?`<div><b>Hack não 3000 chữ Hán:</b> ${hn.length} mục liên kết trong thẻ từ vựng</div>`:''}${mm.length?`<div style="margin-top:4px"><b>Sơ đồ tư duy 3300 chữ Hán:</b> Chữ gốc ${mm.map(x=>escHtml(x)).join(', ')}</div>`:''}`;
      extCard.innerHTML=`<div class="barrow" style="justify-content:space-between"><b>Mở rộng tùy chọn (Không ép SRS)</b><button type="button" class="chip" id="ls-tog-opt-ext">${show?'Đang bật':'Đang ẩn'}</button></div>`+(show?`<div class="small" style="margin-top:6px">${info}</div>`:'<div class="small muted" style="margin-top:4px">Đã ẩn phần mở rộng (bấm “Đang ẩn” để xem lại).</div>');
    }
  }

  const setAct=(id,sub,hasData,isDone,todoLabel,isExt)=>{
    const el=$('#'+id);if(!el)return;
    const sp=el.querySelector('.tx span');if(sp)sp.textContent=sub;
    el.classList.toggle('done',!!isDone);
    const st=el.querySelector('.st');
    if(st){
      if(isDone){
        st.className='st done';st.innerHTML='<span class="ls-ok-dot">✓</span><b>Đã hoàn thành</b>';
      }else if(isExt){
        st.className='st todo';st.textContent='Chưa học';
      }else if(!hasData){
        st.className='st todo';st.innerHTML='<span class="ring"></span>Chưa có dữ liệu';
      }else{
        st.className='st todo';st.innerHTML='<span class="ring"></span>'+(todoLabel||'Chưa học');
      }
    }
  };
  setAct('ls-act-vocab', WORDS.length?`${WORDS.length} từ vựng · Flashcard · Ghi nhớ`:'Chưa có từ vựng (nhấn để bổ sung)', WORDS.length>0, prog.doneMap.vocab, 'Chưa học', false);
  const gCnt=Object.keys(GRAMMAR_POINTS||{}).length;
  setAct('ls-act-gram', gCnt?`${gCnt} cấu trúc và cách sử dụng`:'Cấu trúc và cách sử dụng', gCnt>0, prog.doneMap.grammar, 'Chưa học', false);
  setAct('ls-act-lis', (WORDS.length||LISTEN_DIALOG.length)?'Nghe hội thoại · Bài tập nghe hiểu':'Chưa có dữ liệu nghe', (WORDS.length+LISTEN_DIALOG.length)>0, prog.doneMap.listen, 'Chưa học', false);
  setAct('ls-act-spk', (WORDS.length||SENT.length)?'Phát âm · Đọc theo · Ghi âm':'Chưa có câu luyện đọc', (WORDS.length+SENT.length)>0, prog.doneMap.speak, 'Chưa học', false);
  const gqCnt=(typeof GRAMMAR_QUIZ!=='undefined'&&Array.isArray(GRAMMAR_QUIZ))?GRAMMAR_QUIZ.length:0;
  setAct('ls-act-ex', WORDS.length?`Luyện tập tổng hợp · Kiểm tra (${WORDS.length} từ)`:(gqCnt?`Đề trắc nghiệm tổng hợp (${gqCnt} câu)`:'Cần có ít nhất 2 từ vựng'), WORDS.length>=2||gqCnt>0, prog.doneMap.exercise, 'Chưa làm', false);

  setAct('ls-act-dlg', LISTEN_DIALOG.length?`Đọc · Nghe · ${LISTEN_DIALOG.length} câu`:'Đọc · Nghe · Hiểu hội thoại', LISTEN_DIALOG.length>0, prog.doneMap.dialog, '', true);
  setAct('ls-act-copy', LISTEN_DIALOG.length?`Chép ${LISTEN_DIALOG.length} câu · Bút / Tẩy`:'Nghe và chép · Chép theo mẫu', (LISTEN_DIALOG.length+SENT.length)>0, prog.doneMap.copy, '', true);
  setAct('ls-act-wri', CHARS.length?`Thứ tự nét · ${CHARS.length} chữ Hán`:'Thứ tự nét · Ô viết chữ Hán', CHARS.length>0, prog.doneMap.writing, '', true);
  setAct('ls-act-trans', (LISTEN_DIALOG.length||SENT.length)?`Việt ↔ Trung · ${(LISTEN_DIALOG.length||SENT.length)} câu`:'Việt – Trung · Trung – Việt', (LISTEN_DIALOG.length+SENT.length)>0, prog.doneMap.trans, '', true);

  if(nextBtn){
    const list=(typeof getCourseLessons==='function'&&l.courseId)?getCourseLessons(l.courseId,true):[];
    const idx=list.findIndex(x=>x.id===l.id);
    const nextL=(idx>=0&&idx+1<list.length)?list[idx+1]:null;
    if(nextL&&prog.reqDone>=5){
      nextBtn.classList.remove('hide');
      if(startCta)startCta.classList.add('hide');
      nextBtn.dataset.nextLesson=nextL.id;
      const nextDl=typeof getLessonDownloadState==='function'?getLessonDownloadState(nextL):'downloaded';
      nextBtn.innerHTML=`<span>Qua bài tiếp theo${nextDl==='available'?' · Tải ngay':''}</span><svg class="ic" style="width:18px;height:18px"><use href="#i-chev"></use></svg>`;
    }else{
      nextBtn.classList.add('hide');
      if(startCta)startCta.classList.remove('hide');
      delete nextBtn.dataset.nextLesson;
    }
  }
  const sumCta=$('#ls-summary-cta');
  if(sumCta){
    sumCta.classList.toggle('hide',prog.totalDone<1);
    sumCta.onclick=()=>showLessonSummary(l.id);
  }
}

/* ---------- Hub Song Song trên #home & Lộ trình học ---------- */
let curLearnTab='lessons';
let curLearnRoadmapCourseId=null;
let _obDraft=null;

function getCourseCoverUrl(courseId){
  return (typeof COURSE_COVER_MAP!=='undefined'&&courseId&&COURSE_COVER_MAP[courseId])?COURSE_COVER_MAP[courseId]:'';
}

function getCourseNextLesson(courseId){
  const ls=typeof getCourseLessons==='function'?getCourseLessons(courseId,true):[];
  if(!ls.length)return null;
  const prog=typeof getCourseProg==='function'?getCourseProg(courseId):{};
  if(prog.currentLessonId){
    const cur=ls.find(l=>l.id===prog.currentLessonId);
    if(cur)return cur;
  }
  const doneSet=new Set(prog.completedLessonIds||[]);
  return ls.find(l=>!doneSet.has(l.id))||ls[0];
}

function buildHubLevelPillsHtml(activeLv){
  let html='';
  for(let k=1;k<=6;k++){
    const hnCid=typeof getCourseIdForTrack==='function'?getCourseIdForTrack(k,'hanngu'):`course_hn_${k}`;
    const hskCid=typeof getCourseIdForTrack==='function'?getCourseIdForTrack(k,'hsk30'):`course_hsk30_lv${k}`;
    const hnDone=(typeof getCourseProg==='function'&&(getCourseProg(hnCid).completedLessonIds||[]).length>0);
    const hskDone=(typeof getCourseProg==='function'&&(getCourseProg(hskCid).completedLessonIds||[]).length>0);
    const hasProg=hnDone||hskDone;
    html+=`<button type="button" class="hm-lvl-pill ${k===activeLv?'on':''} ${hasProg?'has-prog':''}" data-hub-lvl="${k}" title="Chuyển cấp độ HSK ${k}">HSK ${k}</button>`;
  }
  return html;
}

function getTrackPairInfo(setup){
  const s=setup||(store&&store.learningSetup)||{completed:false,level:1,mode:'hanngu',activeTrack:'hanngu'};
  const lv=Math.min(6,Math.max(1,Number(s.level)||1));
  const hnId=typeof getCourseIdForTrack==='function'?getCourseIdForTrack(lv,'hanngu'):`course_hn_${lv}`;
  const hskId=typeof getCourseIdForTrack==='function'?getCourseIdForTrack(lv,'hsk30'):`course_hsk30_lv${lv}`;
  const hnC=COURSES.find(x=>x.id===hnId)||null;
  const hskC=COURSES.find(x=>x.id===hskId)||null;
  const hnSt=hnC&&typeof getCourseProgressStats==='function'?getCourseProgressStats(hnId):{doneCnt:0,total:15,pct:0};
  const hskSt=hskC&&typeof getCourseProgressStats==='function'?getCourseProgressStats(hskId):{doneCnt:0,total:15,pct:0};
  return {setup:s,lv,hnId,hskId,hnC,hskC,hnSt,hskSt};
}

function renderHomeTrackHub(){
  const box=$('#hm-track-hub');
  if(!box)return;
  const {setup,lv,hnId,hskId,hnSt,hskSt}=getTrackPairInfo();
  if(!setup.completed){
    box.innerHTML=`<div class="hm-track-card-wrap"><div class="hm-track-single">
      <div style="flex:1;min-width:0"><b>Chưa chọn trình độ HSK &amp; hệ giáo trình</b><div class="small muted" style="margin-top:2px">Chọn cấp độ HSK 1–6 và giáo trình Hán ngữ, NEW HSK 3.0 hoặc học song song.</div></div>
      <button type="button" class="btn sm" data-open-setup="1" style="white-space:nowrap">Thiết lập ngay ›</button>
    </div></div>`;
    return;
  }
  const mkRow=(cid,covCls,covBig,covSmall,title,st)=>{
    const isOn=store.activeCourseId===cid;
    const covUrl=getCourseCoverUrl(cid);
    const covHtml=covUrl
      ?`<span class="hm-tr-cov has-img"><img src="${covUrl}" alt="${escHtml(title)}"/></span>`
      :`<span class="hm-tr-cov ${covCls}"><span>${covBig}<br><small>${covSmall}</small></span></span>`;
    const isDone=st.total>0&&st.doneCnt>=st.total;
    const tagTxt=isDone?'Hoàn thành':(isOn?'Đang học':'');
    return `<button type="button" class="hm-track-row ${isOn?'on':''}" data-switch-course="${escHtml(cid)}">
      ${covHtml}
      <div class="hm-tr-mid">
        <div class="hm-tr-title-line"><span class="hm-tr-title">${escHtml(title)}</span>${tagTxt?`<span class="hm-tr-tag ${isDone?'done':'on'}">${tagTxt}</span>`:''}</div>
        <div class="hm-tr-prog-line"><div class="hm-tc-bar"><i style="width:${st.pct}%"></i></div><span class="hm-tr-stat">${st.doneCnt}/${st.total} bài</span><b class="hm-tr-pct">${st.pct}%</b></div>
      </div>
      <span class="hm-tr-chev" aria-hidden="true">›</span>
    </button>`;
  };
  if(setup.mode==='parallel'){
    box.innerHTML=`<div class="hm-track-card-wrap">
      <div class="hm-track-hd">
        <div class="hm-track-hd-left"><span class="hm-lvl-badge">HSK ${lv}</span><b>Học song song</b></div>
        <button type="button" class="free-pill" data-open-setup="1">Đổi giáo trình</button>
      </div>
      <div class="hm-track-rows">
        ${mkRow(hnId,'hn','汉语','Q'+lv,`Giáo trình Hán ngữ – Quyển ${lv}`,hnSt)}
        ${mkRow(hskId,'hsk','HSK','Cấp '+lv,`NEW HSK 3.0 – Cấp ${lv}`,hskSt)}
      </div>
      <div class="hm-track-note"><span style="font-weight:800;flex-shrink:0">ⓘ</span><span>Tiến độ Giáo trình Hán ngữ và NEW HSK 3.0 tách riêng 100%, không ảnh hưởng lẫn nhau.</span></div>
    </div>`;
    return;
  }
  const singleId=setup.mode==='hsk30'?hskId:hnId;
  const singleSt=setup.mode==='hsk30'?hskSt:hnSt;
  const singleTitle=setup.mode==='hsk30'?`NEW HSK 3.0 – Cấp ${lv}`:`Giáo trình Hán ngữ – Quyển ${lv}`;
  box.innerHTML=`<div class="hm-track-card-wrap">
    <div class="hm-track-hd">
      <div class="hm-track-hd-left"><span class="hm-lvl-badge">HSK ${lv}</span><b>Giáo trình đang học</b></div>
      <div class="hm-track-single-acts">
        <button type="button" class="free-pill" data-enable-parallel="1">Học song song</button>
        <button type="button" class="free-pill" data-open-setup="1">Đổi giáo trình</button>
      </div>
    </div>
    <div class="hm-track-rows single">
      ${mkRow(singleId,setup.mode==='hsk30'?'hsk':'hn',setup.mode==='hsk30'?'HSK':'汉语',setup.mode==='hsk30'?'Cấp '+lv:'Q'+lv,singleTitle,singleSt)}
    </div>
  </div>`;
}

function setLearnTab(tab){
  curLearnTab=(tab==='books')?'books':'lessons';
  const tabs=$$('#learn-mode-tabs button[data-learntab]');
  tabs.forEach(b=>b.classList.toggle('on',b.dataset.learntab===curLearnTab));
  const pLessons=$('#learn-pane-lessons'),pBooks=$('#learn-pane-books');
  if(pLessons)pLessons.classList.toggle('hide',curLearnTab!=='lessons');
  if(pBooks)pBooks.classList.toggle('hide',curLearnTab!=='books');
  if(curLearnTab==='lessons')renderLearnRoadmap();
  else renderLibrary();
}

function renderLearnTrackSwitcher(){
  const box=$('#learn-track-switcher');
  if(!box)return;
  const {setup,lv,hnId,hskId,hnSt,hskSt}=getTrackPairInfo();
  const actC=COURSES.find(x=>x.id===store.activeCourseId);
  if(setup.mode==='parallel'){
    box.innerHTML=`<div class="learn-track-bar">
      <div class="learn-track-tabs">
        <button type="button" class="learn-track-pill ${store.activeCourseId===hnId?'on':''}" data-switch-course="${escHtml(hnId)}">
          <span>Hán ngữ Q${lv}</span><span class="lt-pct">${hnSt.doneCnt}/${hnSt.total} · ${hnSt.pct}%</span>
        </button>
        <button type="button" class="learn-track-pill ${store.activeCourseId===hskId?'on':''}" data-switch-course="${escHtml(hskId)}">
          <span>HSK 3.0 Cấp ${lv}</span><span class="lt-pct">${hskSt.doneCnt}/${hskSt.total} · ${hskSt.pct}%</span>
        </button>
      </div>
      <button type="button" class="free-pill" data-open-setup="1">Đổi trình độ</button>
    </div>`;
    return;
  }
  const st=actC&&typeof getCourseProgressStats==='function'?getCourseProgressStats(actC.id):{doneCnt:0,total:0,pct:0};
  box.innerHTML=`<div class="learn-track-bar">
    <div class="small"><b>HSK ${lv}</b> · ${escHtml(actC?actC.title:'Lộ trình hiện tại')} <span class="muted">(${st.doneCnt}/${st.total} · ${st.pct}%)</span></div>
    <div class="hm-track-single-acts">
      <button type="button" class="free-pill" data-enable-parallel="1">Học song song</button>
      <button type="button" class="free-pill" data-open-setup="1">Đổi giáo trình</button>
    </div>
  </div>`;
}

function openLearningSetupModal(step=1,isFirstRun=false){
  const cur=store.learningSetup||{completed:false,level:1,mode:'hanngu',activeTrack:'hanngu'};
  if(!_obDraft||step===1&&!isFirstRun&&arguments.length>=2){
    _obDraft={level:cur.level||1,mode:cur.completed?(cur.mode||'hanngu'):'parallel'};
  }
  if(!_obDraft)_obDraft={level:cur.level||1,mode:cur.completed?(cur.mode||'hanngu'):'parallel'};

  const renderStep=()=>{
    const hskLevels=[
      [1,'HSK 1','Mới học · Làm quen tiếng Trung'],
      [2,'HSK 2','Sơ cấp · Giao tiếp cơ bản'],
      [3,'HSK 3','Trung cấp nền tảng'],
      [4,'HSK 4','Trung cấp'],
      [5,'HSK 5','Trung cấp nâng cao'],
      [6,'HSK 6','Cao cấp']
    ];
    if(step===1){
      openModal(`
        <div class="ob-head">
          <div class="ob-step-tag">Bước 1 / 2</div>
          <h2>Chọn cấp độ học</h2>
          <p>Xác định trình độ phù hợp để bắt đầu lộ trình Hanyu AI</p>
        </div>
        <div class="ob-list">
          ${hskLevels.map(([lv,lbl,desc])=>`<button type="button" class="ob-card ${_obDraft.level===lv?'on':''}" data-ob-lvl="${lv}">
            <span class="ob-hsk-pill">HSK ${lv}</span>
            <div class="ob-card-txt"><b>${lbl}</b><span>${desc}</span></div>
            <span class="ob-radio"></span>
          </button>`).join('')}
        </div>
        <div class="ob-foot">
          <button type="button" class="btn ghost sm" id="ob-skip-btn">${cur.completed?'Hủy':'Để sau'}</button>
          <button type="button" class="btn sm" id="ob-next-btn">Tiếp tục ›</button>
        </div>
      `);
      $$('#hanyu-modal-box [data-ob-lvl]').forEach(btn=>{
        btn.onclick=()=>{
          _obDraft.level=Number(btn.dataset.obLvl)||1;
          $$('#hanyu-modal-box [data-ob-lvl]').forEach(x=>x.classList.toggle('on',x===btn));
        };
      });
      const skip=$('#ob-skip-btn');
      if(skip)skip.onclick=()=>{
        if(!store.learningSetup||!store.learningSetup.completed){
          store.learningSetup=Object.assign({},cur,{completed:true,updatedAt:Date.now()});
          saveStore(store);
          renderHomeTrackHub();
        }
        closeModal();
      };
      const next=$('#ob-next-btn');
      if(next)next.onclick=()=>{step=2;renderStep();};
      return;
    }

    const lv=_obDraft.level||1;
    const hnUrl=getCourseCoverUrl(`course_hn_${lv}`);
    const hskUrl=getCourseCoverUrl(`course_hsk30_lv${lv}`);
    const hnThumb=hnUrl?`<img class="ob-cov-img" src="${hnUrl}" alt=""/>`:`<span class="ob-hsk-pill">汉语</span>`;
    const hskThumb=hskUrl?`<img class="ob-cov-img" src="${hskUrl}" alt=""/>`:`<span class="ob-hsk-pill">HSK</span>`;
    const pairThumb=(hnUrl&&hskUrl)
      ?`<span class="ob-cov-pair"><img class="ob-cov-p1" src="${hnUrl}" alt=""/><img class="ob-cov-p2" src="${hskUrl}" alt=""/></span>`
      :`<span class="ob-hsk-pill">2 hệ</span>`;
    const modes=[
      ['hanngu',`Giáo trình Hán ngữ · Quyển ${lv}`,`Học tuần tự theo bộ Giáo trình Hán ngữ (Quyển ${lv})`,hnThumb,false],
      ['hsk30',`NEW HSK 3.0 · Cấp ${lv}`,`Học theo chuẩn giáo trình & SBT NEW HSK 3.0 Cấp ${lv}`,hskThumb,false],
      ['parallel','Học song song cả hai',`Theo dõi cả Hán ngữ Quyển ${lv} & NEW HSK 3.0 Cấp ${lv} với tiến độ tách riêng`,pairThumb,true]
    ];
    openModal(`
      <div class="ob-head">
        <button type="button" class="ob-back-link" id="ob-back-btn">‹ Chọn lại cấp độ</button>
        <div class="ob-step-tag">Bước 2 / 2 · HSK ${lv}</div>
        <h2>Chọn giáo trình muốn học</h2>
        <p>Chọn Giáo trình Hán ngữ, NEW HSK 3.0 hoặc học song song</p>
      </div>
      <div class="ob-list">
        ${modes.map(([m,t,d,covHtml,rec])=>`<button type="button" class="ob-card ${_obDraft.mode===m?'on':''}" data-ob-mode="${m}">
          ${covHtml}
          <div class="ob-card-txt"><b>${escHtml(t)}${rec?' <span class="ob-rec">Khuyên dùng</span>':''}</b><span>${escHtml(d)}</span></div>
          <span class="ob-radio"></span>
        </button>`).join('')}
      </div>
      <div class="ob-note-box">
        <span style="font-weight:800;flex-shrink:0">ⓘ</span>
        <span><b>Lưu ý:</b> Hai giáo trình có cấu trúc và nội dung bài học khác nhau, tiến độ mỗi bên được lưu riêng biệt và không ảnh hưởng lẫn nhau.</span>
      </div>
      <div class="ob-foot">
        <button type="button" class="btn ghost sm" id="ob-back2-btn">‹ Quay lại</button>
        <button type="button" class="btn sm" id="ob-confirm-btn">Xác nhận</button>
      </div>
    `);
    $$('#hanyu-modal-box [data-ob-mode]').forEach(btn=>{
      btn.onclick=()=>{
        _obDraft.mode=btn.dataset.obMode||'hanngu';
        $$('#hanyu-modal-box [data-ob-mode]').forEach(x=>x.classList.toggle('on',x===btn));
      };
    });
    const back1=$('#ob-back-btn'),back2=$('#ob-back2-btn');
    if(back1)back1.onclick=()=>{step=1;renderStep();};
    if(back2)back2.onclick=()=>{step=1;renderStep();};
    const conf=$('#ob-confirm-btn');
    if(conf)conf.onclick=()=>{
      const chosenMode=['hanngu','hsk30','parallel'].includes(_obDraft.mode)?_obDraft.mode:'hanngu';
      const chosenTrack=(chosenMode==='hsk30')?'hsk30':((chosenMode==='hanngu')?'hanngu':(cur.activeTrack==='hsk30'?'hsk30':'hanngu'));
      store.learningSetup={
        completed:true,
        level:lv,
        mode:chosenMode,
        activeTrack:chosenTrack,
        updatedAt:Date.now()
      };
      const targetCid=typeof getCourseIdForTrack==='function'?getCourseIdForTrack(lv,chosenTrack):`course_hn_${lv}`;
      _obDraft=null;
      closeModal();
      if(typeof switchToCourse==='function')switchToCourse(targetCid);
      else{
        store.activeCourseId=targetCid;
        saveStore(store);
        renderRoadmap();
      }
      const modeLbl=chosenMode==='parallel'?'Học song song Hán ngữ & HSK 3.0':(chosenMode==='hsk30'?'NEW HSK 3.0':'Giáo trình Hán ngữ');
      toast(`Đã chọn HSK ${lv} · ${modeLbl}`);
    };
  };
  renderStep();
}

/* ---------- Lộ trình học ngang trên #home ---------- */
function renderRoadmap(){
  renderHomeTrackHub();
  const wrap=$('#hm-road-in'),lbl=$('#hm-course-lbl'),freeBtn=$('#hm-free-btn');
  if(!wrap)return;
  const c=COURSES.find(x=>x.id===store.activeCourseId)||COURSES[0];
  if(freeBtn){
    freeBtn.classList.toggle('on',Boolean(store.freeExplore));
    freeBtn.textContent=`Học tự do: ${store.freeExplore?'Bật':'Tắt'}`;
  }
  if(!c){
    if(lbl)lbl.textContent='Chưa có giáo trình nào';
    wrap.innerHTML='<div class="small muted" style="padding:10px">Hãy vào tab <b>Học tập</b> để tạo giáo trình hoặc nhập PDF.</div>';
    return;
  }
  const lessons=getCourseLessons(c.id,true);
  if(lbl)lbl.textContent=`${c.title} (${lessons.length} bài)`;
  const actL=lessons.find(x=>x.id===store.activeLessonId)||lessons[0];
  if(actL){
    const subTxt=`${actL.code||'Bài 1'} • ${actL.titleVi||actL.titleZh||''}`;
    const hmLvl=$('#hm-lvl');if(hmLvl)hmLvl.textContent=subTxt;
    const contSub=$('#hm-cont-sub');
    if(contSub)contSub.textContent=subTxt;
  }
  if(!lessons.length){
    wrap.innerHTML='<div class="small muted" style="padding:10px">Giáo trình chưa có bài học nào. Bấm vào <b>Học tập</b> để thêm bài.</div>';
    return;
  }
  const prog=getCourseProg(c.id);
  const doneSet=new Set(prog.completedLessonIds||[]);
  let nextAssigned=false;
  const stepX=94, padL=52;
  const totalW=Math.max(340, padL*2 + (lessons.length-1)*stepX);
  wrap.style.width=totalW+'px';
  const waveY=idx=>{
    const pattern=[86,70,58,48,54,66,78,66,52,46,56,70,80,66,54];
    return pattern[idx % pattern.length];
  };
  const pts=lessons.map((l,idx)=>({x:padL+idx*stepX, y:waveY(idx)}));
  let dPath='';
  if(pts.length){
    dPath=`M ${pts[0].x-36} ${pts[0].y+16} Q ${pts[0].x-14} ${pts[0].y+4}, ${pts[0].x} ${pts[0].y}`;
    for(let i=0;i<pts.length-1;i++){
      const p1=pts[i], p2=pts[i+1], cx=(p1.x+p2.x)/2;
      dPath+=` C ${cx} ${p1.y}, ${cx} ${p2.y}, ${p2.x} ${p2.y}`;
    }
    const last=pts[pts.length-1];
    dPath+=` Q ${last.x+18} ${last.y-4}, ${last.x+38} ${last.y+10}`;
  }
  const svgBg=`<svg class="road-svg" width="${totalW}" height="186" viewBox="0 0 ${totalW} 186" fill="none">
    <defs>
      <linearGradient id="rmWaveGrad" x1="0" y1="0" x2="${totalW}" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#D78C79" stop-opacity="0.72"/>
        <stop offset="35%" stop-color="#DF9E8D" stop-opacity="0.65"/>
        <stop offset="100%" stop-color="#E5CFC2" stop-opacity="0.75"/>
      </linearGradient>
    </defs>
    <path d="${dPath}" stroke="url(#rmWaveGrad)" stroke-width="7" stroke-linecap="round"/>
  </svg>`;

  const nodesHtml=lessons.map((l,idx)=>{
    const isDone=doneSet.has(l.id);
    const isCurrent=l.id===store.activeLessonId||(!isDone&&!nextAssigned&&!lessons.some(x=>x.id===store.activeLessonId));
    if(isCurrent)nextAssigned=true;
    const unlocked=store.freeExplore||l.status==='published'||isDone||isCurrent||idx===0||(idx>0&&doneSet.has(lessons[idx-1].id));
    const cls=isDone?'done':(isCurrent?'now':'todo');
    const dot=isDone
      ?'<span class="dot"><svg class="ic"><use href="#i-check"></use></svg></span>'
      :(isCurrent
        ?'<span class="tag">Đang học</span><span class="dot"><svg class="ic f"><use href="#i-play"></use></svg></span>'
        :(unlocked?'<span class="dot">'+(idx+1)+'</span>':'<span class="dot"><svg class="ic"><use href="#i-lock"></use></svg></span>'));
    const lblHtml=`<b>${escHtml(l.code||('Bài '+(idx+1)))}</b><span class="nt">${escHtml(l.titleVi||l.titleZh||'Chưa đặt tên')}</span>`;
    const pt=pts[idx];
    return `<a class="node ${cls}" href="javascript:void(0)" data-rm-lid="${escHtml(l.id)}" data-unlocked="${unlocked?'1':'0'}" style="left:${pt.x}px;top:${pt.y-22}px;${unlocked?'':'opacity:.72'}">${dot}${isCurrent?`<span class="nm">${lblHtml}</span>`:lblHtml}</a>`;
  }).join('');
  wrap.innerHTML=svgBg+nodesHtml;
  if(curView==='roadmap'&&typeof renderFullRoadmap==='function')renderFullRoadmap(curRoadmapCourseId);
  if(curView==='learn'&&curLearnTab==='lessons'&&typeof renderLearnRoadmap==='function')renderLearnRoadmap();
}

let curRoadmapCourseId=null;
function renderRoadmapInto(cfg,courseId){
  const canvas=$(cfg.canvasSel),sub=$(cfg.subSel),freeBtn=$(cfg.freeSel);
  const doneEl=$(cfg.doneSel),pctEl=$(cfg.pctSel),barEl=$(cfg.barSel);
  const contBtn=$(cfg.contSel),contTxt=$(cfg.contTxtSel),openBtn=$(cfg.openCourseSel);
  if(!canvas)return null;
  const c=(courseId&&COURSES.find(x=>x.id===courseId))
    ||(cfg.isFull&&curRoadmapCourseId&&COURSES.find(x=>x.id===curRoadmapCourseId))
    ||COURSES.find(x=>x.id===store.activeCourseId&&x.id!=='course_sample_hn1'&&getCourseLessons(x.id,true).length>0)
    ||COURSES.find(x=>x.id==='course_hn_1')
    ||COURSES.find(x=>getCourseLessons(x.id,true).length>0)
    ||COURSES[0];
  if(freeBtn){
    freeBtn.classList.toggle('on',Boolean(store.freeExplore));
    freeBtn.textContent=`Học tự do: ${store.freeExplore?'Bật':'Tắt'}`;
  }
  if(!c){
    if(cfg.isFull)curRoadmapCourseId=null;
    else curLearnRoadmapCourseId=null;
    if(sub)sub.textContent='Chưa có giáo trình nào';
    if(doneEl)doneEl.textContent='0/0';
    if(pctEl)pctEl.textContent='0%';
    if(barEl)barEl.style.width='0%';
    if(contBtn){contBtn.disabled=true;delete contBtn.dataset.lessonId;}
    if(contTxt)contTxt.textContent='Chưa có bài học';
    canvas.style.aspectRatio='360 / 180';
    canvas.innerHTML='<div class="small muted" style="padding:24px;text-align:center">Hãy vào tab <b>Giáo trình</b> để chọn hoặc tạo giáo trình.</div>';
    return null;
  }
  if(cfg.isFull)curRoadmapCourseId=c.id;
  else curLearnRoadmapCourseId=c.id;
  if(openBtn)openBtn.dataset.courseId=c.id;

  const lessons=getCourseLessons(c.id,true);
  const stats=typeof getCourseProgressStats==='function'?getCourseProgressStats(c.id):{doneCnt:0,total:lessons.length,pct:0,doneSet:new Set()};
  const doneSet=stats.doneSet;
  if(sub)sub.textContent=`${c.title} · ${stats.total} bài học`;
  if(doneEl)doneEl.textContent=`${stats.doneCnt}/${stats.total}`;
  if(pctEl)pctEl.textContent=`${stats.pct}%`;
  if(barEl)barEl.style.width=stats.pct+'%';
  if(!lessons.length){
    if(contBtn){contBtn.disabled=true;delete contBtn.dataset.lessonId;}
    if(contTxt)contTxt.textContent='Chưa có bài học';
    canvas.style.aspectRatio='360 / 180';
    canvas.innerHTML='<div class="small muted" style="padding:24px;text-align:center">Giáo trình chưa có bài học nào.</div>';
    return c.id;
  }
  let activeL=(c.id===store.activeCourseId)?lessons.find(x=>x.id===store.activeLessonId):null;
  if(!activeL){
    const cp=getCourseProg(c.id);
    if(cp.currentLessonId)activeL=lessons.find(x=>x.id===cp.currentLessonId);
  }
  if(!activeL)activeL=lessons.find(x=>!doneSet.has(x.id))||lessons[0];
  const activeIdx=Math.max(0,lessons.findIndex(x=>x.id===activeL.id));
  if(contBtn){contBtn.disabled=false;contBtn.dataset.lessonId=activeL.id;}
  if(contTxt)contTxt.textContent=`Tiếp tục ${(activeL.code||'bài 1').toLowerCase()}`;

  const W=360,rowH=152,topPad=76,botPad=92;
  const rows=Math.ceil(lessons.length/3);
  const totalH=topPad+Math.max(0,rows-1)*rowH+botPad;
  canvas.style.aspectRatio=`${W} / ${totalH}`;
  const xs=[68,180,292];
  const pts=lessons.map((l,idx)=>{
    const r=Math.floor(idx/3),posInRow=idx%3;
    const col=(r%2===0)?posInRow:(2-posInRow);
    const dy=(r%2===0)?(posInRow===1?-10:6):(posInRow===1?8:-6);
    return {x:xs[col],y:topPad+r*rowH+dy};
  });
  let dFull=pts.length?`M ${pts[0].x} ${pts[0].y}`:'';
  let dDone=(pts.length&&activeIdx>0)?`M ${pts[0].x} ${pts[0].y}`:'';
  for(let i=0;i<pts.length-1;i++){
    const p1=pts[i],p2=pts[i+1];
    const r1=Math.floor(i/3),r2=Math.floor((i+1)/3);
    let seg='';
    if(r1===r2){
      const dcx=p2.x-p1.x;
      seg=` C ${(p1.x+dcx*0.45).toFixed(1)} ${p1.y}, ${(p1.x+dcx*0.55).toFixed(1)} ${p2.y}, ${p2.x} ${p2.y}`;
    }else if(p1.x>180){
      seg=` C 350 ${p1.y+10}, 350 ${p2.y-10}, ${p2.x} ${p2.y}`;
    }else{
      seg=` C 10 ${p1.y+10}, 10 ${p2.y-10}, ${p2.x} ${p2.y}`;
    }
    dFull+=seg;
    if(i<activeIdx)dDone+=seg;
  }
  const svgHtml=`<svg aria-hidden="true" class="rmf-svg" viewBox="0 0 ${W} ${totalH}">
    <path d="${dFull}" fill="none" stroke="#FFF8F2" stroke-opacity="0.9" stroke-width="11" stroke-linecap="round"/>
    <path d="${dFull}" fill="none" stroke="#ECC2B4" stroke-width="6.5" stroke-linecap="round"/>
    ${dDone?`<path d="${dDone}" fill="none" stroke="#D55649" stroke-opacity="0.88" stroke-width="6.5" stroke-linecap="round"/>`:''}
  </svg>`;
  const lockSvg='<svg aria-hidden="true" class="ic rmf-lock-ic" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M17 10h-1V8a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zm-7-2a2 2 0 0 1 4 0v2h-4V8z"/></svg>';
  const nodesHtml=lessons.map((l,idx)=>{
    const isDone=doneSet.has(l.id);
    const isCurrent=Boolean(activeL&&l.id===activeL.id);
    const unlocked=Boolean(store.freeExplore||l.status==='published'||isDone||isCurrent||idx===0||(idx>0&&doneSet.has(lessons[idx-1].id)));
    const stateCls=isCurrent?'now':(isDone?'done':(unlocked?'open':'locked'));
    const dot=isCurrent
      ?'<span class="rmf-tag">Đang học</span><span class="rmf-dot"><svg class="ic f"><use href="#i-play"></use></svg></span>'
      :(isDone
        ?'<span class="rmf-dot"><svg class="ic"><use href="#i-check"></use></svg></span>'
        :(unlocked
          ?'<span class="rmf-dot"></span>'
          :`<span class="rmf-dot">${lockSvg}</span>`));
    const pt=pts[idx];
    const leftPct=(pt.x/W*100).toFixed(3);
    const topPct=(pt.y/totalH*100).toFixed(3);
    return `<a class="rmf-node ${stateCls}" href="javascript:void(0)" data-rm-lid="${escHtml(l.id)}" data-unlocked="${unlocked?'1':'0'}" style="left:${leftPct}%;top:${topPct}%">${dot}<span class="rmf-lbl"><b>${escHtml(l.code||('Bài '+(idx+1)))}</b><span>${escHtml(l.titleVi||l.titleZh||'Chưa đặt tên')}</span></span></a>`;
  }).join('');
  canvas.innerHTML=svgHtml+nodesHtml;
  return c.id;
}

function renderFullRoadmap(courseId){
  return renderRoadmapInto({
    canvasSel:'#rmf-canvas',subSel:'#rmf-course-sub',freeSel:'#rmf-free-btn',
    doneSel:'#rmf-done-cnt',pctSel:'#rmf-pct',barSel:'#rmf-bar-fill',
    contSel:'#rmf-continue-btn',contTxtSel:'#rmf-continue-txt',openCourseSel:'#rmf-open-course-btn',isFull:true
  },courseId);
}

function renderLearnRoadmap(courseId){
  renderLearnTrackSwitcher();
  return renderRoadmapInto({
    canvasSel:'#learn-rm-canvas',subSel:'#learn-rm-sub',freeSel:'#learn-rm-free-btn',
    doneSel:'#learn-rm-done-cnt',pctSel:'#learn-rm-pct',barSel:'#learn-rm-bar-fill',
    contSel:'#learn-rm-continue-btn',contTxtSel:'#learn-rm-continue-txt',openCourseSel:'#learn-rm-open-course-btn',isFull:false
  },courseId);
}

/* ---------- Thư viện Giáo trình (#learn) ---------- */
function renderLibrary(){
  const wrap=$('#lib-courses-wrap');if(!wrap)return;
  if(!COURSES.length){
    wrap.innerHTML='<div class="card"><p class="muted small" style="margin:0">Chưa có giáo trình nào. Hãy nhấn <b>+ Tạo giáo trình</b> hoặc <b>Nhập PDF</b>.</p></div>';
    return;
  }
  const groups=[
    {key:'hanngu',title:'Giáo trình Hán ngữ (Hệ thống chính 1)'},
    {key:'hsk',title:'NEW HSK 3.0 (Hệ thống chính 2)'},
    {key:'kouyu',title:'Khẩu ngữ bổ trợ (Độc lập)'},
    {key:'hanzi',title:'Bổ trợ Chữ Hán (Hack não & Sơ đồ tư duy)'},
    {key:'personal',title:'Giáo trình cá nhân'}
  ];
  const qVal=($('#q')?$('#q').value:'').trim().toLowerCase();
  const activeFilter=(document.querySelector('#filters .chip.on')||{}).dataset?.filter||'all';
  let html='';
  groups.forEach(g=>{
    const items=COURSES.filter(c=>{
      if(c.group!==g.key)return false;
      if(activeFilter==='hsk'&&c.group!=='hsk')return false;
      if(activeFilter==='course'&&c.group!=='hanngu')return false;
      if(activeFilter==='kouyu'&&c.group!=='kouyu')return false;
      if(activeFilter==='hanzi'&&c.group!=='hanzi')return false;
      if(activeFilter==='mine'&&c.group!=='personal'&&c.id!=='course_sample_hn1')return false;
      if(qVal&&!(c.title+' '+(c.desc||'')+' '+(c.versionLabel||'')).toLowerCase().includes(qVal))return false;
      return true;
    });
    if(!items.length)return;
    html+=`<div style="margin-top:14px"><div class="h2"><h2>${g.title}</h2><span class="small muted">${items.length} bộ</span></div><div class="list" style="margin-top:8px">`;
    items.forEach(c=>{
      const ls=getCourseLessons(c.id,true);
      const cStats=typeof getCourseProgressStats==='function'?getCourseProgressStats(c.id):{doneCnt:0,total:ls.length,pct:0};
      const doneCnt=cStats.doneCnt,pct=cStats.pct;
      const isAct=c.id===store.activeCourseId;
      const pStats=typeof getCoursePackStats==='function'?getCoursePackStats(c.id):{total:ls.length,downloaded:0,available:0};
      const hasPackCourse=pStats.available>0||(pStats.downloaded>0&&ls.some(l=>typeof hasPackForLesson==='function'&&hasPackForLesson(l.id)));
      const metaPrefix=hasPackCourse?`Đã tải ${pStats.downloaded}/${pStats.total} bài · `:`${ls.length} bài · `;
      const covUrl=getCourseCoverUrl(c.id);
      const covHtml=covUrl
        ?`<span class="cover cover-img"><img src="${covUrl}" alt="${escHtml(c.title)}"/></span>`
        :`<span class="cover ${c.group==='hsk'?'c2':c.group==='personal'?'c4':c.group==='kouyu'?'c3':'c1'}"><span><big>${c.group==='hsk'?'HSK':c.group==='personal'?'Tôi':c.group==='kouyu'?'口语':'汉语'}</big>${escHtml(c.level||'Cơ bản')}</span></span>`;
      html+=`<div role="button" tabindex="0" class="course-card ${isAct?'active':''}" data-open-course="${escHtml(c.id)}">
        ${covHtml}
        <div class="mid" style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <b>${escHtml(c.title)}</b>
            ${isAct?'<span class="course-badge ok">Đang học</span>':''}
            ${c.status==='draft'?'<span class="course-badge draft">Nháp</span>':''}
          </div>
          <div class="meta">${metaPrefix}${escHtml(c.versionLabel||c.level||'Chưa gắn phiên bản')}</div>
          <div class="bar"><i style="width:${pct}%"></i></div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
          <span class="pc">${pct}%</span>
          ${ls.length>0?`<button type="button" class="btn sm" data-view-textbook="${escHtml(c.id)}" style="padding:6px 10px;font-size:12px;white-space:nowrap">📖 Xem giáo trình</button>`:''}
        </div>
      </div>`;
    });
    html+='</div></div>';
  });
  const _stripSearchAccents=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').replace(/ü/g,'u').replace(/Ü/g,'U').toLowerCase().trim();

  let vocabHtml='';
  if(qVal&&qVal.length>=1){
    const res=searchAllCurriculumVocab(qVal,'all',30);
    if(res.hits.length){
      vocabHtml=`<div style="margin-top:16px"><div class="h2"><h2>Từ vựng xuyên toàn bộ giáo trình</h2><span class="small muted">${res.hits.length}${res.total>res.hits.length?' / '+res.total:''} từ</span></div><div class="lib-vocab-list">`+
        res.hits.map(h=>renderGlobalVocabHitRow(h)).join('')+`</div></div>`;
    }
  }
  const nr=$('#noresult');if(nr)nr.classList.add('hide');
  wrap.innerHTML=(html||vocabHtml)?(html+vocabHtml):'<p class="small muted" style="text-align:center;padding:18px">Không có giáo trình hay từ vựng phù hợp.</p>';
  bindGlobalVocabRowActions(wrap);
}

function _stripVocabAccents(s){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').replace(/ü/g,'u').replace(/Ü/g,'U').toLowerCase().trim();
}
function _mergeVocabMeanings(curVi,addVi){
  const a=String(curVi||'').trim(),b=String(addVi||'').trim();
  if(!a)return b;
  if(!b)return a;
  const parts=[];
  const seen=new Set();
  const pushParts=txt=>{
    txt.split(/[;；\n]+/).forEach(seg=>{
      const s=seg.trim();
      if(!s)return;
      const norm=s.toLowerCase().replace(/\s+/g,' ');
      if(seen.has(norm))return;
      // Bỏ qua nếu toàn bộ các vế con đã nằm trong nghĩa hiện có
      const subTokens=s.split(/[,，]+/).map(x=>x.trim().toLowerCase()).filter(Boolean);
      if(subTokens.length&&subTokens.every(t=>seen.has(t)))return;
      seen.add(norm);
      subTokens.forEach(t=>seen.add(t));
      parts.push(s);
    });
  };
  pushParts(a);
  pushParts(b);
  return parts.join('; ');
}
function searchAllCurriculumVocab(query,scopeFilter='all',limit=40){
  const qRaw=String(query||'').trim().toLowerCase();
  const qClean=_stripVocabAccents(qRaw).replace(/\s+/g,'');
  const qTextClean=_stripVocabAccents(qRaw);
  if(!qRaw)return {hits:[],total:0};
  const seenSource=new Set();
  const grouped=new Map();
  const zhFallbackKey=new Map();
  const lessonLoadedMap=new Map();
  if(typeof LESSONS!=='undefined'&&Array.isArray(LESSONS)){
    LESSONS.forEach(l=>{if(l&&l.id)lessonLoadedMap.set(l.id,l);});
  }
  const pushHit=(zh,py,vi,cName,cGroup,cId,lCode,lId,isLoaded)=>{
    if(!zh)return;
    if(scopeFilter==='hanngu'&&cGroup!=='hanngu')return;
    if(scopeFilter==='hsk'&&cGroup!=='hsk')return;
    if(scopeFilter==='hanzi'&&cGroup!=='hanzi')return;
    if(scopeFilter==='mine'&&cGroup!=='personal'&&cId!=='course_sample_hn1')return;
    const zhTrim=String(zh).trim();
    const pyTrim=String(py||'').trim();
    const pyFirst=pyTrim.split(/[,，/]+/)[0].trim();
    const pyClean=_stripVocabAccents(pyFirst).replace(/\s+/g,'');
    const srcKey=(lId||cId||'')+'::'+zhTrim+'::'+pyClean;
    if(seenSource.has(srcKey))return;
    const zhLow=zhTrim.toLowerCase();
    const pyLow=pyTrim.toLowerCase();
    const pyAllClean=_stripVocabAccents(pyTrim).replace(/\s+/g,'');
    const viLow=(vi||'').toLowerCase();
    const viClean=_stripVocabAccents(vi);
    let score=0;
    if(zhLow===qRaw||(qClean&&(pyClean===qClean||pyAllClean===qClean)))score=100;
    else if(zhLow.startsWith(qRaw)||(qClean&&(pyClean.startsWith(qClean)||pyAllClean.startsWith(qClean)))||(qTextClean&&viClean.startsWith(qTextClean)))score=70;
    else if(zhLow.includes(qRaw)||pyLow.includes(qRaw)||(qClean&&(pyClean.includes(qClean)||pyAllClean.includes(qClean)))||viLow.includes(qRaw)||(qTextClean&&viClean.includes(qTextClean)))score=40;
    if(!score)return;
    seenSource.add(srcKey);

    let gKey=pyClean?(zhTrim+'::'+pyClean):(zhFallbackKey.get(zhTrim)||(zhTrim+'::'));
    if(pyClean&&!grouped.has(gKey)&&grouped.has(zhTrim+'::')){
      const noPyEntry=grouped.get(zhTrim+'::');
      grouped.delete(zhTrim+'::');
      noPyEntry.py=pyTrim;
      grouped.set(gKey,noPyEntry);
    }
    if(pyClean&&!zhFallbackKey.has(zhTrim))zhFallbackKey.set(zhTrim,gKey);

    const cleanCourseName=(cName||'Giáo trình').replace(/^Giáo trình\s+/,'');
    const srcObj={cName:cleanCourseName,cId:cId||'',lCode:lCode||'',lId:lId||'',isLoaded:Boolean(isLoaded)};
    const existing=grouped.get(gKey);
    if(!existing){
      grouped.set(gKey,{
        score,
        zh:zhTrim,
        py:pyTrim,
        vi:String(vi||'').trim(),
        cName:cleanCourseName,
        cId:cId||'',
        lCode:lCode||'',
        lId:lId||'',
        isLoaded:Boolean(isLoaded),
        sources:[srcObj]
      });
    }else{
      if(score>existing.score)existing.score=score;
      if(!existing.py&&pyTrim)existing.py=pyTrim;
      existing.vi=_mergeVocabMeanings(existing.vi,vi);
      existing.sources.push(srcObj);
      if(isLoaded)existing.isLoaded=true;
    }
  };

  if(typeof LESSONS!=='undefined'&&Array.isArray(LESSONS)){
    for(const l of LESSONS){
      if(!l||!Array.isArray(l.wordIds)||!l.wordIds.length)continue;
      const c=(typeof COURSES!=='undefined'&&Array.isArray(COURSES))?COURSES.find(x=>x.id===l.courseId):null;
      const ws=getLessonVocab(l);
      for(const w of ws){
        if(!w||!w.zh)continue;
        pushHit(w.zh,w.py||'',w.vi||'',c?c.title:'Giáo trình',c?c.group:'personal',l.courseId||'',l.code||'',l.id,true);
      }
    }
  }
  const idxObj=(typeof window!=='undefined'&&window.HANYU_VOCAB_INDEX)||null;
  if(idxObj&&Array.isArray(idxObj.items)&&Array.isArray(idxObj.courses)){
    const cs=idxObj.courses;
    for(const row of idxObj.items){
      const cMeta=cs[row[3]];
      if(!cMeta)continue;
      const lId=row[5];
      const existingL=lessonLoadedMap.get(lId);
      const isLoaded=existingL?(typeof isLessonContentLoaded==='function'?isLessonContentLoaded(existingL):Boolean(existingL.wordIds&&existingL.wordIds.length)):false;
      pushHit(row[0],row[1],row[2],cMeta.name,cMeta.group,cMeta.id,row[4],lId,isLoaded);
    }
  }
  const merged=Array.from(grouped.values()).map(item=>{
    item.sources.sort((a,b)=>((a.isLoaded===b.isLoaded)?0:(a.isLoaded?-1:1)));
    const primary=item.sources[0]||{};
    item.cName=primary.cName||item.cName;
    item.cId=primary.cId||item.cId;
    item.lCode=primary.lCode||item.lCode;
    item.lId=primary.lId||item.lId;
    return item;
  });
  merged.sort((a,b)=>(b.score-a.score)||((a.isLoaded===b.isLoaded)?0:(a.isLoaded?-1:1))||(a.zh.length-b.zh.length));
  return {hits:merged.slice(0,limit),total:merged.length};
}

function renderGlobalVocabHitRow(h){
  const srcs=Array.isArray(h.sources)&&h.sources.length?h.sources:(h.lId||h.cName?[{cName:h.cName,cId:h.cId,lCode:h.lCode,lId:h.lId,isLoaded:h.isLoaded}]:[]);
  const dlTag=h.lId?(h.isLoaded?'<span class="lvh-badge ok">Đã tải</span>':'<span class="lvh-badge dl">Tải khi mở</span>'):'';
  const multiTag=srcs.length>1?`<span class="lvh-badge multi">${srcs.length} bài</span>`:'';
  const srcBlock=srcs.length>1
    ?`<div class="lvh-srcs">${srcs.map(s=>{
      const lbl=escHtml(s.cName)+(s.lCode?' · '+escHtml(s.lCode):'');
      const mark=s.isLoaded?'':' <span class="lvh-src-dl">⬇</span>';
      return s.lId
        ?`<button type="button" class="lvh-src-chip ${s.isLoaded?'ok':''}" data-open-lesson-id="${escHtml(s.lId)}" data-open-course-id="${escHtml(s.cId||'')}" title="Mở ${lbl}">${lbl}${mark}</button>`
        :`<span class="lvh-src-chip">${lbl}</span>`;
    }).join('')}</div>`
    :`<div class="lvh-src">${escHtml(h.cName)}${h.lCode?' · '+escHtml(h.lCode):''}</div>`;
  return `<div class="lib-vocab-hit">
    <div class="lvh-main">
      <div class="lvh-top"><b class="lvh-zh">${escHtml(h.zh)}</b><span class="lvh-py">${escHtml(h.py||'')}</span>${dlTag}${multiTag}</div>
      <div class="lvh-vi">${escHtml(h.vi||'')}</div>
      ${srcBlock}
    </div>
    <div class="lvh-acts">
      <button type="button" class="ico-btn" data-say="${escHtml(h.zh)}" title="Nghe phát âm">🔊</button>
      ${srcs.length<=1&&h.lId?`<button type="button" class="chip" data-open-lesson-id="${escHtml(h.lId)}" data-open-course-id="${escHtml(h.cId||'')}" style="padding:5px 10px;font-size:12px">Mở bài</button>`:''}
    </div>
  </div>`;
}

async function openLessonFromSearch(lessonId,courseId,triggerBtn){
  if(!lessonId)return;
  if(triggerBtn){triggerBtn.disabled=true;triggerBtn.textContent='Đang tải…';}
  try{
    if(typeof getLessonDownloadState==='function'&&typeof downloadLessonById==='function'){
      const lObj=(typeof LESSONS!=='undefined'&&Array.isArray(LESSONS))?LESSONS.find(x=>x.id===lessonId):null;
      if(lObj&&getLessonDownloadState(lObj)==='available'){
        await downloadLessonById(lessonId);
      }
    }
    const ls=(typeof LESSONS!=='undefined'&&Array.isArray(LESSONS))?LESSONS.find(x=>x.id===lessonId):null;
    store.activeLessonId=lessonId;
    if(ls&&ls.courseId)store.activeCourseId=ls.courseId;
    else if(courseId)store.activeCourseId=courseId;
    saveStore(store);
    applyActiveLesson();
    if(typeof renderLessonDetail==='function')renderLessonDetail();
    if(typeof closeModal==='function')closeModal();
    goView('lesson');
  }finally{
    if(triggerBtn&&document.body.contains(triggerBtn)){triggerBtn.disabled=false;triggerBtn.textContent='Mở bài';}
  }
}

function bindGlobalVocabRowActions(container){
  if(!container)return;
  container.querySelectorAll('[data-open-lesson-id]').forEach(btn=>{
    btn.onclick=()=>openLessonFromSearch(btn.getAttribute('data-open-lesson-id'),btn.getAttribute('data-open-course-id'),btn);
  });
}

function openGlobalVocabSearchModal(initialQuery=''){
  if(typeof openModal!=='function')return;
  const totalIdx=(typeof window!=='undefined'&&window.HANYU_VOCAB_INDEX&&Array.isArray(window.HANYU_VOCAB_INDEX.items))?window.HANYU_VOCAB_INDEX.items.length:0;
  let scope='all';
  const suggestions=['你好','学习','工作','tiền','bệnh viện','du lịch'];
  openModal(`
    <div class="gvs-modal">
      <div class="gvs-hd">
        <div>
          <h3>Tra từ xuyên toàn bộ giáo trình</h3>
          <p class="small muted">${totalIdx>0?`${totalIdx.toLocaleString('vi-VN')} từ · Hán ngữ 1–6, HSK 3.0 & Chữ Hán`:'Tìm từ đã nạp trong các giáo trình'}</p>
        </div>
        <button type="button" class="ico-btn" id="gvs-close" aria-label="Đóng">✕</button>
      </div>
      <div class="gvs-search-box">
        <svg class="ic"><use href="#i-search"></use></svg>
        <input id="gvs-input" type="search" autocomplete="off" placeholder="Gõ chữ Hán, pinyin (ko dấu) hoặc nghĩa Việt..." value="${escHtml(initialQuery)}">
        <button type="button" id="gvs-clr" class="${initialQuery?'':'hide'}" aria-label="Xóa">✕</button>
      </div>
      <div class="chips gvs-scopes" id="gvs-scopes">
        <button type="button" class="chip on" data-gscope="all">Tất cả</button>
        <button type="button" class="chip" data-gscope="hanngu">Hán ngữ 1–6</button>
        <button type="button" class="chip" data-gscope="hsk">HSK 3.0</button>
        <button type="button" class="chip" data-gscope="hanzi">Chữ Hán</button>
        <button type="button" class="chip" data-gscope="mine">Của tôi</button>
      </div>
      <div class="gvs-meta small muted" id="gvs-meta"></div>
      <div class="gvs-results" id="gvs-results"></div>
    </div>
  `);
  const inp=$('#gvs-input'),clr=$('#gvs-clr'),resEl=$('#gvs-results'),metaEl=$('#gvs-meta');
  const render=()=>{
    const q=(inp?inp.value:'').trim();
    if(clr)clr.classList.toggle('hide',!q);
    if(!q){
      if(metaEl)metaEl.textContent='Gợi ý tìm nhanh:';
      if(resEl){
        resEl.innerHTML=`<div class="gvs-sug-wrap">${suggestions.map(s=>`<button type="button" class="chip" data-gsug="${escHtml(s)}">${escHtml(s)}</button>`).join('')}</div>`;
        resEl.querySelectorAll('[data-gsug]').forEach(b=>{b.onclick=()=>{if(inp){inp.value=b.dataset.gsug;render();}};});
      }
      return;
    }
    const {hits,total}=searchAllCurriculumVocab(q,scope,50);
    if(metaEl)metaEl.textContent=total?`Tìm thấy ${total} kết quả${total>hits.length?' (hiện 50 kết quả phù hợp nhất)':''}`:'Không tìm thấy từ vựng phù hợp.';
    if(resEl){
      resEl.innerHTML=hits.length
        ?`<div class="lib-vocab-list">${hits.map(h=>renderGlobalVocabHitRow(h)).join('')}</div>`
        :'<p class="small muted" style="text-align:center;padding:16px 8px">Thử tìm với từ khóa ngắn hơn, pinyin không dấu hoặc chữ Hán khác.</p>';
      bindGlobalVocabRowActions(resEl);
    }
  };
  if(inp){
    inp.addEventListener('input',render);
    setTimeout(()=>{try{inp.focus();}catch(_){}},60);
  }
  if(clr)clr.onclick=()=>{if(inp){inp.value='';inp.focus();render();}};
  const cb=$('#gvs-close');if(cb)cb.onclick=()=>{if(typeof closeModal==='function')closeModal();};
  const scWrap=$('#gvs-scopes');
  if(scWrap){
    scWrap.onclick=e=>{
      const b=e.target.closest('[data-gscope]');if(!b)return;
      scope=b.dataset.gscope||'all';
      scWrap.querySelectorAll('[data-gscope]').forEach(x=>x.classList.toggle('on',x===b));
      render();
    };
  }
  render();
}
window.openGlobalVocabSearchModal=openGlobalVocabSearchModal;

/* ---------- Chi tiết giáo trình (course-detail) ---------- */

/* ---------- Trình xem giáo trình & bài học từng quyển (textbook-reader) ---------- */
let curTextbookCourseId = '';
let curTextbookLessonId = '';

function openTextbookReader(courseId, lessonId){
  if(courseId) curTextbookCourseId = courseId;
  const c = COURSES.find(x=>x.id===curTextbookCourseId) || COURSES[0];
  if(!c) return;
  curTextbookCourseId = c.id;
  curDetailCourseId = c.id;
  const ls = getCourseLessons(c.id, true);
  if(lessonId && ls.some(l=>l.id===lessonId)){
    curTextbookLessonId = lessonId;
  } else if(!ls.some(l=>l.id===curTextbookLessonId)){
    const withContent = ls.find(l=>(l.wordIds&&l.wordIds.length)||(l.dialog&&l.dialog.length));
    curTextbookLessonId = (withContent || ls[0] || {}).id || '';
  }
  renderTextbookReader();
  goView('textbook-reader');
}

function renderTextbookReader(){
  const c = COURSES.find(x=>x.id===curTextbookCourseId) || COURSES[0];
  if(!c) return;
  $('#tb-course-title').textContent = c.title;

  // Volume switcher for same group (e.g. Quyển 1..6)
  const sameGroup = COURSES.filter(x=>x.group===c.group && getCourseLessons(x.id, true).length>0);
  const swEl = $('#tb-volume-switcher');
  if(sameGroup.length > 1){
    swEl.classList.remove('hide');
    swEl.innerHTML = sameGroup.map((vc, idx)=>{
      const shortLbl = vc.title.replace(/^Giáo trình\s+/i,'').replace(/^NEW\s+/i,'');
      return `<button type="button" class="chip ${vc.id===c.id?'on':''}" data-tb-course="${escHtml(vc.id)}">${escHtml(shortLbl)}</button>`;
    }).join('');
  } else {
    swEl.classList.add('hide');
    swEl.innerHTML = '';
  }

  const ls = getCourseLessons(c.id, true);
  const prog = getCourseProg(c.id);
  const doneSet = new Set(prog.completedLessonIds||[]);
  const tocEl = $('#tb-lesson-toc');
  if(!ls.length){
    tocEl.innerHTML = '<p class="small muted" style="margin:0">Quyển này chưa có bài học nào.</p>';
    $('#tb-lesson-content').innerHTML = '';
    return;
  }

  tocEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
      <b style="font-size:14px">Mục lục bài học (${ls.length} bài)</b>
      <span class="small muted">● Đã tải · ⬇ Chưa tải · ○ Chưa có sách · ✓ Đã học</span>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">
      ${ls.map((l,i)=>{
        const st = typeof getLessonDownloadState==='function' ? getLessonDownloadState(l) : ((l.wordIds&&l.wordIds.length>0)||(l.dialog&&l.dialog.length>0)?'downloaded':'unavailable');
        const isDone = doneSet.has(l.id);
        const isOn = l.id === curTextbookLessonId;
        const mark = isDone ? '✓' : (st==='downloaded' ? '●' : (st==='available' ? '⬇' : '○'));
        return `<button type="button" class="chip ${isOn?'on':''}" data-tb-lesson="${escHtml(l.id)}" style="font-size:12px;padding:6px 10px">${mark} ${escHtml(l.code||('Bài '+(i+1)))}</button>`;
      }).join('')}
    </div>
  `;

  const idx = ls.findIndex(l=>l.id===curTextbookLessonId);
  const l = ls[idx >= 0 ? idx : 0];
  if(!l) return;
  curTextbookLessonId = l.id;

  const words = getLessonVocab(l);
  const dlg = l.dialog || [];
  const grams = Object.values(l.grammarPoints||{});
  const chars = l.chars || [];
  const quizzes = Array.isArray(l.grammarQuiz) ? l.grammarQuiz : [];
  const hasBody = words.length > 0 || dlg.length > 0 || grams.length > 0 || quizzes.length > 0;
  const prevL = idx > 0 ? ls[idx-1] : null;
  const nextL = idx < ls.length - 1 ? ls[idx+1] : null;

  let bodyHtml = `
    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
        <div>
          <div class="small muted">${escHtml(c.title)} · ${escHtml(l.code||'')}</div>
          <h2 style="margin:4px 0 2px;font-size:20px">${escHtml(l.titleZh||l.titleVi||'')}</h2>
          ${(l.py||l.titlePy)?`<div class="small muted">${escHtml(l.py||l.titlePy)}</div>`:''}
          <div style="font-weight:600;margin-top:2px">${escHtml(l.titleVi||'')}</div>
          ${l.sourceRef&&l.sourceRef.pageRange?`<div class="small muted" style="margin-top:4px">Nguồn: ${escHtml(l.sourceRef.fileName||'')} · Trang ${escHtml(l.sourceRef.pageRange)}</div>`:''}
        </div>
        <button type="button" class="btn sm" data-tb-study="${escHtml(l.id)}">Học bài này →</button>
      </div>
    </div>
  `;

  if(!hasBody){
    const dlState = typeof getLessonDownloadState==='function' ? getLessonDownloadState(l) : 'unavailable';
    if(dlState==='available'){
      bodyHtml += `
        <div class="card" style="margin-bottom:12px;background:var(--surface2);border-color:var(--accent)">
          <b>Bài học chưa được tải xuống</b>
          <p class="small muted" style="margin:4px 0 8px">Nội dung bài này có sẵn trong kho ứng dụng nhưng chưa tải xuống để giữ app nhẹ.</p>
          <button type="button" class="btn sm" data-dl-lesson="${escHtml(l.id)}">⬇ Tải bài này</button>
        </div>
      `;
    } else {
      bodyHtml += `
        <div class="card" style="margin-bottom:12px">
          <p class="small muted" style="margin:0">Khung bài học đã được nạp sẵn với tiêu đề chuẩn và mã audio đối chiếu. Nội dung chi tiết (từ mới, bài khóa, ngữ pháp) của bài này chưa được trích xuất từ PDF.</p>
        </div>
      `;
    }
  } else {
    if(words.length){
      bodyHtml += `
        <div class="card" style="margin-bottom:12px">
          <div class="barrow" style="justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:8px">
            <h3 style="margin:0;font-size:16px">1. Từ mới (${words.length} từ)</h3>
            ${hasCurriculumVocabExtensions(l.id)?`<button type="button" class="chip" data-tb-vocab="${escHtml(l.id)}">Mở rộng từ vựng</button>`:''}
          </div>
          <div style="display:grid;gap:6px">
            ${words.map((w,wi)=>`
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--line,#eadfd3);border-radius:10px">
                <div style="min-width:0">
                  <span class="small muted" style="margin-right:6px">${wi+1}.</span>
                  <b style="font-size:16px">${escHtml(w.zh)}</b>
                  <span class="small muted" style="margin-left:6px">${escHtml(w.py)}</span>
                  ${w.pos?`<span class="course-badge" style="margin-left:6px;font-size:11px">${escHtml(w.pos)}</span>`:''}
                  <div class="small" style="margin-top:2px">${escHtml(w.vi)}</div>
                </div>
                <button type="button" class="ico-btn" data-say="${escHtml(w.zh)}" title="Nghe phát âm">🔊</button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    if(dlg.length){
      let prevSec = '';
      bodyHtml += `
        <div class="card" style="margin-bottom:12px">
          <h3 style="margin:0 0 8px;font-size:16px">2. Bài khóa / Hội thoại (${dlg.length} câu)</h3>
          <div style="display:grid;gap:8px">
            ${dlg.map(d=>{
              let secHtml = '';
              if(d.section && d.section !== prevSec){
                prevSec = d.section;
                secHtml = `<div style="padding:7px 10px;border-radius:9px;background:var(--surface2,#F8E8DE);border:1px solid var(--line,#eadfd3);margin-top:4px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b class="small" style="color:var(--accent)">${escHtml(d.section)}</b>${d.audio?`<code class="small muted">${escHtml(d.audio)}</code>`:''}</div>${d.context?`<div class="small muted" style="margin-top:2px">${escHtml(d.context)}</div>`:''}</div>`;
              }
              return secHtml + `
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:8px 10px;border:1px solid var(--line,#eadfd3);border-radius:10px">
                <div style="min-width:0">
                  ${d.name||d.speaker?`<div class="small muted" style="font-weight:600">${escHtml(d.name||d.speaker)}</div>`:''}
                  <div style="font-size:16px;font-weight:600;margin-top:2px;white-space:pre-line">${escHtml(d.zh)}</div>
                  ${d.py?`<div class="small muted" style="white-space:pre-line">${escHtml(d.py)}</div>`:''}
                  ${d.vi?`<div class="small" style="margin-top:2px;white-space:pre-line">${escHtml(d.vi)}</div>`:''}
                </div>
                <button type="button" class="ico-btn" data-say="${escHtml(d.zh)}" title="Đọc câu">🔊</button>
              </div>
            `;
            }).join('')}
          </div>
        </div>
      `;
    }
    if(grams.length){
      bodyHtml += `
        <div class="card" style="margin-bottom:12px">
          <h3 style="margin:0 0 8px;font-size:16px">3. Ngữ pháp trọng điểm (${grams.length})</h3>
          <div style="display:grid;gap:8px">
            ${grams.map(g=>{
              const exItems = Array.isArray(g.examples) ? g.examples : [];
              return `
              <div style="padding:10px 12px;border:1px solid var(--line,#eadfd3);border-radius:10px">
                <b>${escHtml(g.title||'')}</b>
                ${g.struct?`<div class="small" style="margin-top:4px;color:var(--accent)"><b>Cấu trúc:</b> ${escHtml(g.struct)}</div>`:''}
                ${g.explain?`<p class="small muted" style="margin:4px 0 0;white-space:pre-line">${escHtml(g.explain)}</p>`:''}
                ${exItems.length?`<div style="display:grid;gap:4px;margin-top:6px">${exItems.map(ex=>`<div class="small" style="display:flex;justify-content:space-between;align-items:center;gap:6px;padding:5px 8px;border-radius:8px;background:var(--surface2,#FAF0E8)"><div><b>${escHtml(ex.zh||'')}</b>${ex.py?` <span class="muted">(${escHtml(ex.py)})</span>`:''}${ex.vi?` — ${escHtml(ex.vi)}`:''}</div>${ex.zh?`<button type="button" class="ico-btn" data-say="${escHtml(ex.zh)}" title="Nghe ví dụ">🔊</button>`:''}</div>`).join('')}</div>`:(g.ex?`<div class="small" style="margin-top:4px"><i>VD: ${escHtml(g.ex)}</i></div>`:'')}
                ${g.note?`<div class="small muted" style="margin-top:5px"><i>Lưu ý: ${escHtml(g.note)}</i></div>`:''}
              </div>
            `;
            }).join('')}
          </div>
        </div>
      `;
    }
    if(chars.length){
      bodyHtml += `
        <div class="card" style="margin-bottom:12px">
          <h3 style="margin:0 0 8px;font-size:16px">4. Tập viết chữ Hán (${chars.length} chữ)</h3>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${chars.map(ch=>`<span style="display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border:1px solid var(--line,#eadfd3);border-radius:10px;font-size:20px;font-weight:600">${escHtml(typeof ch==='string'?ch:(ch.ch||''))}</span>`).join('')}
          </div>
        </div>
      `;
    }
    if(l.supplementalContent){
      bodyHtml += `
        <div class="card" style="margin-bottom:12px">
          <h3 style="margin:0 0 6px;font-size:15px">Ghi chú bổ trợ &amp; Luyện âm</h3>
          <div class="small" style="white-space:pre-line;line-height:1.55">${escHtml(l.supplementalContent)}</div>
        </div>
      `;
    }
    if(quizzes.length || (l.workbook && (l.workbook.exercisesNote || l.workbook.answerKeyNote || l.workbook.transcriptNote))){
      bodyHtml += `
        <div class="card" style="margin-bottom:12px">
          <h3 style="margin:0 0 8px;font-size:16px">5. Bài tập tổng hợp &amp; Sách bài tập (SBT)</h3>
          ${quizzes.length?`<div style="display:grid;gap:8px;margin-bottom:10px">${quizzes.map((q,qi)=>`<div style="padding:8px 10px;border:1px solid var(--line,#eadfd3);border-radius:10px"><div class="small" style="font-weight:600">${qi+1}. ${escHtml(q.q||'')}</div>${Array.isArray(q.opts)?`<div class="small muted" style="margin-top:4px">${q.opts.map((o,oi)=>`${['A','B','C','D','E','F'][oi]||oi+1}. ${escHtml(o.t||'')}`).join(' · ')}</div>`:''}${q.exp?`<details style="margin-top:4px"><summary class="small" style="cursor:pointer;color:var(--accent);font-weight:600">Xem đáp án &amp; giải thích</summary><div class="small" style="margin-top:3px">${escHtml(q.exp)}</div></details>`:''}</div>`).join('')}</div>`:''}
          ${l.workbook&&(l.workbook.exercisesNote||l.workbook.answerKeyNote||l.workbook.transcriptNote)?`<details ${!quizzes.length?'open':''}><summary style="cursor:pointer;font-weight:700" class="small">SBT &amp; Đáp án chi tiết</summary><div class="small" style="margin-top:6px;line-height:1.55;white-space:pre-line">${l.workbook.exercisesNote?`<div><b>Nội dung SBT:</b> ${escHtml(l.workbook.exercisesNote)}</div>`:''}${l.workbook.answerKeyNote?`<div style="margin-top:6px"><b>Đáp án SBT:</b>\n${escHtml(l.workbook.answerKeyNote)}</div>`:''}${l.workbook.transcriptNote?`<div style="margin-top:6px"><b>Lời thoại nghe SBT:</b>\n${escHtml(l.workbook.transcriptNote)}</div>`:''}</div></details>`:''}
        </div>
      `;
    }
  }

  bodyHtml += `
    <div style="display:flex;justify-content:space-between;gap:8px;margin-top:8px">
      <button type="button" class="btn ghost sm" ${prevL?`data-tb-lesson="${escHtml(prevL.id)}"`:'disabled'}>← Bài trước</button>
      <button type="button" class="btn ghost sm" ${nextL?`data-tb-lesson="${escHtml(nextL.id)}"`:'disabled'}>Bài tiếp →</button>
    </div>
  `;

  $('#tb-lesson-content').innerHTML = bodyHtml;
}

document.addEventListener('click', e=>{
  const gvsBtn = e.target.closest('#btn-global-vocab-search');
  if(gvsBtn){ e.preventDefault(); openGlobalVocabSearchModal(''); return; }
  const vcBtn = e.target.closest('[data-tb-course]');
  if(vcBtn){ openTextbookReader(vcBtn.dataset.tbCourse); return; }
  const lBtn = e.target.closest('[data-tb-lesson]');
  if(lBtn && !lBtn.disabled){ curTextbookLessonId = lBtn.dataset.tbLesson; renderTextbookReader(); try{window.scrollTo(0,0);}catch(_){} return; }
  const stBtn = e.target.closest('[data-tb-study],[data-tb-vocab]');
  if(stBtn){
    const directVocab = Boolean(stBtn.dataset.tbVocab);
    const l = LESSONS.find(x=>x.id===(stBtn.dataset.tbVocab||stBtn.dataset.tbStudy));
    if(l){
      if(typeof switchToCourse==='function') switchToCourse(l.courseId, l.id);
      else{ store.activeCourseId=l.courseId; store.activeLessonId=l.id; saveStore(store); applyActiveLesson(); renderRoadmap(); }
      goView(directVocab?'vocab':'lesson');
      const extension = directVocab && $('#vc-ext-sec');
      if(extension) extension.open = true;
    }
  }
});

function renderCourseDetail(courseId){
  if(courseId)curDetailCourseId=courseId;
  const c=COURSES.find(x=>x.id===curDetailCourseId)||COURSES[0];
  if(!c)return;
  curDetailCourseId=c.id;
  $('#cd-title').textContent=c.title;
  const ls=getCourseLessons(c.id,true);
  const prog=getCourseProg(c.id);
  const doneSet=new Set(prog.completedLessonIds||[]);
  const cStats=typeof getCourseProgressStats==='function'?getCourseProgressStats(c.id):{doneCnt:ls.filter(l=>doneSet.has(l.id)).length,total:ls.length,pct:ls.length?Math.round(ls.filter(l=>doneSet.has(l.id)).length/ls.length*100):0};
  const doneCnt=cStats.doneCnt;
  const pct=cStats.pct;
  const isAct=c.id===store.activeCourseId;

  const pStats=typeof getCoursePackStats==='function'?getCoursePackStats(c.id):{total:ls.length,downloaded:0,available:0};
  const hasPackCourse=pStats.available>0||(pStats.downloaded>0&&ls.some(l=>typeof hasPackForLesson==='function'&&hasPackForLesson(l.id)));
  const cdCovUrl=getCourseCoverUrl(c.id);

  $('#cd-summary').innerHTML=`
    <div class="cd-cover-wrap">
      ${cdCovUrl?`<img class="cd-cover-img" src="${cdCovUrl}" alt="${escHtml(c.title)}"/>`:''}
      <div style="flex:1;min-width:0">
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">
          <span class="course-badge">${c.group==='hsk'?'HSK':c.group==='personal'?'Cá nhân':'Hán ngữ'}</span>
          <span class="course-badge ${c.status==='published'?'ok':'draft'}">${c.status==='published'?'Đã xuất bản':'Bản nháp'}</span>
          ${c.versionLabel?`<span class="course-badge draft">${escHtml(c.versionLabel)}</span>`:''}
          ${hasPackCourse?`<span class="course-badge ok">Đã tải ${pStats.downloaded}/${pStats.total} bài</span>`:''}
        </div>
        <p class="small muted" style="margin:4px 0">${escHtml(c.desc||'Chưa có mô tả.')}</p>
        ${c.source?`<p class="small muted" style="margin:2px 0">Nguồn: ${escHtml(c.source)}</p>`:''}
      </div>
    </div>
    <div class="barrow" style="margin-top:8px"><div class="bar"><i style="width:${pct}%"></i></div><span class="small">${doneCnt} / ${cStats.total} bài (${pct}%)</span></div>
    <div class="lib-bar" style="margin-top:10px">
      <button type="button" class="btn sm" id="cd-select-active" ${isAct?'disabled':''}>${isAct?'✓ Đang học khóa này':'Chọn làm khóa đang học'}</button>
      ${c.group==='personal'?`<button type="button" class="btn ghost sm" id="cd-dup-course">Nhân bản</button>`:''}
      <button type="button" class="btn ghost sm" id="cd-del-course" style="color:#9B1C1C">Xóa</button>
    </div>
  `;

  const isLoadedCourse = ls.length > 0;
  const cdImpPdf = $('#cd-import-pdf');
  const cdViewTb = $('#cd-view-textbook');
  if(cdImpPdf) cdImpPdf.classList.toggle('hide', isLoadedCourse);
  if(cdViewTb) cdViewTb.classList.toggle('hide', !isLoadedCourse);

  // Pane tabs
  $$('#cd-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.ctab===curCourseTab));
  ['lessons','vocab','grammar','docs'].forEach(t=>$('#cd-pane-'+t).classList.toggle('hide',t!==curCourseTab));

  // Lessons list
  const listEl=$('#cd-lessons-list');
  if(!ls.length){
    listEl.innerHTML='<div class="card"><p class="muted small" style="margin:0">Giáo trình này chưa có bài học nào. Hãy bấm <b>+ Thêm bài học</b> hoặc <b>Nhập từ PDF</b>.</p></div>';
  }else{
    listEl.innerHTML=ls.map((l,i)=>{
      const isDone=doneSet.has(l.id);
      const isNow=l.id===store.activeLessonId;
      const stCls=isDone?'done':(isNow?'now':'todo');
      const wCount=(l.wordIds||[]).length;
      const dlState=typeof getLessonDownloadState==='function'?getLessonDownloadState(l):'unavailable';
      const stTxt=dlState==='downloaded'?`${wCount} từ · Đã tải`:(dlState==='available'?'Chưa tải xuống':(l.status==='published'?`${wCount} từ · Đã xuất bản`:'Chưa có dữ liệu sách'));
      return `<div class="lrow ${isNow?'active':''}">
        <span class="lrow-st ${stCls}">${isDone?'✓':(i+1)}</span>
        <div class="lrow-main" data-open-lesson="${escHtml(l.id)}">
          <b>${escHtml(l.code||('Bài '+(i+1)))} · ${escHtml(l.titleVi||l.titleZh||'Chưa đặt tên')}</b>
          <span>${escHtml(l.titleZh||'')} · ${stTxt}</span>
        </div>
        <div class="lrow-acts">
          ${dlState==='available'?`<button type="button" class="btn sm" data-dl-lesson="${escHtml(l.id)}" style="padding:5px 10px;font-size:12px;white-space:nowrap">⬇ Tải</button>`:''}
          <button type="button" class="ico-btn" data-mv-lesson="${escHtml(l.id)}" data-dir="-1" title="Lên">↑</button>
          <button type="button" class="ico-btn" data-mv-lesson="${escHtml(l.id)}" data-dir="1" title="Xuống">↓</button>
          <button type="button" class="ico-btn" data-ed-lesson="${escHtml(l.id)}" title="Sửa">✎</button>
          <button type="button" class="ico-btn" data-del-lesson="${escHtml(l.id)}" title="Xóa" style="color:#9B1C1C">✕</button>
        </div>
      </div>`;
    }).join('');
  }

  // Vocab tab
  const courseWords=new Map(ls.flatMap(getLessonVocab).map(w=>[JSON.stringify([w.id,w.py,w.vi]),w]));
  $('#cd-pane-vocab').innerHTML=courseWords.size
    ? [...courseWords.values()].map(w=>`<div class="card" style="margin-bottom:8px;padding:10px 12px"><b>${escHtml(w.zh)}</b> <span class="small muted">${escHtml(w.py)}</span> — ${escHtml(w.vi)}</div>`).join('')
    : '<div class="card"><p class="muted small" style="margin:0">Chưa có từ vựng nào trong giáo trình này.</p></div>';

  // Grammar tab
  const allGrams=ls.flatMap(l=>Object.values(l.grammarPoints||{}).map(g=>({lCode:l.code,g})));
  $('#cd-pane-grammar').innerHTML=allGrams.length
    ? allGrams.map(x=>`<div class="card" style="margin-bottom:8px"><b>${escHtml(x.lCode)}: ${escHtml(x.g.title||'')}</b><p class="small muted" style="margin:4px 0 0">${escHtml(x.g.explain||'')}</p></div>`).join('')
    : '<div class="card"><p class="muted small" style="margin:0">Chưa có điểm ngữ pháp nào.</p></div>';

  // Docs tab
  const docRefs=ls.filter(l=>l.sourceRef&&l.sourceRef.fileName);
  $('#cd-pane-docs').innerHTML=docRefs.length
    ? docRefs.map(l=>`<div class="card" style="margin-bottom:8px"><b>${escHtml(l.code)} · ${escHtml(l.titleVi)}</b><div class="small muted">Tệp nguồn: ${escHtml(l.sourceRef.fileName)} · Trang: ${escHtml(l.sourceRef.pageRange||'—')}</div></div>`).join('')
    : '<div class="card"><p class="muted small" style="margin:0">Chưa có tài liệu PDF tham chiếu nào cho giáo trình này.</p></div>';
}

