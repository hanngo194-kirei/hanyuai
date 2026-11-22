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
    WORDS=(l.wordIds||[]).map(id=>store.vocabBank[id]).filter(Boolean);
    const dlg=(l.dialog||[]);
    LISTEN_DIALOG=dlg.map((d,i)=>({speaker:d.speaker||(i%2===0?'A':'B'),name:d.name||(i%2===0?'Người A':'Người B'),zh:d.zh||'',py:d.py||'',vi:d.vi||''})).filter(d=>d.zh);
    SENT=(l.sentences&&l.sentences.length)?l.sentences:LISTEN_DIALOG.map(d=>({zh:d.zh,py:d.py,vi:d.vi}));
    DIALOG_QUESTIONS=l.dialogQuestions||[];
    GRAMMAR_POINTS=l.grammarPoints||{};
    GRAMMAR_QUIZ=l.grammarQuiz||[];
    ORDER_BANK=l.orderBank||[];
    CHARS=(l.chars&&l.chars.length)?l.chars:[];
  }
  renderLessonDetail();
  refreshModulesForLesson();
}

function refreshModulesForLesson(){
  // Safe refresh of existing modules without rebuilding them
  try{if(typeof renderFlash==='function')renderFlash();}catch(_){}
  try{
    const gKeys=Object.keys(GRAMMAR_POINTS||{});
    const gpTabs=$('#gp-tabs'),gpCard=$('#gp-card'),gqWrap=$('#gq-wrap');
    if(gpTabs&&gpCard){
      if(!gKeys.length){
        gpTabs.innerHTML='';
        gpCard.innerHTML='<p class="muted small" style="margin:0">Bài học này chưa có điểm ngữ pháp. Hãy vào <b>Sửa bài</b> để bổ sung.</p>';
        if(gqWrap)gqWrap.classList.add('hide');
      }else{
        gpTabs.innerHTML=gKeys.map((k,i)=>`<button class="${i===0?'on':''}" data-gp="${escHtml(k)}" type="button">${escHtml(GRAMMAR_POINTS[k].title||k)}</button>`).join('');
        if(typeof renderGrammarPoint==='function')renderGrammarPoint(gKeys[0]);
        if(gqWrap)gqWrap.classList.toggle('hide',!(GRAMMAR_QUIZ&&GRAMMAR_QUIZ.length));
      }
    }
  }catch(_){}
  try{
    const dlgPage=$('[data-view="dialog"]');
    if(dlgPage){
      const linesEl=dlgPage.querySelector('.dlg-lines')||dlgPage.querySelector('#dlg-lines');
      if(linesEl&&LISTEN_DIALOG.length){
        linesEl.innerHTML=LISTEN_DIALOG.map((d,i)=>`<div class="bubble ${i%2?'r':'l'}"><b>${escHtml(d.name||d.speaker)}</b><div class="zh">${escHtml(d.zh)}</div><div class="py">${escHtml(d.py)}</div><div class="vi">${escHtml(d.vi)}</div></div>`).join('');
      }
    }
  }catch(_){}
  try{if(typeof speakCtrl!=='undefined'&&speakCtrl.init)speakCtrl.init();}catch(_){}
  try{if(typeof setupPadForChar==='function'&&CHARS.length)setupPadForChar();}catch(_){}
}

