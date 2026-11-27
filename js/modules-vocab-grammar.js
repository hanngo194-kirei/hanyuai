const VOCAB_EXAMPLE_MAP={
  '你':{ex:'你好！很高兴认识你。',exPy:'Nǐ hǎo! Hěn gāoxìng rènshi nǐ.',exVi:'Xin chào! Rất vui được làm quen với bạn.'},
  '好':{ex:'你忙吗？我很好。',exPy:'Nǐ máng ma? Wǒ hěn hǎo.',exVi:'Bạn bận không? Tôi rất khỏe.'},
  '你好':{ex:'老师，你好！',exPy:'Lǎoshī, nǐ hǎo!',exVi:'Em chào thầy/cô ạ!'},
  '一':{ex:'我要一碗米饭。',exPy:'Wǒ yào yì wǎn mǐfàn.',exVi:'Tôi muốn một bát cơm.'},
  '五':{ex:'我买五斤苹果。',exPy:'Wǒ mǎi wǔ jīn píngguǒ.',exVi:'Tôi mua năm cân táo.'},
  '八':{ex:'爸爸有八本书。',exPy:'Bàba yǒu bā běn shū.',exVi:'Bố có tám quyển sách.'},
  '大':{ex:'这个学校很大。',exPy:'Zhè ge xuéxiào hěn dà.',exVi:'Ngôi trường này rất lớn.'},
  '不':{ex:'汉语不太难。',exPy:'Hànyǔ bú tài nán.',exVi:'Tiếng Hán không khó lắm.'},
  '口':{ex:'我家有五口人。',exPy:'Wǒ jiā yǒu wǔ kǒu rén.',exVi:'Nhà tôi có năm người.'},
  '白':{ex:'她有一匹白马。',exPy:'Tā yǒu yì pǐ bái mǎ.',exVi:'Cô ấy có một con ngựa trắng.'},
  '女':{ex:'她是女老师。',exPy:'Tā shì nǚ lǎoshī.',exVi:'Cô ấy là cô giáo.'},
  '马':{ex:'这是一匹白马。',exPy:'Zhè shì yì pǐ bái mǎ.',exVi:'Đây là một con ngựa trắng.'},
  '忙':{ex:'你工作忙吗？很忙。',exPy:'Nǐ gōngzuò máng ma? Hěn máng.',exVi:'Công việc của bạn bận không? Rất bận.'},
  '吗':{ex:'你学习汉语吗？',exPy:'Nǐ xuéxí Hànyǔ ma?',exVi:'Bạn có học tiếng Hán không?'},
  '很':{ex:'我哥哥很忙。',exPy:'Wǒ gēge hěn máng.',exVi:'Anh trai tôi rất bận.'},
  '汉语':{ex:'我学习汉语。',exPy:'Wǒ xuéxí Hànyǔ.',exVi:'Tôi học tiếng Hán.'},
  '难':{ex:'汉字很难，发音不太难。',exPy:'Hànzì hěn nán, fāyīn bú tài nán.',exVi:'Chữ Hán rất khó, phát âm không khó lắm.'},
  '太':{ex:'汉语不太难。',exPy:'Hànyǔ bú tài nán.',exVi:'Tiếng Hán không khó lắm.'},
  '爸爸':{ex:'我爸爸是老师。',exPy:'Wǒ bàba shì lǎoshī.',exVi:'Bố tôi là giáo viên.'},
  '妈妈':{ex:'妈妈很忙吗？',exPy:'Māma hěn máng ma?',exVi:'Mẹ có bận không?'},
  '他':{ex:'他学习汉语。',exPy:'Tā xuéxí Hànyǔ.',exVi:'Anh ấy học tiếng Hán.'},
  '她':{ex:'她是我妹妹。',exPy:'Tā shì wǒ mèimei.',exVi:'Cô ấy là em gái tôi.'},
  '男':{ex:'他是我男朋友。',exPy:'Tā shì wǒ nán péngyou.',exVi:'Anh ấy là bạn trai của tôi.'},
  '哥哥':{ex:'我哥哥去北京。',exPy:'Wǒ gēge qù Běijīng.',exVi:'Anh trai tôi đi Bắc Kinh.'},
  '弟弟':{ex:'我弟弟学英语。',exPy:'Wǒ dìdi xué Yīngyǔ.',exVi:'Em trai tôi học tiếng Anh.'},
  '妹妹':{ex:'我妹妹很好。',exPy:'Wǒ mèimei hěn hǎo.',exVi:'Em gái tôi rất tốt.'}
};

function resolveWordExample(w){
  if(!w||!w.zh)return {ex:'',exPy:'',exVi:''};
  const normLen=s=>String(s||'').replace(/[\s.,!?;:。，！？；：“”"']/g,'').length;
  const zhLen=normLen(w.zh);
  const isSentence=s=>Boolean(s&&s.includes(w.zh)&&normLen(s)>zhLen);
  // Ưu tiên câu có chứa ngữ cảnh dài hơn từ gốc trong kho ví dụ chuẩn & câu hội thoại
  if(VOCAB_EXAMPLE_MAP[w.zh])return VOCAB_EXAMPLE_MAP[w.zh];
  if(w.ex&&isSentence(w.ex))return {ex:w.ex,exPy:w.exPy||'',exVi:w.exVi||''};
  const pool=[...(typeof SENT!=='undefined'&&Array.isArray(SENT)?SENT:[]),...(typeof LISTEN_DIALOG!=='undefined'&&Array.isArray(LISTEN_DIALOG)?LISTEN_DIALOG:[])];
  const longMatch=pool.find(s=>s&&s.zh&&isSentence(s.zh)&&normLen(s.zh)>zhLen+2);
  if(longMatch)return {ex:longMatch.zh,exPy:longMatch.py||'',exVi:longMatch.vi||''};
  if(typeof HANZI_MINDMAP_DB!=='undefined'&&w.zh.length===1&&HANZI_MINDMAP_DB[w.zh]&&HANZI_MINDMAP_DB[w.zh].example){
    const mex=HANZI_MINDMAP_DB[w.zh].example;
    if(mex.zh&&isSentence(mex.zh))return {ex:mex.zh,exPy:mex.py||'',exVi:mex.vi||''};
  }
  const match=pool.find(s=>s&&s.zh&&isSentence(s.zh));
  if(match)return {ex:match.zh,exPy:match.py||'',exVi:match.vi||''};
  if(typeof LESSONS!=='undefined'&&Array.isArray(LESSONS)){
    for(const l of LESSONS){
      const dl=(l&&Array.isArray(l.dialog))?l.dialog:[];
      const hit=dl.find(d=>d&&d.zh&&isSentence(d.zh));
      if(hit)return {ex:hit.zh,exPy:hit.py||'',exVi:hit.vi||''};
    }
  }
  if(w.ex)return {ex:w.ex,exPy:w.exPy||'',exVi:w.exVi||''};
  const loose=pool.find(s=>s&&s.zh&&s.zh.includes(w.zh));
  return loose?{ex:loose.zh,exPy:loose.py||'',exVi:loose.vi||''}:{ex:`${w.zh}！`,exPy:w.py||'',exVi:w.vi||''};
}
window.resolveWordExample=resolveWordExample;

/* ---------- Flashcard dùng chung ---------- */
function makeDeck(root,opts){
  let queue=[],i=0,revealed=false,rateLock=false,lastUndo=null,session={reviewed:0,r0:0,r1:0,r2:0,done:false,studiedSet:new Set(),wrongSet:new Set(),summaryShown:false};
  const f=k=>$(`[data-f="${k}"]`,root);
  const audioRate=()=>store.settings.slowAudio?.45:.65;

  function syncUndoUI(){
    if(root&&root.id==='r-session'){
      const ur=$('#r-undo-row');
      if(ur)ur.classList.toggle('hide',!lastUndo);
    }
  }
  function buildQueue(){
    queue=opts.listFn().slice();i=0;revealed=false;lastUndo=null;session={reviewed:0,r0:0,r1:0,r2:0,done:false,studiedSet:new Set(),wrongSet:new Set(),summaryShown:false};
    syncUndoUI();
  }
  function openVocabSummary(manual){
    if(typeof showSectionSummary!=='function')return;
    const total=queue.length||1;
    const wrongArr=queue.filter(w=>session.wrongSet.has(w.id));
    const err=wrongArr.length;
    const doneCnt=manual?(session.studiedSet.size||total):total;
    const denom=Math.max(1,doneCnt);
    const acc=Math.max(0,Math.min(100,Math.round((denom-err)*100/denom)));
    showSectionSummary('vocab',{
      doneCount:doneCnt,
      totalCount:total,
      unit:'từ',
      errors:err,
      accuracy:acc,
      wrongItems:wrongArr.map(w=>({zh:w.zh,py:w.py,vi:w.vi,note:'Bạn đánh dấu chưa nhớ'}))
    },{
      onRetryWrong:wrongArr.length?()=>{
        const idx=queue.findIndex(x=>x.id===wrongArr[0].id);
        if(idx>=0){i=idx;revealed=false;render();}
      }:null,
      onRetryAll:()=>{buildQueue();render();}
    });
  }
  function applyMask(){
    const card=f('card'),exbox=f('exbox');if(!card)return;
    let mode=opts.fixedMode||store.settings.flashMode;
    if(root&&root.id==='r-session'&&mode==='vi')mode='zh';
    const zhEl=f('zh'),pyRow=f('pyrow'),viEl=f('vi'),lp=f('lprompt'),hint=f('hint'),spkBig=f('spkBig');
    const hasWord=queue.length>0&&!session.done;
    card.classList.toggle('masked',!revealed&&hasWord);
    if(exbox)exbox.classList.toggle('masked',!revealed&&hasWord);
    if(!hasWord)return;
    if(zhEl)zhEl.classList.remove('is-ans');if(pyRow)pyRow.classList.remove('is-ans');if(viEl)viEl.classList.remove('is-ans');
    if(lp)lp.classList.add('hide');
    if(mode==='zh'){
      if(viEl)viEl.classList.add('is-ans');if(spkBig)spkBig.classList.add('hide');
      if(hint)hint.textContent=opts.fixedMode==='zh'?(revealed?'Chạm vào từ để ẩn nghĩa':'Chạm vào từ để xem nghĩa'):(revealed?'Chạm thẻ để ẩn đáp án':'Chạm thẻ để xem nghĩa tiếng Việt');
    }else if(mode==='vi'){
      if(zhEl)zhEl.classList.add('is-ans');if(pyRow)pyRow.classList.add('is-ans');
      if(viEl)viEl.style.visibility='visible';if(spkBig)spkBig.classList.add('hide');
      if(hint)hint.textContent=revealed?'Chạm thẻ để ẩn đáp án':'Chạm thẻ để xem chữ Hán & Pinyin';
    }else{
      if(zhEl)zhEl.classList.add('is-ans');if(pyRow)pyRow.classList.add('is-ans');if(viEl)viEl.classList.add('is-ans');
      if(lp)lp.classList.toggle('hide',revealed);if(spkBig)spkBig.classList.remove('hide');
      if(hint)hint.textContent=revealed?'Chạm thẻ để ẩn đáp án':'Nghe phát âm rồi chạm thẻ để kiểm tra';
    }
    if(mode!=='vi')viEl.style.visibility='';
  }
  function renderSummary(){
    const sumEl=f('summary');if(!sumEl)return;
    const showSum=session.done;sumEl.classList.toggle('hide',!showSum);
    if(opts.onStateChange)opts.onStateChange({empty:queue.length===0,done:showSum,len:queue.length});
    if(!showSum)return;
    sumEl.innerHTML=`<div class="sphead"><svg class="ic"><use href="#i-award"/></svg><div><h3>Hoàn thành phiên ôn!</h3><span class="muted small">Bạn đã ôn ${session.reviewed} lượt thẻ</span></div></div>
      <div class="sum-grid" style="margin-top:12px"><div><b style="color:var(--good)">${session.r2}</b><span>Đã thuộc</span></div><div><b style="color:var(--gold)">${session.r1}</b><span>Hơi nhớ</span></div><div><b>${session.r0}</b><span>Chưa nhớ</span></div></div>
      <div class="btnrow" style="margin-top:12px"><button type="button" class="btn sm" data-f="restart"><svg class="ic"><use href="#i-refresh"/></svg>Ôn lại phiên mới</button></div>`;
    const rb=$('[data-f="restart"]',sumEl);if(rb)rb.onclick=()=>{buildQueue();render();};
  }
  function resolveExample(w){
    return resolveWordExample(w);
  }
  function render(){
    if(i>=queue.length&&queue.length>0)i=0;
    const w=queue[i];
    if(f('count'))f('count').textContent=queue.length?(root&&root.id==='r-session'?`${i+1} / ${queue.length}`:`${i+1} / ${queue.length} từ`):(root&&root.id==='r-session'?'0 / 0':'0 / 0 từ');
    const bar=f('bar');if(bar)bar.style.width=queue.length?((i+1)/queue.length*100)+'%':'0%';
    if(!w||session.done){renderSummary();updateGlobalCounts();if(opts.onRender)opts.onRender(null);return;}
    if(f('summary'))f('summary').classList.add('hide');
    if(opts.onStateChange)opts.onStateChange({empty:false,done:false,len:queue.length});
    const zhEl=f('zh');zhEl.textContent=w.zh;zhEl.classList.toggle('long',(w.zh||'').length>=3);
    f('py').textContent=w.py;f('vi').textContent=w.vi;
    const exData=resolveExample(w);
    const exBox=f('exbox');if(exBox)exBox.classList.toggle('hide',!exData.ex);
    f('ex').innerHTML=highlightText(exData.ex,w.zh);
    f('exPy').innerHTML=highlightText(exData.exPy,w.py);
    f('exVi').textContent=exData.exVi;
    const srsEl=f('srs');if(srsEl)srsEl.textContent=formatSrsBadge(w.id);
    const st=f('star');if(st){const on=isFavorite(w.id);st.classList.toggle('on',on);st.setAttribute('aria-pressed',String(on));}
    const hb=f('hard');if(hb){const on=isDifficult(w.id);hb.classList.toggle('on',on);hb.setAttribute('aria-pressed',String(on));}
    if(typeof previewWordNextInterval==='function'){
      $$('[data-rate]',root).forEach(b=>{
        let iv=b.querySelector('.rv-rate-int');
        if(!iv){iv=document.createElement('small');iv.className='rv-rate-int';b.appendChild(iv);}
        iv.textContent=previewWordNextInterval(w.id,+b.dataset.rate);
      });
    }
    syncUndoUI();
    applyMask();updateGlobalCounts();
    if(opts.onRender)opts.onRender(w);
  }
  const cur=()=>queue[i]||null;
  const go=d=>{if(!queue.length)return;i=(i+d+queue.length)%queue.length;revealed=false;render();};
  const on=(k,fn)=>{const el=f(k);if(el)el.addEventListener('click',e=>{e.stopPropagation();fn(e);});};
  on('next',()=>go(1));on('prev',()=>go(-1));
  on('spk',()=>cur()&&speak(cur().zh,audioRate()));
  on('spk-slow',()=>cur()&&speak(cur().zh,0.45));
  on('spkBig',()=>cur()&&speak(cur().zh,audioRate()));
  on('exSpk',()=>{const w=cur();if(!w)return;const exData=resolveExample(w);if(exData.ex)speak(exData.ex,audioRate());});
  on('exSpkSlow',()=>{const w=cur();if(!w)return;const exData=resolveExample(w);if(exData.ex)speak(exData.ex,0.45);});
  on('vc-repeat',()=>{const w=cur();if(!w)return;speak(w.zh,audioRate());toast(`Đọc theo: ${w.zh}${w.py?' ('+w.py+')':''}`);});
  on('tog-py',()=>{store.settings.showPinyin=!store.settings.showPinyin;saveStore(store);applySettingsUI();applyMask();});
  on('tog-vi',()=>{store.settings.showVi=!store.settings.showVi;saveStore(store);applySettingsUI();applyMask();});
  on('tog-slow',()=>{store.settings.slowAudio=!store.settings.slowAudio;saveStore(store);applySettingsUI();if(cur())speak(cur().zh,audioRate());});

  const cardEl=f('card');
  if(cardEl){
    cardEl.addEventListener('click',e=>{if(e.target.closest('button'))return;if(!cur())return;revealed=!revealed;applyMask();});
    cardEl.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();revealed=!revealed;applyMask();}});
  }
  on('star',()=>{const w=cur();if(!w)return;toggleFavorite(w.id);toast(isFavorite(w.id)?'Đã thêm vào Yêu thích':'Đã bỏ khỏi Yêu thích');if(opts.onMutate)opts.onMutate();else render();});
  on('hard',()=>{const w=cur();if(!w)return;toggleDifficult(w.id);toast(isDifficult(w.id)?'Đã đánh dấu Từ khó':'Đã bỏ khỏi Từ khó');if(opts.onMutate)opts.onMutate();else render();});

  $$('[data-f="fmode"] button',root).forEach(b=>b.addEventListener('click',()=>{
    store.settings.flashMode=b.dataset.fm;saveStore(store);applySettingsUI();revealed=false;
    vocab.refreshMask();rev.refreshMask();
    if(store.settings.flashMode==='listen'&&cur())speak(cur().zh,audioRate());
  }));
  $$('[data-rate]',root).forEach(b=>b.addEventListener('click',()=>{
    if(rateLock)return;const w=cur();if(!w)return;
    rateLock=true;setTimeout(()=>{rateLock=false;},220);
    const v=+b.dataset.rate;
    if(opts.sessionQueue){
      lastUndo={
        wordId:w.id,
        prevWordRec:store.words[w.id]?JSON.parse(JSON.stringify(store.words[w.id])):null,
        prevQueue:queue.slice(),
        prevIndex:i,
        prevSession:{reviewed:session.reviewed,r0:session.r0,r1:session.r1,r2:session.r2,done:session.done},
        prevStudied:new Set(session.studiedSet),
        prevWrong:new Set(session.wrongSet)
      };
    }
    recordWord(w.id,v,opts.fixedMode||store.settings.flashMode);
    if(typeof playSfx==='function'){if(v===2)playSfx('ok');else if(v===0)playSfx('no');}
    session.reviewed+=1;session['r'+v]+=1;
    session.studiedSet.add(w.id);
    if(v===0)session.wrongSet.add(w.id);
    if(opts.sessionQueue){
      queue.splice(i,1);if(v===0)queue.push(w);
      if(!queue.length){session.done=true;render();return;}
      if(i>=queue.length)i=0;revealed=false;render();
    }else{
      if(root&&root.id==='vocab'&&queue.length&&session.studiedSet.size>=queue.length&&!session.summaryShown){
        session.summaryShown=true;
        if(typeof saveLessonSectionStats==='function'){
          const wrongArr=queue.filter(x=>session.wrongSet.has(x.id));
          const acc=Math.max(0,Math.min(100,Math.round((queue.length-wrongArr.length)*100/Math.max(1,queue.length))));
          saveLessonSectionStats(store.activeLessonId,'vocab',{doneCount:queue.length,totalCount:queue.length,unit:'từ',errors:wrongArr.length,accuracy:acc,wrongItems:wrongArr.map(x=>({zh:x.zh,py:x.py,vi:x.vi,note:'Bạn đánh dấu chưa nhớ'}))});
        }
        setTimeout(()=>openVocabSummary(false),180);
      }else go(1);
    }
  }));
  function undo(){
    if(!lastUndo)return false;
    const snap=lastUndo;
    if(snap.prevWordRec)store.words[snap.wordId]=snap.prevWordRec;
    else delete store.words[snap.wordId];
    saveStore(store);
    queue=snap.prevQueue.slice();
    i=snap.prevIndex;
    session.reviewed=snap.prevSession.reviewed;
    session.r0=snap.prevSession.r0;
    session.r1=snap.prevSession.r1;
    session.r2=snap.prevSession.r2;
    session.done=snap.prevSession.done;
    session.studiedSet=new Set(snap.prevStudied);
    session.wrongSet=new Set(snap.prevWrong);
    revealed=false;
    lastUndo=null;
    render();
    if(opts.onMutate)opts.onMutate();
    toast('Đã hoàn tác thẻ vừa chấm');
    return true;
  }
  buildQueue();
  return {
    render,
    refreshMask:applyMask,
    reset(){buildQueue();render();},
    openSummary(manual){openVocabSummary(manual);},
    getQueueIds(){return queue.map(w=>w.id).join(',');},
    isSessionDone(){return session.done;},
    openWord(id){buildQueue();const idx=queue.findIndex(w=>w.id===id);if(idx>=0)i=idx;revealed=false;render();},
    toggleReveal(){if(!cur()||session.done)return;revealed=!revealed;applyMask();},
    step(d){go(d);},
    rate(v){const btn=$(`[data-rate="${v}"]`,root);if(btn&&!btn.disabled)btn.click();},
    undo
  };
}

