/* ---------- Modal Tạo / Sửa Giáo trình & Sao lưu JSON ---------- */
function openModal(html){
  $('#hanyu-modal-box').innerHTML=html;
  $('#hanyu-modal').classList.remove('hide');
}
function closeModal(){$('#hanyu-modal').classList.add('hide');}
if($('#hanyu-modal'))$('#hanyu-modal').addEventListener('click',e=>{if(e.target===$('#hanyu-modal'))closeModal();});

function openCourseFormModal(courseObj){
  const isEdit=Boolean(courseObj);
  const c=courseObj||{id:'',title:'',group:'personal',versionLabel:'',source:'',level:'Sơ cấp',desc:'',status:'published'};
  openModal(`
    <h3 style="margin:0 0 10px">${isEdit?'Sửa thông tin giáo trình':'Tạo giáo trình mới'}</h3>
    <div class="fld"><label>Tên giáo trình *</label><input id="mc-title" value="${escHtml(c.title)}" placeholder="VD: Hán ngữ 1 / HSK 3.0 Cấp 1 / Giao tiếp công sở"/></div>
    <div class="fld"><label>Nhóm giáo trình</label>
      <select id="mc-group">
        <option value="hanngu" ${c.group==='hanngu'?'selected':''}>Giáo trình Hán ngữ</option>
        <option value="hsk" ${c.group==='hsk'?'selected':''}>Giáo trình & Tài liệu HSK</option>
        <option value="kouyu" ${c.group==='kouyu'?'selected':''}>Khẩu ngữ bổ trợ (Độc lập)</option>
        <option value="personal" ${c.group==='personal'?'selected':''}>Giáo trình cá nhân</option>
      </select>
    </div>
    <div class="fld"><label>Phiên bản / Ấn bản (VD: HSK 3.0 áp dụng 2026)</label><input id="mc-ver" value="${escHtml(c.versionLabel||'')}" placeholder="VD: HSK 3.0 (2026) / Tái bản 2024"/></div>
    <div class="fld"><label>Nguồn tài liệu</label><input id="mc-src" value="${escHtml(c.source||'')}" placeholder="VD: File PDF cá nhân tự nhập"/></div>
    <div class="fld"><label>Trình độ</label><input id="mc-lvl" value="${escHtml(c.level||'Sơ cấp')}" placeholder="Sơ cấp / Trung cấp / HSK 1"/></div>
    <div class="fld"><label>Trạng thái</label>
      <select id="mc-st">
        <option value="published" ${c.status==='published'?'selected':''}>Đã xuất bản</option>
        <option value="draft" ${c.status==='draft'?'selected':''}>Bản nháp</option>
      </select>
    </div>
    <div class="fld"><label>Mô tả</label><textarea id="mc-desc" placeholder="Mô tả ngắn nội dung hoặc mục tiêu khóa học...">${escHtml(c.desc||'')}</textarea></div>
    <div class="lib-bar">
      <button type="button" class="btn ghost sm" onclick="closeModal()">Hủy</button>
      <button type="button" class="btn sm" id="mc-save">Lưu giáo trình</button>
    </div>
  `);
  $('#mc-save').onclick=async()=>{
    const title=$('#mc-title').value.trim();
    if(!title){toast('Vui lòng nhập tên giáo trình');return;}
    const obj=isEdit?Object.assign({},c):{id:genId('course'),lessonOrder:[],createdAt:Date.now()};
    obj.title=title;
    obj.group=$('#mc-group').value;
    obj.versionLabel=$('#mc-ver').value.trim();
    obj.source=$('#mc-src').value.trim();
    obj.level=$('#mc-lvl').value.trim()||'Cơ bản';
    obj.status=$('#mc-st').value;
    obj.desc=$('#mc-desc').value.trim();
    obj.updatedAt=Date.now();
    await HanyuIDB.put('courses',obj);
    if(isEdit){
      const idx=COURSES.findIndex(x=>x.id===obj.id);
      if(idx>=0)COURSES[idx]=obj;
    }else{
      COURSES.push(obj);
      curDetailCourseId=obj.id;
    }
    closeModal();
    renderLibrary();
    renderRoadmap();
    if(curView==='course-detail')renderCourseDetail(obj.id);
    toast(isEdit?'Đã cập nhật giáo trình':'Đã tạo giáo trình mới');
  };
}