/* ---------- Chi tiết bài học #lesson ---------- */
function renderLessonDetail(){
  const l=LESSONS.find(x=>x.id===store.activeLessonId);
  const hero=$('#ls-hero-txt');
  if(!l){
    if(hero)hero.innerHTML='<span class="chipsm">Chưa có bài</span><h1>Chưa chọn bài học</h1><div class="py">Hãy tạo hoặc chọn bài học trong Thư viện</div>';
    return;
  }
  if(hero){
    hero.innerHTML=`<span class="chipsm">${escHtml(l.code||'Bài học')}${l.status==='draft'?' · Bản nháp':''}</span><h1>${escHtml(l.titleVi||'Chưa đặt tên')}</h1><div class="zh">${escHtml(l.titleZh||'')}</div><div class="py">${escHtml(l.py||'')}</div>${l.sourceRef&&l.sourceRef.fileName?`<div class="small muted" style="margin-top:4px">Nguồn: ${escHtml(l.sourceRef.fileName)} (${escHtml(l.sourceRef.pageRange||'—')})</div>`:''}`;
  }
  const gUl=$('#ls-goals');
  if(gUl){
    const gs=(l.goals&&l.goals.length)?l.goals:['Học từ vựng trọng tâm','Nắm vững ngữ pháp chính','Nghe và nói theo bài khóa'];
    gUl.innerHTML=gs.slice(0,3).map(g=>`<li><span class="gchk">✓</span><span>${escHtml(g)}</span></li>`).join('');
  }
  const wList=(l.wordIds||[]).map(id=>store.vocabBank[id]).filter(Boolean);
  const subV=$('#ls-sub-vocab');if(subV)subV.textContent=wList.length?`Học ${wList.length} từ vựng trọng tâm`:'Học từ vựng của bài';
  const pvV=$('#ls-pv-vocab');
  if(pvV)pvV.innerHTML=wList.slice(0,3).map(w=>`<i>${escHtml(w.zh)}</i>`).join('')+(wList.length>3?'<span class="small muted">…</span>':'');
  const gList=Object.values(l.grammarPoints||{});
  const subG=$('#ls-sub-gram');if(subG)subG.textContent=gList[0]?gList[0].title:'Điểm ngữ pháp trọng tâm';
  const pvG=$('#ls-pv-gram');
  if(pvG){const ex=gList[0]?(gList[0].ex||gList[0].title):l.titleZh;pvG.innerHTML=ex?`<i>${escHtml(ex.split(/[。！？]/)[0])}</i>`:'';}
  const pvS=$('#ls-pv-spk');
  if(pvS){
    const pys=(l.py||'').split(/\s+/).filter(Boolean).slice(0,3);
    const fallbackPys=wList.slice(0,3).map(w=>w.py).filter(Boolean);
    const showPys=pys.length?pys:fallbackPys;
    pvS.innerHTML=showPys.map(p=>`<i>${escHtml(p)}</i>`).join('');
  }
  const cList=l.chars||[];
  const subW=$('#ls-sub-wri');if(subW)subW.textContent=cList.length?`Luyện viết ${cList.length} chữ Hán`:'Luyện viết chữ Hán';
  const pvW=$('#ls-pv-wri');
  if(pvW)pvW.innerHTML=cList.slice(0,4).map(ch=>`<i>${escHtml(typeof ch==='string'?ch:(ch.ch||''))}</i>`).join('')+(cList.length>4?'<span class="small muted">…</span>':'');
  const ctaSpan=$('#ls-start-cta span');
  if(ctaSpan)ctaSpan.textContent=`Bắt đầu học ${(l.code||'bài').toLowerCase()}`;
  // Audio đối chiếu (8D)
  const audioCard=$('#ls-audio-card');
  if(audioCard){
    const tracks=Array.isArray(l.audioTracks)?l.audioTracks:[];
    if(!tracks.length){audioCard.classList.add('hide');audioCard.innerHTML='';}
    else{
      audioCard.classList.remove('hide');
      audioCard.innerHTML='<div class="barrow" style="justify-content:space-between;margin-bottom:6px"><b>Audio bài học đã đối chiếu (${tracks.length} track)</b><button type="button" class="chip" id="ls-load-audio-btn">Nạp MP3 / ZIP</button></div><div id="ls-audio-tracks-list" class="small muted">Đang kiểm tra bộ nhớ âm thanh...</div>';
      Promise.all(tracks.map(async tr=>{
        let rec=await HanyuIDB.get('media',normMediaName(tr.fileName));
        if(!rec&&tr.fileName&&tr.fileName.includes('/')){
          rec=await HanyuIDB.get('media',normMediaName(tr.fileName.split('/').pop()));
        }
        return {tr,rec};
      })).then(items=>{
        const box=$('#ls-audio-tracks-list');if(!box)return;
        box.innerHTML=items.map(({tr,rec},idx)=>{
          if(rec&&rec.blob){
            const url=URL.createObjectURL(rec.blob);
            return `<div style="margin-top:6px"><div style="font-weight:600;color:var(--ink)">${escHtml(tr.label||tr.fileName)}</div><audio controls preload="none" src="${url}" style="width:100%;height:34px;margin-top:4px"></audio></div>`;
          }
          return `<div style="margin-top:4px">• ${escHtml(tr.label||tr.fileName)} — <span style="color:var(--muted)">Chưa nạp file MP3 từ máy</span></div>`;
        }).join('');
      });
    }
  }
  // SBT & Đáp án (8D)
  const wbCard=$('#ls-workbook-card');
  if(wbCard){
    const wb=l.workbook;
    if(!wb||(!wb.exercisesNote&&!wb.answerKeyNote&&!wb.transcriptNote)){wbCard.classList.add('hide');wbCard.innerHTML='';}
    else{
      wbCard.classList.remove('hide');
      wbCard.innerHTML=`<details><summary style="cursor:pointer;font-weight:700">Sách bài tập &amp; Đáp án đối chiếu</summary><div class="small" style="margin-top:8px;line-height:1.5">${wb.exercisesNote?`<div><b>Bài tập:</b> ${escHtml(wb.exercisesNote)}</div>`:''}${wb.answerKeyNote?`<div style="margin-top:4px"><b>Đáp án:</b> ${escHtml(wb.answerKeyNote)}</div>`:''}${wb.transcriptNote?`<div style="margin-top:4px"><b>Lời thoại nghe:</b> ${escHtml(wb.transcriptNote)}</div>`:''}</div></details>`;
    }
  }
  // Mở rộng tùy chọn Hack não & Sơ đồ tư duy (8D)
  const extCard=$('#ls-ext-card');
  if(extCard){
    const ext=l.optionalExtensions||{};
    const hn=Array.isArray(ext.hackNaoIds)?ext.hackNaoIds:[];
    const mm=Array.isArray(ext.mindMapRootChars)?ext.mindMapRootChars:[];
    if(!hn.length&&!mm.length){extCard.classList.add('hide');extCard.innerHTML='';}
    else{
      extCard.classList.remove('hide');
      const show=store.settings.showOptionalExt!==false;
      extCard.innerHTML=`<div class="barrow" style="justify-content:space-between"><b>Mở rộng tùy chọn (Không ép SRS)</b><button type="button" class="chip" id="ls-tog-opt-ext">${show?'Đang bật':'Đang ẩn'}</button></div>`+(show?`<div class="small" style="margin-top:6px">${hn.length?`<div><b>Hack não 3000 chữ Hán:</b> Mã chữ ${hn.map(x=>escHtml(x)).join(', ')}</div>`:''}${mm.length?`<div style="margin-top:4px"><b>Sơ đồ tư duy 3300 chữ Hán:</b> Chữ gốc ${mm.map(x=>escHtml(x)).join(', ')}</div>`:''}</div>`:'<div class="small muted" style="margin-top:4px">Đã ẩn phần mở rộng (bấm “Đang ẩn” để xem lại).</div>');
    }
  }

  const setAct=(id,sub,hasData)=>{
    const el=$('#'+id);if(!el)return;
    const sp=el.querySelector('.tx span');if(sp)sp.textContent=sub;
    const st=el.querySelector('.st');
    if(st&&!hasData){st.className='st todo';st.innerHTML='<span class="ring"></span>Chưa có dữ liệu';}
  };
  setAct('ls-act-vocab', WORDS.length?`Học ${WORDS.length} từ vựng trong bài`:'Chưa có từ vựng (nhấn để bổ sung)', WORDS.length>0);
  setAct('ls-act-ex', WORDS.length?`Bài tập với ${WORDS.length} từ vựng`:'Cần có ít nhất 2 từ vựng', WORDS.length>=2);
  const gCnt=Object.keys(GRAMMAR_POINTS||{}).length;
  setAct('ls-act-gram', gCnt?`${gCnt} cấu trúc trọng tâm`:'Chưa có ngữ pháp', gCnt>0);
  setAct('ls-act-dlg', LISTEN_DIALOG.length?`${LISTEN_DIALOG.length} câu hội thoại`:'Chưa có hội thoại', LISTEN_DIALOG.length>0);
  setAct('ls-act-lis', (WORDS.length||LISTEN_DIALOG.length)?'Nghe chọn, chép chính tả, hội thoại':'Chưa có dữ liệu nghe', (WORDS.length+LISTEN_DIALOG.length)>0);
  setAct('ls-act-spk', (WORDS.length||SENT.length)?'Luyện đọc từ và câu mẫu':'Chưa có câu luyện đọc', (WORDS.length+SENT.length)>0);
  setAct('ls-act-wri', CHARS.length?`Tập viết ${CHARS.length} chữ Hán`:'Chưa có chữ Hán luyện viết', CHARS.length>0);
}

