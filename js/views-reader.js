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
  try{
    const l=LESSONS.find(x=>x.id===store.activeLessonId);
    const vSub=$('#vocab [data-f="subtitle"]');
    if(vSub&&l)vSub.textContent=`${l.code||'Bài học'} · ${l.titleVi||l.titleZh||''}`;
  }catch(_){}
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
  try{if(typeof window.refreshDot2Views==='function')window.refreshDot2Views();}catch(_){}
  try{if(typeof speakCtrl!=='undefined'&&speakCtrl.init)speakCtrl.init();}catch(_){}
  try{if(typeof setupPadForChar==='function'&&CHARS.length)setupPadForChar();}catch(_){}
}

/* ---------- Chi tiết bài học #lesson ---------- */
const LS_REQ_KEYS=['vocab','grammar','listen','speak','exercise'];
const LS_EXT_KEYS=['dialog','copy','writing','trans'];
function getLessonSectionProgress(l){
  const sec=(store.lessonSections&&l&&l.id&&store.lessonSections[l.id])||{};
  const wList=((l&&l.wordIds)||[]).map(id=>store.vocabBank[id]).filter(Boolean);
  const allWordsStudied=wList.length>0&&wList.every(w=>store.words&&store.words[w.id]&&store.words[w.id].status!=='new');
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
  const wList=(l.wordIds||[]).map(id=>store.vocabBank[id]).filter(Boolean);
  const gList=Object.values(l.grammarPoints||{});
  const cList=l.chars||[];
  if(heroZh){
    const rawZh=(l.titleZh||l.code||'你好').replace(/[。？！?!\s]+$/,'').slice(0,4);
    heroZh.textContent=(rawZh||'你好')+'!';
  }
  if(hero){
    const c=(typeof COURSES!=='undefined')?COURSES.find(x=>x.id===l.courseId):null;
    const courseLabel=c?(c.title||'Giáo trình').replace(/\s+(\d+)$/,' · Quyển $1'):'Giáo trình Hán ngữ';
    const fullTitle=`${l.code?l.code+' · ':''}${l.titleVi||'Chưa đặt tên'}`;
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
  if(audioCard){
    const tracks=Array.isArray(l.audioTracks)?l.audioTracks:[];
    if(!tracks.length){audioCard.classList.add('hide');audioCard.innerHTML='';}
    else{
      audioCard.classList.remove('hide');
      audioCard.innerHTML=`<div class="barrow" style="justify-content:space-between;margin-bottom:6px"><b>Audio bài học đã đối chiếu (${tracks.length} track)</b><button type="button" class="chip" id="ls-load-audio-btn">Nạp MP3 / ZIP</button></div><div id="ls-audio-tracks-list" class="small muted">Đang kiểm tra bộ nhớ âm thanh...</div>`;
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
      extCard.innerHTML=`<div class="barrow" style="justify-content:space-between"><b>Mở rộng tùy chọn (Không ép SRS)</b><button type="button" class="chip" id="ls-tog-opt-ext">${show?'Đang bật':'Đang ẩn'}</button></div>`+(show?`<div class="small" style="margin-top:6px">${hn.length?`<div><b>Hack não 3000 chữ Hán:</b> ${hn.length} mục liên kết trong thẻ từ vựng</div>`:''}${mm.length?`<div style="margin-top:4px"><b>Sơ đồ tư duy 3300 chữ Hán:</b> Chữ gốc ${mm.map(x=>escHtml(x)).join(', ')}</div>`:''}</div>`:'<div class="small muted" style="margin-top:4px">Đã ẩn phần mở rộng (bấm “Đang ẩn” để xem lại).</div>');
    }
  }

  const setAct=(id,sub,hasData,isDone,todoLabel,isExt)=>{
    const el=$('#'+id);if(!el)return;
    const sp=el.querySelector('.tx span');if(sp)sp.textContent=sub;
    el.classList.toggle('done',!!isDone);
    const st=el.querySelector('.st');
    if(st){
      if(isExt){
        if(isDone){st.className='st done';st.innerHTML='<span class="ls-ok-dot">✓</span>';}
        else{st.className='st todo';st.textContent='';}
      }else if(!hasData){
        st.className='st todo';st.innerHTML='<span class="ring"></span>Chưa có dữ liệu';
      }else if(isDone){
        st.className='st done';st.innerHTML='<span class="ls-ok-dot">✓</span><b>100%</b>';
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
  setAct('ls-act-ex', WORDS.length?`Luyện tập tổng hợp · Kiểm tra (${WORDS.length} từ)`:'Cần có ít nhất 2 từ vựng', WORDS.length>=2, prog.doneMap.exercise, 'Chưa làm', false);

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
  if(curView==='roadmap'&&typeof renderFullRoadmap==='function')renderFullRoadmap(curRoadmapCourseId);
}

let curRoadmapCourseId=null;
function renderFullRoadmap(courseId){
  const canvas=$('#rmf-canvas'),sub=$('#rmf-course-sub'),freeBtn=$('#rmf-free-btn');
  const doneEl=$('#rmf-done-cnt'),pctEl=$('#rmf-pct'),barEl=$('#rmf-bar-fill');
  const contBtn=$('#rmf-continue-btn'),contTxt=$('#rmf-continue-txt');
  if(!canvas)return;
  const c=(courseId&&COURSES.find(x=>x.id===courseId))
    ||(curRoadmapCourseId&&COURSES.find(x=>x.id===curRoadmapCourseId))
    ||COURSES.find(x=>x.id===store.activeCourseId&&x.id!=='course_sample_hn1'&&getCourseLessons(x.id,true).length>0)
    ||COURSES.find(x=>x.id==='course_hn_1')
    ||COURSES.find(x=>getCourseLessons(x.id,true).length>0)
    ||COURSES[0];
  if(freeBtn){
    freeBtn.classList.toggle('on',Boolean(store.freeExplore));
    freeBtn.textContent=`Học tự do: ${store.freeExplore?'Bật':'Tắt'}`;
  }
  if(!c){
    curRoadmapCourseId=null;
    if(sub)sub.textContent='Chưa có giáo trình nào';
    if(doneEl)doneEl.textContent='0/0';
    if(pctEl)pctEl.textContent='0%';
    if(barEl)barEl.style.width='0%';
    if(contBtn){contBtn.disabled=true;delete contBtn.dataset.lessonId;}
    if(contTxt)contTxt.textContent='Chưa có bài học';
    canvas.style.aspectRatio='360 / 180';
    canvas.innerHTML='<div class="small muted" style="padding:24px;text-align:center">Hãy vào tab <b>Học tập</b> để chọn hoặc tạo giáo trình.</div>';
    return;
  }
  curRoadmapCourseId=c.id;
  const lessons=getCourseLessons(c.id,true);
  if(sub)sub.textContent=`${c.title} · ${lessons.length} bài học`;
  const prog=getCourseProg(c.id);
  const doneSet=new Set(prog.completedLessonIds||[]);
  const doneCnt=lessons.filter(l=>doneSet.has(l.id)).length;
  const pct=lessons.length?Math.round(doneCnt*100/lessons.length):0;
  if(doneEl)doneEl.textContent=`${doneCnt}/${lessons.length}`;
  if(pctEl)pctEl.textContent=`${pct}%`;
  if(barEl)barEl.style.width=pct+'%';
  if(!lessons.length){
    if(contBtn){contBtn.disabled=true;delete contBtn.dataset.lessonId;}
    if(contTxt)contTxt.textContent='Chưa có bài học';
    canvas.style.aspectRatio='360 / 180';
    canvas.innerHTML='<div class="small muted" style="padding:24px;text-align:center">Giáo trình chưa có bài học nào.</div>';
    return;
  }
  let activeL=lessons.find(x=>x.id===store.activeLessonId);
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
      const pStats=typeof getCoursePackStats==='function'?getCoursePackStats(c.id):{total:ls.length,downloaded:0,available:0};
      const hasPackCourse=pStats.available>0||(pStats.downloaded>0&&ls.some(l=>typeof hasPackForLesson==='function'&&hasPackForLesson(l.id)));
      const metaPrefix=hasPackCourse?`Đã tải ${pStats.downloaded}/${pStats.total} bài · `:`${ls.length} bài · `;
      html+=`<div role="button" tabindex="0" class="course-card ${isAct?'active':''}" data-open-course="${escHtml(c.id)}">
        <span class="cover ${c.group==='hsk'?'c2':c.group==='personal'?'c4':c.group==='kouyu'?'c3':'c1'}"><span><big>${c.group==='hsk'?'HSK':c.group==='personal'?'Tôi':c.group==='kouyu'?'口语':'汉语'}</big>${escHtml(c.level||'Cơ bản')}</span></span>
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

  const pStats=typeof getCoursePackStats==='function'?getCoursePackStats(c.id):{total:ls.length,downloaded:0,available:0};
  const hasPackCourse=pStats.available>0||(pStats.downloaded>0&&ls.some(l=>typeof hasPackForLesson==='function'&&hasPackForLesson(l.id)));

  $('#cd-summary').innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
      <div>
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