function openBackupModal(){
  openModal(`
    <h3 style="margin:0 0 8px">Sao lưu & Khôi phục JSON</h3>
    <p class="small muted" style="margin:0 0 10px">Xuất toàn bộ giáo trình, bài học đã biên soạn và kho từ vựng sang tệp JSON. Lưu ý: tệp JSON chỉ chứa nội dung đã biên soạn, không nhúng file nhị phân PDF gốc.</p>
    <button type="button" class="btn sm" id="bk-export" style="width:100%;margin-bottom:12px">⬇ Tải xuống bản sao lưu JSON</button>
    <div class="fld">
      <label>Khôi phục từ tệp JSON</label>
      <input type="file" id="bk-import-file" accept=".json,application/json"/>
    </div>
    <div id="bk-msg"></div>
    <button type="button" class="btn ghost sm" onclick="closeModal()" style="width:100%">Đóng</button>
  `);
  $('#bk-export').onclick=()=>{
    const payload={
      app:'Hanyu AI',
      schemaVersion:SCHEMA_VERSION,
      exportedAt:new Date().toISOString(),
      note:'Chỉ chứa giáo trình, bài học biên soạn và từ vựng; không bao gồm tệp PDF nhị phân.',
      courses:COURSES,
      lessons:LESSONS,
      vocabBank:store.vocabBank||{}
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=`hanyu-ai-backup-${localDateKey()}.json`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast('Đã xuất file JSON sao lưu');
  };
  $('#bk-import-file').onchange=async e=>{
    const f=e.target.files&&e.target.files[0];if(!f)return;
    try{
      const txt=await f.text();
      const data=JSON.parse(txt);
      if(!data||!Array.isArray(data.courses)||!Array.isArray(data.lessons)){
        $('#bk-msg').innerHTML='<div class="err-box">Tệp JSON không đúng cấu trúc sao lưu của Hanyu AI.</div>';
        return;
      }
      const ok=confirm(`Tìm thấy ${data.courses.length} giáo trình và ${data.lessons.length} bài học. Bấm OK để gộp vào dữ liệu hiện tại (không xóa tiến độ SRS cũ).`);
      if(!ok)return;
      if(data.vocabBank&&typeof data.vocabBank==='object'){
        Object.values(data.vocabBank).forEach(w=>registerVocabWord(w));
      }
      for(const c of data.courses){
        if(!c||!c.id||!c.title)continue;
        await HanyuIDB.put('courses',c);
        const i=COURSES.findIndex(x=>x.id===c.id);
        if(i>=0)COURSES[i]=c;else COURSES.push(c);
      }
      for(const l of data.lessons){
        if(!l||!l.id||!l.courseId)continue;
        await HanyuIDB.put('lessons',l);
        const i=LESSONS.findIndex(x=>x.id===l.id);
        if(i>=0)LESSONS[i]=l;else LESSONS.push(l);
      }
      saveStore(store);
      renderLibrary();renderRoadmap();applyActiveLesson();
      $('#bk-msg').innerHTML='<div class="ok-box">Khôi phục dữ liệu thành công và đã giữ nguyên tiến độ học cũ!</div>';
    }catch(err){
      $('#bk-msg').innerHTML='<div class="err-box">Không thể đọc tệp JSON: tệp bị hỏng hoặc sai định dạng.</div>';
    }
  };
}

/* ---------- Trình biên soạn bài học (lesson-editor) ---------- */
let draftLesson=null;
function openLessonEditor(lessonId,prefill){
  let l=lessonId?LESSONS.find(x=>x.id===lessonId):null;
  if(!l){
    const cId=curDetailCourseId||store.activeCourseId||(COURSES[0]&&COURSES[0].id);
    if(!cId){toast('Hãy tạo giáo trình trước');return;}
    const cnt=getCourseLessons(cId,true).length+1;
    l={
      id:genId('lesson'),
      courseId:cId,
      code:`Bài ${cnt}`,
      titleVi:'',
      titleZh:'',
      py:'',
      goals:[],
      status:'draft',
      sourceRef:{fileName:'',fileHash:'',pageRange:''},
      originalContent:'',
      supplementalContent:'',
      wordIds:[],
      _editWords:[],
      dialog:[],
      grammarPoints:{},
      chars:[],
      updatedAt:Date.now()
    };
  }
  draftLesson=JSON.parse(JSON.stringify(l));
  if(prefill){
    if(prefill.courseId)draftLesson.courseId=prefill.courseId;
    if(prefill.titleVi)draftLesson.titleVi=prefill.titleVi;
    if(prefill.titleZh)draftLesson.titleZh=prefill.titleZh;
    if(prefill.py)draftLesson.py=prefill.py;
    if(prefill.sourceRef)draftLesson.sourceRef=prefill.sourceRef;
    if(prefill.originalContent)draftLesson.originalContent=prefill.originalContent;
    if(prefill.editWords)draftLesson._editWords=prefill.editWords;
    if(prefill.dialog)draftLesson.dialog=prefill.dialog;
    if(prefill.grammar)draftLesson._editGrams=prefill.grammar;
  }
  if(!draftLesson._editWords){
    draftLesson._editWords=(draftLesson.wordIds||[]).map(id=>store.vocabBank[id]).filter(Boolean).map(w=>({zh:w.zh,py:w.py,vi:w.vi}));
  }
  if(!draftLesson._editGrams){
    draftLesson._editGrams=Object.values(draftLesson.grammarPoints||{}).map(g=>({title:g.title||'',explain:g.explain||'',exZh:(g.examples&&g.examples[0]?g.examples[0].zh:'')}));
  }
  editingLessonId=draftLesson.id;
  $('#le-code').value=draftLesson.code||'';
  $('#le-vi').value=draftLesson.titleVi||'';
  $('#le-zh').value=draftLesson.titleZh||'';
  $('#le-py').value=draftLesson.py||'';
  $('#le-goal').value=(draftLesson.goals||[]).join('\n');
  $('#le-source').value=draftLesson.sourceRef&&draftLesson.sourceRef.fileName?`${draftLesson.sourceRef.fileName}${draftLesson.sourceRef.pageRange?' • '+draftLesson.sourceRef.pageRange:''}`:'';
  $('#le-chars').value=(draftLesson.chars||[]).map(c=>c.ch).join(',');
  $('#le-audio-files').value=(draftLesson.audioTracks||[]).map(t=>t.fileName).join('\n');
  $('#le-wb-ex').value=(draftLesson.workbook&&draftLesson.workbook.exercisesNote)||'';
  $('#le-wb-ans').value=(draftLesson.workbook&&draftLesson.workbook.answerKeyNote)||'';
  $('#le-ext-hn').value=(draftLesson.optionalExtensions&&draftLesson.optionalExtensions.hackNaoIds?draftLesson.optionalExtensions.hackNaoIds.join(', '):'');
  $('#le-ext-mm').value=(draftLesson.optionalExtensions&&draftLesson.optionalExtensions.mindMapRootChars?draftLesson.optionalExtensions.mindMapRootChars.join(', '):'');
  $('#le-orig').value=draftLesson.originalContent||'';
  $('#le-supp').value=draftLesson.supplementalContent||'';
  $('#le-status-badge').textContent=draftLesson.status==='published'?'Đã xuất bản':'Bản nháp';
  $('#le-status-badge').className=`course-badge ${draftLesson.status==='published'?'ok':'draft'}`;
  renderEditorWords();
  renderEditorDialog();
  renderEditorGrams();
  editorDirty=false;
  goView('lesson-editor');
}

function renderEditorWords(){
  const list=$('#le-words-list'),warn=$('#le-words-warn');
  const arr=draftLesson._editWords||[];
  const missingPyVi=arr.filter(w=>w.zh&&(!w.py||!w.vi)).length;
  warn.innerHTML=missingPyVi?`<div class="warn-box">Có ${missingPyVi} từ chưa có pinyin hoặc nghĩa tiếng Việt. Vui lòng bổ sung để Flashcard hiển thị đầy đủ.</div>`:'';
  list.innerHTML=arr.map((w,i)=>`<div class="ed-row">
    <input data-ew="zh" data-i="${i}" value="${escHtml(w.zh||'')}" placeholder="Chữ Hán"/>
    <input data-ew="py" data-i="${i}" value="${escHtml(w.py||'')}" placeholder="Pinyin"/>
    <input class="ed-vi" data-ew="vi" data-i="${i}" value="${escHtml(w.vi||'')}" placeholder="Nghĩa tiếng Việt"/>
    <button type="button" class="ico-btn" data-del-ew="${i}" style="color:#9B1C1C">✕</button>
  </div>`).join('')||'<p class="small muted">Chưa có từ vựng nào.</p>';
}

function renderEditorDialog(){
  const arr=draftLesson.dialog||[];
  $('#le-dlg-list').innerHTML=arr.map((d,i)=>`<div class="ed-row">
    <input data-ed="zh" data-i="${i}" value="${escHtml(d.zh||'')}" placeholder="Câu tiếng Trung"/>
    <input data-ed="py" data-i="${i}" value="${escHtml(d.py||'')}" placeholder="Pinyin"/>
    <input class="ed-vi" data-ed="vi" data-i="${i}" value="${escHtml(d.vi||'')}" placeholder="Nghĩa tiếng Việt"/>
    <button type="button" class="ico-btn" data-del-ed="${i}" style="color:#9B1C1C">✕</button>
  </div>`).join('')||'<p class="small muted">Chưa có câu hội thoại nào.</p>';
}

function renderEditorGrams(){
  const arr=draftLesson._editGrams||[];
  $('#le-gram-list').innerHTML=arr.map((g,i)=>`<div style="border:1px solid var(--line);border-radius:10px;padding:8px;margin-bottom:6px">
    <div style="display:flex;gap:6px;margin-bottom:6px">
      <input data-eg="title" data-i="${i}" value="${escHtml(g.title||'')}" placeholder="Cấu trúc (VD: 也 yě · cũng)" style="flex:1;padding:6px 8px;border-radius:8px;border:1px solid var(--line)"/>
      <button type="button" class="ico-btn" data-del-eg="${i}" style="color:#9B1C1C">✕</button>
    </div>
    <input data-eg="explain" data-i="${i}" value="${escHtml(g.explain||'')}" placeholder="Giải thích bằng tiếng Việt" style="width:100%;padding:6px 8px;border-radius:8px;border:1px solid var(--line);margin-bottom:6px;box-sizing:border-box"/>
    <input data-eg="exZh" data-i="${i}" value="${escHtml(g.exZh||'')}" placeholder="Ví dụ tiếng Trung" style="width:100%;padding:6px 8px;border-radius:8px;border:1px solid var(--line);box-sizing:border-box"/>
  </div>`).join('')||'<p class="small muted">Chưa có điểm ngữ pháp nào.</p>';
}

function syncDraftFromInputs(){
  if(!draftLesson)return;
  draftLesson.code=$('#le-code').value.trim()||'Bài mới';
  draftLesson.titleVi=$('#le-vi').value.trim()||'Bài học chưa đặt tên';
  draftLesson.titleZh=$('#le-zh').value.trim();
  draftLesson.py=$('#le-py').value.trim();
  draftLesson.goals=$('#le-goal').value.split('\n').map(x=>x.trim()).filter(Boolean);
  draftLesson.supplementalContent=$('#le-supp').value;
  const srcVal=$('#le-source').value.trim();
  if(srcVal){
    const parts=srcVal.split('•');
    draftLesson.sourceRef={fileName:(parts[0]||'').trim(),fileHash:draftLesson.sourceRef?.fileHash||'',pageRange:(parts[1]||'').trim()};
  }
  const aLines=$('#le-audio-files').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  draftLesson.audioTracks=aLines.map(fn=>makeAudioTrack(fn,'dialog',fn));
  const wbEx=$('#le-wb-ex').value.trim(),wbAns=$('#le-wb-ans').value.trim();
  draftLesson.workbook=(wbEx||wbAns)?{exercisesNote:wbEx,answerKeyNote:wbAns,transcriptNote:(draftLesson.workbook&&draftLesson.workbook.transcriptNote)||''}:null;
  const hnIds=$('#le-ext-hn').value.split(/[,，\s]+/).map(x=>x.trim()).filter(Boolean);
  const mmChars=$('#le-ext-mm').value.split(/[,，\s]+/).map(x=>x.trim()).filter(Boolean);
  draftLesson.optionalExtensions={hackNaoIds:hnIds,mindMapRootChars:mmChars};
  const chList=$('#le-chars').value.replace(/[,，\s]+/g,'').split('').filter(c=>/[\u4e00-\u9fff]/.test(c));
  draftLesson.chars=[...new Set(chList)].map((ch,i)=>({id:'c_'+ch.charCodeAt(0),ch,py:'',vi:'',rad:'',strokes:0}));
  try{localStorage.setItem('hanyu_ai_editor_draft',JSON.stringify({lesson:draftLesson,ts:Date.now()}));}catch(_){}
  $('#le-autosave-msg').textContent='Đã tự động lưu bản nháp cục bộ.';
}

async function saveEditedLesson(targetStatus){
  syncDraftFromInputs();
  const wordIds=[];
  (draftLesson._editWords||[]).forEach(w=>{
    if(!w.zh||!w.zh.trim())return;
    const id=registerVocabWord(w);
    if(id&&!wordIds.includes(id))wordIds.push(id);
  });
  const gramObj={};
  (draftLesson._editGrams||[]).forEach((g,idx)=>{
    if(!g.title&&!g.explain)return;
    gramObj['g_'+idx]={title:g.title||`Cấu trúc ${idx+1}`,explain:g.explain||'',examples:g.exZh?[{zh:g.exZh,py:'',vi:''}]:[]};
  });
  const saved=Object.assign({},draftLesson);
  delete saved._editWords;
  delete saved._editGrams;
  saved.wordIds=wordIds;
  saved.grammarPoints=gramObj;
  saved.status=targetStatus;
  saved.updatedAt=Date.now();
  await HanyuIDB.put('lessons',saved);
  const idx=LESSONS.findIndex(x=>x.id===saved.id);
  if(idx>=0)LESSONS[idx]=saved;else LESSONS.push(saved);
  const c=COURSES.find(x=>x.id===saved.courseId);
  if(c){
    if(!Array.isArray(c.lessonOrder))c.lessonOrder=[];
    if(!c.lessonOrder.includes(saved.id)){c.lessonOrder.push(saved.id);await HanyuIDB.put('courses',c);}
  }
  try{localStorage.removeItem('hanyu_ai_editor_draft');}catch(_){}
  saveStore(store);
  editorDirty=false;
  renderCourseDetail(saved.courseId);
  renderLibrary();
  renderRoadmap();
  if(store.activeLessonId===saved.id)applyActiveLesson();
  toast(targetStatus==='published'?'Đã xuất bản bài học!':'Đã lưu bản nháp');
  return saved;
}

/* ---------- Quy trình Nhập PDF (pdf-import) ---------- */
let pdfJsPromise=null;
function loadPdfJs(){
  if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
  if(pdfJsPromise)return pdfJsPromise;
  pdfJsPromise=new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload=()=>{
      if(window.pdfjsLib){
        window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'.replace('pdf.min.js','pdf.worker.min.js');
        res(window.pdfjsLib);
      }else rej(new Error('No pdfjsLib'));
    };
    s.onerror=()=>rej(new Error('Không thể tải thư viện PDF.js (kiểm tra kết nối mạng)'));
    document.head.appendChild(s);
  });
  return pdfJsPromise;
}