/* ---------- Lộ trình học ngang trên #home ---------- */
function renderRoadmap(){
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
  // Gentle scenic rising wave curve (matching demo)
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
      const prog=getCourseProg(c.id);
      const doneCnt=(prog.completedLessonIds||[]).filter(id=>ls.some(l=>l.id===id)).length;
      const pct=ls.length?Math.round(doneCnt/ls.length*100):0;
      const isAct=c.id===store.activeCourseId;
      html+=`<div role="button" tabindex="0" class="course-card ${isAct?'active':''}" data-open-course="${escHtml(c.id)}">
        <span class="cover ${c.group==='hsk'?'c2':c.group==='personal'?'c4':c.group==='kouyu'?'c3':'c1'}"><span><big>${c.group==='hsk'?'HSK':c.group==='personal'?'Tôi':c.group==='kouyu'?'口语':'汉语'}</big>${escHtml(c.level||'Cơ bản')}</span></span>
        <div class="mid" style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <b>${escHtml(c.title)}</b>
            ${isAct?'<span class="course-badge ok">Đang học</span>':''}
            ${c.status==='draft'?'<span class="course-badge draft">Nháp</span>':''}
          </div>
          <div class="meta">${ls.length} bài · ${escHtml(c.versionLabel||c.level||'Chưa gắn phiên bản')}</div>
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
  wrap.innerHTML=html||'<p class="small muted" style="text-align:center;padding:18px">Không có giáo trình phù hợp bộ lọc.</p>';
}

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
      <span class="small muted">● Đủ nội dung · ○ Khung bài · ✓ Đã học</span>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">
      ${ls.map((l,i)=>{
        const hasBody = (l.wordIds&&l.wordIds.length>0) || (l.dialog&&l.dialog.length>0);
        const isDone = doneSet.has(l.id);
        const isOn = l.id === curTextbookLessonId;
        const mark = isDone ? '✓' : (hasBody ? '●' : '○');
        return `<button type="button" class="chip ${isOn?'on':''}" data-tb-lesson="${escHtml(l.id)}" style="font-size:12px;padding:6px 10px">${mark} ${escHtml(l.code||('Bài '+(i+1)))}</button>`;
      }).join('')}
    </div>
  `;

  const idx = ls.findIndex(l=>l.id===curTextbookLessonId);
  const l = ls[idx >= 0 ? idx : 0];
  if(!l) return;
  curTextbookLessonId = l.id;

  const words = (l.wordIds||[]).map(id=>store.vocabBank[id]).filter(Boolean);
  const dlg = l.dialog || [];
  const grams = Object.values(l.grammarPoints||{});
  const chars = l.chars || [];
  const hasBody = words.length > 0 || dlg.length > 0 || grams.length > 0;
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
          ${((l.audioTracks&&l.audioTracks[0]&&l.audioTracks[0].fileName)||(l.audio&&l.audio.trackName))?`<div class="small muted" style="margin-top:2px">Audio đối chiếu: <code>${escHtml((l.audioTracks&&l.audioTracks[0]&&l.audioTracks[0].fileName)||l.audio.trackName)}</code></div>`:''}
        </div>
        <button type="button" class="btn sm" data-tb-study="${escHtml(l.id)}">Học bài này →</button>
      </div>
    </div>
  `;

  if(!hasBody){
    bodyHtml += `
      <div class="card" style="margin-bottom:12px">
        <p class="small muted" style="margin:0">Khung bài học đã được nạp sẵn với tiêu đề chuẩn và mã audio đối chiếu. Nội dung chi tiết (từ mới, bài khóa, ngữ pháp) của bài này chưa được trích xuất từ PDF.</p>
      </div>
    `;
  } else {
    if(words.length){
      bodyHtml += `
        <div class="card" style="margin-bottom:12px">
          <h3 style="margin:0 0 8px;font-size:16px">1. Từ mới (${words.length} từ)</h3>
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
      bodyHtml += `
        <div class="card" style="margin-bottom:12px">
          <h3 style="margin:0 0 8px;font-size:16px">2. Bài khóa / Hội thoại (${dlg.length} câu)</h3>
          <div style="display:grid;gap:8px">
            ${dlg.map(d=>`
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:8px 10px;border:1px solid var(--line,#eadfd3);border-radius:10px">
                <div style="min-width:0">
                  ${d.name||d.speaker?`<div class="small muted" style="font-weight:600">${escHtml(d.name||d.speaker)}</div>`:''}
                  <div style="font-size:16px;font-weight:600;margin-top:2px">${escHtml(d.zh)}</div>
                  ${d.py?`<div class="small muted">${escHtml(d.py)}</div>`:''}
                  ${d.vi?`<div class="small" style="margin-top:2px">${escHtml(d.vi)}</div>`:''}
                </div>
                <button type="button" class="ico-btn" data-say="${escHtml(d.zh)}" title="Đọc câu">🔊</button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    if(grams.length){
      bodyHtml += `
        <div class="card" style="margin-bottom:12px">
          <h3 style="margin:0 0 8px;font-size:16px">3. Ngữ pháp trọng điểm (${grams.length})</h3>
          <div style="display:grid;gap:8px">
            ${grams.map(g=>`
              <div style="padding:8px 10px;border:1px solid var(--line,#eadfd3);border-radius:10px">
                <b>${escHtml(g.title||'')}</b>
                ${g.explain?`<p class="small muted" style="margin:4px 0 0">${escHtml(g.explain)}</p>`:''}
                ${g.ex?`<div class="small" style="margin-top:4px"><i>VD: ${escHtml(g.ex)}</i></div>`:''}
              </div>
            `).join('')}
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
  const vcBtn = e.target.closest('[data-tb-course]');
  if(vcBtn){ openTextbookReader(vcBtn.dataset.tbCourse); return; }
  const lBtn = e.target.closest('[data-tb-lesson]');
  if(lBtn && !lBtn.disabled){ curTextbookLessonId = lBtn.dataset.tbLesson; renderTextbookReader(); try{window.scrollTo(0,0);}catch(_){} return; }
  const stBtn = e.target.closest('[data-tb-study]');
  if(stBtn){
    const l = LESSONS.find(x=>x.id===stBtn.dataset.tbStudy);
    if(l){ store.activeCourseId=l.courseId; store.activeLessonId=l.id; saveStore(store); applyActiveLesson(); renderRoadmap(); goView('lesson'); }
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
  const doneCnt=ls.filter(l=>doneSet.has(l.id)).length;
  const pct=ls.length?Math.round(doneCnt/ls.length*100):0;
  const isAct=c.id===store.activeCourseId;

  $('#cd-summary').innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
      <div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">
          <span class="course-badge">${c.group==='hsk'?'HSK':c.group==='personal'?'Cá nhân':'Hán ngữ'}</span>
          <span class="course-badge ${c.status==='published'?'ok':'draft'}">${c.status==='published'?'Đã xuất bản':'Bản nháp'}</span>
          ${c.versionLabel?`<span class="course-badge draft">${escHtml(c.versionLabel)}</span>`:''}
        </div>
        <p class="small muted" style="margin:4px 0">${escHtml(c.desc||'Chưa có mô tả.')}</p>
        ${c.source?`<p class="small muted" style="margin:2px 0">Nguồn: ${escHtml(c.source)}</p>`:''}
      </div>
    </div>
    <div class="barrow" style="margin-top:8px"><div class="bar"><i style="width:${pct}%"></i></div><span class="small">${doneCnt} / ${ls.length} bài (${pct}%)</span></div>
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
      return `<div class="lrow ${isNow?'active':''}">
        <span class="lrow-st ${stCls}">${isDone?'✓':(i+1)}</span>
        <div class="lrow-main" data-open-lesson="${escHtml(l.id)}">
          <b>${escHtml(l.code||('Bài '+(i+1)))} · ${escHtml(l.titleVi||l.titleZh||'Chưa đặt tên')}</b>
          <span>${escHtml(l.titleZh||'')} · ${wCount} từ · ${l.status==='published'?'Đã xuất bản':'Bản nháp'}</span>
        </div>
        <div class="lrow-acts">
          <button type="button" class="ico-btn" data-mv-lesson="${escHtml(l.id)}" data-dir="-1" title="Lên">↑</button>
          <button type="button" class="ico-btn" data-mv-lesson="${escHtml(l.id)}" data-dir="1" title="Xuống">↓</button>
          <button type="button" class="ico-btn" data-ed-lesson="${escHtml(l.id)}" title="Sửa">✎</button>
          <button type="button" class="ico-btn" data-del-lesson="${escHtml(l.id)}" title="Xóa" style="color:#9B1C1C">✕</button>
        </div>
      </div>`;
    }).join('');
  }

  // Vocab tab
  const allWIds=[...new Set(ls.flatMap(l=>l.wordIds||[]))];
  $('#cd-pane-vocab').innerHTML=allWIds.length
    ? allWIds.map(id=>store.vocabBank[id]).filter(Boolean).map(w=>`<div class="card" style="margin-bottom:8px;padding:10px 12px"><b>${escHtml(w.zh)}</b> <span class="small muted">${escHtml(w.py)}</span> — ${escHtml(w.vi)}</div>`).join('')
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

