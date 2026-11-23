/* ---------- Flashcard dùng chung ---------- */
function makeDeck(root,opts){
  let queue=[],i=0,revealed=false,rateLock=false,session={reviewed:0,r0:0,r1:0,r2:0,done:false};
  const f=k=>$(`[data-f="${k}"]`,root);
  const audioRate=()=>store.settings.slowAudio?.6:.9;

  function buildQueue(){
    queue=opts.listFn().slice();i=0;revealed=false;session={reviewed:0,r0:0,r1:0,r2:0,done:false};
  }
  function applyMask(){
    const card=f('card'),exbox=f('exbox');if(!card)return;
    const mode=opts.fixedMode||store.settings.flashMode;
    const zhEl=f('zh'),pyRow=f('pyrow'),viEl=f('vi'),lp=f('lprompt'),hint=f('hint'),spkBig=f('spkBig');
    const hasWord=queue.length>0&&!session.done;
    card.classList.toggle('masked',!revealed&&hasWord);
    if(exbox)exbox.classList.toggle('masked',!revealed&&hasWord);
    if(!hasWord)return;
    zhEl.classList.remove('is-ans');pyRow.classList.remove('is-ans');viEl.classList.remove('is-ans');
    if(lp)lp.classList.add('hide');
    if(mode==='zh'){
      viEl.classList.add('is-ans');if(spkBig)spkBig.classList.add('hide');
      if(hint)hint.textContent=opts.fixedMode==='zh'?(revealed?'Chạm vào từ để ẩn nghĩa':'Chạm vào từ để xem nghĩa'):(revealed?'Chạm thẻ để ẩn đáp án':'Chạm thẻ để xem nghĩa tiếng Việt');
    }else if(mode==='vi'){
      zhEl.classList.add('is-ans');pyRow.classList.add('is-ans');
      viEl.style.visibility='visible';if(spkBig)spkBig.classList.add('hide');
      if(hint)hint.textContent=revealed?'Chạm thẻ để ẩn đáp án':'Chạm thẻ để xem chữ Hán & Pinyin';
    }else{
      zhEl.classList.add('is-ans');pyRow.classList.add('is-ans');viEl.classList.add('is-ans');
      if(lp)lp.classList.toggle('hide',revealed);if(spkBig)spkBig.classList.remove('hide');
      if(hint)hint.textContent=revealed?'Chạm thẻ để ẩn đáp án':'Nghe phát âm rồi chạm thẻ để kiểm tra';
    }
    if(mode!=='vi')viEl.style.visibility='';
  }
  function renderSummary(){
    const sumEl=f('summary');if(!sumEl)return;
    const showSum=session.done;sumEl.classList.toggle('hide',!showSum);
    if(opts.onStateChange)opts.onStateChange({empty:queue.length===0,done:showSum});
    if(!showSum)return;
    sumEl.innerHTML=`<div class="sphead"><svg class="ic"><use href="#i-award"/></svg><div><h3>Hoàn thành phiên ôn!</h3><span class="muted small">Bạn đã ôn ${session.reviewed} lượt thẻ</span></div></div>
      <div class="sum-grid" style="margin-top:12px"><div><b style="color:var(--good)">${session.r2}</b><span>Đã thuộc</span></div><div><b style="color:var(--gold)">${session.r1}</b><span>Hơi nhớ</span></div><div><b>${session.r0}</b><span>Chưa nhớ</span></div></div>
      <div class="btnrow" style="margin-top:12px"><button type="button" class="btn sm" data-f="restart"><svg class="ic"><use href="#i-refresh"/></svg>Ôn lại phiên mới</button></div>`;
    const rb=$('[data-f="restart"]',sumEl);if(rb)rb.onclick=()=>{buildQueue();render();};
  }
  function render(){
    if(i>=queue.length&&queue.length>0)i=0;
    const w=queue[i];
    if(f('count'))f('count').textContent=queue.length?`${i+1} / ${queue.length} từ`:'0 / 0 từ';
    const bar=f('bar');if(bar)bar.style.width=queue.length?((i+1)/queue.length*100)+'%':'0%';
    if(!w||session.done){renderSummary();updateGlobalCounts();if(opts.onRender)opts.onRender(null);return;}
    if(f('summary'))f('summary').classList.add('hide');
    if(opts.onStateChange)opts.onStateChange({empty:false,done:false});
    const zhEl=f('zh');zhEl.textContent=w.zh;zhEl.classList.toggle('long',(w.zh||'').length>=3);
    f('py').textContent=w.py;f('vi').textContent=w.vi;
    const exBox=f('exbox');if(exBox)exBox.classList.toggle('hide',!w.ex);
    f('ex').innerHTML=highlightText(w.ex,w.zh);
    f('exPy').innerHTML=highlightText(w.exPy,w.py);
    f('exVi').textContent=w.exVi;
    const srsEl=f('srs');if(srsEl)srsEl.textContent=formatSrsBadge(w.id);
    const st=f('star');if(st){const on=isFavorite(w.id);st.classList.toggle('on',on);st.setAttribute('aria-pressed',String(on));}
    const hb=f('hard');if(hb){const on=isDifficult(w.id);hb.classList.toggle('on',on);hb.setAttribute('aria-pressed',String(on));}
    applyMask();updateGlobalCounts();
    if(opts.onRender)opts.onRender(w);
  }
  const cur=()=>queue[i]||null;
  const go=d=>{if(!queue.length)return;i=(i+d+queue.length)%queue.length;revealed=false;render();};
  const on=(k,fn)=>{const el=f(k);if(el)el.addEventListener('click',e=>{e.stopPropagation();fn(e);});};
  on('next',()=>go(1));on('prev',()=>go(-1));
  on('spk',()=>cur()&&speak(cur().zh,audioRate()));
  on('spkBig',()=>cur()&&speak(cur().zh,audioRate()));
  on('exSpk',()=>cur()&&speak(cur().ex,audioRate()));
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
    const v=+b.dataset.rate;recordWord(w.id,v,opts.fixedMode||store.settings.flashMode);
    session.reviewed+=1;session['r'+v]+=1;
    if(opts.sessionQueue){
      queue.splice(i,1);if(v===0)queue.push(w);
      if(!queue.length){session.done=true;render();return;}
      if(i>=queue.length)i=0;revealed=false;render();
    }else go(1);
  }));
  buildQueue();
  return {render,refreshMask:applyMask,reset(){buildQueue();render();},openWord(id){buildQueue();const idx=queue.findIndex(w=>w.id===id);if(idx>=0)i=idx;revealed=false;render();}};
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
  const arr=[];
  for(const ch of String(zh||'')){if(/[\u4e00-\u9fff]/.test(ch)&&!arr.includes(ch))arr.push(ch);}
  return arr;
}
function renderVocabExtension(w){
  const hnTab=$('#vc-tab-hacknao'),mmTab=$('#vc-tab-mindmap'),panel=$('#vc-ext-panel');
  if(hnTab)hnTab.classList.toggle('on',vcExtTab==='hacknao');
  if(mmTab)mmTab.classList.toggle('on',vcExtTab==='mindmap');
  if(!panel)return;
  if(!w){panel.innerHTML='<div class="vc-ext-empty">Chưa chọn từ vựng</div>';return;}
  const chars=extractUniqueHanzi(w.zh);
  const pillsHtml=(matched)=>matched.length>1?`<div class="vc-char-pills">${matched.map((m,idx)=>`<button class="${idx===vcExtCharIdx?'on':''}" data-vext-char="${idx}" type="button">${escH(m.ch)}</button>`).join('')}</div>`:'';

  if(vcExtTab==='hacknao'){
    const db=(typeof HANZI_HACKNAO_DB!=='undefined')?HANZI_HACKNAO_DB:{};
    const matched=chars.map(ch=>({ch,entry:db[ch]})).filter(x=>x.entry);
    if(!matched.length){panel.innerHTML='<div class="vc-ext-empty">Từ này không có nội dung</div>';return;}
    vcExtCharIdx=vcExtCharIdx%matched.length;
    const curItem=matched[vcExtCharIdx],e=curItem.entry;
    let eqInner='';
    if(e.parts&&e.parts.length){
      const rhs=e.parts.map((p,idx)=>{
        const sub=getPartMeaning(p,db);
        return `<div class="vc-hn-term${idx===0?' is-red':''}"><div class="vc-hn-ch">${escH(p.ch)}</div>${sub?`<div class="vc-hn-sub">(${escH(sub)})</div>`:''}</div>`;
      }).join('<span class="vc-hn-op">+</span>');
      eqInner=`<div class="vc-hn-term is-main"><div class="vc-hn-ch">${escH(curItem.ch)}</div></div><span class="vc-hn-op">=</span>${rhs}`;
    }else if(chars.length>=2&&matched.length>=2){
      const rhs=chars.map((ch,idx)=>{
        const ent=db[ch];
        const sub=ent?(String(ent.meaning||ent.hv||'').split(',')[0].trim()):'';
        return `<div class="vc-hn-term${idx===0?' is-red':''}"><div class="vc-hn-ch">${escH(ch)}</div>${sub?`<div class="vc-hn-sub">(${escH(sub)})</div>`:''}</div>`;
      }).join('<span class="vc-hn-op">+</span>');
      eqInner=`<div class="vc-hn-term is-main"><div class="vc-hn-ch">${escH(w.zh)}</div></div><span class="vc-hn-op">=</span>${rhs}`;
    }else{
      const shortM=String(e.meaning||'').split(',')[0].trim();
      eqInner=`<div class="vc-hn-term is-main is-red"><div class="vc-hn-ch">${escH(curItem.ch)}</div></div><span class="vc-hn-op">=</span><div class="vc-hn-base"><b>${escH(e.hv||e.py||'')}</b>${shortM?`<span>(${escH(shortM)})</span>`:''}</div>`;
    }
    const brainIc='<span class="vc-ext-ic-brain" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9.5 4.2a3.4 3.4 0 0 0-3.2 4.5 3.1 3.1 0 0 0-1.6 2.8 3.1 3.1 0 0 0 1.2 2.4A3.1 3.1 0 0 0 9.1 19h2.2V4.2z" fill="#E36252"/><path d="M14.5 4.2a3.4 3.4 0 0 1 3.2 4.5 3.1 3.1 0 0 1 1.6 2.8 3.1 3.1 0 0 1-1.2 2.4A3.1 3.1 0 0 1 14.9 19h-2.2V4.2z" fill="#C73F33"/><path d="M8 9.2c.8.5 1.4 1.3 1.4 2.2M7.5 14c1-.3 1.8-.9 2-1.7M16 9.2c-.8.5-1.4 1.3-1.4 2.2M16.5 14c-1-.3-1.8-.9-2-1.7" fill="none" stroke="#FFF8F3" stroke-width="1.3" stroke-linecap="round"/></svg></span>';
    const nextBtn=matched.length>1?'<button aria-label="Chữ tiếp theo" class="vc-next-char" data-vext-next="1" type="button">→</button>':'';
    const comps=(e.compounds||[]).map(cp=>`<button class="vc-comp-chip" data-say="${escH(cp.zh)}" type="button"><b>${escH(cp.zh)}</b><span>${escH(cp.py)} · ${escH(cp.vi)}</span></button>`).join('');
    panel.innerHTML=`<div class="vc-ext-head"><div class="vc-ext-head-l">${brainIc}<span class="vc-ext-title">Hack não 3000 chữ Hán</span></div>${pillsHtml(matched)}</div><div class="vc-hn-eqbox">${eqInner}</div><div class="vc-hn-tiprow"><span class="vc-bulb" aria-hidden="true">💡</span><div class="vc-hn-tip"><b>Mẹo nhớ:</b><p>${escH(e.mnemonic||'')}</p></div>${nextBtn}</div>${comps?`<div class="vc-comp-list">${comps}</div>`:''}`;
    return;
  }

  const db=(typeof HANZI_MINDMAP_DB!=='undefined')?HANZI_MINDMAP_DB:{};
  const matched=chars.map(ch=>({ch,entry:db[ch]})).filter(x=>x.entry);
  if(!matched.length){panel.innerHTML='<div class="vc-ext-empty">Từ này không có nội dung</div>';return;}
  vcExtCharIdx=vcExtCharIdx%matched.length;
  const curItem=matched[vcExtCharIdx],e=curItem.entry;
  const allItems=[];
  (e.groups||[]).forEach(g=>(g.items||[]).forEach(it=>{if(it&&it.zh)allItems.push(it);}));
  const pageSize=6,totalPages=Math.max(1,Math.ceil(allItems.length/pageSize));
  vcMmPage=vcMmPage%totalPages;
  const pageItems=allItems.slice(vcMmPage*pageSize,(vcMmPage+1)*pageSize);
  const leftCount=Math.ceil(pageItems.length/2);
  const leftItems=pageItems.slice(0,leftCount),rightItems=pageItems.slice(leftCount);
  const ySlots=n=>n<=1?[110]:n===2?[54,166]:[35,110,185];
  const lYs=ySlots(leftItems.length),rYs=ySlots(rightItems.length);
  const linesSvg=[
    ...leftItems.map((_,idx)=>`<line x1="170" y1="110" x2="72" y2="${lYs[idx]}" stroke="#C7463B" stroke-width="2" stroke-linecap="round"/>`),
    ...rightItems.map((_,idx)=>`<line x1="170" y1="110" x2="268" y2="${rYs[idx]}" stroke="#C7463B" stroke-width="2" stroke-linecap="round"/>`)
  ].join('');
  const renderPill=it=>`<button class="vc-mm-pill" data-say="${escH(it.zh)}" title="${escH(it.py||'')}" type="button"><b>${escH(it.zh)}</b><span>${escH(it.vi||'')}</span></button>`;
  const shortVi=String(e.meaning||'').split(/[;,]/)[0].trim();
  const mmIc='<span class="vc-ext-ic-mm" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 12L5.8 6.2M12 12l6.2-5.8M12 12l-6.2 5.8M12 12l6.2 5.8" stroke="#C7463B" stroke-width="2.2" stroke-linecap="round"/><circle cx="5.5" cy="6" r="2.7" fill="#C73F33"/><circle cx="18.5" cy="6" r="2.7" fill="#C73F33"/><circle cx="5.5" cy="18" r="2.7" fill="#C73F33"/><circle cx="18.5" cy="18" r="2.7" fill="#C73F33"/><circle cx="12" cy="12" r="3.4" fill="#9E2A22"/></svg></span>';
  const hasNext=totalPages>1||matched.length>1;
  const mmNextBtn=hasNext?`<button aria-label="Xem nhánh tiếp theo" class="vc-next-char vc-mm-next" data-chars="${matched.length}" data-pages="${totalPages}" data-vext-mm-next="1" type="button">→</button>`:'';
  const pgBadge=totalPages>1?`<span class="vc-mm-pg">${vcMmPage+1}/${totalPages}</span>`:'';
  const partsHtml=(e.parts&&e.parts.length)?`<div class="vc-mm-parts">${e.parts.map(p=>`<span class="vc-part-pill"><b>${escH(p.rad)}</b><span>${escH(p.hv)}${p.meaning?' · '+escH(p.meaning):''}</span></span>`).join('')}</div>`:'';
  const exHtml=(e.example&&e.example.zh)?`<button class="vc-mm-ex" data-say="${escH(e.example.zh)}" type="button"><div><div class="zh">${escH(e.example.zh)}</div><div class="sub">${escH(e.example.py)} · ${escH(e.example.vi)}</div></div><svg class="ic" style="color:var(--accent);flex-shrink:0"><use href="#i-vol"></use></svg></button>`:'';
  const moreHtml=`<details class="vc-mm-more"><summary>Chi tiết chữ ${escH(curItem.ch)} (${escH(e.py||'')}) · Câu chuyện &amp; ví dụ</summary><div class="vc-mm-more-body">${partsHtml}${e.story?`<div class="vc-mm-story"><b>Câu chuyện nhớ:</b> ${escH(e.story)}</div>`:''}${exHtml}</div></details>`;
  panel.innerHTML=`<div class="vc-ext-head"><div class="vc-ext-head-l">${mmIc}<span class="vc-ext-title">Sơ đồ tư duy 3300 chữ Hán</span></div><div class="vc-ext-head-r">${pillsHtml(matched)}${pgBadge}</div></div><div class="vc-mm-wrap${hasNext?' has-next':''}"><div class="vc-mm-radial"><svg aria-hidden="true" class="vc-mm-svg" preserveaspectratio="none" viewbox="0 0 340 220">${linesSvg}</svg><div class="vc-mm-col left">${leftItems.map(renderPill).join('')}</div><button class="vc-mm-center" data-say="${escH(curItem.ch)}" title="${escH(e.py||'')}" type="button"><b>${escH(curItem.ch)}</b><span>${escH(shortVi)}</span></button><div class="vc-mm-col right">${rightItems.map(renderPill).join('')}</div></div>${mmNextBtn}</div>${moreHtml}`;
}
if($('#vc-ext-tabs'))$('#vc-ext-tabs').addEventListener('click',e=>{
  const b=e.target.closest('button[data-vext]');if(!b)return;
  vcExtTab=b.dataset.vext;vcExtCharIdx=0;vcMmPage=0;renderVocabExtension(vcCurWord);
});
if($('#vc-ext-panel'))$('#vc-ext-panel').addEventListener('click',e=>{
  const cb=e.target.closest('[data-vext-char]');
  if(cb){vcExtCharIdx=+cb.dataset.vextChar||0;vcMmPage=0;renderVocabExtension(vcCurWord);return;}
  const nb=e.target.closest('[data-vext-next]');
  if(nb){vcExtCharIdx+=1;vcMmPage=0;renderVocabExtension(vcCurWord);return;}
  const mb=e.target.closest('[data-vext-mm-next]');
  if(mb){
    const pages=Math.max(1,+mb.dataset.pages||1),chars=Math.max(1,+mb.dataset.chars||1);
    if(vcMmPage+1<pages)vcMmPage+=1;
    else{vcMmPage=0;if(chars>1)vcExtCharIdx+=1;}
    renderVocabExtension(vcCurWord);
  }
});