function setPdfStep(n){
  $$('#pdf-steps .step-pill').forEach(el=>{
    const k=Number(el.dataset.ps);
    el.classList.toggle('on',k===n);
    el.classList.toggle('done',k<n);
  });
}

async function renderPdfPage(num){
  if(!pdfState.pdfDoc)return;
  const page=await pdfState.pdfDoc.getPage(num);
  const vp=page.getViewport({scale:pdfState.scale});
  const cv=$('#pdf-canvas'),ctx=cv.getContext('2d');
  cv.width=vp.width;cv.height=vp.height;
  await page.render({canvasContext:ctx,viewport:vp}).promise;
  $('#pdf-page-lbl').textContent=`Trang ${num} / ${pdfState.numPages}`;
}

function parsePageRange(str,maxP){
  const out=new Set();
  String(str||'1').split(',').forEach(part=>{
    const m=part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if(!m)return;
    const a=Math.max(1,Number(m[1])),b=Math.min(maxP,Number(m[2]||m[1]));
    for(let i=a;i<=b;i++)out.add(i);
  });
  return [...out].sort((a,b)=>a-b);
}

function classifyLines(text){
  const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  return lines.map((line,idx)=>{
    let kind='text';
    if(/^(Bài|Lesson|第.*课)/i.test(line))kind='title';
    else if(/^[A-Za-z0-9\u4e00-\u9fff]+\s*[:：]\s*.+/.test(line)&&idx>0)kind='dialog';
    else if(line.includes('|')||(/^[\u4e00-\u9fff]{1,6}\s+[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+/i.test(line)))kind='vocab';
    else if(/^(Ngữ pháp|Cấu trúc|语法)/i.test(line))kind='grammar';
    else if(/^(Ví dụ|例句)/i.test(line))kind='example';
    else if(/^(Bài tập|练习)/i.test(line))kind='exercise';
    return {line,kind};
  });
}

function renderClassifiedLines(){
  const box=$('#pdf-lines-list');
  const opts=[['title','Tiêu đề'],['vocab','Từ vựng'],['dialog','Hội thoại'],['grammar','Ngữ pháp'],['example','Ví dụ'],['text','Bài khóa'],['exercise','Bài tập'],['skip','Bỏ qua']];
  box.innerHTML=pdfState.classified.map((item,i)=>`<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
    <select data-cl-i="${i}" style="padding:6px;border-radius:8px;border:1px solid var(--line);font-size:12px;background:var(--bg)">
      ${opts.map(([k,lbl])=>`<option value="${k}" ${item.kind===k?'selected':''}>${lbl}</option>`).join('')}
    </select>
    <input data-cl-txt="${i}" value="${escHtml(item.line)}" style="flex:1;min-width:0;padding:6px 8px;border-radius:8px;border:1px solid var(--line);font-size:13px"/>
  </div>`).join('');
}

function refreshPdfCourseSelect(){
  const sel=$('#pdf-target-course');if(!sel)return;
  sel.innerHTML=COURSES.map(c=>`<option value="${escHtml(c.id)}" ${c.id===(curDetailCourseId||store.activeCourseId)?'selected':''}>${escHtml(c.title)}</option>`).join('');
}

/* ---------- Gắn sự kiện UI Công đoạn 8 ---------- */
function onViewEntered(id){
  if(id==='learn'){
    if(typeof setLearnTab==='function')setLearnTab(curLearnTab||'lessons');
    else renderLibrary();
  }
  if(id==='course-detail')renderCourseDetail();
  if(id==='pdf-import')refreshPdfCourseSelect();
  if(id==='home')renderRoadmap();
  if(id==='roadmap'&&typeof renderFullRoadmap==='function')renderFullRoadmap();
  if(id==='lesson')renderLessonDetail();
  if(id==='vocab'&&typeof syncMindMapLines==='function')requestAnimationFrame(syncMindMapLines);
  if(id==='dialog'&&typeof dialogCtrl!=='undefined')dialogCtrl.enter();
  if(id==='copy'&&typeof copyCtrl!=='undefined')copyCtrl.enter();
  if(id==='trans'&&typeof transCtrl!=='undefined')transCtrl.enter();
  if(id==='dialog'&&typeof LISTEN_DIALOG!=='undefined'&&LISTEN_DIALOG.length&&typeof markLessonSectionDone==='function'){
    markLessonSectionDone(store.activeLessonId,'dialog',true);
  }
  if(id==='grammar'&&(typeof GRAMMAR_QUIZ==='undefined'||!GRAMMAR_QUIZ||!GRAMMAR_QUIZ.length)&&typeof GRAMMAR_POINTS!=='undefined'&&Object.keys(GRAMMAR_POINTS||{}).length&&typeof markLessonSectionDone==='function'){
    markLessonSectionDone(store.activeLessonId,'grammar',true);
  }
}

document.addEventListener('click',async e=>{
  // Learn mode tabs (Bài học / Giáo trình)
  const lTab=e.target.closest('#learn-mode-tabs [data-learntab]');
  if(lTab&&typeof setLearnTab==='function'){
    e.preventDefault();
    setLearnTab(lTab.dataset.learntab);
    return;
  }
  // Switch track / course in parallel or single mode
  const swBtn=e.target.closest('[data-switch-course]');
  if(swBtn&&typeof switchToCourse==='function'){
    e.preventDefault();
    switchToCourse(swBtn.dataset.switchCourse);
    if(swBtn.dataset.openLearn==='1'){
      if(typeof curLearnTab!=='undefined')curLearnTab='lessons';
      goView('learn');
    }
    return;
  }
  // Open onboarding / learning setup modal
  const setupBtn=e.target.closest('[data-open-setup]');
  if(setupBtn&&typeof openLearningSetupModal==='function'){
    e.preventDefault();
    openLearningSetupModal(1,false);
    return;
  }
  // Home & Learn roadmap click
  const rm=e.target.closest('[data-rm-lid]');
  if(rm){
    const lid=rm.dataset.rmLid;
    if(rm.dataset.unlocked==='0'){
      toast('Hãy hoàn thành bài trước hoặc bật “Học tự do” để mở bài này');
      return;
    }
    const l=LESSONS.find(x=>x.id===lid);
    if(l&&l.courseId&&l.courseId!==store.activeCourseId&&typeof switchToCourse==='function'){
      switchToCourse(l.courseId,l.id);
    }else{
      store.activeLessonId=lid;
      if(l&&l.courseId)getCourseProg(l.courseId).currentLessonId=lid;
      saveStore(store);
      applyActiveLesson();
      if(typeof refreshDashboards==='function')refreshDashboards();
    }
    goView('lesson');
    return;
  }
  // "Xem toàn bộ lộ trình" -> mở bản đồ lộ trình 15 bài đường cong chữ S
  const allRm=e.target.closest('#hm-all-roadmap');
  if(allRm){
    e.preventDefault();
    const cid=(store.activeCourseId&&store.activeCourseId!=='course_sample_hn1')?store.activeCourseId:'course_hn_1';
    if(typeof renderFullRoadmap==='function')renderFullRoadmap(cid);
    goView('roadmap');
    return;
  }
  // Mọi nút "Xem giáo trình" (Trang chủ, Thư viện, Thẻ quyển, Chi tiết quyển)
  const vtb=e.target.closest('[data-view-textbook],#btn-view-textbook-top,#rm-view-textbook,#cd-view-textbook');
  if(vtb){
    e.preventDefault();
    e.stopPropagation();
    let cid=vtb.dataset.viewTextbook||'';
    if(!cid&&vtb.id==='cd-view-textbook')cid=curDetailCourseId;
    if(!cid){
      const actC=COURSES.find(c=>c.id===store.activeCourseId&&c.id!=='course_sample_hn1'&&getCourseLessons(c.id,true).length>0)||COURSES.find(c=>c.id==='course_hn_1')||COURSES.find(c=>getCourseLessons(c.id,true).length>0)||COURSES[0];
      cid=actC?actC.id:'course_hn_1';
    }
    openTextbookReader(cid);
    return;
  }
  // Open course detail from #learn
  const oc=e.target.closest('[data-open-course]');
  if(oc){renderCourseDetail(oc.dataset.openCourse);goView('course-detail');return;}
  // Download on-demand lesson pack
  const dlBtn=e.target.closest('[data-dl-lesson]');
  if(dlBtn){
    e.preventDefault();e.stopPropagation();
    if(dlBtn.disabled)return;
    const orig=dlBtn.innerHTML;
    dlBtn.disabled=true;
    if(dlBtn.id!=='ls-top-dl-btn')dlBtn.textContent='Đang tải…';
    try{await downloadLessonById(dlBtn.dataset.dlLesson);}
    finally{
      if(document.body.contains(dlBtn)){
        dlBtn.disabled=false;
        if(dlBtn.id==='ls-top-dl-btn'||dlBtn.hasAttribute('data-dl-lesson'))dlBtn.innerHTML=orig;
      }
    }
    return;
  }
  const dlStartBtn=e.target.closest('[data-dl-and-start]');
  if(dlStartBtn){
    e.preventDefault();e.stopPropagation();
    if(dlStartBtn.dataset.loading==='1')return;
    const lid=dlStartBtn.dataset.dlAndStart;
    dlStartBtn.dataset.loading='1';
    const sp=dlStartBtn.querySelector('span');
    const origSp=sp?sp.textContent:'';
    if(sp)sp.textContent='Đang tải bài học…';
    let ok=false;
    try{ok=await downloadLessonById(lid);}
    finally{delete dlStartBtn.dataset.loading;if(!ok&&sp&&document.body.contains(sp))sp.textContent=origSp;}
    if(ok){
      if(store.activeLessonId!==lid){store.activeLessonId=lid;saveStore(store);applyActiveLesson();}
      goView('vocab');
    }
    return;
  }
  // Open lesson from course-detail
  const ol=e.target.closest('[data-open-lesson]');
  if(ol){
    const l=LESSONS.find(x=>x.id===ol.dataset.openLesson);
    if(l){
      if(typeof switchToCourse==='function')switchToCourse(l.courseId,l.id);
      else{store.activeCourseId=l.courseId;store.activeLessonId=l.id;saveStore(store);applyActiveLesson();renderRoadmap();}
      goView('lesson');
    }
    return;
  }
  // Edit lesson
  const elBtn=e.target.closest('[data-ed-lesson]');
  if(elBtn){openLessonEditor(elBtn.dataset.edLesson);return;}
  // Move lesson order
  const mvBtn=e.target.closest('[data-mv-lesson]');
  if(mvBtn){
    const lid=mvBtn.dataset.mvLesson,dir=Number(mvBtn.dataset.dir);
    const c=COURSES.find(x=>x.id===curDetailCourseId);if(!c)return;
    const ls=getCourseLessons(c.id,true).map(x=>x.id);
    const i=ls.indexOf(lid),ni=i+dir;
    if(i<0||ni<0||ni>=ls.length)return;
    [ls[i],ls[ni]]=[ls[ni],ls[i]];
    c.lessonOrder=ls;
    await HanyuIDB.put('courses',c);
    renderCourseDetail(c.id);renderRoadmap();
    return;
  }
  // Delete lesson
  const delL=e.target.closest('[data-del-lesson]');
  if(delL){
    const lid=delL.dataset.delLesson;
    const l=LESSONS.find(x=>x.id===lid);if(!l)return;
    if(!confirm(`Xóa "${l.code}: ${l.titleVi}"? Lịch sử ôn tập từ vựng (SRS) vẫn được bảo toàn.`))return;
    await HanyuIDB.del('lessons',lid);
    LESSONS=LESSONS.filter(x=>x.id!==lid);
    const c=COURSES.find(x=>x.id===l.courseId);
    if(c&&Array.isArray(c.lessonOrder)){c.lessonOrder=c.lessonOrder.filter(x=>x!==lid);await HanyuIDB.put('courses',c);}
    if(store.activeLessonId===lid){
      const rem=getCourseLessons(l.courseId,true);
      store.activeLessonId=rem[0]?rem[0].id:null;
      saveStore(store);applyActiveLesson();
    }
    renderCourseDetail(l.courseId);renderRoadmap();renderLibrary();
    toast('Đã xóa bài học (lịch sử SRS vẫn được giữ)');
    return;
  }
  // Course detail tabs
  const ctab=e.target.closest('#cd-tabs button');
  if(ctab){curCourseTab=ctab.dataset.ctab;renderCourseDetail();return;}
  // Select active course
  if(e.target.id==='cd-select-active'){
    if(typeof switchToCourse==='function')switchToCourse(curDetailCourseId);
    else{
      store.activeCourseId=curDetailCourseId;
      const ls=getCourseLessons(curDetailCourseId,true);
      store.activeLessonId=ls[0]?ls[0].id:null;
      saveStore(store);applyActiveLesson();renderRoadmap();renderLibrary();
    }
    renderCourseDetail();
    toast('Đã chuyển sang giáo trình này');
    return;
  }
  // Duplicate personal course
  if(e.target.id==='cd-dup-course'){
    const c=COURSES.find(x=>x.id===curDetailCourseId);if(!c)return;
    const copy=JSON.parse(JSON.stringify(c));
    copy.id=genId('course');copy.title=c.title+' (Bản sao)';copy.createdAt=Date.now();copy.lessonOrder=[];
    const oldLs=getCourseLessons(c.id,true);
    for(const ol of oldLs){
      const nl=JSON.parse(JSON.stringify(ol));
      nl.id=genId('lesson');nl.courseId=copy.id;
      copy.lessonOrder.push(nl.id);
      LESSONS.push(nl);await HanyuIDB.put('lessons',nl);
    }
    COURSES.push(copy);await HanyuIDB.put('courses',copy);
    renderCourseDetail(copy.id);renderLibrary();
    toast('Đã nhân bản giáo trình cá nhân');
    return;
  }
  // Delete course
  if(e.target.id==='cd-del-course'){
    const c=COURSES.find(x=>x.id===curDetailCourseId);if(!c)return;
    if(!confirm(`Xóa giáo trình "${c.title}" cùng các bài học bên trong? Tiến độ SRS của các từ bạn đã học vẫn được giữ lại.`))return;
    const ls=LESSONS.filter(x=>x.courseId===c.id);
    for(const l of ls)await HanyuIDB.del('lessons',l.id);
    LESSONS=LESSONS.filter(x=>x.courseId!==c.id);
    await HanyuIDB.del('courses',c.id);
    COURSES=COURSES.filter(x=>x.id!==c.id);
    if(store.activeCourseId===c.id){
      store.activeCourseId=COURSES[0]?COURSES[0].id:null;
      const nls=store.activeCourseId?getCourseLessons(store.activeCourseId,true):[];
      store.activeLessonId=nls[0]?nls[0].id:null;
      saveStore(store);applyActiveLesson();
    }
    renderLibrary();renderRoadmap();goView('learn');
    toast('Đã xóa giáo trình');
    return;
  }
});

// Wire toolbar & editor buttons
$('#hm-free-btn').onclick=()=>{store.freeExplore=!store.freeExplore;saveStore(store);renderRoadmap();};
$('#btn-new-course').onclick=()=>openCourseFormModal(null);
if($('#btn-open-pdf'))$('#btn-open-pdf').onclick=()=>{refreshPdfCourseSelect();goView('pdf-import');};
if($('#btn-view-textbook-top'))$('#btn-view-textbook-top').onclick=()=>{
  const actC=COURSES.find(c=>c.id===store.activeCourseId&&c.id!=='course_sample_hn1'&&getCourseLessons(c.id,true).length>0)||COURSES.find(c=>c.id==='course_hn_1');
  const firstLoaded=actC||COURSES.find(c=>getCourseLessons(c.id,true).length>0)||COURSES[0];
  if(firstLoaded)openTextbookReader(firstLoaded.id);
};
if($('#rm-view-textbook'))$('#rm-view-textbook').onclick=()=>{openTextbookReader(store.activeCourseId||'course_hn_1');};
$('#btn-backup-json').onclick=()=>openBackupModal();

$('#btn-seed-catalog').onclick=()=>seedStandardCatalog(true);
$('#cd-import-audio').onclick=()=>$('#audio-file-input').click();
document.addEventListener('click',e=>{
  if(e.target&&e.target.id==='ls-load-audio-btn'){$('#audio-file-input').click();}
  if(e.target&&e.target.id==='ls-tog-opt-ext'){
    store.settings.showOptionalExt=!(store.settings.showOptionalExt!==false);
    saveStore(store);
    renderLessonDetail();
  }
});
function detectZipCoursePrefix(zipName,entryPath){
  const z=normMediaName(zipName),p=normMediaName(entryPath);
  if(p.includes('学练手册')||z.includes('sbt 1')||z.includes('sbt1'))return 'sbt1/';
  if(z.includes('sbt 2')||z.includes('sbt2')||p.includes('二级')||/^第\d+课\.mp3$/.test(p.split('/').pop()))return 'sbt2/';
  if(p.includes('教程1')||z.includes('hsk 1'))return 'hsk1/';
  if(p.includes('教程2')||z.includes('hsk 2'))return 'hsk2/';
  if(p.includes('教程3')||z.includes('hsk 3'))return 'hsk3/';
  return '';
}

function decodeZipEntryName(bytes,isUtf8){
  if(isUtf8){try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch(_){}}
  try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch(_){}
  try{return new TextDecoder('gbk').decode(bytes);}catch(_){}
  return new TextDecoder('latin1').decode(bytes);
}

async function extractMp3FromZip(file){
  const buf=await file.arrayBuffer();
  const dv=new DataView(buf),u8=new Uint8Array(buf);
  // Find End of Central Directory (0x06054b50)
  let eocd=-1;
  for(let i=u8.length-22;i>=Math.max(0,u8.length-65557);i--){
    if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;}
  }
  if(eocd<0)throw new Error('Không đọc được cấu trúc ZIP');
  const cdTotal=dv.getUint16(eocd+10,true);
  let off=dv.getUint32(eocd+16,true);
  const out=[];
  for(let idx=0;idx<cdTotal&&off+46<=u8.length;idx++){
    if(dv.getUint32(off,true)!==0x02014b50)break;
    const flags=dv.getUint16(off+8,true);
    const method=dv.getUint16(off+10,true);
    const compSize=dv.getUint32(off+20,true);
    const fnLen=dv.getUint16(off+28,true);
    const exLen=dv.getUint16(off+30,true);
    const cmLen=dv.getUint16(off+32,true);
    const lfhOff=dv.getUint32(off+42,true);
    const fnBytes=u8.subarray(off+46,off+46+fnLen);
    const entryName=decodeZipEntryName(fnBytes,(flags&0x800)!==0);
    off+=46+fnLen+exLen+cmLen;
    if(entryName.endsWith('/')||entryName.includes('__MACOSX')||!/\.mp3$/i.test(entryName))continue;
    if(lfhOff+30>u8.length||dv.getUint32(lfhOff,true)!==0x04034b50)continue;
    const lFnLen=dv.getUint16(lfhOff+26,true),lExLen=dv.getUint16(lfhOff+28,true);
    const dataStart=lfhOff+30+lFnLen+lExLen;
    const compBytes=u8.subarray(dataStart,dataStart+compSize);
    let rawBytes=null;
    if(method===0){
      rawBytes=compBytes;
    }else if(method===8&&typeof DecompressionStream!=='undefined'){
      const ds=new DecompressionStream('deflate-raw');
      const writer=ds.writable.getWriter();
      writer.write(compBytes);writer.close();
      const ab=await new Response(ds.readable).arrayBuffer();
      rawBytes=new Uint8Array(ab);
    }
    if(rawBytes){
      out.push({entryName,blob:new Blob([rawBytes],{type:'audio/mpeg'}),size:rawBytes.byteLength});
    }
  }
  return out;
}