let vcExtTab='hacknao',vcExtCharIdx=0,vcMmPage=0,vcCurWord=null;
const escH=s=>(typeof escHtml==='function')?escHtml(s):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const RADICAL_MEANING_MAP={
  'ユ':'số 1','ヰ':'số 14','ㄑ':'nhỏ','ㄥ':'nhỏ','⺀':'hai','丅:215':'tầng','丅:224':'lớn','丅':'tầng',
  '丨':'gạch dọc','丬':'tường','丶':'ông chủ','丷':'số 8','丿':'phẩy','乂':'chữ X','乚':'là','亅':'nhất quyết',
  '了':'kết thúc','亠':'đầu','亻':'người','冂':'biên giới','冖':'khăn','匕':'thìa','匚':'tủ đựng','卜':'xem bói',
  '厂':'sườn núi','囗':'vây quanh','宀':'mái nhà','工':'công nhân','忄':'trái tim','扌':'tay','日':'mặt trời',
  '氵':'nước','灬':'lửa','犬':'chó','王':'vua','艹':'cỏ','虫':'côn trùng','讠':'lời nói','辶':'đi xa',
  '酉':'giờ Dậu','𠂇':'số 10','𠂉':'nằm','𠃌':'lớn','𢆉':'tiền'
};
function getPartMeaning(p,db){
  if(!p)return '';
  const byCode=p.code?RADICAL_MEANING_MAP[p.ch+':'+p.code]:'';
  if(byCode)return byCode;
  if(RADICAL_MEANING_MAP[p.ch])return RADICAL_MEANING_MAP[p.ch];
  const ent=db&&db[p.ch];
  if(ent&&ent.meaning)return String(ent.meaning).split(',')[0].trim();
  return '';
}
function extractUniqueHanzi(zh){
  return [...new Set(String(zh||'').match(/\p{Script=Han}/gu)||[])];
}
function hasCurriculumVocabExtensions(lessonId){
  return typeof parseLessonPackRef==='function'&&Boolean(parseLessonPackRef(lessonId));
}
function getVocabExtensionEntries(word,tab){
  const isHack=tab==='hacknao';
  const db=isHack
    ?(typeof HANZI_HACKNAO_DB==='undefined'?{}:HANZI_HACKNAO_DB)
    :(typeof HANZI_MINDMAP_DB==='undefined'?{}:HANZI_MINDMAP_DB);
  const isCurriculumLesson=hasCurriculumVocabExtensions(store.activeLessonId);
  const radicals=typeof HANZI_RADICAL_STROKES==='undefined'?{}:HANZI_RADICAL_STROKES;
  const books=typeof HANZI_BOOK_REFERENCES==='undefined'?null:HANZI_BOOK_REFERENCES;
  const samples=isHack?books?.hackDetails:books?.mindDetails;
  return extractUniqueHanzi(word?.zh).flatMap(ch=>{
    const entry=db[ch]||(isCurriculumLesson?samples?.[ch]:null);
    if(!isCurriculumLesson)return entry?[{ch,entry}]:[];
    const [radical,strokes]=radicals[ch]||[];
    const lessonWords=[word,...WORDS.filter(w=>w.zh!==word.zh&&w.zh.includes(ch))];
    const references=isHack?books?.hack?.[ch]:books?.mind?.[ch];
    return [{ch,entry,radical,strokes,lessonWords,references,
      similar:isHack?books?.hackSimilar?.[ch]:null,related:isHack?null:books?.related?.[ch]}];
  });
}
function renderVocabBookReference(item,tab){
  const refs=item.references;
  if(tab==='hacknao'&&refs?.length){
    const locations=refs.map(([volume,pages])=>`Tập ${volume}, ${pages}`).join(' · ');
    const similar=item.similar?`<p class="vc-ext-ref">Chữ cùng nhóm hình dạng ở Tập 2 · <b>${escH(item.similar)}</b></p>`:'';
    return `<p class="vc-ext-ref">Đối chiếu <i>Hack não 3000 chữ Hán</i> · ${escH(locations)}</p>${similar}`;
  }
  if(tab==='mindmap'&&refs)return `<p class="vc-ext-ref">Đối chiếu mục lục <i>Sơ đồ tư duy 3300 chữ Hán</i> · trang in ${escH(refs)}</p>`;
  return '';
}
function mergeExtensionWords(lessonWords,curatedWords){
  const words=new Map();
  for(const w of [...lessonWords,...curatedWords]){
    if(w?.zh&&!words.has(w.zh))words.set(w.zh,w);
  }
  return [...words.values()];
}
const VC_MIND_MAP_PAGE_SIZE=6;
function getMindMapItems(item){
  const curated=(item.entry?.groups||[]).flatMap(g=>g.items||[]).filter(w=>w?.zh);
  if(!item.lessonWords)return curated;
  const related=mergeExtensionWords(item.lessonWords.filter(w=>w.zh!==item.ch),curated);
  if(item.entry&&related.length)return related;
  if(!related.length&&item.related)related.push(...item.related);
  if(item.radical)related.push({fact:'Bộ tra chữ',value:item.radical});
  if(item.strokes)related.push({fact:'Số nét',value:String(item.strokes)});
  if(!related.length)related.push({fact:'Nghĩa trong bài',value:item.lessonWords[0].vi});
  return related;
}
function renderVocabExtension(w){
  const hnTab=$('#vc-tab-hacknao'),mmTab=$('#vc-tab-mindmap'),panel=$('#vc-ext-panel');
  if(hnTab)hnTab.classList.toggle('on',vcExtTab==='hacknao');
  if(mmTab)mmTab.classList.toggle('on',vcExtTab==='mindmap');
  if(!panel)return;
  if(!w){panel.innerHTML='<div class="vc-ext-empty">Chưa chọn từ vựng</div>';return;}
  const matched=getVocabExtensionEntries(w,vcExtTab);
  if(!matched.length){panel.innerHTML='<div class="vc-ext-empty">Từ này không có nội dung</div>';return;}
  vcExtCharIdx=vcExtCharIdx%matched.length;
  const curItem=matched[vcExtCharIdx],e=curItem.entry||{};
  const pillsHtml=(matched)=>matched.length>1?`<div class="vc-char-pills">${matched.map((m,idx)=>`<button class="${idx===vcExtCharIdx?'on':''}" data-vext-char="${idx}" type="button">${escH(m.ch)}</button>`).join('')}</div>`:'';

  if(vcExtTab==='hacknao'){
    let eqInner='';
    if(e.parts&&e.parts.length){
      const rhs=e.parts.map((p,idx)=>{
        const sub=getPartMeaning(p,HANZI_HACKNAO_DB);
        return `<div class="vc-hn-term${idx===0?' is-red':''}"><div class="vc-hn-ch">${escH(p.ch)}</div>${sub?`<div class="vc-hn-sub">(${escH(sub)})</div>`:''}</div>`;
      }).join('<span class="vc-hn-op">+</span>');
      eqInner=`<div class="vc-hn-term is-main"><div class="vc-hn-ch">${escH(curItem.ch)}</div></div><span class="vc-hn-op">=</span>${rhs}`;
    }else if(!curItem.lessonWords&&matched.length>=2){
      const rhs=extractUniqueHanzi(w.zh).map((ch,idx)=>{
        const ent=HANZI_HACKNAO_DB[ch];
        const sub=ent?(String(ent.meaning||ent.hv||'').split(',')[0].trim()):'';
        return `<div class="vc-hn-term${idx===0?' is-red':''}"><div class="vc-hn-ch">${escH(ch)}</div>${sub?`<div class="vc-hn-sub">(${escH(sub)})</div>`:''}</div>`;
      }).join('<span class="vc-hn-op">+</span>');
      eqInner=`<div class="vc-hn-term is-main"><div class="vc-hn-ch">${escH(w.zh)}</div></div><span class="vc-hn-op">=</span>${rhs}`;
    }else if(curItem.entry){
      const shortM=String(e.meaning||'').split(',')[0].trim();
      eqInner=`<div class="vc-hn-term is-main is-red"><div class="vc-hn-ch">${escH(curItem.ch)}</div></div><span class="vc-hn-op">=</span><div class="vc-hn-base"><b>${escH(e.hv||e.py||'')}</b>${shortM?`<span>(${escH(shortM)})</span>`:''}</div>`;
    }else{
      const facts=[curItem.radical&&`Bộ tra chữ ${curItem.radical}`,curItem.strokes&&`${curItem.strokes} nét`].filter(Boolean).join(' · ');
      eqInner=`<div class="vc-hn-term is-main is-red"><div class="vc-hn-ch">${escH(curItem.ch)}</div></div><div class="vc-hn-base"><b>${escH(w.zh)} · ${escH(w.py)}</b><span>${escH(facts||w.vi)}</span></div>`;
    }
    const brainIc='<span class="vc-ext-ic-brain" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9.5 4.2a3.4 3.4 0 0 0-3.2 4.5 3.1 3.1 0 0 0-1.6 2.8 3.1 3.1 0 0 0 1.2 2.4A3.1 3.1 0 0 0 9.1 19h2.2V4.2z" fill="#E36252"/><path d="M14.5 4.2a3.4 3.4 0 0 1 3.2 4.5 3.1 3.1 0 0 1 1.6 2.8 3.1 3.1 0 0 1-1.2 2.4A3.1 3.1 0 0 1 14.9 19h-2.2V4.2z" fill="#C73F33"/><path d="M8 9.2c.8.5 1.4 1.3 1.4 2.2M7.5 14c1-.3 1.8-.9 2-1.7M16 9.2c-.8.5-1.4 1.3-1.4 2.2M16.5 14c-1-.3-1.8-.9-2-1.7" fill="none" stroke="#FFF8F3" stroke-width="1.3" stroke-linecap="round"/></svg></span>';
    const hnNav=matched.length>1?'<div class="vc-hn-nav"><button aria-label="Chữ trước" class="vc-next-char" data-vext-prev="1" type="button">←</button><button aria-label="Chữ tiếp theo" class="vc-next-char" data-vext-next="1" type="button">→</button></div>':'';
    const related=curItem.lessonWords?.[1];
    const tip=e.mnemonic||(related
      ?`Tìm chữ ${curItem.ch} trong ${w.zh} và ${related.zh}. Đọc mỗi từ rồi nhắc lại nghĩa: ${w.vi} / ${related.vi}.`
      :`Nhìn nghĩa “${w.vi}”, che chữ rồi viết lại ${w.zh}. Đọc ${w.py} để kiểm tra.`);
    const title=curItem.entry?'Hack não 3000 chữ Hán':'Hack não theo từ trong bài';
    const curated=e.compounds||[];
    const compounds=curItem.lessonWords?mergeExtensionWords([w,...curated],curItem.lessonWords).slice(0,6):curated;
    const comps=compounds.map(cp=>`<button class="vc-comp-chip" data-say="${escH(cp.zh)}" type="button"><b>${escH(cp.zh)}</b><span>${escH(cp.py)} · ${escH(cp.vi)}</span></button>`).join('');
    panel.innerHTML=`<div class="vc-ext-head"><div class="vc-ext-head-l">${brainIc}<span class="vc-ext-title">${title}</span></div>${pillsHtml(matched)}</div><div class="vc-hn-eqbox">${eqInner}</div><div class="vc-hn-tiprow"><span class="vc-bulb" aria-hidden="true">💡</span><div class="vc-hn-tip"><b>Mẹo nhớ:</b><p>${escH(tip)}</p></div>${hnNav}</div>${comps?`<div class="vc-comp-list">${comps}</div>`:''}${renderVocabBookReference(curItem,vcExtTab)}`;
    return;
  }

  const allItems=getMindMapItems(curItem);
  const pageSize=VC_MIND_MAP_PAGE_SIZE,totalPages=Math.max(1,Math.ceil(allItems.length/pageSize));
  vcMmPage=vcMmPage%totalPages;
  const pageItems=allItems.slice(vcMmPage*pageSize,(vcMmPage+1)*pageSize);
  let top=[],midL=null,midR=null,bot=[];
  const k=pageItems.length;
  if(k===6){top=[pageItems[0],pageItems[1]];midL=pageItems[2];midR=pageItems[3];bot=[pageItems[4],pageItems[5]];}
  else if(k===5){top=[pageItems[0],pageItems[1]];midL=pageItems[2];midR=pageItems[3];bot=[pageItems[4]];}
  else if(k===4){top=[pageItems[0],pageItems[1]];bot=[pageItems[2],pageItems[3]];}
  else if(k===3){top=[pageItems[0],pageItems[1]];bot=[pageItems[2]];}
  else if(k===2){midL=pageItems[0];midR=pageItems[1];}
  else if(k===1){midR=pageItems[0];}
  const renderPill=it=>it.fact
    ?`<div class="vc-mm-pill vc-mm-fact"><b>${escH(it.value)}</b><span>${escH(it.fact)}</span></div>`
    :`<button class="vc-mm-pill" data-say="${escH(it.zh)}" title="${escH(it.py||'')}" type="button"><b>${escH(it.zh)}</b><span>${escH(it.vi||'')}</span></button>`;
  const shortVi=String((curItem.lessonWords&&w.zh===curItem.ch?w.vi:e.meaning)||'').split(/[;,]/)[0].trim();
  const charPy=(curItem.lessonWords&&w.zh===curItem.ch?w.py:e.py)||'';
  const mmIc='<span class="vc-ext-ic-mm" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 12L5.8 6.2M12 12l6.2-5.8M12 12l-6.2 5.8M12 12l6.2 5.8" stroke="#C7463B" stroke-width="2.2" stroke-linecap="round"/><circle cx="5.5" cy="6" r="2.7" fill="#C73F33"/><circle cx="18.5" cy="6" r="2.7" fill="#C73F33"/><circle cx="5.5" cy="18" r="2.7" fill="#C73F33"/><circle cx="18.5" cy="18" r="2.7" fill="#C73F33"/><circle cx="12" cy="12" r="3.4" fill="#9E2A22"/></svg></span>';
  const hasNav=totalPages>1||matched.length>1;
  const navHtml=hasNav?`<div class="vc-mm-nav"><button aria-label="Trang trước" class="vc-next-char vc-mm-prev" data-vext-mm-prev="1" type="button">←</button><span class="vc-mm-pg">${matched.length>1?escH(curItem.ch)+' · ':''}Trang ${vcMmPage+1} / ${totalPages}</span><button aria-label="Trang tiếp theo" class="vc-next-char vc-mm-next" data-vext-mm-next="1" type="button">→</button></div>`:'';
  const partsHtml=(e.parts&&e.parts.length)?`<div class="vc-mm-parts">${e.parts.map(p=>`<span class="vc-part-pill"><b>${escH(p.rad)}</b><span>${escH(p.hv)}${p.meaning?' · '+escH(p.meaning):''}</span></span>`).join('')}</div>`:'';
  const example=e.example||(curItem.lessonWords&&SENT.find(s=>s.zh?.includes(w.zh)&&s.zh.length>w.zh.length+2&&s.zh.length<=90));
  const exHtml=example?.zh?`<button class="vc-mm-ex" data-say="${escH(example.zh)}" type="button"><div><div class="zh">${escH(example.zh)}</div><div class="sub">${escH(example.py)} · ${escH(example.vi)}</div></div><svg class="ic" style="color:var(--accent);flex-shrink:0"><use href="#i-vol"></use></svg></button>`:'';
  const storyHtml=e.story?`<div class="vc-mm-story"><b>Câu chuyện nhớ:</b> ${escH(e.story)}</div>`:'';
  const moreHtml=partsHtml||storyHtml||exHtml?`<details class="vc-mm-more"><summary>Chi tiết chữ ${escH(curItem.ch)}${charPy?` (${escH(charPy)})`:''}</summary><div class="vc-mm-more-body">${partsHtml}${storyHtml}${exHtml}</div></details>`:'';
  const topHtml=top.length?`<div class="vc-mm-row mm-top${top.length===1?' single':''}">${top.map(renderPill).join('')}</div>`:'';
  const botHtml=bot.length?`<div class="vc-mm-row mm-bot${bot.length===1?' single':''}">${bot.map(renderPill).join('')}</div>`:'';
  const midHtml=`<div class="vc-mm-row mm-mid${(!midL&&!midR)?' center-only':''}"><div class="vc-mm-slot left">${midL?renderPill(midL):''}</div><button class="vc-mm-center" data-say="${escH(curItem.ch)}" title="${escH(charPy)}" type="button"><b>${escH(curItem.ch)}</b><span>${escH(shortVi)}</span></button><div class="vc-mm-slot right">${midR?renderPill(midR):''}</div></div>`;
  const title=curItem.entry?'Sơ đồ tư duy 3300 chữ Hán':'Sơ đồ tư duy từ vựng';
  panel.innerHTML=`<div class="vc-ext-head"><div class="vc-ext-head-l">${mmIc}<span class="vc-ext-title">${title}</span></div>${pillsHtml(matched)}</div><div class="vc-mm-stage" id="vc-mm-stage"><svg aria-hidden="true" class="vc-mm-svg"></svg>${topHtml}${midHtml}${botHtml}</div>${navHtml}${moreHtml}${renderVocabBookReference(curItem,vcExtTab)}`;
  requestAnimationFrame(syncMindMapLines);
}
function syncMindMapLines(){
  const stage=$('#vc-mm-stage');if(!stage)return;
  const svg=stage.querySelector('.vc-mm-svg'),hub=stage.querySelector('.vc-mm-center');
  if(!svg||!hub)return;
  const sr=stage.getBoundingClientRect();
  if(sr.width<10||sr.height<10)return;
  const hr=hub.getBoundingClientRect();
  const cx=hr.left-sr.left+hr.width/2,cy=hr.top-sr.top+hr.height/2;
  svg.setAttribute('viewBox',`0 0 ${sr.width} ${sr.height}`);
  const pills=[...stage.querySelectorAll('.vc-mm-pill')];
  svg.innerHTML=pills.map(p=>{
    const pr=p.getBoundingClientRect();
    const px=pr.left-sr.left+pr.width/2,py=pr.top-sr.top+pr.height/2;
    return `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" stroke="#C7463B" stroke-width="2" stroke-linecap="round"/>`;
  }).join('');
}
window.syncMindMapLines=syncMindMapLines;
window.addEventListener('resize',()=>requestAnimationFrame(syncMindMapLines));
$('#vc-ext-sec')?.addEventListener('toggle',()=>requestAnimationFrame(syncMindMapLines));
function getMmTotalPages(item){
  return Math.max(1,Math.ceil(getMindMapItems(item).length/VC_MIND_MAP_PAGE_SIZE));
}
if($('#vc-ext-tabs'))$('#vc-ext-tabs').addEventListener('click',e=>{
  const b=e.target.closest('button[data-vext]');if(!b)return;
  vcExtTab=b.dataset.vext;vcExtCharIdx=0;vcMmPage=0;renderVocabExtension(vcCurWord);
});
if($('#vc-ext-panel'))$('#vc-ext-panel').addEventListener('click',e=>{
  const cb=e.target.closest('[data-vext-char]');
  if(cb){vcExtCharIdx=+cb.dataset.vextChar||0;vcMmPage=0;renderVocabExtension(vcCurWord);return;}
  const pb=e.target.closest('[data-vext-prev]');
  if(pb){
    const matched=getVocabExtensionEntries(vcCurWord,'hacknao');
    if(matched.length>1){vcExtCharIdx=(vcExtCharIdx-1+matched.length)%matched.length;vcMmPage=0;renderVocabExtension(vcCurWord);}
    return;
  }
  const nb=e.target.closest('[data-vext-next]');
  if(nb){vcExtCharIdx+=1;vcMmPage=0;renderVocabExtension(vcCurWord);return;}
  const mp=e.target.closest('[data-vext-mm-prev]');
  if(mp){
    const matched=getVocabExtensionEntries(vcCurWord,'mindmap');
    if(!matched.length)return;
    const len=matched.length;vcExtCharIdx=vcExtCharIdx%len;
    if(vcMmPage>0)vcMmPage-=1;
    else if(len>1){vcExtCharIdx=(vcExtCharIdx-1+len)%len;vcMmPage=getMmTotalPages(matched[vcExtCharIdx])-1;}
    else vcMmPage=getMmTotalPages(matched[0])-1;
    renderVocabExtension(vcCurWord);return;
  }
  const mn=e.target.closest('[data-vext-mm-next]');
  if(mn){
    const matched=getVocabExtensionEntries(vcCurWord,'mindmap');
    if(!matched.length)return;
    const len=matched.length;vcExtCharIdx=vcExtCharIdx%len;
    const pages=getMmTotalPages(matched[vcExtCharIdx]);
    if(vcMmPage+1<pages)vcMmPage+=1;
    else{vcMmPage=0;if(len>1)vcExtCharIdx=(vcExtCharIdx+1)%len;}
    renderVocabExtension(vcCurWord);
  }
});