const vocab=makeDeck($('#vocab'),{fixedMode:'zh',listFn:()=>WORDS,sessionQueue:false,onRender(w){vcCurWord=w;vcExtCharIdx=0;vcMmPage=0;renderVocabExtension(w);},onMutate(){vocab.render();renderReviewDash();renderWordbook();}});
window.renderFlash=()=>{vocab.reset();try{renderReviewDash();renderWordbook();}catch(_){}};

/* ---------- Màn 2: Ôn tập theo lịch ---------- */
let rmode='today',rCustomIds=null,inReviewSession=false;
function getReviewQueue(){
  if(rCustomIds)return rCustomIds.map(wordById).filter(Boolean);
  const now=Date.now();
  if(rmode==='today')return WORDS.filter(w=>isDue(w.id,now));
  if(rmode==='hard')return WORDS.filter(w=>isDifficult(w.id));
  if(rmode==='new')return WORDS.filter(w=>getWordState(w.id).status==='new');
  return WORDS;
}
function renderReviewDash(){
  updateGlobalCounts();
  const list=getReviewQueue();
  const btn=$('#r-start-btn');
  if(btn)btn.innerHTML=`<svg class="ic f"><use href="#i-play"/></svg>Bắt đầu ôn (${list.length} từ)`;

  const now=Date.now();
  const dueList=WORDS.filter(w=>isDue(w.id,now));
  const hardList=WORDS.filter(w=>isDifficult(w.id));
  const newList=WORDS.filter(w=>getWordState(w.id).status==='new');
  const cards=[];
  if(rmode==='today'){
    if(dueList.length)cards.push({m:'today',ic:'book',t:'Bài 4 · Sở thích',c:`${dueList.length} từ`,p:'Đến hạn hôm nay'});
    if(hardList.length)cards.push({m:'hard',ic:'layers',t:'Từ khó tổng hợp',c:`${hardList.length} từ`,p:'Ôn lại (từ khó)'});
    if(newList.length)cards.push({m:'new',ic:'bulb',t:'Từ mới chưa học',c:`${newList.length} từ`,p:'Chủ động học mới'});
    if(!dueList.length&&!hardList.length&&!newList.length)cards.push({m:'all',ic:'layers',t:'Tất cả từ vựng',c:`${WORDS.length} từ`,p:'Ôn tự do'});
  }else if(rmode==='hard'){
    cards.push({m:'hard',ic:'flag',t:'Từ khó tổng hợp',c:`${hardList.length} từ`,p:'Danh sách từ khó'});
  }else if(rmode==='new'){
    cards.push({m:'new',ic:'bulb',t:'Từ mới Bài 4',c:`${newList.length} từ`,p:'Chưa học'});
  }else{
    cards.push({m:'all',ic:'layers',t:'Bài 4 · Sở thích (Toàn bộ)',c:`${WORDS.length} từ`,p:'Tất cả'});
  }
  $('#r-decks').innerHTML=cards.map(d=>`<button type="button" class="deck-item" data-dm="${d.m}"><span class="ib"><svg class="ic"><use href="#i-${d.ic}"/></svg></span><div class="mid"><b>${d.t}</b><span>${d.c}</span></div><span class="due-pill">${d.p}</span><svg class="ic" style="color:var(--accent)"><use href="#i-chev"/></svg></button>`).join('');
}
function openReviewSession(mode,customIds,openId){
  if(mode)rmode=mode;
  rCustomIds=customIds||null;
  inReviewSession=true;
  $('#r-decks').classList.add('hide');
  $('#r-start-btn').classList.add('hide');
  $('#rmode').classList.add('hide');
  $('#r-session').classList.remove('hide');
  if(openId)rev.openWord(openId);else rev.reset();
}
function closeReviewSession(){
  inReviewSession=false;rCustomIds=null;
  $('#r-session').classList.add('hide');
  $('#r-decks').classList.remove('hide');
  $('#r-start-btn').classList.remove('hide');
  $('#rmode').classList.remove('hide');
  renderReviewDash();
}
const rev=makeDeck($('#r-session'),{
  listFn:getReviewQueue,
  sessionQueue:true,
  onStateChange({empty,done}){
    const hideCard=empty||done;
    $$('#r-session .flash,#r-session .rate3,#r-session .fmodes').forEach(el=>el.classList.toggle('hide',hideCard));
    const em=$('#r-empty');em.classList.toggle('hide',!empty||done);
    if(empty&&!done){
      em.innerHTML=rmode==='today'
        ? `<h3>Hôm nay bạn đã ôn hết từ đến hạn!</h3><p class="muted small" style="margin-top:6px">Từ chưa học sẽ không tự tính là đến hạn.</p><div class="btnrow" style="margin-top:12px"><button type="button" class="btn sm" id="re-new">Học từ mới</button><button type="button" class="btn ghost sm" id="re-back">Quay lại</button></div>`
        : `<h3>Danh sách hiện đang trống</h3><div class="btnrow" style="margin-top:12px"><button type="button" class="btn ghost sm" id="re-back">Quay lại danh sách</button></div>`;
      const rn=$('#re-new');if(rn)rn.onclick=()=>openReviewSession('new');
      const rb=$('#re-back');if(rb)rb.onclick=closeReviewSession;
    }
  },
  onMutate(){if(rmode==='hard')rev.reset();else rev.render();renderReviewDash();renderWordbook();}
});
$('#rmode').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  rmode=b.dataset.m;$$('#rmode button').forEach(x=>x.classList.toggle('on',x===b));renderReviewDash();
});
$('#r-decks').addEventListener('click',e=>{const d=e.target.closest('[data-dm]');if(d)openReviewSession(d.dataset.dm);});
$('#r-start-btn').onclick=()=>openReviewSession(rmode);
$('#r-back-dash').onclick=closeReviewSession;