if($('#btn-load-audio-top'))$('#btn-load-audio-top').onclick=()=>$('#audio-file-input').click();

$('#audio-file-input').onchange=async e=>{
  const files=[...(e.target.files||[])];
  if(!files.length)return;
  let savedCnt=0,matchedCnt=0;
  const allExpected=new Set(LESSONS.flatMap(l=>(l.audioTracks||[]).map(t=>normMediaName(t.fileName))));
  for(const f of files){
    if(/\.zip$/i.test(f.name)){
      toast(`Đang giải nén ${f.name}...`);
      try{
        const mp3s=await extractMp3FromZip(f);
        for(const item of mp3s){
          const prefix=detectZipCoursePrefix(f.name,item.entryName);
          let rel=item.entryName;
          if(prefix==='sbt1/'){
            const parts=item.entryName.split('/');
            rel=parts.length>=3?(parts[parts.length-2]+'/'+parts[parts.length-1]):parts[parts.length-1];
          }else{
            rel=item.entryName.split('/').pop();
          }
          const key=normMediaName(prefix+rel);
          await HanyuIDB.put('media',{id:key,fileName:prefix+rel,mimeType:'audio/mpeg',size:item.size,blob:item.blob,addedAt:Date.now()});
          savedCnt++;
          if(allExpected.has(key))matchedCnt++;
        }
      }catch(err){
        toast(`Lỗi đọc ZIP ${f.name}: ${err.message||err}`);
      }
    }else{
      const key=normMediaName(f.name);
      await HanyuIDB.put('media',{id:key,fileName:f.name,mimeType:f.type||'audio/mpeg',size:f.size,blob:f,addedAt:Date.now()});
      savedCnt++;
      if(allExpected.has(key))matchedCnt++;
    }
  }
  e.target.value='';
  if(curView==='lesson')renderLessonDetail();
  toast(`Đã nạp ${savedCnt} file audio (khớp ${matchedCnt} track bài học)`);
};