function makeVocabQuiz(root,opts){
  let queue=[],i=0,session={studiedSet:new Set(),wrongMap:new Map(),answers:{},choices:{},done:false,summaryShown:false};
  const stopTts=()=>{if(typeof window._stopTts==='function')window._stopTts();};
  const f=k=>$(`[data-f="${k}"]`,root);
  const audioRate=()=>store.settings.slowAudio?.45:.65;
  const ABC=['A','B','C','D'];

  function buildQueue(customList){
    queue=Array.isArray(customList)?customList.slice():opts.listFn().slice();
    i=0;
    session={studiedSet:new Set(),wrongMap:new Map(),answers:{},choices:{},done:false,summaryShown:false};
    if(typeof resetSectionTimer==='function')resetSectionTimer('vocab');
  }

  function buildChoices(w){
    if(session.choices[w.id])return session.choices[w.id];
    const targetVi=String(w.vi||'—').trim();
    const seenVi=new Set([targetVi.toLowerCase()]);
    const pickFrom=pool=>{
      const res=[];
      for(const x of shuffle(pool)){
        if(!x||x.id===w.id||!x.vi)continue;
        const v=String(x.vi).trim();
        if(!v||seenVi.has(v.toLowerCase()))continue;
        seenVi.add(v.toLowerCase());
        res.push({id:x.id,label:v,ok:false});
        if(res.length>=3)break;
      }
      return res;
    };
    let dist=pickFrom(WORDS||[]);
    if(dist.length<3&&store&&store.vocabBank){
      dist=dist.concat(pickFrom(Object.values(store.vocabBank))).slice(0,3);
    }
    const choices=shuffle([{id:w.id,label:targetVi,ok:true},...dist]);
    session.choices[w.id]=choices;
    return choices;
  }

  function openVocabSummary(manual){
    if(typeof showSectionSummary!=='function')return;
    const total=queue.length||1;
    const wrongArr=queue.filter(w=>session.wrongMap.has(w.id));
    const err=wrongArr.length;
    const doneCnt=manual?(session.studiedSet.size||total):total;
    const denom=Math.max(1,doneCnt);
    const acc=Math.max(0,Math.min(100,Math.round((denom-err)*100/denom)));
    session.done=true;
    showSectionSummary('vocab',{
      doneCount:doneCnt,
      totalCount:total,
      unit:'từ',
      errors:err,
      accuracy:acc,
      wrongItems:wrongArr.map(w=>{
        const rec=session.wrongMap.get(w.id);
        return {zh:w.zh,py:w.py,vi:w.vi,note:(rec&&rec.note)||'Bạn đã chọn sai nghĩa'};
      })
    },{
      onRetryWrong:wrongArr.length?()=>{buildQueue(wrongArr);render();}:null,
      onRetryAll:()=>{buildQueue();render();}
    });
  }

  function updateSaveBtn(w){
    const st=f('star');if(!st||!w)return;
    const on=isFavorite(w.id);
    st.classList.toggle('on',on);
    st.setAttribute('aria-pressed',String(on));
    const sp=st.querySelector('span');
    if(sp)sp.textContent=on?'Đã lưu':'Lưu từ';
  }

  function applyRevealState(w){
    const ans=w?session.answers[w.id]:null;
    const revealed=Boolean(ans);
    const exData=w?resolveWordExample(w):{ex:''};
    const exBox=f('exbox');if(exBox)exBox.classList.toggle('hide',!revealed||!exData.ex);
    const extSec=$('#vc-ext-sec');
    if(extSec)extSec.classList.toggle('hide',!w||(!revealed&&!hasCurriculumVocabExtensions(store.activeLessonId)));
    const act=$('#vc-actions');
    if(act){
      act.classList.toggle('hide',!revealed);
      const prevBtn=$('#vc-prev-btn');if(prevBtn)prevBtn.classList.toggle('hide',i<=0);
      const nextBtn=$('#vc-next-btn');if(nextBtn)nextBtn.textContent=(i+1>=queue.length)?'Xem kết quả →':'Từ tiếp theo →';
    }
    if(revealed&&w&&opts.onRender){
      opts.onRender(w);
      requestAnimationFrame(()=>{if(typeof syncMindMapLines==='function')syncMindMapLines();});
    }
  }

  function render(){
    stopTts();
    if(i>=queue.length&&queue.length>0)i=0;
    const w=queue[i];
    if(f('count'))f('count').textContent=queue.length?`${i+1} / ${queue.length} từ`:'0 / 0 từ';
    const bar=f('bar');if(bar)bar.style.width=queue.length?((i+1)/queue.length*100)+'%':'0%';
    const optsEl=$('#vc-opts');
    if(!w){
      if(f('zh'))f('zh').textContent='—';
      if(f('py'))f('py').textContent='';
      if(optsEl)optsEl.innerHTML='<p class="muted small" style="padding:10px 0">Bài học này chưa có danh sách từ mới.</p>';
      applyRevealState(null);
      updateGlobalCounts();
      if(opts.onRender)opts.onRender(null);
      return;
    }
    const zhEl=f('zh');zhEl.textContent=w.zh;zhEl.classList.toggle('long',(w.zh||'').length>=3);
    f('py').textContent=w.py||'';
    const exData=resolveWordExample(w);
    f('ex').innerHTML=highlightText(exData.ex,w.zh);
    f('exPy').innerHTML=highlightText(exData.exPy,w.py);
    f('exVi').textContent=exData.exVi;
    const srsEl=f('srs');if(srsEl)srsEl.textContent=formatSrsBadge(w.id);
    updateSaveBtn(w);

    const choices=buildChoices(w);
    const savedAns=session.answers[w.id]||null;
    if(optsEl){
      optsEl.innerHTML=choices.map((c,idx)=>{
        let cls='',ic='';
        if(savedAns){
          if(c.ok){cls=' ok';ic='✓';}
          else if(idx===savedAns.pickedIdx){cls=' no';ic='✕';}
        }
        return `<button type="button" class="opt${cls}" data-idx="${idx}"><i>${ABC[idx]||idx+1}</i><span>${escH(c.label)}</span><span class="st-ic">${ic}</span></button>`;
      }).join('');
      $$('.opt',optsEl).forEach(btn=>btn.onclick=()=>{
        if(session.answers[w.id])return;
        const idx=+btn.dataset.idx,picked=choices[idx],isOk=Boolean(picked&&picked.ok);
        session.answers[w.id]={pickedIdx:idx,ok:isOk,pickedVi:picked?picked.label:''};
        session.studiedSet.add(w.id);
        if(!isOk)session.wrongMap.set(w.id,{zh:w.zh,py:w.py,vi:w.vi,note:'Chọn nhầm: '+(picked?picked.label:'')});
        btn.classList.add(isOk?'ok':'no');
        const stEl=$('.st-ic',btn);if(stEl)stEl.textContent=isOk?'✓':'✕';
        if(!isOk){
          const oi=choices.findIndex(x=>x.ok);
          if(oi>=0){const ob=$$('.opt',optsEl)[oi];if(ob){ob.classList.add('ok');const ost=$('.st-ic',ob);if(ost)ost.textContent='✓';}}
        }
        if(typeof playSfx==='function')playSfx(isOk?'ok':'no');
        recordWord(w.id,isOk?2:0,'zh');
        updateGlobalCounts();
        applyRevealState(w);
        if(typeof speak==='function')speak(w.zh,0.65);
      });
    }
    applyRevealState(w);
    updateGlobalCounts();
    if(opts.onRender)opts.onRender(w);
  }

  const cur=()=>queue[i]||null;
  const on=(k,fn)=>{const el=f(k);if(el)el.addEventListener('click',e=>{e.stopPropagation();fn(e);});};
  on('spk',()=>cur()&&speak(cur().zh,0.65));
  on('spk-slow',()=>cur()&&speak(cur().zh,0.45));
  on('exSpk',()=>{const w=cur();if(!w)return;const exData=resolveWordExample(w);if(exData.ex)speak(exData.ex,audioRate());});
  on('exSpkSlow',()=>{const w=cur();if(!w)return;const exData=resolveWordExample(w);if(exData.ex)speak(exData.ex,0.45);});
  on('tog-py',()=>{store.settings.showPinyin=!store.settings.showPinyin;saveStore(store);applySettingsUI();});
  on('tog-slow',()=>{store.settings.slowAudio=!store.settings.slowAudio;saveStore(store);applySettingsUI();if(cur())speak(cur().zh,audioRate());});
  on('star',()=>{
    const w=cur();if(!w)return;
    toggleFavorite(w.id);
    const savedOn=isFavorite(w.id);
    toast(savedOn?'Đã lưu từ vào Sổ từ (Yêu thích)':'Đã bỏ lưu từ');
    updateSaveBtn(w);
    if(opts.onMutate)opts.onMutate();
  });

  if($('#vc-prev-btn'))$('#vc-prev-btn').onclick=()=>{stopTts();if(i>0){i--;render();}};
  if($('#vc-next-btn'))$('#vc-next-btn').onclick=()=>{
    stopTts();
    if(!queue.length)return;
    if(i+1<queue.length){
      i+=1;render();
      try{window.scrollTo({top:0,behavior:'smooth'});}catch(_){}
    }else{
      openVocabSummary(false);
    }
  };

  buildQueue();
  return {
    render,
    refreshMask(){},
    reset(customList){buildQueue(customList);render();},
    openSummary(manual){openVocabSummary(manual);},
    getQueueIds(){return queue.map(w=>w.id).join(',');},
    isSessionDone(){return session.done;},
    openWord(id){buildQueue();const idx=queue.findIndex(w=>w.id===id);if(idx>=0)i=idx;render();},
    toggleReveal(){const w=cur();if(w&&typeof speak==='function')speak(w.zh,audioRate());},
    step(d){if(!queue.length)return;i=(i+d+queue.length)%queue.length;render();}
  };
}