/* ---------- Màn 3: Sổ từ khó & yêu thích ---------- */
let wbTab='hard',wbSub='marked',wbQuery='';
function getWordbookList(){
  let base=WORDS;
  if(wbTab==='fav')base=WORDS.filter(w=>isFavorite(w.id));
  else if(wbSub==='marked')base=WORDS.filter(w=>isDifficult(w.id));
  else if(wbSub==='wrong')base=WORDS.filter(w=>getWordState(w.id).wrongCount>0).sort((a,b)=>getWordState(b.id).wrongCount-getWordState(a.id).wrongCount);
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
    if(a==='say')speak(w.zh,store.settings.slowAudio?.6:.9);
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

function buildExerciseQuestions(mode){
  if(!WORDS.length)return [];
  const makeMeaning=w=>{
    const opts=shuffle([w,...pickDistractors(w,WORDS,3)]).map(x=>({id:x.id,label:x.vi,ok:x.id===w.id}));
    return {type:'meaning',wordId:w.id,prompt:'Chọn nghĩa đúng của từ:',zh:w.zh,py:w.py,opts,exp:`${w.zh} (${w.py}): ${w.vi}.`};
  };
  const makeHanzi=w=>{
    const opts=shuffle([w,...pickDistractors(w,WORDS,3)]).map(x=>({id:x.id,zh:x.zh,py:x.py,ok:x.id===w.id}));
    return {type:'hanzi',wordId:w.id,prompt:'Chọn chữ Hán & Pinyin đúng cho nghĩa:',vi:w.vi,zh:w.zh,opts,exp:`“${w.vi}” viết là ${w.zh} (${w.py}).`};
  };
  const makeFill=w=>{
    const blank=w.ex.includes(w.zh)?w.ex.replace(w.zh,'____'):`${w.ex} (____)`;
    const opts=shuffle([w,...pickDistractors(w,WORDS,3)]).map(x=>({id:x.id,zh:x.zh,py:x.py,ok:x.id===w.id}));
    return {type:'fill',wordId:w.id,prompt:'Điền từ đúng vào chỗ trống:',sentence:blank,vi:w.exVi,zh:w.ex,opts,exp:`Câu đúng: ${w.ex} (${w.exPy}) — ${w.exVi}`};
  };
  const makeMatch=slice=>{
    const pairs=slice.map(w=>({id:w.id,zh:w.zh,py:w.py,vi:w.vi}));
    return {type:'match',prompt:'Nối 4 cặp chữ Hán với nghĩa đúng:',pairs,left:shuffle(pairs),right:shuffle(pairs),exp:pairs.map(p=>`${p.zh} (${p.py}) = ${p.vi}`).join(' · ')};
  };
  const makeOrder=o=>({type:'order',prompt:'Sắp xếp các từ thành câu đúng:',tokens:shuffle(o.tokens),ans:o.ans,py:o.py,vi:o.vi,exp:`Đáp án đúng: ${o.ans} (${o.py})`});

  if(mode==='meaning')return shuffle(WORDS).slice(0,6).map(makeMeaning);
  if(mode==='hanzi')return shuffle(WORDS).slice(0,6).map(makeHanzi);
  if(mode==='fill')return shuffle(WORDS).slice(0,6).map(makeFill);
  if(mode==='match')return [makeMatch(shuffle(WORDS).slice(0,4)),makeMatch(shuffle(WORDS).slice(4,8))];
  if(mode==='order')return shuffle(ORDER_BANK).map(makeOrder);

  // Tổng hợp 10 câu đa dạng
  const ws=shuffle(WORDS);
  return [
    makeMeaning(ws[0]),makeMeaning(ws[1]),
    makeHanzi(ws[2]),makeHanzi(ws[3]),
    makeFill(ws[4]),makeFill(ws[5]),
    makeMatch(ws.slice(0,4)),makeMatch(ws.slice(4,8)),
    makeOrder(ORDER_BANK[0]),makeOrder(ORDER_BANK[1])
  ];
}

/* ---------- Bộ điều khiển Bài tập tương tác (#exercise) ---------- */
const exCtrl=(function(){
  let mode='mix',qs=[],qi=0,correct=0,wrong=0,wrongQs=[],answered=false,recorded=false,placed=[],mSelL=null,mSelR=null,mDone=new Set(),mErrors=0;

  function saveActive(){
    if(!qs.length||qi>=qs.length)return;
    store.exercises.active={mode,qs,qi,correct,wrong,wrongQs,savedAt:Date.now()};
    saveStore(store);
  }
  function clearActive(){
    store.exercises.active=null;
    saveStore(store);
  }
  function checkResumeBanner(){
    const act=store.exercises.active,rb=$('#ex-resume');
    if(!rb)return;
    if(act&&Array.isArray(act.qs)&&act.qs.length&&act.qi<act.qs.length){
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
    const ABC=['A','B','C','D'];

    if(q.type==='meaning'){
      pbox.innerHTML=`<p class="muted small">${q.prompt}</p><div class="q-han" style="margin-top:8px"><span>${q.zh}</span><button type="button" class="playbtn" data-say="${q.zh}" aria-label="Nghe ${q.zh}"><svg class="ic"><use href="#i-vol"/></svg></button></div><div class="q-sub">${q.py}</div>`;
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
      stage.innerHTML=`<div class="opt-list">${q.opts.map((o,idx)=>`<button type="button" class="opt" data-idx="${idx}"><i>${ABC[idx]}</i><span class="zh">${o.zh}</span><span class="muted small">(${o.py})</span><span class="st-ic"></span></button>`).join('')}</div>`;
      $$('.opt',stage).forEach(btn=>btn.onclick=()=>{
        if(answered)return;
        const idx=+btn.dataset.idx,ok=q.opts[idx].ok;
        btn.classList.add(ok?'ok':'no');
        $('.st-ic',btn).textContent=ok?'✓':'✕';
        if(!ok){const oi=q.opts.findIndex(x=>x.ok);if(oi>=0){const ob=$$('.opt',stage)[oi];ob.classList.add('ok');$('.st-ic',ob).textContent='✓';}}
        speak(q.zh);
        gradeSimple(ok,q);
      });
    }else if(q.type==='fill'){
      pbox.innerHTML=`<p class="muted small">${q.prompt}</p><div style="font-family:var(--han);font-size:24px;font-weight:700;margin-top:10px">${q.sentence}</div><div class="q-sub">${q.vi}</div>`;
      stage.innerHTML=`<div class="opt-list">${q.opts.map((o,idx)=>`<button type="button" class="opt" data-idx="${idx}"><i>${ABC[idx]}</i><span class="zh">${o.zh}</span><span class="muted small">(${o.py})</span><span class="st-ic"></span></button>`).join('')}</div>`;
      $$('.opt',stage).forEach(btn=>btn.onclick=()=>{
        if(answered)return;
        const idx=+btn.dataset.idx,ok=q.opts[idx].ok;
        btn.classList.add(ok?'ok':'no');
        $('.st-ic',btn).textContent=ok?'✓':'✕';
        if(!ok){const oi=q.opts.findIndex(x=>x.ok);if(oi>=0){const ob=$$('.opt',stage)[oi];ob.classList.add('ok');$('.st-ic',ob).textContent='✓';}}
        speak(q.zh);
        gradeSimple(ok,q);
      });
    }else if(q.type==='match'){
      pbox.innerHTML=`<p class="muted small">${q.prompt}</p><div class="q-sub">Chạm 1 chữ Hán bên trái và 1 nghĩa bên phải</div>`;
      const drawMatch=()=>{
        stage.innerHTML=`<div class="match-grid">
          <div class="match-col">${q.left.map(p=>`<button type="button" class="m-btn zh ${mDone.has(p.id)?'ok':mSelL===p.id?'sel':''}" data-ml="${p.id}">${p.zh}</button>`).join('')}</div>
          <div class="match-col">${q.right.map(p=>`<button type="button" class="m-btn ${mDone.has(p.id)?'ok':mSelR===p.id?'sel':''}" data-mr="${p.id}"><span><b>${p.py}</b><br><span class="small muted">${p.vi}</span></span></button>`).join('')}</div>
        </div>`;
        $$('[data-ml]',stage).forEach(b=>b.onclick=()=>{if(answered)return;mSelL=b.dataset.ml;speak(b.textContent);tryMatch();});
        $$('[data-mr]',stage).forEach(b=>b.onclick=()=>{if(answered)return;mSelR=b.dataset.mr;tryMatch();});
      };
      const tryMatch=()=>{
        if(mSelL&&mSelR){
          if(mSelL===mSelR){
            mDone.add(mSelL);mSelL=null;mSelR=null;drawMatch();
            if(mDone.size===q.pairs.length){
              gradeSimple(mErrors===0,q);
              if(mErrors>0)showFb(false,`Hoàn thành (sai ${mErrors} lần ghép)`,q.exp,true);
            }
          }else{
            mErrors++;
            const l=mSelL,r=mSelR;mSelL=null;mSelR=null;drawMatch();
            const lb=$(`[data-ml="${l}"]`,stage),rb=$(`[data-mr="${r}"]`,stage);
            if(lb)lb.classList.add('no');if(rb)rb.classList.add('no');
            toast('Chưa khớp, thử chọn lại nhé');
          }
        }else drawMatch();
      };
      drawMatch();
    }else if(q.type==='order'){
      pbox.innerHTML=`<p class="muted small">${q.prompt}</p><div class="q-sub" style="font-size:16px;color:var(--ink);font-weight:600;margin-top:8px">“${q.vi}”</div>`;
      const drawOrder=()=>{
        stage.innerHTML=`
          <div class="order-zone" id="ord-ans">${placed.length?placed.map((ti,pos)=>`<button type="button" class="tok placed" data-op="${pos}">${q.tokens[ti]}</button>`).join(''):'<span class="muted small">Chạm các mảnh từ bên dưới để xếp câu...</span>'}</div>
          <div class="bank-zone" style="margin-top:10px">${q.tokens.map((t,ti)=>`<button type="button" class="tok ${placed.includes(ti)?'used':''}" data-ot="${ti}">${t}</button>`).join('')}</div>
          <div class="btnrow" style="margin-top:10px"><button type="button" class="btn ghost sm" id="ord-clr">Xếp lại</button><button type="button" class="btn sm" id="ord-chk">Kiểm tra</button></div>`;
        $$('[data-ot]',stage).forEach(b=>b.onclick=()=>{if(answered)return;placed.push(+b.dataset.ot);drawOrder();});
        $$('[data-op]',stage).forEach(b=>b.onclick=()=>{if(answered)return;placed.splice(+b.dataset.op,1);drawOrder();});
        $('#ord-clr',stage).onclick=()=>{if(answered)return;placed=[];drawOrder();};
        $('#ord-chk',stage).onclick=()=>{
          if(answered)return;
          if(!placed.length){toast('Hãy chọn các từ trước khi kiểm tra');return;}
          const userStr=placed.map(ti=>q.tokens[ti]).join('');
          const ok=userStr===q.ans;
          speak(q.ans);
          gradeSimple(ok,q);
        };
      };
      drawOrder();
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
      store.exercises.sessions.push({at:Date.now(),mode,correct,wrong,total,pct});recordLearningEvent({type:'exercise',skill:'read',title:`Bài tập từ vựng (${mode})`,result:`${correct}/${total} (${pct}%)`,view:'exercise',meta:{correct,total,pct}});
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
  }

  $('#ex-modes').addEventListener('click',e=>{const b=e.target.closest('button');if(b)start(b.dataset.em);});
  $('#ex-next').onclick=()=>{qi+=1;if(qi<qs.length)saveActive();renderQ();};
  $('#ex-retry').onclick=()=>{
    // Cho làm lại ngay câu vừa sai (không cộng trùng vào total)
    const q=qs[qi];
    if(answered&&wrong>0){wrong--;const idx=wrongQs.indexOf(q);if(idx>=0)wrongQs.splice(idx,1);}
    renderQ();
  };

  return {init(){checkResumeBanner();start('mix');}};
})();

/* ---------- Bộ điều khiển Ngữ pháp (#grammar) ---------- */
const gramCtrl=(function(){
  let curGp='ye',qi=0,correct=0,wrong=0,answered=false,recorded=false,wrongList=[];
  const esc=s=>(typeof escHtml==='function')?escHtml(s):String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  function renderPoint(key){
    const g=GRAMMAR_POINTS[key];
    if(!g)return;
    curGp=key;
    $$('#gp-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.gp===key));
    const han=g.han||'语法';
    const py=g.py||'';
    const desc=g.desc||g.explain||'';
    const structHtml=g.struct?`<div class="struct"><b><svg class="ic"><use href="#i-layers"/></svg>Cấu trúc:</b><span>${esc(g.struct)}</span></div>`:'';
    const exList=Array.isArray(g.examples)?g.examples:(g.ex?[{zh:g.ex,hl:'',py:'',vi:'',ic:'book'}]:[]);
    const exHtml=exList.length?`<h3 style="border-left:4px solid var(--accent);padding-left:8px">Ví dụ</h3>
      <div>${exList.map(ex=>`<div class="ex"><span class="ib"><svg class="ic"><use href="#i-${esc(ex.ic||'book')}"/></svg></span><div><div class="zh">${ex.hl?highlightText(esc(ex.zh||''),esc(ex.hl)):esc(ex.zh||'')}</div>${ex.py?`<small>${esc(ex.py)}</small>`:''}${ex.vi?`<small>${esc(ex.vi)}</small>`:''}</div><button type="button" class="playbtn" data-say="${esc(ex.zh||'')}" aria-label="Nghe ví dụ"><svg class="ic"><use href="#i-vol"/></svg></button></div>`).join('')}</div>`:'';
    const noteHtml=g.note?`<div class="note"><svg class="ic"><use href="#i-bulb"/></svg><div><b>Lưu ý:</b> ${esc(g.note)}</div></div>`:'';
    $('#gp-card').innerHTML=`
      <div class="gram"><div class="big">${esc(han)}<small>${esc(py)}</small></div><div><h3>${esc(g.title||'')}</h3>${desc?`<p class="muted small" style="margin-top:4px">${esc(desc)}</p>`:''}</div></div>
      ${structHtml}
      ${exHtml}
      ${noteHtml}`;
  }

  function renderQuiz(){
    const wrap=$('#gq-wrap'),sum=$('#gq-summary');
    if(qi>=GRAMMAR_QUIZ.length){
      wrap.classList.add('hide');sum.classList.remove('hide');
      const total=GRAMMAR_QUIZ.length,pct=Math.round(correct/total*100);
      if(!recorded){
        recorded=true;
        store.grammarQuiz.attempts+=1;
        if(pct>store.grammarQuiz.bestPct)store.grammarQuiz.bestPct=pct;
        store.grammarQuiz.sessions.push({at:Date.now(),correct,wrong,total,pct});recordLearningEvent({type:'grammar',skill:'read',title:'Bài tập ngữ pháp Bài 4',result:`${correct}/${total} (${pct}%)`,view:'grammar',meta:{correct,total,pct}});
        if(store.grammarQuiz.sessions.length>20)store.grammarQuiz.sessions=store.grammarQuiz.sessions.slice(-20);
        saveStore(store);
      }
      sum.innerHTML=`<div class="sphead"><svg class="ic"><use href="#i-award"/></svg><div><h3>Hoàn thành bài tập ngữ pháp!</h3><span class="muted small">Đúng ${correct}/${total} câu (${pct}%)</span></div></div>
        <div class="sum-grid" style="margin-top:12px"><div><b style="color:var(--good)">${correct}</b><span>Đúng</span></div><div><b>${wrong}</b><span>Sai</span></div><div><b style="color:var(--ink)">${store.grammarQuiz.attempts}</b><span>Lần làm</span></div></div>
        <div class="btnrow" style="margin-top:12px"><button type="button" class="btn sm" id="gq-restart"><svg class="ic"><use href="#i-refresh"/></svg>Làm lại bài ngữ pháp</button></div>`;
      $('#gq-restart').onclick=()=>{qi=0;correct=0;wrong=0;recorded=false;wrongList=[];renderQuiz();};
      return;
    }
    wrap.classList.remove('hide');sum.classList.add('hide');
    answered=false;
    const q=GRAMMAR_QUIZ[qi],ABC=['A','B','C'];
    $('#gq-count').textContent=`${qi+1} / ${GRAMMAR_QUIZ.length}`;
    $('#gq-bar').style.width=((qi+1)/GRAMMAR_QUIZ.length*100)+'%';
    $('#gq-prompt').textContent=q.prompt;
    $('#gq-q').textContent=q.q;
    $('#gq-fb').classList.add('hide');$('#gq-actions').classList.add('hide');
    $('#gq-opts').innerHTML=q.opts.map((o,idx)=>`<button class="opt" type="button" data-idx="${idx}"><i>${ABC[idx]}</i><span class="z">${o.t}</span><span class="st-ic"></span></button>`).join('');
    $$('#gq-opts .opt').forEach(btn=>btn.onclick=()=>{
      if(answered)return;
      answered=true;
      const idx=+btn.dataset.idx,ok=q.opts[idx].ok;
      btn.classList.add(ok?'ok':'no');
      $('.st-ic',btn).textContent=ok?'✓':'✕';
      if(!ok){const oi=q.opts.findIndex(x=>x.ok);if(oi>=0){const ob=$$('#gq-opts .opt')[oi];ob.classList.add('ok');$('.st-ic',ob).textContent='✓';}}
      if(ok)correct++;else{wrong++;wrongList.push(q);}
      const fb=$('#gq-fb');
      fb.className='fb-card '+(ok?'ok':'no');
      fb.innerHTML=`<b><svg class="ic" style="width:1.1em;height:1.1em"><use href="#i-${ok?'check':'x'}"/></svg>${ok?'Chính xác!':'Giải thích lỗi'}</b><span>${q.exp}</span>`;
      fb.classList.remove('hide');
      $('#gq-actions').classList.remove('hide');
      $('#gq-retry').classList.toggle('hide',ok);
      $('#gq-next').textContent=(qi+1>=GRAMMAR_QUIZ.length)?'Xem tổng kết':'Câu tiếp theo →';
    });
  }

  $('#gp-tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b)renderPoint(b.dataset.gp);});
  $('#gq-next').onclick=()=>{qi+=1;renderQuiz();};
  $('#gq-retry').onclick=()=>{if(answered&&wrong>0)wrong--;renderQuiz();};

  window.renderGrammarPoint=renderPoint;
  return {renderPoint,init(){
    const ks=Object.keys(GRAMMAR_POINTS||{});
    if(ks.length)renderPoint(ks[0]);
    if(GRAMMAR_QUIZ&&GRAMMAR_QUIZ.length){renderQuiz();}
    else{
      const wrap=$('#gq-wrap'),sum=$('#gq-summary');
      if(wrap)wrap.classList.add('hide');
      if(sum)sum.classList.add('hide');
    }
  }};
})();

function updateLessonExerciseStatus(){
  const st=$('#lesson-ex-st');if(!st)return;
  if(store.exercises&&store.exercises.attempts>0){
    st.className='st done';
    st.innerHTML=`<svg class="ic"><use href="#i-check"/></svg>${store.exercises.bestPct}% (${store.exercises.attempts} lần)`;
  }
}