$('#cd-edit-btn').onclick=()=>openCourseFormModal(COURSES.find(x=>x.id===curDetailCourseId));
$('#cd-add-lesson').onclick=()=>openLessonEditor(null,{courseId:curDetailCourseId});
$('#cd-import-pdf').onclick=()=>{refreshPdfCourseSelect();goView('pdf-import');};
$('#cd-view-textbook').onclick=()=>{openTextbookReader(curDetailCourseId);};
$('#ls-edit-btn').onclick=()=>{if(store.activeLessonId)openLessonEditor(store.activeLessonId);};
const _sbLogo=$('#sb-logo-img'),_rmfLogo=$('#rmf-logo-img'),_lsLogo=$('#ls-logo-img'),_topLogo=$('.top .logo');
if(_topLogo&&_topLogo.src){
  [_sbLogo,_rmfLogo,_lsLogo].forEach(im=>{if(im){im.src=_topLogo.src;im.style.display='';}});
}
[$('#ls-top-dl-btn'),$('#ls-status-pill')].forEach(el=>{
  if(!el)return;
  el.addEventListener('click',()=>{
    if(el.hasAttribute('data-dl-lesson'))return;
    const l=LESSONS.find(x=>x.id===store.activeLessonId);
    const st=(l&&typeof getLessonDownloadState==='function')?getLessonDownloadState(l):'downloaded';
    toast(st==='downloaded'?'Bài học đã được tải về — có thể học offline':'Nội dung bài học này đang được cập nhật');
  });
});
if($('#rmf-free-btn'))$('#rmf-free-btn').onclick=()=>{
  store.freeExplore=!store.freeExplore;saveStore(store);
  renderRoadmap();if(typeof renderFullRoadmap==='function')renderFullRoadmap();
};
if($('#rmf-continue-btn'))$('#rmf-continue-btn').onclick=()=>{
  const btn=$('#rmf-continue-btn');
  const lid=btn&&btn.dataset.lessonId;
  const l=LESSONS.find(x=>x.id===lid);
  if(!l)return;
  if(typeof switchToCourse==='function')switchToCourse(l.courseId,l.id);
  else{store.activeCourseId=l.courseId;store.activeLessonId=l.id;saveStore(store);applyActiveLesson();renderRoadmap();}
  goView('lesson');
};
if($('#rmf-open-course-btn'))$('#rmf-open-course-btn').onclick=()=>{
  const cid=(typeof curRoadmapCourseId!=='undefined'&&curRoadmapCourseId)?curRoadmapCourseId:((store.activeCourseId&&store.activeCourseId!=='course_sample_hn1')?store.activeCourseId:'course_hn_1');
  curCourseTab='lessons';
  renderCourseDetail(cid);
  goView('course-detail');
};
if($('#learn-rm-free-btn'))$('#learn-rm-free-btn').onclick=()=>{
  store.freeExplore=!store.freeExplore;saveStore(store);
  renderRoadmap();if(typeof renderFullRoadmap==='function')renderFullRoadmap();
  if(typeof renderLearnRoadmap==='function')renderLearnRoadmap();
};
if($('#learn-rm-continue-btn'))$('#learn-rm-continue-btn').onclick=()=>{
  const btn=$('#learn-rm-continue-btn');
  const lid=btn&&btn.dataset.lessonId;
  const l=LESSONS.find(x=>x.id===lid);
  if(!l)return;
  if(typeof switchToCourse==='function')switchToCourse(l.courseId,l.id);
  else{store.activeCourseId=l.courseId;store.activeLessonId=l.id;saveStore(store);applyActiveLesson();renderRoadmap();}
  goView('lesson');
};
if($('#learn-rm-open-course-btn'))$('#learn-rm-open-course-btn').onclick=()=>{
  const btn=$('#learn-rm-open-course-btn');
  const cid=(btn&&btn.dataset.courseId)||((typeof curLearnRoadmapCourseId!=='undefined'&&curLearnRoadmapCourseId)?curLearnRoadmapCourseId:(store.activeCourseId||'course_hn_1'));
  curCourseTab='lessons';
  renderCourseDetail(cid);
  goView('course-detail');
};
if(typeof syncSidebarThemeLabel==='function')syncSidebarThemeLabel();
if($('#sb-theme-btn'))$('#sb-theme-btn').onclick=()=>{const tb=$('#themebtn');if(tb)tb.click();if(typeof syncSidebarThemeLabel==='function')syncSidebarThemeLabel();};
if($('#hdr-bell-btn'))$('#hdr-bell-btn').onclick=()=>{
  const now=Date.now();
  const dueCnt=Object.values(store.words||{}).filter(r=>r&&r.status!=='new'&&Number.isFinite(r.dueAt)&&r.dueAt<=now).length;
  const actL=LESSONS.find(x=>x.id===store.activeLessonId);
  const name=actL?`${actL.code||''}${actL.titleVi?' · '+actL.titleVi:''}`:'bài học hiện tại';
  toast(dueCnt?`Hôm nay có ${dueCnt} từ SRS cần ôn · Đang học ${name}`:`Chưa có từ SRS đến hạn · Đang học ${name}`);
};
if($('#ls-read-tb-btn'))$('#ls-read-tb-btn').onclick=()=>{
  const l=LESSONS.find(x=>x.id===store.activeLessonId);
  openTextbookReader((l&&l.courseId)||store.activeCourseId||'course_hn_1',l?l.id:null);
};
if($('#ls-next-lesson-cta'))$('#ls-next-lesson-cta').onclick=async()=>{
  const btn=$('#ls-next-lesson-cta');
  const nextLid=btn&&btn.dataset.nextLesson;
  if(!nextLid)return;
  const nextL=LESSONS.find(x=>x.id===nextLid);
  if(!nextL)return;
  const dlState=typeof getLessonDownloadState==='function'?getLessonDownloadState(nextL):'downloaded';
  if(dlState==='available'&&typeof downloadLessonById==='function'){
    btn.disabled=true;btn.textContent='Đang tải bài tiếp theo...';
    try{await downloadLessonById(nextLid);}finally{btn.disabled=false;}
  }
  store.activeCourseId=nextL.courseId||store.activeCourseId;
  store.activeLessonId=nextL.id;
  saveStore(store);applyActiveLesson();renderRoadmap();renderLessonDetail();
  try{window.scrollTo(0,0);}catch(_){}
};