const vocab=makeVocabQuiz($('#vocab'),{listFn:()=>WORDS,onRender(w){vcCurWord=w;vcExtCharIdx=0;vcMmPage=0;renderVocabExtension(w);},onMutate(){renderReviewDash();renderWordbook();}});
let vcBatchKey='all';
function renderVocabBatchBar(resetSelection=false){
  const bar=$('#vc-batch-bar');
  if(!bar)return;
  const list=Array.isArray(WORDS)?WORDS:[];
  if(list.length<=25){
    vcBatchKey='all';
    bar.innerHTML='';
    bar.classList.add('hide');
    return;
  }
  if(resetSelection)vcBatchKey='all';
  const CHUNK=20;
  const unlearned=list.filter(w=>{
    const s=(typeof store!=='undefined'&&store.srs)?store.srs[w.id]:null;
    return !s||((s.reps||0)<1&&((s.interval||0)<1));
  });
  const btns=[{k:'all',lbl:`Tất cả (${list.length})`,items:list}];
  for(let start=0;start<list.length;start+=CHUNK){
    const end=Math.min(list.length,start+CHUNK);
    const n=Math.floor(start/CHUNK)+1;
    btns.push({k:`g${n}`,lbl:`Nhóm ${n} (${start+1}–${end})`,items:list.slice(start,end)});
  }
  if(unlearned.length&&unlearned.length<list.length){
    btns.push({k:'unlearned',lbl:`Chưa thuộc (${unlearned.length})`,items:unlearned});
  }
  if(!btns.some(b=>b.k===vcBatchKey))vcBatchKey='all';
  bar.innerHTML=btns.map(b=>`<button type="button" class="vc-batch-chip${b.k===vcBatchKey?' on':''}" data-vbatch="${b.k}">${b.lbl}</button>`).join('');
  bar.classList.remove('hide');
  bar.querySelectorAll('[data-vbatch]').forEach(btn=>{
    btn.onclick=()=>{
      const k=btn.getAttribute('data-vbatch')||'all';
      const found=btns.find(b=>b.k===k)||btns[0];
      vcBatchKey=found.k;
      bar.querySelectorAll('[data-vbatch]').forEach(x=>x.classList.toggle('on',x===btn));
      vocab.reset(found.items);
    };
  });
}
const _origOpenWord=vocab.openWord.bind(vocab);
vocab.openWord=function(id){
  vcBatchKey='all';
  renderVocabBatchBar(true);
  _origOpenWord(id);
};
window.renderFlash=()=>{renderVocabBatchBar(true);vocab.reset();try{renderReviewDash();renderWordbook();}catch(_){}};

/* ---------- Màn 2: Ôn tập SRS chồng thẻ ---------- */
let rmode='today',rCustomIds=null,rUserPicked=false,inReviewSession=true;
function getReviewQueue(forcedMode){
  if(rCustomIds)return rCustomIds.map(wordById).filter(Boolean);
  const pool=(typeof getReviewWordPool==='function')?getReviewWordPool():WORDS;
  const m=forcedMode||rmode,now=Date.now();
  if(m==='today')return pool.filter(w=>isDue(w.id,now));
  if(m==='hard')return pool.filter(w=>isDifficult(w.id));
  if(m==='new')return pool.filter(w=>getWordState(w.id).status==='new');
  return pool;
}
function updateReviewFooter(){
  updateGlobalCounts();
  const weakEl=$('#rv-weak-txt');if(!weakEl)return;
  const spWeak=(store&&store.speaking&&Array.isArray(store.speaking.weakChars))?store.speaking.weakChars:[];
  if(spWeak.length>0){
    const wt=(store.speaking&&store.speaking.weakTones)||{};
    let wTone=0,wToneCnt=0;
    [1,2,3,4,5].forEach(t=>{const c=Number(wt[t]&&wt[t].weak)||0;if(c>wToneCnt){wToneCnt=c;wTone=t;}});
    weakEl.innerHTML=`Phát âm yếu: <b>${spWeak.length} từ</b>${wTone&&wTone<=4?` (Thanh ${wTone})`:''} · <button type="button" class="rv-weak-link" id="rv-open-weak-speak">Ôn ngay →</button>`;
    const btn=$('#rv-open-weak-speak');
    if(btn)btn.onclick=()=>{if(typeof window.openWeakPronunciation==='function')window.openWeakPronunciation(0);};
    return;
  }
  const tm=(store&&store.listening&&store.listening.toneMistakes)||{};
  let bestTone=0,maxToneErr=0;
  [1,2,3,4].forEach(t=>{const c=Number(tm[t])||0;if(c>maxToneErr){maxToneErr=c;bestTone=t;}});
  if(maxToneErr>0){
    weakEl.innerHTML=`Sai nhiều: <b>thanh ${bestTone}</b> (${maxToneErr} lần)`;
    return;
  }
  const pool=(typeof getReviewWordPool==='function')?getReviewWordPool():WORDS;
  let weakW=null,maxW=0;
  pool.forEach(w=>{const wc=getWordState(w.id).wrongCount||0;if(wc>maxW){maxW=wc;weakW=w;}});
  if(weakW){
    weakEl.innerHTML=`Hay quên: <b>${escH(weakW.zh)}</b> (${maxW} lần)`;
    return;
  }
  const hardCnt=store.difficultIds.filter(id=>wordById(id)).length;
  weakEl.innerHTML=`Từ khó: <b>${hardCnt}</b> · Tổng: <b>${pool.length}</b>`;
}
window.updateReviewFooter=updateReviewFooter;

function renderReviewBanner(autoSwitched){
  const bn=$('#r-mode-banner');if(!bn)return;
  if(rCustomIds){
    bn.classList.remove('hide');
    bn.innerHTML=`<span>Đang ôn danh sách từ Sổ từ (${rCustomIds.length} từ)</span><button type="button" id="r-exit-custom">Xem tất cả</button>`;
    const eb=$('#r-exit-custom');if(eb)eb.onclick=()=>{rCustomIds=null;rUserPicked=true;rmode='all';renderReviewDash();};
    return;
  }
  if(autoSwitched){
    const pool=(typeof getReviewWordPool==='function')?getReviewWordPool():WORDS;
    bn.classList.remove('hide');
    bn.innerHTML=`<span>Chưa có từ đến hạn hôm nay · Đang mở tất cả ${pool.length} từ để luyện ngay</span>`;
    return;
  }
  bn.classList.add('hide');bn.innerHTML='';
}

function renderReviewDash(){
  updateGlobalCounts();
  const pool=(typeof getReviewWordPool==='function')?getReviewWordPool():WORDS;
  const dueList=getReviewQueue('today');
  let autoSwitched=false;
  if(!rCustomIds&&!rUserPicked&&rmode==='today'&&!dueList.length&&pool.length){
    rmode='all';
    autoSwitched=true;
  }
  $$('#rmode button').forEach(b=>b.classList.toggle('on',b.dataset.m===rmode));
  renderReviewBanner(autoSwitched);
  if(store.settings.flashMode==='vi'){
    const zb=$('#review [data-f="fmode"] [data-fm="zh"]');
    if(zb)zb.classList.add('on');
  }
  $('#r-session').classList.remove('hide');
  const nextIds=getReviewQueue().map(w=>w.id).join(',');
  if(rev.getQueueIds()!==nextIds||rev.isSessionDone())rev.reset();
  else rev.render();
  updateReviewFooter();
}
function openReviewSession(mode,customIds,openId){
  if(mode)rmode=mode;
  rCustomIds=customIds||null;
  rUserPicked=true;
  inReviewSession=true;
  $$('#rmode button').forEach(b=>b.classList.toggle('on',b.dataset.m===rmode));
  renderReviewBanner(false);
  $('#r-session').classList.remove('hide');
  if(openId)rev.openWord(openId);else rev.reset();
  updateReviewFooter();
}
function closeReviewSession(){
  rCustomIds=null;rUserPicked=false;rmode='today';
  renderReviewDash();
}
const rev=makeDeck($('#r-session'),{
  listFn:()=>getReviewQueue(),
  sessionQueue:true,
  onStateChange({empty,done,len}){
    const hideCard=empty||done;
    $$('#r-session .rv-stack-wrap,#r-session [data-f="exbox"],#r-session .rv-rate3,#r-session .rv-nav-row,#r-session .bar').forEach(el=>el.classList.toggle('hide',hideCard));
    const sw=$('#rv-stack-wrap');if(sw)sw.classList.toggle('empty-stack',hideCard||(len<=1));
    const em=$('#r-empty');em.classList.toggle('hide',!empty||done);
    if(empty&&!done){
      const msg=rmode==='today'?'Hôm nay bạn chưa có từ đến hạn!':rmode==='hard'?'Chưa có từ khó nào được đánh dấu.':'Danh sách ôn hiện đang trống';
      const sub=rmode==='today'?'Hãy học từ mới trong bài học hoặc chuyển sang ôn Tất cả từ.':'Bạn có thể đánh dấu ⚑ trên flashcard hoặc mở danh sách Tất cả.';
      em.innerHTML=`<h3>${msg}</h3><p class="muted small" style="margin-top:6px">${sub}</p><div class="btnrow" style="margin-top:12px"><button type="button" class="btn sm" id="re-all">Ôn tất cả từ</button></div>`;
      const ra=$('#re-all');if(ra)ra.onclick=()=>openReviewSession('all');
    }
  },
  onMutate(){
    if(rmode==='hard')rev.reset();else rev.render();
    updateReviewFooter();
    renderWordbook();
  }
});
$('#rmode').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  rCustomIds=null;rUserPicked=true;rmode=b.dataset.m;
  $$('#rmode button').forEach(x=>x.classList.toggle('on',x===b));
  renderReviewBanner(false);
  rev.reset();
  updateReviewFooter();
});
$('#r-start-btn').onclick=()=>openReviewSession(rmode);
$('#r-back-dash').onclick=closeReviewSession;
const _rUndoBtn=$('#r-undo');if(_rUndoBtn)_rUndoBtn.onclick=()=>rev.undo();

if(typeof document!=='undefined'&&!window._hanyuHotkeysBound){
  window._hanyuHotkeysBound=true;
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      const hm=$('#hanyu-modal');
      if(hm&&!hm.classList.contains('hide')&&typeof closeModal==='function'){
        e.preventDefault();closeModal();
      }
      return;
    }
    const t=e.target;
    if(t&&((t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT')||t.isContentEditable))return;
    const hm=$('#hanyu-modal');
    if(hm&&!hm.classList.contains('hide'))return;
    const rvView=$('#review');
    if(rvView&&rvView.classList.contains('on')){
      if(e.code==='Space'||e.key===' '){
        e.preventDefault();
        if(!t||typeof t.closest!=='function'||!t.closest('.flash'))rev.toggleReveal();
        return;
      }
      if(e.key==='1'||e.key==='2'||e.key==='3'){
        e.preventDefault();rev.rate(Number(e.key)-1);return;
      }
      if(e.key==='z'||e.key==='Z'){
        if(rev.undo())e.preventDefault();
        return;
      }
    }
    const vcView=$('#vocab');
    if(vcView&&vcView.classList.contains('on')){
      if(e.code==='Space'||e.key===' '){
        e.preventDefault();
        if(typeof vocab.toggleReveal==='function')vocab.toggleReveal();
        return;
      }
      if(e.key==='ArrowLeft'&&typeof vocab.step==='function'){e.preventDefault();vocab.step(-1);return;}
      if(e.key==='ArrowRight'&&typeof vocab.step==='function'){e.preventDefault();vocab.step(1);return;}
    }
  });
}

/* ---------- Màn 3: Sổ từ khó & yêu thích ---------- */
let wbTab='hard',wbSub='marked',wbQuery='';
function getWordbookList(){
  const seen=new Set(),pool=[];
  const add=w=>{if(w&&w.id&&!seen.has(w.id)){seen.add(w.id);pool.push(w);}};
  ((typeof getReviewWordPool==='function')?getReviewWordPool():WORDS).forEach(add);
  (store.favoriteIds||[]).forEach(id=>add(wordById(id)));
  let base=pool;
  if(wbTab==='fav')base=pool.filter(w=>isFavorite(w.id));
  else if(wbSub==='marked')base=pool.filter(w=>isDifficult(w.id));
  else if(wbSub==='wrong')base=pool.filter(w=>getWordState(w.id).wrongCount>0).sort((a,b)=>getWordState(b.id).wrongCount-getWordState(a.id).wrongCount);
  if(wbQuery)base=base.filter(w=>matchWord(w,wbQuery));
  return base;
}
function renderWordbook(){
  updateGlobalCounts();
  $('#wb-sub').classList.toggle('hide',wbTab!=='hard');
  const list=getWordbookList();
  const el=$('#wb-list');
  if(!list.length){
    el.innerHTML=`<div class="card" style="text-align:center"><p class="muted">${wbQuery?'Không tìm thấy từ phù hợp.':wbTab==='fav'?'Chưa có từ yêu thích nào. Bấm ♡ trên thẻ từ để lưu.':wbSub==='wrong'?'Chưa có từ nào trả lời sai.':'Chưa có từ khó nào. Bấm ⚑ trên thẻ từ để thêm.'}</p></div>`;
    return;
  }
  el.innerHTML=list.map(w=>{
    const s=getWordState(w.id),dif=isDifficult(w.id),fav=isFavorite(w.id);
    const meta=s.wrongCount>0?`${w.vi} • Sai ${s.wrongCount} lần`:`${w.vi} • ${formatSrsBadge(w.id)}`;
    return `<div class="wrow" data-wid="${w.id}">
      <div class="wzh">${w.zh}</div>
      <div class="wmid"><b>${w.py}</b><span>${meta}</span></div>
      <div class="wacts">
        <button type="button" data-wa="say" aria-label="Nghe ${w.zh}"><svg class="ic"><use href="#i-vol"/></svg></button>
        <button type="button" data-wa="fav" class="${fav?'on-star':''}" aria-label="Yêu thích"><svg class="ic"><use href="#i-heart"/></svg></button>
        <button type="button" data-wa="hard" class="${dif?'on-hard':''}" aria-label="Từ khó"><svg class="ic"><use href="#i-flag"/></svg></button>
      </div>
    </div>`;
  }).join('');
}
$('#wb-tabs').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  wbTab=b.dataset.wt;$$('#wb-tabs button').forEach(x=>x.classList.toggle('on',x===b));renderWordbook();
});
$('#wb-sub').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  wbSub=b.dataset.ws;$$('#wb-sub button').forEach(x=>x.classList.toggle('on',x===b));renderWordbook();
});
$('#wbq').addEventListener('input',e=>{wbQuery=e.target.value.trim();$('#wbq-clr').classList.toggle('hide',!wbQuery);renderWordbook();});
$('#wbq-clr').onclick=()=>{wbQuery='';$('#wbq').value='';$('#wbq-clr').classList.add('hide');renderWordbook();};
$('#wb-list').addEventListener('click',e=>{
  const row=e.target.closest('.wrow');if(!row)return;
  const id=row.dataset.wid,w=wordById(id);if(!w)return;
  const act=e.target.closest('[data-wa]');
  if(act){
    e.stopPropagation();
    const a=act.dataset.wa;
    if(a==='say')speak(w.zh,store.settings.slowAudio?.45:.65);
    else if(a==='fav'){toggleFavorite(id);renderWordbook();vocab.render();}
    else if(a==='hard'){toggleDifficult(id);renderWordbook();vocab.render();renderReviewDash();}
    return;
  }
  const ids=getWordbookList().map(x=>x.id);
  goView('review');
  openReviewSession('all',ids,id);
});
$('#wb-q-flash').onclick=()=>{
  const ids=getWordbookList().map(x=>x.id);
  if(!ids.length){toast('Danh sách hiện đang trống');return;}
  goView('review');
  openReviewSession('all',ids);
};
$('#wb-q-listen').onclick=()=>{
  const ids=getWordbookList().map(x=>x.id);
  if(!ids.length){toast('Danh sách hiện đang trống');return;}
  store.settings.flashMode='listen';saveStore(store);applySettingsUI();
  goView('review');
  openReviewSession('all',ids);
};