$('#q').addEventListener('input',()=>renderLibrary());
$('#filters').addEventListener('click',()=>setTimeout(renderLibrary,0));

// Editor actions
$('#le-add-word').onclick=()=>{draftLesson._editWords.push({zh:'',py:'',vi:''});renderEditorWords();editorDirty=true;};
$('#le-add-dlg').onclick=()=>{draftLesson.dialog.push({speaker:'A',name:'Người A',zh:'',py:'',vi:''});renderEditorDialog();editorDirty=true;};
$('#le-add-gram').onclick=()=>{draftLesson._editGrams.push({title:'',explain:'',exZh:''});renderEditorGrams();editorDirty=true;};
$('#le-split-paste').onclick=()=>{
  const raw=prompt('Dán nhanh danh sách từ (mỗi dòng: Chữ Hán | Pinyin | Nghĩa):');
  if(!raw)return;
  raw.split(/\r?\n/).forEach(line=>{
    const p=line.split(/[|\t]/).map(x=>x.trim());
    if(p[0])draftLesson._editWords.push({zh:p[0],py:p[1]||'',vi:p[2]||''});
  });
  renderEditorWords();syncDraftFromInputs();
};
$('#lesson-editor').addEventListener('input',e=>{
  const t=e.target;editorDirty=true;
  if(t.dataset.ew){draftLesson._editWords[Number(t.dataset.i)][t.dataset.ew]=t.value;}
  else if(t.dataset.ed){draftLesson.dialog[Number(t.dataset.i)][t.dataset.ed]=t.value;}
  else if(t.dataset.eg){draftLesson._editGrams[Number(t.dataset.i)][t.dataset.eg]=t.value;}
  syncDraftFromInputs();
});
$('#lesson-editor').addEventListener('click',e=>{
  const t=e.target;
  if(t.dataset.delEw!==undefined){draftLesson._editWords.splice(Number(t.dataset.delEw),1);renderEditorWords();syncDraftFromInputs();}
  if(t.dataset.delEd!==undefined){draftLesson.dialog.splice(Number(t.dataset.delEd),1);renderEditorDialog();syncDraftFromInputs();}
  if(t.dataset.delEg!==undefined){draftLesson._editGrams.splice(Number(t.dataset.delEg),1);renderEditorGrams();syncDraftFromInputs();}
});
$('#le-save-draft').onclick=()=>saveEditedLesson('draft');
$('#le-publish').onclick=()=>saveEditedLesson('published');
$('#le-preview').onclick=async()=>{
  const sv=await saveEditedLesson(draftLesson.status||'draft');
  store.activeCourseId=sv.courseId;store.activeLessonId=sv.id;saveStore(store);applyActiveLesson();goView('lesson');
};

// PDF Import actions
$('#pdf-file-input').onchange=async e=>{
  const f=e.target.files&&e.target.files[0];if(!f)return;
  const alertBox=$('#pdf-alert-box'),infoEl=$('#pdf-file-info'),libEl=$('#pdf-lib-status');
  alertBox.innerHTML='';
  if(!f.name.toLowerCase().endsWith('.pdf')&&f.type!=='application/pdf'){
    alertBox.innerHTML='<div class="err-box">Định dạng không hợp lệ. Vui lòng chọn tệp <b>.pdf</b>.</div>';
    return;
  }
  const mb=(f.size/1048576).toFixed(2);
  infoEl.textContent=`Tệp: ${f.name} (${mb} MB)`;
  if(f.size>25*1048576){
    alertBox.innerHTML='<div class="warn-box">Tệp lớn hơn 25 MB, việc đọc trang trên trình duyệt có thể chậm.</div>';
  }
  const fHash=`${f.name}_${f.size}_${f.lastModified}`;
  const allPdfs=await HanyuIDB.getAll('pdfs');
  if(allPdfs.some(p=>p.id===fHash)){
    alertBox.innerHTML+='<div class="warn-box">Tệp PDF này đã từng được nhập trước đó. Hệ thống không lưu trùng file gốc.</div>';
  }
  pdfState.file=f;pdfState.fileHash=fHash;pdfState.dirty=true;
  setPdfStep(2);
  try{
    libEl.textContent='Đang tải PDF.js...';
    const pdfjs=await loadPdfJs();
    libEl.textContent='Đang đọc cấu trúc PDF...';
    const buf=await f.arrayBuffer();
    const doc=await pdfjs.getDocument({data:buf}).promise;
    pdfState.pdfDoc=doc;pdfState.numPages=doc.numPages;pdfState.pageNum=1;
    $('#pdf-viewer-card').classList.remove('hide');
    $('#pdf-range').value=`1-${Math.min(3,doc.numPages)}`;
    libEl.textContent=`Đã tải xong (${doc.numPages} trang).`;
    await HanyuIDB.put('pdfs',{id:fHash,name:f.name,size:f.size,numPages:doc.numPages,importedAt:Date.now()});
    await renderPdfPage(1);
  }catch(err){
    if(err&&err.name==='PasswordException'){
      alertBox.innerHTML='<div class="err-box">File PDF có mật khẩu bảo vệ. Vui lòng gỡ mật khẩu trước khi nhập hoặc dán văn bản thủ công.</div>';
    }else if(String(err).includes('PDF.js')){
      alertBox.innerHTML='<div class="warn-box">Không tải được thư viện PDF.js (có thể do mất mạng). Bạn vẫn có thể dán văn bản bài học vào ô bên dưới để tiếp tục.</div>';
    }else{
      alertBox.innerHTML='<div class="err-box">Không thể đọc tệp PDF này (tệp có thể bị hỏng hoặc không hỗ trợ). Hãy thử dán văn bản thủ công.</div>';
    }
    libEl.textContent='';
  }
};
$('#pdf-prev').onclick=()=>{if(pdfState.pageNum>1){pdfState.pageNum--;renderPdfPage(pdfState.pageNum);}};
$('#pdf-next').onclick=()=>{if(pdfState.pageNum<pdfState.numPages){pdfState.pageNum++;renderPdfPage(pdfState.pageNum);}};
$('#pdf-zout').onclick=()=>{pdfState.scale=Math.max(0.6,pdfState.scale-0.2);renderPdfPage(pdfState.pageNum);};
$('#pdf-zin').onclick=()=>{pdfState.scale=Math.min(2.4,pdfState.scale+0.2);renderPdfPage(pdfState.pageNum);};