/* ---------- Công đoạn 3: Bài tập tương tác (5 dạng) & Ngữ pháp ---------- */
function shuffle(arr){
  const a=arr.slice();
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
function pickDistractors(target,pool,n=3){
  return shuffle(pool.filter(x=>x.id!==target.id)).slice(0,n);
}

// Dữ liệu cấu trúc ngữ pháp Bài 4 (liên kết với WORDS/SENT)
let GRAMMAR_POINTS={
  ye:{
    han:'也',py:'yě',title:'也 (yě) – cũng, cũng vậy',
    desc:'Dùng để bổ sung, cho biết người hoặc sự việc cũng có cùng hành động, tính chất hay sở thích với người/sự việc đã nêu.',
    struct:'Chủ ngữ + 也 + Động từ / Tính từ',
    examples:[
      {zh:'我也喜欢喝茶。',hl:'也',py:'Wǒ yě xǐhuan hē chá.',vi:'Tôi cũng thích uống trà.',ic:'book'},
      {zh:'我也喜欢看书。',hl:'也',py:'Wǒ yě xǐhuan kàn shū.',vi:'Tôi cũng thích đọc sách.',ic:'film'}
    ],
    note:'“也” luôn đứng trước động từ hoặc tính từ (như 喜欢, 会), không bao giờ đứng trước chủ ngữ hay cuối câu.'
  },
  xihuan:{
    han:'喜欢',py:'xǐhuan',title:'喜欢 (xǐhuan) – thích, yêu thích',
    desc:'Dùng để diễn đạt sở thích đối với một sự vật (danh từ) hoặc một hoạt động (động từ). Phủ định dùng “不喜欢”.',
    struct:'Chủ ngữ + (不)喜欢 + Danh từ / Động từ',
    examples:[
      {zh:'我喜欢听音乐。',hl:'喜欢',py:'Wǒ xǐhuan tīng yīnyuè.',vi:'Tôi thích nghe nhạc.',ic:'head'},
      {zh:'你喜欢运动吗？',hl:'喜欢',py:'Nǐ xǐhuan yùndòng ma?',vi:'Bạn có thích thể thao không?',ic:'target'}
    ],
    note:'Để hỏi sở thích, thêm “吗” ở cuối câu (你喜欢…吗？) hoặc dùng “喜欢什么？” (thích gì?).'
  }
};

let GRAMMAR_QUIZ=[
  {
    id:'gq1',prompt:'Chọn câu dùng đúng vị trí của “也”:',
    q:'Tôi cũng thích uống trà.',
    opts:[
      {t:'我茶也喜欢。',ok:false},
      {t:'我也喜欢喝茶。',ok:true},
      {t:'也我喜欢喝茶。',ok:false}
    ],
    exp:'“也” đứng ngay sau chủ ngữ “我” và trước động từ “喜欢”: 我也喜欢喝茶。'
  },
  {
    id:'gq2',prompt:'Điền từ thích hợp vào chỗ trống:',
    q:'我喜欢看书，____ 喜欢看电影。',
    opts:[
      {t:'不',ok:false},
      {t:'也',ok:true},
      {t:'吗',ok:false}
    ],
    exp:'Hai vế cùng nói về sở thích của tôi nên dùng “也” (cũng): 我也喜欢看电影。'
  },
  {
    id:'gq3',prompt:'Chọn câu đúng để diễn đạt “Bạn có thích thể thao không?”:',
    q:'Bạn có thích thể thao không?',
    opts:[
      {t:'你喜欢运动吗？',ok:true},
      {t:'你运动喜欢吗？',ok:false},
      {t:'你喜欢也运动？',ok:false}
    ],
    exp:'Động từ “喜欢” đứng trước tân ngữ “运动”, cuối câu thêm “吗” để tạo câu hỏi.'
  },
  {
    id:'gq4',prompt:'Chọn câu phủ định đúng cho “Anh ấy không thích xem phim”:',
    q:'Anh ấy không thích xem phim.',
    opts:[
      {t:'他喜欢不看电影。',ok:false},
      {t:'他不喜欢看电影。',ok:true},
      {t:'他没喜欢看电影。',ok:false}
    ],
    exp:'Phủ định của “喜欢” dùng “不” đặt trước “喜欢”: 不喜欢 (bù xǐhuan).'
  },
  {
    id:'gq5',prompt:'Chọn câu đúng ngữ pháp:',
    q:'Cô ấy cũng thích ca hát.',
    opts:[
      {t:'她喜欢唱歌也。',ok:false},
      {t:'她也喜欢唱歌。',ok:true},
      {t:'也她喜欢唱歌。',ok:false}
    ],
    exp:'“也” không đứng ở cuối câu hay đầu câu; phải đặt trước cụm động từ “喜欢唱歌”.'
  }
];

// Dữ liệu tách cụm câu cho dạng Sắp xếp câu (liên kết trực tiếp từ SENT & WORDS)
let ORDER_BANK=[
  {id:'ord1',tokens:['我','喜欢','喝茶','。'],ans:'我喜欢喝茶。',py:'Wǒ xǐhuan hē chá.',vi:'Tôi thích uống trà.'},
  {id:'ord2',tokens:['我','也','喜欢','看书','。'],ans:'我也喜欢看书。',py:'Wǒ yě xǐhuan kàn shū.',vi:'Tôi cũng thích đọc sách.'},
  {id:'ord3',tokens:['你','喜欢','运动','吗','？'],ans:'你喜欢运动吗？',py:'Nǐ xǐhuan yùndòng ma?',vi:'Bạn có thích thể thao không?'},
  {id:'ord4',tokens:['他','喜欢','看电影','。'],ans:'他喜欢看电影。',py:'Tā xǐhuan kàn diànyǐng.',vi:'Anh ấy thích xem phim.'},
  {id:'ord5',tokens:['我','想','去','旅游','。'],ans:'我想去旅游。',py:'Wǒ xiǎng qù lǚyóu.',vi:'Tôi muốn đi du lịch.'}
];

const PUNCT_ONLY_RE=/^[。！？?!，,；;：:…、.]+$/;
function mergePunctTokens(arr){
  const out=[];
  for(const raw of (arr||[])){
    const tok=String(raw||'').trim();
    if(!tok)continue;
    if(PUNCT_ONLY_RE.test(tok)&&out.length)out[out.length-1]+=tok;
    else out.push(tok);
  }
  return out;
}
function resolveTokenPinyin(tok,sentZh,sentPy){
  const clean=String(tok||'').replace(/[。！？?!，,；;：:…、.\s]+/g,'');
  if(!clean)return '';
  const lex=new Map();
  (WORDS||[]).forEach(w=>{if(w&&w.zh&&w.py)lex.set(w.zh,w.py);});
  if(lex.has(clean))return lex.get(clean);
  if(store&&store.vocabBank){
    for(const w of Object.values(store.vocabBank)){if(w&&w.zh===clean&&w.py)return w.py;}
  }
  if(sentZh&&sentPy&&typeof splitPinyinSyllables==='function'){
    const hanAll=[...String(sentZh)].filter(c=>/[\u4e00-\u9fff]/.test(c));
    const syls=splitPinyinSyllables(sentPy);
    const tokHan=[...clean].filter(c=>/[\u4e00-\u9fff]/.test(c)).join('');
    if(tokHan&&syls.length===hanAll.length){
      const pos=hanAll.join('').indexOf(tokHan);
      if(pos>=0)return syls.slice(pos,pos+tokHan.length).join(' ');
    }
  }
  const chs=[...clean].filter(c=>/[\u4e00-\u9fff]/.test(c));
  if(chs.length){
    const parts=chs.map(c=>{
      if(lex.has(c))return lex.get(c);
      if(typeof HANZI_HACKNAO_DB!=='undefined'&&HANZI_HACKNAO_DB[c]&&HANZI_HACKNAO_DB[c].py)return HANZI_HACKNAO_DB[c].py;
      if(typeof HANZI_MINDMAP_DB!=='undefined'&&HANZI_MINDMAP_DB[c]&&HANZI_MINDMAP_DB[c].py)return HANZI_MINDMAP_DB[c].py;
      return '';
    });
    if(parts.every(Boolean))return parts.join(' ');
  }
  return '';
}

function buildLessonOrderBank(){
  if(typeof ORDER_BANK!=='undefined'&&Array.isArray(ORDER_BANK)&&ORDER_BANK.length){
    return ORDER_BANK.map(o=>Object.assign({},o,{tokens:mergePunctTokens(o.tokens)}));
  }
  const wordSet=(WORDS||[]).map(w=>w.zh).filter(z=>z&&z.length>=2).sort((a,b)=>b.length-a.length);
  const splitSentence=zh=>{
    const clean=String(zh||'').trim();
    if(!clean)return [];
    const tokens=[];
    let i=0;
    while(i<clean.length){
      const ch=clean[i];
      if(/\s/.test(ch)){i++;continue;}
      if(/[。！？?!，,；;：:]/.test(ch)){
        if(tokens.length)tokens[tokens.length-1]+=ch;
        else tokens.push(ch);
        i++;continue;
      }
      const hit=wordSet.find(w=>clean.startsWith(w,i));
      if(hit){tokens.push(hit);i+=hit.length;}
      else{tokens.push(ch);i++;}
    }
    return mergePunctTokens(tokens);
  };
  const candidates=[];
  const seen=new Set();
  const pushItem=(zh,py,vi,id)=>{
    const cleanZh=String(zh||'').trim().replace(/\s+/g,'');
    const hanLen=(cleanZh.match(/[\u4e00-\u9fff]/g)||[]).length;
    if(hanLen<3||seen.has(cleanZh))return;
    const tokens=splitSentence(cleanZh);
    if(tokens.length<3)return;
    seen.add(cleanZh);
    candidates.push({id,tokens,ans:cleanZh,py:py||'',vi:vi||''});
  };
  (LISTEN_DIALOG||[]).forEach((d,k)=>pushItem(d.zh,d.py,d.vi,'ord_d_'+k));
  (SENT||[]).forEach((s,k)=>pushItem(s.zh,s.py,s.vi,'ord_s_'+k));
  (WORDS||[]).forEach((w,k)=>{
    const ex=resolveWordExample(w);
    pushItem(ex.ex,ex.exPy,ex.exVi,'ord_w_'+k);
  });
  return candidates.slice(0,8);
}

function buildExerciseQuestions(mode){
  if(!WORDS.length){
    if(typeof GRAMMAR_QUIZ!=='undefined'&&Array.isArray(GRAMMAR_QUIZ)&&GRAMMAR_QUIZ.length){
      return GRAMMAR_QUIZ.filter(q=>Array.isArray(q.opts)&&q.opts.length).map((q,idx)=>({
        type:'gquiz',id:q.id||'ex_gq_'+idx,prompt:q.prompt||'Chọn đáp án đúng:',qText:q.q||'',opts:q.opts,exp:q.exp||''
      }));
    }
    return [];
  }
  const makeMeaning=w=>{
    const opts=shuffle([w,...pickDistractors(w,WORDS,3)]).map(x=>({id:x.id,label:x.vi,ok:x.id===w.id}));
    return {type:'meaning',wordId:w.id,prompt:'Chọn nghĩa đúng của từ:',zh:w.zh,py:w.py,opts,exp:`${w.zh} (${w.py}): ${w.vi}.`};
  };
  const makeHanzi=w=>{
    const opts=shuffle([w,...pickDistractors(w,WORDS,3)]).map(x=>({id:x.id,zh:x.zh,py:x.py,ok:x.id===w.id}));
    return {type:'hanzi',wordId:w.id,prompt:'Chọn chữ Hán & Pinyin đúng cho nghĩa:',vi:w.vi,zh:w.zh,opts,exp:`“${w.vi}” viết là ${w.zh} (${w.py}).`};
  };
  const makeFill=w=>{
    const exData=resolveWordExample(w);
    const exZh=exData.ex||(w.zh+'！');
    const blank=exZh.includes(w.zh)?exZh.replace(w.zh,'____'):`${exZh} (____)`;
    const opts=shuffle([w,...pickDistractors(w,WORDS,3)]).map(x=>({id:x.id,zh:x.zh,py:x.py,ok:x.id===w.id}));
    return {type:'fill',wordId:w.id,prompt:'Điền từ đúng vào chỗ trống:',sentence:blank,vi:exData.exVi||w.vi,zh:exZh,opts,exp:`Câu đúng: ${exZh} (${exData.exPy||w.py}) — ${exData.exVi||w.vi}`};
  };
  const makeMatch=slice=>{
    const pairs=slice.map(w=>({id:w.id,zh:w.zh,py:w.py,vi:w.vi}));
    return {type:'match',prompt:`Nối ${pairs.length} cặp chữ Hán với nghĩa đúng:`,pairs,left:shuffle(pairs),right:shuffle(pairs),exp:pairs.map(p=>`${p.zh} (${p.py}) = ${p.vi}`).join(' · ')};
  };
  const makeOrder=o=>({type:'order',prompt:'Sắp xếp các từ thành câu đúng:',tokens:shuffle(mergePunctTokens(o.tokens)),ans:o.ans,py:o.py,vi:o.vi,exp:`Đáp án đúng: ${o.ans}${o.py?' ('+o.py+')':''}`});
  const ordBank=buildLessonOrderBank();

  if(mode==='meaning')return shuffle(WORDS).slice(0,6).map(makeMeaning);
  if(mode==='hanzi')return shuffle(WORDS).slice(0,6).map(makeHanzi);
  if(mode==='fill')return shuffle(WORDS).slice(0,6).map(makeFill);
  if(mode==='match'){
    const ws=shuffle(WORDS);
    const out=[];
    if(ws.length>=2)out.push(makeMatch(ws.slice(0,Math.min(4,ws.length))));
    if(ws.length>=6)out.push(makeMatch(ws.slice(4,Math.min(8,ws.length))));
    return out;
  }
  if(mode==='order')return shuffle(ordBank).map(makeOrder);

  // Tổng hợp đa dạng theo đúng bài học hiện tại (tối đa 10 câu)
  const ws=shuffle(WORDS),qs=[];
  if(ws[0])qs.push(makeMeaning(ws[0]));
  if(ws[1])qs.push(makeMeaning(ws[1]));
  if(ws[2])qs.push(makeHanzi(ws[2]));
  if(ws[3])qs.push(makeHanzi(ws[3]));
  if(ws[4])qs.push(makeFill(ws[4]));
  if(ws[5])qs.push(makeFill(ws[5]));
  else if(ws[0])qs.push(makeFill(ws[0]));
  if(ws.length>=4)qs.push(makeMatch(ws.slice(0,4)));
  if(ws.length>=8)qs.push(makeMatch(ws.slice(4,8)));
  if(ordBank[0])qs.push(makeOrder(ordBank[0]));
  if(ordBank[1])qs.push(makeOrder(ordBank[1]));
  return qs;
}

/* ---------- Bộ điều khiển Bài tập tương tác (#exercise) ---------- */
const exCtrl=(function(){
  let mode='mix',qs=[],qi=0,correct=0,wrong=0,wrongQs=[],answered=false,recorded=false,placed=[],mSelL=null,mSelR=null,mDone=new Set(),mErrors=0;
  let showPy=(!store.settings||store.settings.showPinyin!==false);
  const stopTts=()=>{if(typeof window._stopTts==='function')window._stopTts();};

  function syncPyBtn(){
    const exSec=$('#exercise'),btn=$('#ex-tog-py');
    if(exSec)exSec.classList.toggle('ex-nopy',!showPy);
    if(btn){
      btn.classList.toggle('on',showPy);
      btn.setAttribute('aria-pressed',String(showPy));
      const useEl=btn.querySelector('use');
      if(useEl)useEl.setAttribute('href',showPy?'#i-eye':'#i-eye-off');
      const sp=btn.querySelector('span');
      if(sp)sp.textContent=showPy?'Pinyin: Bật':'Pinyin: Tắt';
    }
  }

  function syncHeader(){
    const l=(typeof LESSONS!=='undefined'&&Array.isArray(LESSONS))?LESSONS.find(x=>x.id===store.activeLessonId):null;
    const sub=$('#ex-sub');
    if(sub)sub.textContent=l?`${l.code||'Bài học'} • ${l.titleVi||l.titleZh||''}`:'Bài tập từ vựng bài học';
  }
  function saveActive(){
    if(!qs.length||qi>=qs.length)return;
    store.exercises.active={lessonId:store.activeLessonId,mode,qs,qi,correct,wrong,wrongQs,savedAt:Date.now()};
    saveStore(store);
  }
  function clearActive(){
    store.exercises.active=null;
    saveStore(store);
  }
  function checkResumeBanner(){
    const act=store.exercises.active,rb=$('#ex-resume');
    if(!rb)return;
    if(act&&act.lessonId===store.activeLessonId&&Array.isArray(act.qs)&&act.qs.length&&act.qi<act.qs.length){
      rb.classList.remove('hide');
      rb.innerHTML=`<div class="head" style="align-items:center"><svg class="ic"><use href="#i-clock"/></svg><div><b>Bạn có bài tập đang làm dở</b><span class="muted small" style="display:block">Câu ${act.qi+1} / ${act.qs.length} • Đúng ${act.correct}</span></div></div><div class="btnrow" style="margin-top:10px"><button type="button" class="btn sm" id="ex-cont">Tiếp tục</button><button type="button" class="btn ghost sm" id="ex-fresh">Làm bài mới</button></div>`;
      $('#ex-cont').onclick=()=>{
        mode=act.mode||'mix';qs=act.qs;qi=act.qi;correct=act.correct||0;wrong=act.wrong||0;wrongQs=act.wrongQs||[];
        recorded=false;rb.classList.add('hide');renderQ();
      };
      $('#ex-fresh').onclick=()=>{clearActive();rb.classList.add('hide');start(mode);};
    }else rb.classList.add('hide');
  }

  function start(newMode,customQs){
    mode=newMode||mode;
    $$('#ex-modes button').forEach(b=>b.classList.toggle('on',b.dataset.em===mode));
    qs=customQs||buildExerciseQuestions(mode);
    qi=0;correct=0;wrong=0;wrongQs=[];recorded=false;
    if(!customQs)clearActive();
    renderQ();
  }

  function showFb(isOk,title,desc,allowRetry){
    if(typeof playSfx==='function')playSfx(isOk?'ok':'no');
    const fb=$('#ex-fb'),act=$('#ex-actions'),rbtn=$('#ex-retry');
    fb.className='fb-card '+(isOk?'ok':'no');
    fb.innerHTML=`<b><svg class="ic" style="width:1.1em;height:1.1em"><use href="#i-${isOk?'check':'x'}"/></svg>${title}</b><span>${desc}</span>`;
    fb.classList.remove('hide');
    act.classList.remove('hide');
    rbtn.classList.toggle('hide',isOk||!allowRetry);
    $('#ex-next').textContent=(qi+1>=qs.length)?'Xem tổng kết':'Câu tiếp theo →';
  }

  function gradeSimple(isOk,q){
    if(answered)return;
    answered=true;
    if(isOk)correct++;else{wrong++;if(!wrongQs.includes(q))wrongQs.push(q);}
    saveActive();
    showFb(isOk,isOk?'Chính xác!':'Chưa đúng rồi!',q.exp,!isOk);
  }

  function renderQ(){
    stopTts();
    const play=$('#ex-play'),em=$('#ex-empty'),sum=$('#ex-summary');
    sum.classList.add('hide');
    if(!qs.length){
      play.classList.add('hide');em.classList.remove('hide');
      em.innerHTML=`<h3>Chưa có câu hỏi phù hợp</h3><p class="muted small" style="margin-top:6px">Hãy thử chọn dạng bài tập khác hoặc quay lại bài học.</p><div class="btnrow" style="margin-top:12px"><button type="button" class="btn sm" id="ex-reset-mix">Về Tổng hợp</button></div>`;
      $('#ex-reset-mix').onclick=()=>start('mix');
      return;
    }
    if(qi>=qs.length){renderSummary();return;}
    em.classList.add('hide');play.classList.remove('hide');
    answered=false;placed=[];mSelL=null;mSelR=null;mDone=new Set();mErrors=0;
    $('#ex-fb').classList.add('hide');$('#ex-actions').classList.add('hide');

    const q=qs[qi];
    $('#ex-count').textContent=`${qi+1} / ${qs.length}`;
    $('#ex-bar').style.width=((qi+1)/qs.length*100)+'%';

    const pbox=$('#ex-prompt-box'),stage=$('#ex-stage');
    const ABC=['A','B','C','D','E','F'];

    if(q.type==='gquiz'){
      const esc=s=>(typeof escHtml==='function')?escHtml(s):String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      pbox.innerHTML=`<p class="muted small">${esc(q.prompt)}</p><div style="font-size:18px;font-weight:700;margin-top:8px;line-height:1.45">${esc(q.qText)}</div>`;
      stage.innerHTML=`<div class="opt-list">${q.opts.map((o,idx)=>`<button type="button" class="opt" data-idx="${idx}"><i>${ABC[idx]||idx+1}</i><span class="zh">${esc(o.t)}</span><span class="st-ic"></span></button>`).join('')}</div>`;
      $$('.opt',stage).forEach(btn=>btn.onclick=()=>{
        if(answered)return;
        const idx=+btn.dataset.idx,ok=q.opts[idx].ok;
        btn.classList.add(ok?'ok':'no');
        $('.st-ic',btn).textContent=ok?'✓':'✕';
        if(!ok){const oi=q.opts.findIndex(x=>x.ok);if(oi>=0){const ob=$$('.opt',stage)[oi];ob.classList.add('ok');$('.st-ic',ob).textContent='✓';}}
        gradeSimple(ok,q);
      });
    }else if(q.type==='meaning'){
      pbox.innerHTML=`<p class="muted small">${q.prompt}</p><div class="word-aud-grid" style="margin-top:8px"><span aria-hidden="true"></span><div class="word-aud-stack"><div class="q-han"><span>${q.zh}</span></div><div class="q-sub ex-py">${q.py}</div></div><div class="word-aud-btns"><button type="button" class="playbtn" data-say="${q.zh}" aria-label="Nghe ${q.zh}"><svg class="ic"><use href="#i-vol"/></svg></button><button type="button" class="playbtn slow" data-say-slow="${q.zh}" title="Nghe chậm" aria-label="Nghe chậm ${q.zh}"><svg class="ic"><use href="#i-slow"/></svg></button></div></div>`;
      stage.innerHTML=`<div class="opt-list">${q.opts.map((o,idx)=>`<button type="button" class="opt" data-idx="${idx}"><i>${ABC[idx]}</i><span>${o.label}</span><span class="st-ic"></span></button>`).join('')}</div>`;
      $$('.opt',stage).forEach(btn=>btn.onclick=()=>{
        if(answered)return;
        const idx=+btn.dataset.idx,ok=q.opts[idx].ok;
        btn.classList.add(ok?'ok':'no');
        $('.st-ic',btn).textContent=ok?'✓':'✕';
        if(!ok){const oi=q.opts.findIndex(x=>x.ok);if(oi>=0){const ob=$$('.opt',stage)[oi];ob.classList.add('ok');$('.st-ic',ob).textContent='✓';}}
        gradeSimple(ok,q);
      });
    }else if(q.type==='hanzi'){
      pbox.innerHTML=`<p class="muted small">${q.prompt}</p><div style="font-size:22px;font-weight:700;margin-top:8px;color:var(--accent)">“${q.vi}”</div>`;
      stage.innerHTML=`<div class="opt-list">${q.opts.map((o,idx)=>`<button type="button" class="opt" data-idx="${idx}"><i>${ABC[idx]}</i><span class="ex-opt-stack"><span class="zh">${o.zh}</span><span class="ex-py">${o.py}</span></span><span class="st-ic"></span></button>`).join('')}</div>`;
      $$('.opt',stage).forEach(btn=>btn.onclick=()=>{
        if(answered)return;
        const idx=+btn.dataset.idx,ok=q.opts[idx].ok;
        btn.classList.add(ok?'ok':'no');
        $('.st-ic',btn).textContent=ok?'✓':'✕';
        if(!ok){const oi=q.opts.findIndex(x=>x.ok);if(oi>=0){const ob=$$('.opt',stage)[oi];ob.classList.add('ok');$('.st-ic',ob).textContent='✓';}}
        gradeSimple(ok,q);
        if(typeof speak==='function')speak(q.zh);
      });
    }else if(q.type==='fill'){
      pbox.innerHTML=`<p class="muted small">${q.prompt}</p><div style="font-family:var(--han);font-size:24px;font-weight:700;margin-top:10px">${q.sentence}</div><div class="q-sub">${q.vi}</div>`;
      stage.innerHTML=`<div class="opt-list">${q.opts.map((o,idx)=>`<button type="button" class="opt" data-idx="${idx}"><i>${ABC[idx]}</i><span class="ex-opt-stack"><span class="zh">${o.zh}</span><span class="ex-py">${o.py}</span></span><span class="st-ic"></span></button>`).join('')}</div>`;
      $$('.opt',stage).forEach(btn=>btn.onclick=()=>{
        if(answered)return;
        const idx=+btn.dataset.idx,ok=q.opts[idx].ok;
        btn.classList.add(ok?'ok':'no');
        $('.st-ic',btn).textContent=ok?'✓':'✕';
        if(!ok){const oi=q.opts.findIndex(x=>x.ok);if(oi>=0){const ob=$$('.opt',stage)[oi];ob.classList.add('ok');$('.st-ic',ob).textContent='✓';}}
        gradeSimple(ok,q);
        if(typeof speak==='function')speak(q.zh);
      });
    }else if(q.type==='match'){
      pbox.innerHTML=`<p class="muted small">${q.prompt}</p><div class="q-sub">Chạm 1 chữ Hán bên trái và 1 nghĩa bên phải</div>`;
      stage.innerHTML=`<div class="match-grid">
        <div class="match-col">${q.left.map(p=>`<button type="button" class="m-btn zh" data-ml="${p.id}" data-zh="${p.zh}"><span class="m-han">${p.zh}</span><span class="ex-py m-py">${p.py}</span></button>`).join('')}</div>
        <div class="match-col">${q.right.map(p=>`<button type="button" class="m-btn" data-mr="${p.id}"><span>${p.vi}</span></button>`).join('')}</div>
      </div>`;
      const syncMatchUI=(badL,badR)=>{
        $$('[data-ml]',stage).forEach(b=>{
          const id=b.dataset.ml;
          b.classList.toggle('ok',mDone.has(id));
          b.classList.toggle('sel',!mDone.has(id)&&mSelL===id);
          b.classList.toggle('no',Boolean(badL&&id===badL));
        });
        $$('[data-mr]',stage).forEach(b=>{
          const id=b.dataset.mr;
          b.classList.toggle('ok',mDone.has(id));
          b.classList.toggle('sel',!mDone.has(id)&&mSelR===id);
          b.classList.toggle('no',Boolean(badR&&id===badR));
        });
      };
      const tryMatch=()=>{
        if(mSelL&&mSelR){
          if(mSelL===mSelR){
            if(typeof playSfx==='function')playSfx('ok');
            mDone.add(mSelL);mSelL=null;mSelR=null;syncMatchUI();
            if(mDone.size===q.pairs.length){
              gradeSimple(mErrors===0,q);
              if(mErrors>0)showFb(false,`Hoàn thành (sai ${mErrors} lần ghép)`,q.exp,true);
            }
          }else{
            if(typeof playSfx==='function')playSfx('no');
            mErrors++;
            const l=mSelL,r=mSelR;mSelL=null;mSelR=null;syncMatchUI(l,r);
            toast('Chưa khớp, thử chọn lại nhé');
          }
        }else syncMatchUI();
      };
      $$('[data-ml]',stage).forEach(b=>b.onclick=()=>{
        if(answered||mDone.has(b.dataset.ml))return;
        mSelL=b.dataset.ml;
        const zh=b.dataset.zh||b.textContent;
        tryMatch();
        if(typeof speak==='function')speak(zh);
      });
      $$('[data-mr]',stage).forEach(b=>b.onclick=()=>{
        if(answered||mDone.has(b.dataset.mr))return;
        mSelR=b.dataset.mr;
        tryMatch();
      });
      syncMatchUI();
    }else if(q.type==='order'){
      pbox.innerHTML=`<p class="muted small">${q.prompt}</p><div class="q-sub" style="font-size:16px;color:var(--ink);font-weight:600;margin-top:8px">“${q.vi}”</div>`;
      const tokPys=q.tokens.map(t=>resolveTokenPinyin(t,q.ans,q.py));
      const renderTokInner=(t,idx)=>`<span class="tok-zh">${escH(t)}</span>${tokPys[idx]?`<span class="tok-py">${escH(tokPys[idx])}</span>`:''}`;
      stage.innerHTML=`
        <div class="order-zone" id="ord-ans"></div>
        <div class="bank-zone" style="margin-top:10px">${q.tokens.map((t,ti)=>`<button type="button" class="tok" data-ot="${ti}">${renderTokInner(t,ti)}</button>`).join('')}</div>
        <div class="btnrow" style="margin-top:10px"><button type="button" class="btn ghost sm" id="ord-clr">Xếp lại</button><button type="button" class="btn sm" id="ord-chk">Kiểm tra</button></div>`;
      const ansEl=$('#ord-ans',stage);
      const syncOrderUI=()=>{
        ansEl.innerHTML=placed.length
          ?placed.map((ti,pos)=>`<button type="button" class="tok placed" data-op="${pos}">${renderTokInner(q.tokens[ti],ti)}</button>`).join('')
          :'<span class="muted small">Chạm các mảnh từ bên dưới để xếp câu...</span>';
        $$('[data-ot]',stage).forEach(b=>b.classList.toggle('used',placed.includes(+b.dataset.ot)));
      };
      ansEl.onclick=e=>{
        if(answered)return;
        const b=e.target.closest('[data-op]');
        if(!b)return;
        placed.splice(+b.dataset.op,1);
        syncOrderUI();
      };
      $$('[data-ot]',stage).forEach(b=>b.onclick=()=>{
        if(answered)return;
        const ti=+b.dataset.ot;
        if(placed.includes(ti))return;
        const sp=String(q.tokens[ti]||'').replace(/[，。！？、；：“”‘’（）《》….,!?;:\s]+/g,'');
        placed.push(ti);
        syncOrderUI();
        if(sp&&typeof speak==='function')speak(sp);
      });
      $('#ord-clr',stage).onclick=()=>{if(answered)return;stopTts();placed=[];syncOrderUI();};
      $('#ord-chk',stage).onclick=()=>{
        if(answered)return;
        if(!placed.length){toast('Hãy chọn các từ trước khi kiểm tra');return;}
        const userStr=placed.map(ti=>q.tokens[ti]).join('').replace(/\s+/g,'');
        const ok=userStr===String(q.ans||'').replace(/\s+/g,'');
        gradeSimple(ok,q);
        if(typeof speak==='function')speak(q.ans);
      };
      syncOrderUI();
    }
  }

  function renderSummary(){
    $('#ex-play').classList.add('hide');
    $('#ex-empty').classList.add('hide');
    const sum=$('#ex-summary');sum.classList.remove('hide');
    const total=correct+wrong,pct=total?Math.round(correct/total*100):0;
    if(!recorded&&total>0){
      recorded=true;
      store.exercises.attempts+=1;
      if(pct>store.exercises.bestPct)store.exercises.bestPct=pct;
      const lAct=(typeof LESSONS!=='undefined'&&Array.isArray(LESSONS))?LESSONS.find(x=>x.id===store.activeLessonId):null;
      const exTitle=lAct?`Bài tập từ vựng ${lAct.code||''} (${mode})`:`Bài tập từ vựng (${mode})`;
      store.exercises.sessions.push({at:Date.now(),mode,correct,wrong,total,pct});recordLearningEvent({type:'exercise',skill:'read',title:exTitle,result:`${correct}/${total} (${pct}%)`,view:'exercise',meta:{correct,total,pct}});
      if(store.exercises.sessions.length>20)store.exercises.sessions=store.exercises.sessions.slice(-20);
      clearActive();
      updateLessonExerciseStatus();
    }
    sum.innerHTML=`<div class="sphead"><svg class="ic"><use href="#i-award"/></svg><div><h3>Hoàn thành bài tập!</h3><span class="muted small">Độ chính xác: ${pct}% • Kỷ lục: ${store.exercises.bestPct}%</span></div></div>
      <div class="sum-grid" style="margin-top:12px"><div><b style="color:var(--good)">${correct}</b><span>Đúng</span></div><div><b>${wrong}</b><span>Sai</span></div><div><b style="color:var(--ink)">${store.exercises.attempts}</b><span>Lần luyện</span></div></div>
      ${wrongQs.length?`<div style="margin-top:12px;display:grid;gap:6px"><b class="small">Câu cần xem lại:</b>${wrongQs.map(w=>`<div class="wrong-item"><b>${w.zh||w.ans||''}</b> — ${w.exp}</div>`).join('')}</div>`:''}
      <div class="btnrow" style="margin-top:14px">${wrongQs.length?`<button type="button" class="btn ghost sm" id="ex-retry-wrong">Làm lại ${wrongQs.length} câu sai</button>`:''}<button type="button" class="btn sm" id="ex-again"><svg class="ic"><use href="#i-refresh"/></svg>Luyện lại</button></div>`;
    const rw=$('#ex-retry-wrong');if(rw)rw.onclick=()=>start(mode,wrongQs.slice());
    $('#ex-again').onclick=()=>start(mode);
    if(total>0&&typeof showSectionSummary==='function'){
      showSectionSummary('exercise',{
        doneCount:total,
        totalCount:total,
        unit:'câu',
        errors:wrong,
        accuracy:pct,
        wrongItems:wrongQs.map(w=>({zh:w.zh||w.ans||'',py:w.py||'',vi:w.vi||w.exp||'',note:'Bạn đã trả lời sai'}))
      },{
        onRetryWrong:wrongQs.length?()=>start(mode,wrongQs.slice()):null,
        onRetryAll:()=>start(mode)
      });
    }
  }

  if($('#ex-tog-py'))$('#ex-tog-py').onclick=()=>{showPy=!showPy;syncPyBtn();};
  $('#ex-modes').addEventListener('click',e=>{const b=e.target.closest('button');if(b){stopTts();start(b.dataset.em);}});
  $('#ex-next').onclick=()=>{stopTts();qi+=1;if(qi<qs.length)saveActive();renderQ();};
  $('#ex-retry').onclick=()=>{
    // Cho làm lại ngay câu vừa sai (không cộng trùng vào total)
    stopTts();
    const q=qs[qi];
    if(answered&&wrong>0){wrong--;const idx=wrongQs.indexOf(q);if(idx>=0)wrongQs.splice(idx,1);}
    renderQ();
  };

  return {init(){syncPyBtn();syncHeader();checkResumeBanner();start('mix');},refresh(){syncPyBtn();syncHeader();checkResumeBanner();start(mode);},syncHeader};
})();

/* ---------- Bộ điều khiển Ngữ pháp (#grammar: Lý thuyết + Bài tập áp dụng đa dạng) ---------- */
const HN_GRAMMAR_QUIZ_BANK={
  lesson_hn1_b1:[
    {id:'g1_1',qtype:'fill',prompt:'Chọn từ đúng về biến điệu thanh 3:',q:'Khi nói “你好” (nǐ hǎo), âm tiết “你” đọc biến điệu thành ____.',opts:[{t:'ní (thanh 2)',ok:true},{t:'nī (thanh 1)',ok:false},{t:'nì (thanh 4)',ok:false}],exp:'Hai âm tiết thanh 3 liền nhau thì âm đầu đọc thành thanh 2: nǐ hǎo → ní hǎo.'},
    {id:'g1_2',qtype:'correct',prompt:'Chọn cặp chữ & thanh điệu đúng nghĩa “tám” (bā) – “bố” (bà):',q:'Phân biệt thanh 1 và thanh 4:',opts:[{t:'八 (bā · thanh 1) — 爸 (bà · thanh 4)',ok:true},{t:'八 (bà · thanh 4) — 爸 (bā · thanh 1)',ok:false},{t:'八 (bá · thanh 2) — 爸 (bǎ · thanh 3)',ok:false}],exp:'Thanh 1 (bā: tám) đọc cao ngang, còn thanh 4 (bà: bố) đọc giáng mạnh từ cao xuống thấp.'},
    {id:'g1_3',qtype:'fill',prompt:'Chọn đại từ nhân xưng ngôi 2 số ít đúng với ngữ cảnh chào hỏi:',q:'____ 好！(Xin chào bạn!)',opts:[{t:'你 (nǐ)',ok:true},{t:'马 (mǎ)',ok:false},{t:'大 (dà)',ok:false}],exp:'“你好！” (Nǐ hǎo!) là câu chào hỏi cơ bản nhất trong Bài 1.'},
    {id:'g1_4',qtype:'correct',prompt:'Chọn câu chào đáp lại đúng chuẩn hội thoại Bài 1:',q:'Người A: “你好！” — Người B đáp:',opts:[{t:'你好！',ok:true},{t:'不马！',ok:false},{t:'大女！',ok:false}],exp:'Trong Bài 1 Hán ngữ 1, khi nghe “你好！”, ta đáp lại lịch sự là “你好！”.'},
    {id:'g1_5',qtype:'order',prompt:'Sắp xếp các mảnh sau thành câu chào chuẩn:',tokens:['你','好','！'],ans:'你好！',py:'Nǐ hǎo!',vi:'Xin chào!'},
    {id:'g1_6',qtype:'order',prompt:'Sắp xếp các mảnh sau thành cụm từ có nghĩa “con ngựa trắng”:',tokens:['白','马'],ans:'白马',py:'bái mǎ',vi:'con ngựa trắng'}
  ],
  lesson_hn1_b2:[
    {id:'g2_1',qtype:'fill',prompt:'Chọn trợ từ nghi vấn để tạo câu hỏi “Bạn bận không?”:',q:'你忙 ____？',opts:[{t:'吗 (ma)',ok:true},{t:'很 (hěn)',ok:false},{t:'太 (tài)',ok:false}],exp:'Đặt trợ từ “吗” ở cuối câu trần thuật để hỏi Có/Không: 你忙吗？'},
    {id:'g2_2',qtype:'fill',prompt:'Chọn cụm từ điền đúng nghĩa “không khó lắm”:',q:'汉语 ____ 难。',opts:[{t:'不太 (bú tài)',ok:true},{t:'吗 (ma)',ok:false},{t:'好吗 (hǎo ma)',ok:false}],exp:'“不太 + Tính từ” diễn đạt mức độ “không ... lắm”: 汉语不太难。'},
    {id:'g2_3',qtype:'correct',prompt:'Chọn câu hỏi đúng ngữ pháp cho “Tiếng Hán khó không?”:',q:'Tiếng Hán có khó không?',opts:[{t:'汉语难吗？',ok:true},{t:'汉语吗难？',ok:false},{t:'吗汉语难？',ok:false}],exp:'Trợ từ nghi vấn “吗” luôn đứng ở cuối câu hỏi: 汉语难吗？'},
    {id:'g2_4',qtype:'correct',prompt:'Chọn câu áp dụng đúng biến điệu “不” trước thanh 4 (tài):',q:'Đọc và dùng đúng “不太难”:',opts:[{t:'不太难 (bú tài nán)',ok:true},{t:'不太难 (bù tǎi nán)',ok:false},{t:'难不太 (nán bú tài)',ok:false}],exp:'“不” đứng trước âm tiết thanh 4 (太 tài) biến điệu thành thanh 2 (bú): bú tài nán.'},
    {id:'g2_5',qtype:'order',prompt:'Sắp xếp thành câu hỏi “Bạn bận không?”:',tokens:['你','忙','吗','？'],ans:'你忙吗？',py:'Nǐ máng ma?',vi:'Bạn bận không?'},
    {id:'g2_6',qtype:'order',prompt:'Sắp xếp thành câu trả lời “Không khó lắm.”:',tokens:['不','太','难','。'],ans:'不太难。',py:'Bú tài nán.',vi:'Không khó lắm.'}
  ]
};

const gramCtrl=(function(){
  let curGp='ye',gMode='mix',quizList=[],qi=0,correct=0,wrong=0,answered=false,recorded=false,wrongList=[],placed=[],phase='theory',gpKeys=[],gpIdx=0;
  const esc=s=>(typeof escHtml==='function')?escHtml(s):String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const stopTts=()=>{if(typeof window._stopTts==='function')window._stopTts();};

  function syncHeader(){
    const l=(typeof LESSONS!=='undefined'&&Array.isArray(LESSONS))?LESSONS.find(x=>x.id===store.activeLessonId):null;
    const sub=$('#gr-sub');
    if(sub)sub.textContent=l?`${l.code||'Bài học'} • ${l.titleVi||l.titleZh||''}`:'Ngữ pháp bài học';
  }

  function buildDynamicGrammarQuiz(){
    const lid=store.activeLessonId;
    if(lid&&HN_GRAMMAR_QUIZ_BANK[lid])return HN_GRAMMAR_QUIZ_BANK[lid].slice();
    const out=[];
    let hasSeedFill=false,hasSeedCorrect=false,hasSeedOrder=false;
    if(typeof GRAMMAR_QUIZ!=='undefined'&&Array.isArray(GRAMMAR_QUIZ)&&GRAMMAR_QUIZ.length){
      GRAMMAR_QUIZ.forEach(q=>{
        const qt=q.qtype||(q.q&&(q.q.includes('____')||q.q.includes('（　）')||q.q.includes('( )'))?'fill':'correct');
        const normQt=(qt==='choice')?'correct':qt;
        if(normQt==='fill')hasSeedFill=true;
        else if(normQt==='correct')hasSeedCorrect=true;
        else if(normQt==='order')hasSeedOrder=true;
        out.push(Object.assign({},q,{qtype:normQt}));
      });
    }
    const gpVals=Object.values(GRAMMAR_POINTS||{});
    const exPool=[];
    gpVals.forEach(gp=>{
      if(Array.isArray(gp.examples))gp.examples.forEach(ex=>{if(ex&&ex.zh)exPool.push({zh:ex.zh,py:ex.py||'',vi:ex.vi||'',hl:ex.hl||'',gpTitle:gp.title||''});});
      if(gp.ex)exPool.push({zh:gp.ex,py:'',vi:gp.explain||gp.desc||'',hl:'',gpTitle:gp.title||''});
    });
    if(WORDS&&WORDS.length){
      (LISTEN_DIALOG||[]).forEach(d=>{if(d&&d.zh)exPool.push({zh:d.zh,py:d.py||'',vi:d.vi||'',hl:'',gpTitle:''});});
      (SENT||[]).forEach(s=>{if(s&&s.zh)exPool.push({zh:s.zh,py:s.py||'',vi:s.vi||'',hl:'',gpTitle:''});});
    }

    const funcWords=[
      {w:'吗',alt:['呢','很']},
      {w:'呢',alt:['吗','吧']},
      {w:'吧',alt:['吗','的']},
      {w:'也',alt:['不','都']},
      {w:'都',alt:['也','很']},
      {w:'的',alt:['吗','呢']},
      {w:'很',alt:['不','太']},
      {w:'还是',alt:['不是','都是']},
      {w:'没有',alt:['不是','很']},
      {w:'在',alt:['是','有']},
      {w:'是',alt:['在','有']},
      {w:'有',alt:['在','是']},
      {w:'不',alt:['很','也']}
    ];
    const seenFill=new Set();
    const cleanSentences=[];
    const seenSent=new Set();
    exPool.forEach(item=>{
      String(item.zh).split(/[·。！？!?]/).map(x=>x.trim()).forEach(seg=>{
        const han=(seg.match(/[\u4e00-\u9fff]/g)||[]).length;
        if(han>=3&&han<=18&&!seenSent.has(seg)){seenSent.add(seg);cleanSentences.push({zh:seg+(String(item.zh).includes('？')&&seg.includes('吗')?'？':(/[吗谁什么哪几多少呢]$/.test(seg)?'？':'。')),py:item.py,vi:item.vi,gpTitle:item.gpTitle});}
      });
    });

    // 1. Chọn từ vào chỗ trống (fill) nếu chưa có sẵn từ GRAMMAR_QUIZ
    if(!hasSeedFill){
      for(const s of cleanSentences){
        if(seenFill.size>=3)break;
        let matchedFw=funcWords.find(fw=>s.zh.includes(fw.w));
        let tok=matchedFw?matchedFw.w:null;
        let alts=matchedFw?matchedFw.alt:null;
        if(!tok&&WORDS&&WORDS.length){
          const wHit=(WORDS||[]).find(w=>w.zh&&s.zh.includes(w.zh));
          if(wHit){
            tok=wHit.zh;
            alts=shuffle((WORDS||[]).filter(x=>x.zh!==tok)).slice(0,2).map(x=>x.zh);
          }
        }
        if(tok&&alts&&alts.length>=2&&!seenFill.has(s.zh)){
          seenFill.add(s.zh);
          const blank=s.zh.replace(tok,'____');
          const opts=shuffle([{t:tok,ok:true},{t:alts[0],ok:false},{t:alts[1],ok:false}]);
          out.push({id:'dyn_f_'+out.length,qtype:'fill',prompt:'Chọn từ thích hợp điền vào chỗ trống:',q:`${blank}${s.vi?' ('+s.vi+')':''}`,opts,ansZh:s.zh,exp:`Câu hoàn chỉnh đúng ngữ pháp là “${s.zh}”${s.vi?' ('+s.vi+')':''}.`});
        }
      }
    }

    // 2. Chọn câu đúng ngữ pháp (correct)
    if(!hasSeedCorrect){
      cleanSentences.slice(0,3).forEach((s,idx)=>{
        const base=s.zh.replace(/[。！？?!]+$/,'');
        const endP=s.zh.slice(base.length)||'。';
        const chars=[...base];
        if(chars.length<3)return;
        const w1=[...chars.slice(1),chars[0]].join('')+endP;
        const w2=chars.slice().reverse().join('')+endP;
        if(w1===s.zh||w2===s.zh||w1===w2)return;
        const opts=shuffle([{t:s.zh,ok:true},{t:w1,ok:false},{t:w2,ok:false}]);
        out.push({id:'dyn_c_'+idx,qtype:'correct',prompt:'Chọn câu viết đúng trật tự ngữ pháp:',q:s.vi||`Áp dụng ngữ pháp ${s.gpTitle||'của bài'}`,opts,ansZh:s.zh,exp:`Câu chuẩn theo giáo trình: “${s.zh}”${s.vi?' — '+s.vi:''}.`});
      });
    }

    // 3. Sắp xếp câu ngữ pháp (order)
    if(!hasSeedOrder&&(WORDS&&WORDS.length)){
      const ordBank=buildLessonOrderBank();
      ordBank.slice(0,3).forEach((o,idx)=>{
        out.push({id:'dyn_o_'+idx,qtype:'order',prompt:'Sắp xếp các từ theo đúng cấu trúc câu:',tokens:o.tokens.slice(),ans:o.ans,py:o.py,vi:o.vi,exp:`Trật tự đúng: ${o.ans}${o.py?' ('+o.py+')':''}`});
      });
    }

    return out;
  }

  function startQuiz(newMode){
    if(newMode)gMode=newMode;
    $$('#gq-modes button').forEach(b=>b.classList.toggle('on',b.dataset.gm===gMode));
    const full=buildDynamicGrammarQuiz();
    const wrap=$('#gq-wrap'),sum=$('#gq-summary');
    if(!full.length){
      quizList=[];
      if(wrap)wrap.classList.add('hide');
      if(sum)sum.classList.add('hide');
      return;
    }
    if(gMode==='mix'){
      const fills=full.filter(x=>x.qtype==='fill');
      const cors=full.filter(x=>x.qtype==='correct');
      const ords=full.filter(x=>x.qtype==='order');
      const mixed=[];
      const maxLen=Math.max(fills.length,cors.length,ords.length);
      for(let k=0;k<maxLen&&mixed.length<6;k++){
        if(fills[k]&&mixed.length<6)mixed.push(fills[k]);
        if(cors[k]&&mixed.length<6)mixed.push(cors[k]);
        if(ords[k]&&mixed.length<6)mixed.push(ords[k]);
      }
      quizList=mixed.length?mixed:full.slice(0,6);
    }else{
      quizList=full.filter(x=>x.qtype===gMode);
    }
    qi=0;correct=0;wrong=0;answered=false;recorded=false;wrongList=[];placed=[];
    if(wrap)wrap.classList.toggle('hide',phase!=='quiz');
    if(sum)sum.classList.add('hide');
    renderQuiz();
  }

  function renderGrammarPointHtml(key){
    const g=GRAMMAR_POINTS[key];
    if(!g)return '<p class="muted small" style="margin:0">Chưa có nội dung ngữ pháp.</p>';
    const han=g.han||'语法';
    const py=g.py||'';
    const desc=g.desc||g.explain||'';
    const structHtml=g.struct?`<div class="struct"><b><svg class="ic"><use href="#i-layers"/></svg>Cấu trúc:</b><span>${esc(g.struct)}</span></div>`:'';
    const exList=Array.isArray(g.examples)?g.examples:(g.ex?[{zh:g.ex,hl:'',py:'',vi:'',ic:'book'}]:[]);
    const exHtml=exList.length?`<h3 style="border-left:4px solid var(--accent);padding-left:8px">Ví dụ</h3>
      <div>${exList.map(ex=>`<div class="ex"><span class="ib"><svg class="ic"><use href="#i-${esc(ex.ic||'book')}"/></svg></span><div><div class="zh">${ex.hl?highlightText(ex.zh||'',ex.hl):esc(ex.zh||'')}</div>${ex.py?`<small>${esc(ex.py)}</small>`:''}${ex.vi?`<small>${esc(ex.vi)}</small>`:''}</div><button type="button" class="playbtn" data-say="${esc(ex.zh||'')}" aria-label="Nghe ví dụ"><svg class="ic"><use href="#i-vol"/></svg></button></div>`).join('')}</div>`:'';
    const noteHtml=g.note?`<div class="note"><svg class="ic"><use href="#i-bulb"/></svg><div><b>Lưu ý:</b> ${esc(g.note)}</div></div>`:'';
    const isWide=han.length>2||/[\/、，,\s]/.test(han);
    return `<div class="gram${isWide?' gram-wide':''}"><div class="big">${esc(han)}<small>${esc(py)}</small></div><div><h3>${esc(g.title||'')}</h3>${desc?`<p class="muted small" style="margin-top:4px">${esc(desc)}</p>`:''}</div></div>${structHtml}${exHtml}${noteHtml}`;
  }

  function setPhase(nextPhase){
    phase=(nextPhase==='quiz'||!gpKeys.length)?'quiz':'theory';
    const th=$('#gp-theory-view'),wrap=$('#gq-wrap'),sum=$('#gq-summary'),peek=$('#gr-peek-btn');
    if(phase==='theory'){
      if(th)th.classList.remove('hide');
      if(wrap)wrap.classList.add('hide');
      if(sum)sum.classList.add('hide');
      if(peek)peek.classList.add('hide');
    }else{
      if(th)th.classList.add('hide');
      if(peek)peek.classList.toggle('hide',!gpKeys.length);
      if(wrap&&(!sum||sum.classList.contains('hide'))){
        if(!quizList.length)startQuiz(gMode);
        else wrap.classList.remove('hide');
      }
      try{window.scrollTo({top:0,behavior:'smooth'});}catch(_){}
    }
  }

  function renderPoint(key){
    const g=GRAMMAR_POINTS[key];
    if(!g)return;
    curGp=key;
    if(gpKeys.length){const idx=gpKeys.indexOf(key);if(idx>=0)gpIdx=idx;}
    $$('#gp-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.gp===key));
    $('#gp-card').innerHTML=renderGrammarPointHtml(key);
    const total=Math.max(1,gpKeys.length);
    const cntEl=$('#gp-cnt'),barEl=$('#gp-bar'),prevB=$('#gp-prev-btn'),nextB=$('#gp-next-btn');
    if(cntEl)cntEl.textContent=`${gpIdx+1} / ${total}`;
    if(barEl)barEl.style.width=((gpIdx+1)/total*100)+'%';
    if(prevB)prevB.classList.toggle('hide',gpIdx<=0);
    if(nextB)nextB.textContent=(gpIdx+1>=gpKeys.length)?'Làm bài tập áp dụng →':'Tiếp theo →';
  }

  function openGrammarPopup(){
    if(!gpKeys.length||typeof openModal!=='function')return;
    let popKey=gpKeys.includes(curGp)?curGp:gpKeys[0];
    const tabsHtml=gpKeys.length>1?`<div class="gr-pop-tabs" id="gr-pop-tabs">${gpKeys.map(k=>`<button type="button" class="${k===popKey?'on':''}" data-gpop="${esc(k)}">${esc((GRAMMAR_POINTS[k]&&GRAMMAR_POINTS[k].title)||k)}</button>`).join('')}</div>`:'';
    openModal(`<div class="gr-pop-wrap">
      <div class="gr-pop-head"><b>Ngữ pháp bài học</b><button type="button" class="iconb" id="gr-pop-x" aria-label="Đóng"><svg class="ic"><use href="#i-x"/></svg></button></div>
      ${tabsHtml}
      <div class="gr-pop-body card" id="gr-pop-body">${renderGrammarPointHtml(popKey)}</div>
      <button type="button" class="btn sm" id="gr-pop-close">Đóng &amp; tiếp tục làm bài</button>
    </div>`);
    const closeFn=()=>{if(typeof closeModal==='function')closeModal();};
    if($('#gr-pop-x'))$('#gr-pop-x').onclick=closeFn;
    if($('#gr-pop-close'))$('#gr-pop-close').onclick=closeFn;
    if($('#gr-pop-tabs'))$('#gr-pop-tabs').addEventListener('click',e=>{
      const b=e.target.closest('[data-gpop]');if(!b)return;
      popKey=b.dataset.gpop;
      $$('#gr-pop-tabs button').forEach(x=>x.classList.toggle('on',x.dataset.gpop===popKey));
      const bd=$('#gr-pop-body');if(bd)bd.innerHTML=renderGrammarPointHtml(popKey);
    });
  }

  function renderQuiz(){
    const wrap=$('#gq-wrap'),sum=$('#gq-summary');
    if(!quizList.length){
      $('#gq-count').textContent='0 / 0';
      $('#gq-bar').style.width='0%';
      $('#gq-prompt').textContent='Dạng bài tập này chưa có đủ câu ở bài ngắn này:';
      $('#gq-q').textContent='Hãy chọn “Tổng hợp” hoặc chuyển sang bài học dài hơn.';
      $('#gq-opts').innerHTML=`<button type="button" class="btn sm" id="gq-to-mix">Chuyển về Tổng hợp</button>`;
      $('#gq-fb').classList.add('hide');$('#gq-actions').classList.add('hide');
      const tm=$('#gq-to-mix');if(tm)tm.onclick=()=>startQuiz('mix');
      return;
    }
    if(qi>=quizList.length){
      wrap.classList.add('hide');sum.classList.remove('hide');
      const total=quizList.length,pct=Math.round(correct/total*100);
      if(!recorded){
        recorded=true;
        store.grammarQuiz.attempts+=1;
        if(pct>store.grammarQuiz.bestPct)store.grammarQuiz.bestPct=pct;
        const lAct=(typeof LESSONS!=='undefined'&&Array.isArray(LESSONS))?LESSONS.find(x=>x.id===store.activeLessonId):null;
        const grTitle=lAct?`Bài tập ngữ pháp ${lAct.code||''}`:'Bài tập ngữ pháp';
        store.grammarQuiz.sessions.push({at:Date.now(),correct,wrong,total,pct});
        recordLearningEvent({type:'grammar',skill:'read',title:grTitle,result:`${correct}/${total} (${pct}%)`,view:'grammar',meta:{correct,total,pct}});
        if(store.grammarQuiz.sessions.length>20)store.grammarQuiz.sessions=store.grammarQuiz.sessions.slice(-20);
        if(typeof markLessonSectionDone==='function')markLessonSectionDone(store.activeLessonId,'grammar',true);
        saveStore(store);
      }
      sum.innerHTML=`<div class="sphead"><svg class="ic"><use href="#i-award"/></svg><div><h3>Hoàn thành bài tập ngữ pháp!</h3><span class="muted small">Đúng ${correct}/${total} câu (${pct}%)</span></div></div>
        <div class="sum-grid" style="margin-top:12px"><div><b style="color:var(--good)">${correct}</b><span>Đúng</span></div><div><b>${wrong}</b><span>Sai</span></div><div><b style="color:var(--ink)">${store.grammarQuiz.attempts}</b><span>Lần làm</span></div></div>
        <div class="btnrow" style="margin-top:12px"><button type="button" class="btn sm" id="gq-restart"><svg class="ic"><use href="#i-refresh"/></svg>Làm lại bài ngữ pháp</button></div>`;
      $('#gq-restart').onclick=()=>startQuiz(gMode);
      if(total>0&&typeof showSectionSummary==='function'){
        showSectionSummary('grammar',{
          doneCount:total,
          totalCount:total,
          unit:'câu',
          errors:wrong,
          accuracy:pct,
          wrongItems:wrongList.map(w=>({zh:w.ans||w.ansZh||w.qText||'',py:'',vi:w.exp||'',note:'Bạn đã trả lời sai'}))
        },{
          onRetryWrong:wrongList.length?()=>startQuiz(gMode):null,
          onRetryAll:()=>startQuiz(gMode)
        });
      }
      return;
    }
    wrap.classList.toggle('hide',phase!=='quiz');sum.classList.add('hide');
    stopTts();
    answered=false;placed=[];
    const q=quizList[qi],ABC=['A','B','C','D','E','F'];
    $('#gq-count').textContent=`${qi+1} / ${quizList.length}`;
    $('#gq-bar').style.width=((qi+1)/quizList.length*100)+'%';
    $('#gq-prompt').textContent=q.prompt;
    $('#gq-fb').classList.add('hide');$('#gq-actions').classList.add('hide');

    if(q.qtype==='order'){
      const tokens=shuffle(mergePunctTokens(q.tokens.slice()));
      const tokPys=tokens.map(t=>resolveTokenPinyin(t,q.ans,q.py));
      const renderTokInner=(t,idx)=>`<span class="tok-zh">${esc(t)}</span>${tokPys[idx]?`<span class="tok-py">${esc(tokPys[idx])}</span>`:''}`;
      $('#gq-q').textContent=q.vi?`“${q.vi}”`:'Ghép thành câu tiếng Trung hoàn chỉnh';
      const optsEl=$('#gq-opts');
      optsEl.innerHTML=`
        <div class="order-zone" id="gq-ord-ans"></div>
        <div class="bank-zone" style="margin-top:8px">${tokens.map((t,ti)=>`<button type="button" class="tok" data-got="${ti}">${renderTokInner(t,ti)}</button>`).join('')}</div>
        <div class="btnrow" style="margin-top:8px"><button type="button" class="btn ghost sm" id="gq-ord-clr">Xếp lại</button><button type="button" class="btn sm" id="gq-ord-chk">Kiểm tra</button></div>`;
      const gAnsEl=$('#gq-ord-ans');
      const syncGqOrderUI=()=>{
        gAnsEl.innerHTML=placed.length
          ?placed.map((ti,pos)=>`<button type="button" class="tok placed" data-gop="${pos}">${renderTokInner(tokens[ti],ti)}</button>`).join('')
          :'<span class="muted small">Chạm các mảnh từ bên dưới để xếp câu...</span>';
        $$('[data-got]',optsEl).forEach(b=>b.classList.toggle('used',placed.includes(+b.dataset.got)));
      };
      gAnsEl.onclick=e=>{
        if(answered)return;
        const b=e.target.closest('[data-gop]');
        if(!b)return;
        placed.splice(+b.dataset.gop,1);
        syncGqOrderUI();
      };
      $$('[data-got]',optsEl).forEach(b=>b.onclick=()=>{
        if(answered)return;
        const ti=+b.dataset.got;
        if(placed.includes(ti))return;
        const sp=String(tokens[ti]||'').replace(/[，。！？、；：“”‘’（）《》….,!?;:\s]+/g,'');
        placed.push(ti);
        syncGqOrderUI();
        if(sp&&typeof speak==='function')speak(sp);
      });
      $('#gq-ord-clr').onclick=()=>{if(answered)return;stopTts();placed=[];syncGqOrderUI();};
      $('#gq-ord-chk').onclick=()=>{
        if(answered)return;
        if(!placed.length){toast('Hãy chọn các mảnh từ trước khi kiểm tra');return;}
        answered=true;
        const userStr=placed.map(ti=>tokens[ti]).join('').replace(/\s+/g,'');
        const ok=userStr===String(q.ans||'').replace(/\s+/g,'');
        if(typeof playSfx==='function')playSfx(ok?'ok':'no');
        if(ok)correct++;else{wrong++;wrongList.push(q);}
        const fb=$('#gq-fb');
        fb.className='fb-card '+(ok?'ok':'no');
        fb.innerHTML=`<b><svg class="ic" style="width:1.1em;height:1.1em"><use href="#i-${ok?'check':'x'}"/></svg>${ok?'Chính xác!':'Chưa đúng trật tự'}</b><span>${esc(q.exp||'')}</span>`;
        fb.classList.remove('hide');
        $('#gq-actions').classList.remove('hide');
        $('#gq-retry').classList.toggle('hide',ok);
        $('#gq-next').textContent=(qi+1>=quizList.length)?'Xem tổng kết':'Câu tiếp theo →';
        if(typeof speak==='function')speak(q.ans);
      };
      syncGqOrderUI();
      return;
    }

    $('#gq-q').textContent=q.q;
    $('#gq-opts').innerHTML=q.opts.map((o,idx)=>`<button class="opt" type="button" data-idx="${idx}"><i>${ABC[idx]}</i><span class="z">${esc(o.t)}</span><span class="st-ic"></span></button>`).join('');
    $$('#gq-opts .opt').forEach(btn=>btn.onclick=()=>{
      if(answered)return;
      answered=true;
      const idx=+btn.dataset.idx,ok=q.opts[idx].ok;
      btn.classList.add(ok?'ok':'no');
      $('.st-ic',btn).textContent=ok?'✓':'✕';
      if(!ok){const oi=q.opts.findIndex(x=>x.ok);if(oi>=0){const ob=$$('#gq-opts .opt')[oi];ob.classList.add('ok');$('.st-ic',ob).textContent='✓';}}
      if(typeof playSfx==='function')playSfx(ok?'ok':'no');
      if(ok)correct++;else{wrong++;wrongList.push(q);}
      const fb=$('#gq-fb');
      fb.className='fb-card '+(ok?'ok':'no');
      fb.innerHTML=`<b><svg class="ic" style="width:1.1em;height:1.1em"><use href="#i-${ok?'check':'x'}"/></svg>${ok?'Chính xác!':'Giải thích lỗi'}</b><span>${esc(q.exp||'')}</span>`;
      fb.classList.remove('hide');
      $('#gq-actions').classList.remove('hide');
      $('#gq-retry').classList.toggle('hide',ok);
      $('#gq-next').textContent=(qi+1>=quizList.length)?'Xem tổng kết':'Câu tiếp theo →';
      if(q.ansZh&&typeof speak==='function')speak(q.ansZh);
    });
  }

  $('#gp-tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b)renderPoint(b.dataset.gp);});
  if($('#gp-prev-btn'))$('#gp-prev-btn').onclick=()=>{if(gpIdx>0)renderPoint(gpKeys[gpIdx-1]);};
  if($('#gp-next-btn'))$('#gp-next-btn').onclick=()=>{if(gpIdx+1<gpKeys.length)renderPoint(gpKeys[gpIdx+1]);else{setPhase('quiz');startQuiz(gMode);}};
  if($('#gr-peek-btn'))$('#gr-peek-btn').onclick=openGrammarPopup;
  if($('#gq-modes'))$('#gq-modes').addEventListener('click',e=>{const b=e.target.closest('button');if(b){stopTts();phase='quiz';startQuiz(b.dataset.gm);}});
  $('#gq-next').onclick=()=>{stopTts();qi+=1;renderQuiz();};
  $('#gq-retry').onclick=()=>{stopTts();if(answered&&wrong>0)wrong--;renderQuiz();};

  window.renderGrammarPoint=renderPoint;
  function refresh(){
    syncHeader();
    gpKeys=Object.keys(GRAMMAR_POINTS||{});
    gpIdx=0;
    const gpTabs=$('#gp-tabs'),gpCard=$('#gp-card');
    if(!gpKeys.length){
      if(gpTabs)gpTabs.innerHTML='';
      if(gpCard)gpCard.innerHTML='<p class="muted small" style="margin:0">Bài học này chưa có điểm ngữ pháp. Hãy vào <b>Sửa bài</b> để bổ sung.</p>';
      setPhase('quiz');
      startQuiz('mix');
      return;
    }
    if(gpTabs){
      gpTabs.innerHTML=gpKeys.map((k,i)=>`<button class="${i===0?'on':''}" data-gp="${esc(k)}" type="button">${esc(GRAMMAR_POINTS[k].title||k)}</button>`).join('');
    }
    setPhase('theory');
    renderPoint(gpKeys[0]);
    startQuiz('mix');
  }
  return {renderPoint,syncHeader,refresh,init:refresh,setPhase,openPopup:openGrammarPopup};
})();

function updateLessonExerciseStatus(){
  const st=$('#lesson-ex-st');if(!st)return;
  if(store.exercises&&store.exercises.attempts>0){
    st.className='st done';
    st.innerHTML=`<svg class="ic"><use href="#i-check"/></svg>${store.exercises.bestPct}% (${store.exercises.attempts} lần)`;
  }
}