$('#pdf-extract-btn').onclick=async()=>{
  if(!pdfState.pdfDoc)return;
  const pages=parsePageRange($('#pdf-range').value,pdfState.numPages);
  if(!pages.length){toast('Phạm vi trang không hợp lệ');return;}
  setPdfStep(3);
  $('#pdf-lib-status').textContent=`Đang trích xuất ${pages.length} trang...`;
  let out='',totalChars=0;
  for(const pNum of pages){
    const page=await pdfState.pdfDoc.getPage(pNum);
    const tc=await page.getTextContent();
    const str=tc.items.map(it=>it.str).join(' ').replace(/\s{2,}/g,' ').trim();
    totalChars+=str.length;
    out+=`[Trang ${pNum}]\n${str}\n\n`;
  }
  $('#pdf-raw-text').value=out.trim();
  pdfState.extractedText=out.trim();
  if(totalChars<pages.length*15){
    $('#pdf-alert-box').innerHTML='<div class="warn-box"><b>Phát hiện PDF dạng ảnh / scan:</b> Không có lớp văn bản có thể trích xuất trực tiếp. Phiên bản HTML offline chưa tích hợp OCR tiếng Trung đủ tin cậy — vui lòng nhập hoặc dán văn bản thủ công vào ô bên dưới.</div>';
  }else{
    $('#pdf-alert-box').innerHTML=`<div class="ok-box">Đã trích xuất ${totalChars} ký tự từ ${pages.length} trang. Hãy kiểm tra và nhấn <b>Gợi ý phân loại</b>.</div>`;
  }
  $('#pdf-lib-status').textContent='Trích xuất hoàn tất.';
};

$('#pdf-classify-btn').onclick=()=>{
  const raw=$('#pdf-raw-text').value.trim();
  if(!raw){toast('Chưa có văn bản để phân loại');return;}
  setPdfStep(4);
  pdfState.classified=classifyLines(raw);
  renderClassifiedLines();
  $('#pdf-classify-card').classList.remove('hide');
};
$('#pdf-classify-card').addEventListener('change',e=>{
  if(e.target.dataset.clI!==undefined)pdfState.classified[Number(e.target.dataset.clI)].kind=e.target.value;
  if(e.target.dataset.clTxt!==undefined)pdfState.classified[Number(e.target.dataset.clTxt)].line=e.target.value;
});
$('#pdf-to-editor-btn').onclick=()=>{
  const cId=$('#pdf-target-course').value||store.activeCourseId;
  const editWords=[],dialog=[],grammar=[],titles=[];
  pdfState.classified.forEach(item=>{
    if(item.kind==='skip')return;
    if(item.kind==='title')titles.push(item.line);
    else if(item.kind==='vocab'){
      const p=item.line.split(/[|\t]/).map(x=>x.trim());
      if(p.length>=2)editWords.push({zh:p[0],py:p[1]||'',vi:p[2]||''});
      else{
        const m=item.line.match(/^([\u4e00-\u9fff]+)\s+([^\u4e00-\u9fff]+)$/);
        if(m)editWords.push({zh:m[1],py:m[2],vi:''});
        else editWords.push({zh:item.line,py:'',vi:''});
      }
    }else if(item.kind==='dialog'){
      const p=item.line.split(/[|\t]/).map(x=>x.trim());
      dialog.push({speaker:'A',name:'Nhân vật',zh:p[0]||item.line,py:p[1]||'',vi:p[2]||''});
    }else if(item.kind==='grammar'){
      grammar.push({title:item.line,explain:'',exZh:''});
    }
  });
  pdfState.dirty=false;
  openLessonEditor(null,{
    courseId:cId,
    titleVi:titles[0]||'',
    sourceRef:{fileName:pdfState.file?pdfState.file.name:'Nhập thủ công',fileHash:pdfState.fileHash,pageRange:$('#pdf-range').value||''},
    originalContent:$('#pdf-raw-text').value,
    editWords,dialog,grammar
  });
};

window._v8Ready=true;
initCurriculumStore();

route();
refreshDashboards();
