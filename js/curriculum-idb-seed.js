/* ========== CÔNG ĐOẠN 8: HỆ THỐNG GIÁO TRÌNH, BÀI HỌC & NHẬP PDF ========== */
const DEFAULT_WORDS_SNAP=JSON.parse(JSON.stringify(WORDS));
const DEFAULT_SENT_SNAP=JSON.parse(JSON.stringify(SENT));
const DEFAULT_CHARS_SNAP=JSON.parse(JSON.stringify(CHARS));
const DEFAULT_GRAMMAR_POINTS_SNAP=JSON.parse(JSON.stringify(GRAMMAR_POINTS));
const DEFAULT_GRAMMAR_QUIZ_SNAP=JSON.parse(JSON.stringify(GRAMMAR_QUIZ));
const DEFAULT_ORDER_BANK_SNAP=JSON.parse(JSON.stringify(ORDER_BANK));
const DEFAULT_LISTEN_DIALOG_SNAP=JSON.parse(JSON.stringify(LISTEN_DIALOG));
const DEFAULT_DIALOG_QUESTIONS_SNAP=JSON.parse(JSON.stringify(DIALOG_QUESTIONS));

function normalizeZh(s){return String(s||'').replace(/[\s\u3000.,!?，。！？、；：""''（）()]/g,'').trim();}
function escHtml(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function genId(p){return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;}

/* ---------- IndexedDB + Fallback bộ nhớ ---------- */
const HanyuIDB=(function(){
  const DB_NAME='hanyu_ai_db',DB_VER=2;
  let dbPromise=null;
  const mem={courses:{},lessons:{},pdfs:{},media:{}};
  function open(){
    if(dbPromise)return dbPromise;
    if(typeof indexedDB==='undefined')return Promise.resolve(null);
    dbPromise=new Promise(res=>{
      let settled=false;
      const done=val=>{if(!settled){settled=true;res(val);}};
      const timer=setTimeout(()=>done(null),1200);
      try{
        const req=indexedDB.open(DB_NAME,DB_VER);
        req.onupgradeneeded=e=>{
          const db=e.target.result;
          if(!db.objectStoreNames.contains('courses'))db.createObjectStore('courses',{keyPath:'id'});
          if(!db.objectStoreNames.contains('lessons'))db.createObjectStore('lessons',{keyPath:'id'});
          if(!db.objectStoreNames.contains('pdfs'))db.createObjectStore('pdfs',{keyPath:'id'});
          if(!db.objectStoreNames.contains('media'))db.createObjectStore('media',{keyPath:'id'});
        };
        req.onsuccess=()=>{clearTimeout(timer);done(req.result);};
        req.onerror=()=>{clearTimeout(timer);done(null);};
        req.onblocked=()=>{clearTimeout(timer);done(null);};
      }catch(e){clearTimeout(timer);done(null);}
    });
    return dbPromise;
  }
  async function getAll(stName){
    const db=await open();
    if(!db)return Object.values(mem[stName]||{});
    return new Promise(res=>{
      try{
        const tx=db.transaction(stName,'readonly');
        const req=tx.objectStore(stName).getAll();
        req.onsuccess=()=>res(req.result||[]);
        req.onerror=()=>res(Object.values(mem[stName]||{}));
      }catch(e){res(Object.values(mem[stName]||{}));}
    });
  }
  async function put(stName,obj){
    mem[stName][obj.id]=obj;
    const db=await open();
    if(!db)return true;
    return new Promise(res=>{
      try{
        const tx=db.transaction(stName,'readwrite');
        tx.objectStore(stName).put(obj);
        tx.oncomplete=()=>res(true);
        tx.onerror=ev=>{
          const err=ev.target&&ev.target.error;
          if(err&&err.name==='QuotaExceededError')toast('Bộ nhớ trình duyệt đã đầy, hãy xuất JSON sao lưu.');
          res(false);
        };
      }catch(e){res(false);}
    });
  }
  async function del(stName,id){
    delete mem[stName][id];
    const db=await open();
    if(!db)return true;
    return new Promise(res=>{
      try{
        const tx=db.transaction(stName,'readwrite');
        tx.objectStore(stName).delete(id);
        tx.oncomplete=()=>res(true);
        tx.onerror=()=>res(false);
      }catch(e){res(false);}
    });
  }
  async function get(stName,id){
    if(mem[stName]&&mem[stName][id])return mem[stName][id];
    const db=await open();
    if(!db)return null;
    return new Promise(res=>{
      try{
        const tx=db.transaction(stName,'readonly');
        const req=tx.objectStore(stName).get(id);
        req.onsuccess=()=>{if(req.result)mem[stName][id]=req.result;res(req.result||null);};
        req.onerror=()=>res(null);
      }catch(e){res(null);}
    });
  }
  return {getAll,get,put,del,mem};
})();

/* ---------- Kho dữ liệu giáo trình & bài học trong phiên ---------- */
let COURSES=[];
let LESSONS=[];
let curDetailCourseId=null;
let curCourseTab='lessons';
let editingLessonId=null;
let editorDirty=false;
let pdfState={file:null,fileHash:'',pdfDoc:null,pageNum:1,numPages:0,scale:1.2,extractedText:'',classified:[],dirty:false};

function registerVocabWord(w){
  if(!w||!w.zh)return null;
  const ck=normalizeZh(w.zh);
  if(!ck)return null;
  if(!store.vocabBank)store.vocabBank={};
  const existing=Object.values(store.vocabBank).find(x=>x.canonicalKey===ck||(w.id&&x.id===w.id));
  if(existing){
    if(!existing.py&&w.py)existing.py=w.py;
    if(!existing.vi&&w.vi)existing.vi=w.vi;
    if(!existing.pos&&w.pos)existing.pos=w.pos;
    if(!existing.ex&&w.ex){existing.ex=w.ex;existing.exPy=w.exPy||'';existing.exVi=w.exVi||'';}
    return existing.id;
  }
  const id=w.id||genId('w');
  store.vocabBank[id]={id,zh:w.zh.trim(),py:(w.py||'').trim(),vi:(w.vi||'').trim(),pos:(w.pos||'').trim(),ex:w.ex||'',exPy:w.exPy||'',exVi:w.exVi||'',canonicalKey:ck,createdAt:Date.now()};
  return id;
}

function registerLessonWords(words,wordDetails){
  const ids=new Set();
  for(const w of Array.isArray(words)?words:[]){
    const id=registerVocabWord(w);
    if(!id||ids.has(id))continue;
    ids.add(id);
    // Giữ cách đọc và nghĩa theo bài, dùng chung mã từ để ôn tập SRS.
    if(wordDetails)wordDetails[id]={zh:w.zh.trim(),py:(w.py||'').trim(),vi:(w.vi||'').trim(),pos:(w.pos||'').trim()};
  }
  return [...ids];
}

function getLessonVocab(lesson){
  return (lesson?.wordIds||[]).map(id=>{
    const word=store.vocabBank?.[id],details=lesson.wordDetails?.[id];
    return word&&details?{...word,...details}:word;
  }).filter(Boolean);
}


/* ---------- Khung Giáo trình chuẩn & Bộ nạp bài theo yêu cầu (On-demand) ---------- */
const SEED_TS=1700000200000;
const _loadedVolumePacks={};
const _pendingPackLoads={};

function normMediaName(name){
  return String(name||'').trim().toLowerCase().normalize('NFC').replace(/\s+/g,' ');
}
function makeAudioTrack(fileName,section,label){
  return {id:normMediaName(fileName),fileName,section:section||'lesson',label:label||fileName,verified:true};
}
function parseHnLessonId(lessonId){
  const m=/^lesson_hn(\d+)_b(\d+)$/.exec(String(lessonId||''));
  return m?{vol:Number(m[1]),num:Number(m[2])}:null;
}
function parseLessonPackRef(lessonId){
  const s=String(lessonId||'');
  const hn=/^lesson_hn(\d+)_b(\d+)$/.exec(s);
  if(hn)return {system:'hanngu',packKey:String(hn[1]),vol:Number(hn[1]),num:Number(hn[2]),dataKey:String(hn[2])};
  const hskB=/^lesson_hsk30_(\d+)_b(\d+)$/.exec(s);
  if(hskB)return {system:'hsk30',packKey:`hsk30_${hskB[1]}`,lvl:Number(hskB[1]),num:Number(hskB[2]),dataKey:String(hskB[2])};
  const hskM=/^lesson_hsk30_(\d+)_mock$/.exec(s);
  if(hskM)return {system:'hsk30',packKey:`hsk30_${hskM[1]}`,lvl:Number(hskM[1]),num:'mock',dataKey:'mock'};
  const mm=/^lesson_mindmap_3300_c(\d+)$/.exec(s);
  if(mm)return {system:'mindmap',packKey:'mindmap_3300',num:Number(mm[1]),dataKey:String(mm[1])};
  const hno=/^lesson_hacknao_t(\d+)_c(\d+)$/.exec(s);
  if(hno)return {system:'hacknao',packKey:`hacknao_${hno[1]}`,book:Number(hno[1]),num:Number(hno[2]),dataKey:String(hno[2])};
  return null;
}
function getPackManifestForVol(vol){
  return (typeof LESSON_PACK_MANIFEST!=='undefined'&&LESSON_PACK_MANIFEST[vol])||null;
}
function hasPackForLesson(lessonId){
  const ref=parseLessonPackRef(lessonId);
  if(!ref)return false;
  const m=getPackManifestForVol(ref.packKey);
  return Boolean(m&&Array.isArray(m.lessons)&&(m.lessons.includes(ref.num)||m.lessons.includes(ref.dataKey)));
}
function isLessonContentLoaded(l){
  return Boolean(l&&((l.wordIds&&l.wordIds.length>0)||(l.dialog&&l.dialog.length>0)||Object.keys(l.grammarPoints||{}).length>0||(l.grammarQuiz&&l.grammarQuiz.length>0)));
}
function getLessonDownloadState(l){
  if(!l)return 'unavailable';
  if(isLessonContentLoaded(l))return 'downloaded';
  if(hasPackForLesson(l.id))return 'available';
  return 'unavailable';
}
function getCoursePackStats(courseId){
  const ls=LESSONS.filter(x=>x.courseId===courseId);
  let downloaded=0,available=0;
  ls.forEach(l=>{
    const st=getLessonDownloadState(l);
    if(st==='downloaded')downloaded++;
    else if(st==='available')available++;
  });
  return {total:ls.length,downloaded,available};
}
function readGlobalPackVar(varName){
  if(!varName||!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(varName))return null;
  try{return (new Function('return typeof '+varName+'!=="undefined"?'+varName+':null;'))();}
  catch(_){return null;}
}
async function loadVolumePack(volNum){
  const key=String(volNum||'');
  if(_loadedVolumePacks[key])return _loadedVolumePacks[key];
  const meta=getPackManifestForVol(volNum)||getPackManifestForVol(key);
  if(!meta)return null;
  if(_pendingPackLoads[key])return _pendingPackLoads[key];
  _pendingPackLoads[key]=(async()=>{
    const existing=readGlobalPackVar(meta.varName);
    if(existing){_loadedVolumePacks[key]=existing;return existing;}
    const lazyEl=document.querySelector(`script[type="text/plain"][data-lazy-pack="${meta.src}"]`);
    if(lazyEl){
      const code=lazyEl.textContent||'';
      const data=(new Function(code+'\nreturn typeof '+meta.varName+'!=="undefined"?'+meta.varName+':null;'))();
      if(data){
        _loadedVolumePacks[key]=data;
        try{window[meta.varName]=data;}catch(_){}
      }
      return data;
    }
    const loaded=await new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=meta.src;
      s.async=true;
      const timer=setTimeout(()=>{s.remove();reject(new Error('Timeout loading '+meta.src));},8000);
      s.onload=()=>{
        clearTimeout(timer);
        const data=readGlobalPackVar(meta.varName);
        if(data)resolve(data);
        else reject(new Error('Missing '+meta.varName+' after loading '+meta.src));
      };
      s.onerror=()=>{clearTimeout(timer);s.remove();reject(new Error('Failed loading '+meta.src));};
      document.body.appendChild(s);
    });
    if(loaded)_loadedVolumePacks[key]=loaded;
    return loaded;
  })().finally(()=>{delete _pendingPackLoads[key];});
  return _pendingPackLoads[key];
}
function getExtMapForVol(volNum){
  const map={
    1:(typeof HN1_EXT_MAP!=='undefined'?HN1_EXT_MAP:null),
    2:(typeof HN2_EXT_MAP!=='undefined'?HN2_EXT_MAP:null),
    3:(typeof HN3_EXT_MAP!=='undefined'?HN3_EXT_MAP:null),
    4:(typeof HN4_EXT_MAP!=='undefined'?HN4_EXT_MAP:null),
    5:(typeof HN5_EXT_MAP!=='undefined'?HN5_EXT_MAP:null),
    6:(typeof HN6_EXT_MAP!=='undefined'?HN6_EXT_MAP:null)
  };
  return map[volNum]||null;
}
function mergeMindmapEntries(entries){
  if(!entries||typeof entries!=='object')return;
  if(typeof HANZI_MINDMAP_DB!=='undefined'&&HANZI_MINDMAP_DB){
    Object.assign(HANZI_MINDMAP_DB,entries);
  }
}
function mergeHackNaoEntries(entries){
  if(!entries||typeof entries!=='object')return;
  if(typeof HANZI_HACKNAO_DB!=='undefined'&&HANZI_HACKNAO_DB){
    Object.assign(HANZI_HACKNAO_DB,entries);
  }
}
function populateLessonFromPackData(l,full,volNum,bNum,volData){
  const ref=(volNum&&typeof volNum==='object')
    ?volNum
    :{system:'hanngu',packKey:String(volNum||''),vol:Number(volNum),num:bNum,dataKey:String(bNum||'')};
  const srcRoot=(volData&&typeof volData==='object')?volData:readGlobalPackVar(getPackManifestForVol(ref.packKey)?.varName);
  if(ref.system==='mindmap'){
    const entries=(srcRoot&&srcRoot.entries)||{};
    mergeMindmapEntries(entries);
    const rootChars=Array.isArray(full&&full.chars)?full.chars:[];
    const mmWords=[],mmDialog=[],mmGrammar={},mmNotes=[];
    rootChars.forEach((ch,i)=>{
      const e=entries[ch];
      if(!e)return;
      const hvTag=e.hv?`[${String(e.hv).toUpperCase()}] `:'';
      const exObj=e.example&&e.example.zh?e.example:null;
      const firstGroup=(Array.isArray(e.groups)&&e.groups[0]&&Array.isArray(e.groups[0].items))?e.groups[0].items:[];
      const fallbackEx=firstGroup[0]||null;
      mmWords.push({
        zh:ch,py:e.py||'',vi:hvTag+(e.meaning||''),pos:'chữ gốc',
        ex:exObj?exObj.zh:(fallbackEx?fallbackEx.zh:''),
        exPy:exObj?(exObj.py||''):(fallbackEx?(fallbackEx.py||''):''),
        exVi:exObj?(exObj.vi||''):(fallbackEx?(fallbackEx.vi||''):'')
      });
      if(exObj&&exObj.zh){
        mmDialog.push({section:`Ví dụ chữ ${ch}`,speaker:ch,name:`${ch} (${e.py||''})`,zh:exObj.zh,py:exObj.py||'',vi:exObj.vi||''});
      }
      const partsTxt=(Array.isArray(e.parts)&&e.parts.length)?e.parts.map(p=>`${p.rad||p.ch||''}${p.hv?' ('+p.hv+')':''}${p.meaning?' = '+p.meaning:''}`).join(' + '):'';
      const branchCnt=(e.groups||[]).reduce((s,g)=>s+((g&&g.items)?g.items.length:0),0);
      const branchSample=(e.groups||[]).flatMap(g=>g.items||[]).slice(0,5).map(it=>({zh:it.zh,py:it.py||'',vi:it.vi||''}));
      mmGrammar[`mm_${i+1}`]={
        han:ch,py:e.py||'',
        title:`${i+1}. ${ch}${e.trad&&e.trad!==ch?' ('+e.trad+')':''} · ${e.py||''}${e.hv?' ['+e.hv+']':''}`,
        struct:partsTxt||`Nghĩa gốc: ${e.meaning||''}`,
        explain:e.story||`Chữ gốc "${ch}" nghĩa là "${e.meaning||''}", mở rộng ${branchCnt} từ ghép trên sơ đồ tư duy.`,
        examples:branchSample,
        note:branchCnt?`Sơ đồ tư duy có ${branchCnt} từ liên kết (trang in ${e.page||'—'}).`:''
      };
      if(e.story)mmNotes.push(`${ch} (${e.py||''}): ${e.story}`);
    });
    const wordDetails={};
    l.wordIds=registerLessonWords(mmWords,wordDetails);
    l.wordDetails=wordDetails;
    l.dialog=mmDialog;
    l.sentences=mmDialog.map(d=>({zh:d.zh,py:d.py||'',vi:d.vi||''}));
    l.dialogQuestions=[];
    l.grammarPoints=mmGrammar;
    l.grammarQuiz=[];
    l.orderBank=[];
    l.chars=rootChars.map(ch=>({id:'c_'+ch.charCodeAt(0),ch,py:(entries[ch]&&entries[ch].py)||'',vi:(entries[ch]&&entries[ch].meaning)||'',rad:'',strokes:0}));
    l.optionalExtensions={hackNaoIds:[],mindMapRootChars:rootChars};
    l.sourceRef={fileName:'Sơ đồ tư duy 3300 chữ Hán.pdf',fileHash:'',pageRange:(full&&full.pages)||'—'};
    l.goals=['Học chữ gốc qua câu chuyện ghi nhớ & bộ thủ','Mở rộng mạng lưới từ ghép trên sơ đồ tư duy tương tác'];
    l.supplementalContent=mmNotes.join('\n');
    if(full&&full.title)l.titleVi=full.title;
    l.status='published';
    l.downloaded=true;
    l.updatedAt=Date.now();
    return l;
  }
  if(ref.system==='hacknao'){
    const entries=(srcRoot&&srcRoot.entries)||{};
    mergeHackNaoEntries(entries);
    const chList=Array.isArray(full&&full.chars)?full.chars:[];
    const hnWords=[],hnDialog=[],hnGrammar={},hnNotes=[];
    chList.forEach((ch,i)=>{
      const e=entries[ch];
      if(!e)return;
      const hvTag=e.hv?`[${String(e.hv).toUpperCase()}] `:'';
      const cmp=(Array.isArray(e.compounds)&&e.compounds.length)?e.compounds:[];
      const exCmp=cmp.find(c=>c&&c.zh&&c.zh!==ch)||cmp[0]||null;
      hnWords.push({
        zh:ch,py:e.py||'',vi:hvTag+(e.meaning||''),pos:'chữ Hán',
        ex:exCmp?exCmp.zh:'',
        exPy:exCmp?(exCmp.py||''):'',
        exVi:exCmp?(exCmp.vi||''):''
      });
      if(exCmp&&exCmp.zh){
        hnDialog.push({section:`Từ ghép chữ ${ch}`,speaker:ch,name:`#${e.code||i+1} ${ch}`,zh:exCmp.zh,py:exCmp.py||'',vi:exCmp.vi||''});
      }
      const partsTxt=(Array.isArray(e.parts)&&e.parts.length)?e.parts.map(p=>`${p.ch||''}${p.code?' (#'+p.code+')':''}`).join(' + '):'';
      hnGrammar[`hn_${i+1}`]={
        han:ch,py:e.py||'',
        title:`#${e.code||i+1} ${ch}${e.trad&&e.trad!==ch?' ('+e.trad+')':''} · ${e.py||''}${e.hv?' ['+e.hv+']':''}`,
        struct:partsTxt||`Nghĩa gốc: ${e.meaning||''}`,
        explain:e.mnemonic||`Chữ "${ch}" (${e.hsk||'Tập '+ref.book}) nghĩa là "${e.meaning||''}".`,
        examples:cmp.slice(0,4).map(c=>({zh:c.zh,py:c.py||'',vi:`${c.hv?'['+c.hv+'] ':''}${c.vi||''}`})),
        note:e.hsk?`Cấp độ: ${e.hsk} · Hack não ${e.book||'Tập 1'}`:''
      };
      if(e.mnemonic)hnNotes.push(`#${e.code||i+1} ${ch} (${e.py||''}): ${e.mnemonic}`);
    });
    const wordDetails={};
    l.wordIds=registerLessonWords(hnWords,wordDetails);
    l.wordDetails=wordDetails;
    l.dialog=hnDialog;
    l.sentences=hnDialog.map(d=>({zh:d.zh,py:d.py||'',vi:d.vi||''}));
    l.dialogQuestions=[];
    l.grammarPoints=hnGrammar;
    l.grammarQuiz=[];
    l.orderBank=[];
    l.chars=chList.map(ch=>({id:'c_'+ch.charCodeAt(0),ch,py:(entries[ch]&&entries[ch].py)||'',vi:(entries[ch]&&entries[ch].meaning)||'',rad:'',strokes:0}));
    l.optionalExtensions={hackNaoIds:chList,mindMapRootChars:[]};
    l.sourceRef={fileName:`Hack não 3000 chữ Hán tập ${ref.book||1}.pdf`,fileHash:'',pageRange:(full&&full.pages)||'—'};
    l.goals=['Học chữ Hán qua câu chuyện & bộ phận cấu tạo','Mở rộng từ ghép Hán-Việt theo bộ Hack não 3000'];
    l.supplementalContent=hnNotes.join('\n');
    if(full&&full.title)l.titleVi=full.title;
    l.status='published';
    l.downloaded=true;
    l.updatedAt=Date.now();
    return l;
  }
  const wordDetails=getPackManifestForVol(ref.packKey)?.keepWordDetails?{}:null;
  const wordIds=registerLessonWords(full?.words,wordDetails);
  const dlg=(full&&Array.isArray(full.dialog))?full.dialog:[];
  const chars=(full&&Array.isArray(full.chars))?full.chars.map(ch=>({id:'c_'+ch.charCodeAt(0),ch,py:'',vi:'',rad:'',strokes:0})):[];
  l.wordIds=wordIds;
  if(wordDetails)l.wordDetails=wordDetails;
  l.dialog=dlg;
  if(ref.system==='hsk30'&&ref.num==='mock'){
    l.sentences=[];
  }else{
    l.sentences=dlg.map(d=>({zh:d.zh,py:d.py||'',vi:d.vi||''}));
  }
  l.dialogQuestions=(full&&Array.isArray(full.dialogQuestions))?full.dialogQuestions:(l.dialogQuestions||[]);
  l.grammarPoints=(full&&full.grammar)?full.grammar:{};
  l.grammarQuiz=(full&&Array.isArray(full.grammarQuiz))?full.grammarQuiz:(l.grammarQuiz||[]);
  l.orderBank=(full&&Array.isArray(full.orderBank))?full.orderBank:(l.orderBank||[]);
  if(full&&full.workbook)l.workbook=Object.assign({},l.workbook||{},full.workbook);
  if(full&&Array.isArray(full.notes))l.notes=full.notes.slice();
  l.chars=chars;
  if(full&&full.titleZh)l.titleZh=full.titleZh;
  if(full&&full.titlePy)l.py=full.titlePy;
  if(full&&full.titleVi)l.titleVi=full.titleVi;
  l.status='published';
  l.downloaded=true;
  if(ref.system==='hsk30'){
    l.sourceRef={fileName:ref.num==='mock'?`SBT HSK${ref.lvl} - Tiếng Việt (3.0).pdf`:`HSK${ref.lvl} - Tiếng Việt (3.0).pdf`,fileHash:'',pageRange:(full&&full.pages)||'—'};
    if(full&&Array.isArray(full.goals)&&full.goals.length){
      l.goals=full.goals.slice();
    }else{
      l.goals=[`Giáo trình NEW HSK ${ref.lvl} (3.0) · Giọng đọc tích hợp`,'Đã tải từ vựng, bài khóa, ngữ pháp, bài tập & SBT'];
    }
    const suppParts=[];
    if(full&&full.rhyme&&full.rhyme.zh){
      suppParts.push(`Bài vè luyện âm (${full.rhyme.audio||'audio'}):\n${full.rhyme.zh}${full.rhyme.py?'\n'+full.rhyme.py:''}${full.rhyme.vi?'\n'+full.rhyme.vi:''}`);
    }
    if(full&&Array.isArray(full.notes)&&full.notes.length){
      suppParts.push(full.notes.join('\n'));
    }
    if(suppParts.length)l.supplementalContent=suppParts.join('\n\n');
    if(full&&full.rhyme)l.rhyme=full.rhyme;
  }else{
    l.sourceRef={fileName:`GT Hán Ngữ ${ref.vol}.pdf`,fileHash:'',pageRange:(full&&full.pages)||'—'};
    l.goals=[`Giọng đọc tiếng Trung chuẩn theo từng câu & từ vựng`,'Đã tải từ vựng, bài khóa, ngữ pháp & tập viết'];
    if(full&&Array.isArray(full.notes)&&full.notes.length)l.supplementalContent=full.notes.join('\n');
    const extMap=getExtMapForVol(ref.vol);
    const ext=extMap&&(extMap[ref.num]||extMap[String(ref.num)]);
    if(ext&&(!l.optionalExtensions||(!(l.optionalExtensions.hackNaoIds||[]).length&&!(l.optionalExtensions.mindMapRootChars||[]).length))){
      l.optionalExtensions=ext;
    }
  }
  l.updatedAt=Date.now();
  return l;
}
async function downloadLessonById(lessonId){
  const l=LESSONS.find(x=>x.id===lessonId);
  const ref=parseLessonPackRef(lessonId);
  if(!l||!ref||!hasPackForLesson(lessonId)){
    toast('Bài học này chưa có dữ liệu để tải');
    return false;
  }
  if(isLessonContentLoaded(l))return true;
  let volData=null;
  try{
    volData=await loadVolumePack(ref.packKey);
  }catch(err){
    console.error('Load pack error:',err);
    toast('Không thể tải dữ liệu bài học. Hãy kiểm tra thư mục data/.');
    return false;
  }
  const chapSrc=((ref.system==='mindmap'||ref.system==='hacknao')&&volData&&volData.chapters)?volData.chapters:volData;
  const full=chapSrc&&(chapSrc[ref.dataKey]||chapSrc[ref.num]||chapSrc[String(ref.num)]);
  if(!full){
    toast('Không thể tải dữ liệu bài học. Hãy kiểm tra thư mục data/.');
    return false;
  }
  populateLessonFromPackData(l,full,ref,null,volData);
  if(!Array.isArray(store.downloadedLessonIds))store.downloadedLessonIds=[];
  if(!store.downloadedLessonIds.includes(lessonId))store.downloadedLessonIds.push(lessonId);
  saveStore(store);
  await HanyuIDB.put('lessons',l);
  const c=COURSES.find(x=>x.id===l.courseId);
  if(c)await HanyuIDB.put('courses',c);
  if(store.activeLessonId===lessonId)applyActiveLesson();
  if(typeof refreshDashboards==='function')refreshDashboards();
  renderRoadmap();
  renderLibrary();
  if(curView==='learn'&&typeof renderLearnRoadmap==='function')renderLearnRoadmap();
  if(curView==='course-detail')renderCourseDetail();
  if(curView==='lesson')renderLessonDetail();
  if(curView==='textbook-reader')renderTextbookReader();
  toast(`Đã tải xong ${l.code}: ${l.titleVi||l.titleZh}`);
  return true;
}

function buildStandardCatalogSeed(){
  const now=SEED_TS;
  const courses=[],lessons=[];
  const hnMeta={
    1:{lvl:'Sơ cấp',range:'15 bài',desc:'Giáo trình Hán ngữ Quyển 1 (15 bài). Đã nạp sẵn Bài 1–2; các bài khác bấm Tải khi cần học.'},
    2:{lvl:'Sơ cấp',range:'Bài 16–30',desc:'Giáo trình Hán ngữ Quyển 2 (Bài 16–30). Có sẵn gói tải đủ 15 bài trong app.'},
    3:{lvl:'Sơ trung cấp',range:'10 bài',desc:'Giáo trình Hán ngữ Quyển 3 (10 bài). Đã nạp sẵn danh mục 10 bài từ sách gốc.'},
    4:{lvl:'Trung cấp',range:'Bài 11–20',desc:'Giáo trình Hán ngữ Quyển 4 (Bài 11–20). Đã nạp sẵn danh mục 10 bài từ sách gốc.'},
    5:{lvl:'Trung cao cấp',range:'13 bài',desc:'Giáo trình Hán ngữ Quyển 5 (13 bài). Đã nạp sẵn danh mục 13 bài từ sách gốc.'},
    6:{lvl:'Cao cấp',range:'Bài 14–26',desc:'Giáo trình Hán ngữ Quyển 6 (Bài 14–26). Đã nạp sẵn danh mục 13 bài từ sách gốc.'}
  };
  const hnFullByVol={
    1:(typeof HN1_FULL_DATA!=='undefined'?HN1_FULL_DATA:null),
    2:(typeof HN2_FULL_DATA!=='undefined'?HN2_FULL_DATA:null),
    3:(typeof HN3_FULL_DATA!=='undefined'?HN3_FULL_DATA:null),
    4:(typeof HN4_FULL_DATA!=='undefined'?HN4_FULL_DATA:null),
    5:(typeof HN5_FULL_DATA!=='undefined'?HN5_FULL_DATA:null),
    6:(typeof HN6_FULL_DATA!=='undefined'?HN6_FULL_DATA:null)
  };
  const preloadedSet=new Set([
    ...((typeof DEFAULT_PRELOADED_LESSON_IDS!=='undefined'&&Array.isArray(DEFAULT_PRELOADED_LESSON_IDS))?DEFAULT_PRELOADED_LESSON_IDS:['lesson_hn1_b1','lesson_hn1_b2']),
    ...((typeof store!=='undefined'&&store&&Array.isArray(store.downloadedLessonIds))?store.downloadedLessonIds:[])
  ]);
  [1,2,3,4,5,6].forEach(num=>{
    const cId=`course_hn_${num}`,order=[],list=HN_CATALOG_TITLES[num]||[];
    const starterVol=(typeof HN_STARTER_DATA!=='undefined'&&HN_STARTER_DATA[num])?HN_STARTER_DATA[num]:null;
    const packVol=_loadedVolumePacks[num]||hnFullByVol[num]||null;
    const volExt=getExtMapForVol(num);
    const packMeta=getPackManifestForVol(num);
    let loadedCnt=0;
    list.forEach(([b,zhTitle,pyTitle,viTitle])=>{
      const lId=`lesson_hn${num}_b${b}`;
      order.push(lId);
      const mp3=`Quyển ${num} Bài ${b}.mp3`;
      const shouldPreload=preloadedSet.has(lId)||!packMeta;
      const full=shouldPreload?((starterVol&&(starterVol[b]||starterVol[String(b)]))||(packVol&&(packVol[b]||packVol[String(b)]))||null):null;
      if(full)loadedCnt++;
      const wordDetails=full&&packMeta?.keepWordDetails?{}:null;
      const wordIds=registerLessonWords(full?.words,wordDetails);
      const chars=(full&&full.chars)?full.chars.map(ch=>({id:'c_'+ch.charCodeAt(0),ch,py:'',vi:'',rad:'',strokes:0})):[];
      const dlg=(full&&full.dialog)?full.dialog:[];
      const hasPack=hasPackForLesson(lId);
      lessons.push({
        id:lId,courseId:cId,code:`Bài ${b}`,titleVi:viTitle,titleZh:zhTitle,py:pyTitle,
        goals:[`Giọng đọc tiếng Trung chuẩn trong app`,full?'Đã tải từ vựng, bài khóa, ngữ pháp & tập viết':(hasPack?'Bấm “Tải bài” để tải từ vựng, bài khóa, ngữ pháp & tập viết':'Nhập thêm từ vựng/bài khóa từ PDF GT Hán Ngữ '+num)],
        status:full?'published':'draft',
        downloaded:Boolean(full),
        sourceRef:{fileName:`GT Hán Ngữ ${num}.pdf`,fileHash:'',pageRange:full?full.pages:'—'},
        audioTracks:[makeAudioTrack(mp3,'dialog',`Audio bài khóa (${mp3})`)],
        workbook:(full&&full.workbook)||null,optionalExtensions:(volExt&&(volExt[b]||volExt[String(b)]))||( {hackNaoIds:[],mindMapRootChars:[]} ),
        originalContent:'',supplementalContent:(full&&Array.isArray(full.notes))?full.notes.join('\n'):'',
        wordIds,
        ...(wordDetails&&{wordDetails}),
        sentences:dlg.map(d=>({zh:d.zh,py:d.py,vi:d.vi})),
        dialog:dlg,
        dialogQuestions:(full&&full.dialogQuestions)||[],
        grammarPoints:(full&&full.grammar)?full.grammar:{},
        grammarQuiz:(full&&full.grammarQuiz)||[],orderBank:(full&&full.orderBank)||[],chars,updatedAt:now
      });
    });
    const desc=packMeta
      ?`Giáo trình Hán ngữ Quyển ${num} (${hnMeta[num].range}). Có sẵn gói tải đủ ${list.length} bài trong app (chỉ tải sẵn khi cần để giảm nhẹ bộ nhớ).`
      :((loadedCnt>0&&loadedCnt===list.length)
        ?`Giáo trình Hán ngữ Quyển ${num} (${hnMeta[num].range}). Đã nạp đầy đủ nội dung chi tiết cả ${list.length} bài (Từ mới, Bài khóa, Ngữ pháp, Chữ Hán).`
        :(loadedCnt>0
          ?`Giáo trình Hán ngữ Quyển ${num} (${hnMeta[num].range}). Đã nạp nội dung chi tiết ${loadedCnt}/${list.length} bài.`
          :hnMeta[num].desc));
    courses.push({
      id:cId,title:`Giáo trình Hán ngữ ${num}`,group:'hanngu',systemTrack:'hanngu',
      versionLabel:`Quyển ${num} (${order.length} bài)`,
      source:`GT Hán Ngữ ${num}.pdf`,level:hnMeta[num].lvl,desc,
      status:'published',lessonOrder:order,createdAt:now,updatedAt:now
    });
  });

  // Nhóm C: NEW HSK 3.0 Cấp 1–3
  const hskDefs=[
    {lvl:1,cnt:15,title:'NEW HSK 3.0 · Cấp 1',ver:'HSK 3.0 · 15 bài + Đề thi thử & SBT 1',src:'HSK1 - Tiếng Việt (3.0).pdf + SBT HSK1',hasSbt:true},
    {lvl:2,cnt:15,title:'NEW HSK 3.0 · Cấp 2',ver:'HSK 3.0 · 15 bài + Đề thi thử & SBT 2',src:'HSK2 - Tiếng Việt (3.0).pdf + SBT HSK2',hasSbt:true},
    {lvl:3,cnt:18,title:'NEW HSK 3.0 · Cấp 3',ver:'HSK 3.0 · 18 bài chuẩn',src:'HSK3 - Tiếng Việt (3.0).pdf',hasSbt:false}
  ];
  hskDefs.forEach(h=>{
    const cId=`course_hsk30_lv${h.lvl}`,order=[];
    const mainMap=HSK_AUDIO_MANIFEST[`hsk${h.lvl}`]||{};
    const sbtMap=h.hasSbt?(HSK_AUDIO_MANIFEST[`sbt${h.lvl}`]||{}):{};
    const packKey=`hsk30_${h.lvl}`;
    const packMeta=getPackManifestForVol(packKey);
    const starterLv=(typeof HSK30_STARTER_DATA!=='undefined'&&(HSK30_STARTER_DATA[h.lvl]||HSK30_STARTER_DATA[String(h.lvl)]))||null;
    const packLv=_loadedVolumePacks[packKey]||readGlobalPackVar(`HSK30_${h.lvl}_FULL_DATA`)||null;
    const catList=(typeof HSK30_CATALOG_TITLES!=='undefined'&&(HSK30_CATALOG_TITLES[h.lvl]||HSK30_CATALOG_TITLES[String(h.lvl)]))||[];
    for(let b=1;b<=h.cnt;b++){
      const lId=`lesson_hsk30_${h.lvl}_b${b}`;
      const pad=String(b).padStart(2,'0');
      order.push(lId);
      const tracks=[];
      if(b===1&&Array.isArray(mainMap['0'])){
        mainMap['0'].forEach(fn=>tracks.push(makeAudioTrack(`hsk${h.lvl}/${fn}`,'intro',`Giới thiệu HSK ${h.lvl} (${fn})`)));
      }
      const mainFiles=mainMap[String(b)]||[`${pad}-1.mp3`,`${pad}-2.mp3`];
      mainFiles.forEach((fn,idx)=>tracks.push(makeAudioTrack(`hsk${h.lvl}/${fn}`,idx===0?'dialog':'lesson',`Giáo trình · Phần ${idx+1} (${fn})`)));
      const sbtFiles=sbtMap[String(b)]||[];
      sbtFiles.forEach(fn=>{
        const lbl=fn.includes('语音')?'SBT Ngữ âm':fn.includes('听读')?'SBT Nghe đọc':fn.includes('模拟')?'SBT Thi thử':'SBT Nghe';
        tracks.push(makeAudioTrack(`sbt${h.lvl}/${fn}`,'workbook',`${lbl} (${fn})`));
      });
      const catRow=catList.find(x=>Number(x[0])===b);
      const titleZh=catRow?(catRow[1]||''):'';
      const py=catRow?(catRow[2]||''):'';
      const titleVi=catRow?(catRow[3]||`HSK ${h.lvl} (3.0) · Bài ${b}`):`HSK ${h.lvl} (3.0) · Bài ${b}`;
      const hasPack=hasPackForLesson(lId);
      const shouldPreload=preloadedSet.has(lId)||!packMeta;
      const full=shouldPreload?((starterLv&&(starterLv[b]||starterLv[String(b)]))||(packLv&&(packLv[b]||packLv[String(b)]))||null):null;
      const lObj={
        id:lId,courseId:cId,code:`Bài ${b}`,titleVi,titleZh,py,
        goals:[`Giọng đọc tích hợp (${h.hasSbt?'kèm SBT & Đáp án':'Giáo trình HSK '+h.lvl})`,hasPack?'Bấm “Tải bài” để tải từ vựng, bài khóa, ngữ pháp, bài tập & đáp án SBT':(h.hasSbt?`Kèm SBT HSK ${h.lvl} & Đáp án`:'Nhập nội dung chi tiết từ PDF HSK 3.0')],
        status:'draft',
        downloaded:false,
        sourceRef:{fileName:`HSK${h.lvl} - Tiếng Việt (3.0).pdf`,fileHash:'',pageRange:'—'},
        audioTracks:tracks,
        workbook:h.hasSbt?{exercisesNote:`Tham chiếu SBT HSK${h.lvl} - Tiếng Việt (3.0).pdf (Bài ${b})`,answerKeyNote:`Tham chiếu Đáp án SBT HSK ${h.lvl}.pdf`,transcriptNote:h.lvl===2?'Tham chiếu Lời thoại phần nghe SBT HSK2.pdf':''}:null,
        optionalExtensions:{hackNaoIds:[],mindMapRootChars:[]},
        originalContent:'',supplementalContent:'',wordIds:[],sentences:[],dialog:[],dialogQuestions:[],grammarPoints:{},grammarQuiz:[],orderBank:[],chars:[],updatedAt:now
      };
      if(full){
        populateLessonFromPackData(lObj,full,{system:'hsk30',packKey,lvl:h.lvl,num:b,dataKey:String(b)});
        lObj.updatedAt=now;
      }
      lessons.push(lObj);
    }
    if(h.hasSbt&&Array.isArray(sbtMap['mock'])&&sbtMap['mock'].length){
      const mockId=`lesson_hsk30_${h.lvl}_mock`;
      order.push(mockId);
      const mockTracks=sbtMap['mock'].map(fn=>makeAudioTrack(`sbt${h.lvl}/${fn}`,'workbook',`Đề thi thử HSK ${h.lvl} (${fn})`));
      const hasMockPack=hasPackForLesson(mockId);
      const mockFull=(preloadedSet.has(mockId)||!packMeta)?((starterLv&&starterLv.mock)||(packLv&&packLv.mock)||null):null;
      const mockObj={
        id:mockId,courseId:cId,code:'Thi thử',titleVi:`Đề thi thử HSK ${h.lvl} (SBT ${h.lvl})`,titleZh:'模拟测试',py:'Mónǐ cèshì',
        goals:[`Đề thi thử HSK ${h.lvl} · Giọng đọc tích hợp`,hasMockPack?'Bấm “Tải bài” để tải Đề thi thử Đọc hiểu & Đáp án 40 câu':`Đáp án SBT HSK ${h.lvl}.pdf`],
        status:'draft',
        downloaded:false,
        sourceRef:{fileName:`SBT HSK${h.lvl} - Tiếng Việt (3.0).pdf`,fileHash:'',pageRange:'Cuối sách'},
        audioTracks:mockTracks,
        workbook:{exercisesNote:`Đề thi thử trong SBT HSK${h.lvl} - Tiếng Việt (3.0).pdf`,answerKeyNote:`Đáp án SBT HSK ${h.lvl}.pdf`,transcriptNote:h.lvl===2?'Lời thoại phần nghe SBT HSK2.pdf':''},
        optionalExtensions:{hackNaoIds:[],mindMapRootChars:[]},
        originalContent:'',supplementalContent:'',wordIds:[],sentences:[],dialog:[],dialogQuestions:[],grammarPoints:{},grammarQuiz:[],orderBank:[],chars:[],updatedAt:now
      };
      if(mockFull){
        populateLessonFromPackData(mockObj,mockFull,{system:'hsk30',packKey,lvl:h.lvl,num:'mock',dataKey:'mock'});
        mockObj.updatedAt=now;
      }
      lessons.push(mockObj);
    }
    const packLessons=packMeta&&Array.isArray(packMeta.lessons)?packMeta.lessons:[];
    const packRegularCnt=packLessons.filter(x=>x!=='mock').length;
    const hasStarterData=Boolean(starterLv&&Object.keys(starterLv).length);
    const sbtDesc=h.lvl===2?' + Đề thi thử + SBT, Đáp án & Lời thoại nghe':(h.hasSbt?' + Đề thi thử + SBT & Đáp án':'');
    const courseDesc=packMeta
      ?(hasStarterData
        ?`Hệ thống NEW HSK 3.0 Cấp ${h.lvl} độc lập (${h.cnt} bài${sbtDesc}). Đã nạp sẵn Bài 1–2; các bài khác bấm Tải khi cần học để giữ ứng dụng gọn nhẹ.`
        :(packRegularCnt>=h.cnt
          ?`Hệ thống NEW HSK 3.0 Cấp ${h.lvl} độc lập (${h.cnt} bài${sbtDesc}). Có sẵn gói tải đầy đủ trong app; bấm Tải ở từng bài khi cần học.`
          :`Hệ thống NEW HSK 3.0 Cấp ${h.lvl} độc lập (${h.cnt} bài${sbtDesc}). Đã có gói tải ${packRegularCnt}/${h.cnt} bài (Bài 1–${packRegularCnt}); bấm Tải ở từng bài khi cần học.`))
      :`Hệ thống NEW HSK 3.0 Cấp ${h.lvl} độc lập · Giọng đọc tiếng Trung tích hợp.`;
    courses.push({
      id:cId,title:h.title,group:'hsk',systemTrack:'hsk30',versionLabel:h.ver,source:h.src,level:`HSK ${h.lvl} (3.0)`,
      desc:courseDesc,
      status:'published',lessonOrder:order,createdAt:now,updatedAt:now
    });
  });
  [4,5,6].forEach(lvl=>{
    const cId=`course_hsk30_lv${lvl}`,order=[];
    for(let b=1;b<=15;b++){
      const lId=`lesson_hsk30_${lvl}_b${b}`;
      order.push(lId);
      lessons.push({
        id:lId,courseId:cId,code:`Bài ${b}`,titleVi:`HSK ${lvl} (3.0) · Bài ${b}`,titleZh:'',py:'',
        goals:[`Chờ nạp nội dung & audio chuẩn HSK ${lvl} (3.0)`],
        status:'draft',
        sourceRef:{fileName:`HSK${lvl} - Tiếng Việt (3.0).pdf`,fileHash:'',pageRange:'—'},
        audioTracks:[],workbook:null,optionalExtensions:{hackNaoIds:[],mindMapRootChars:[]},
        originalContent:'',supplementalContent:'',wordIds:[],sentences:[],dialog:[],dialogQuestions:[],grammarPoints:{},grammarQuiz:[],orderBank:[],chars:[],updatedAt:now
      });
    }
    courses.push({
      id:cId,title:`NEW HSK 3.0 · Cấp ${lvl}`,group:'hsk',systemTrack:'hsk30',
      versionLabel:`HSK 3.0 · 15 bài (Chờ nạp PDF)`,
      source:`HSK${lvl} - Tiếng Việt (3.0).pdf`,level:`HSK ${lvl} (3.0)`,
      desc:`Khung hệ thống NEW HSK 3.0 Cấp ${lvl} độc lập (${order.length} bài). Độc lập tiến độ với Giáo trình Hán ngữ.`,
      status:'published',lessonOrder:order,createdAt:now,updatedAt:now
    });
  });

  // Nhóm B: Khẩu ngữ bổ trợ (độc lập)
  courses.push({
    id:'course_kouyu_1_5',title:'Khẩu ngữ bổ trợ (1m–5m)',group:'kouyu',systemTrack:'kouyu',
    versionLabel:'HanYu KouYu SuCheng Tập 1–5',source:'HanYu KouYu SuCheng 1m–5m.pdf',level:'Bổ trợ giao tiếp',
    desc:'Tài liệu luyện khẩu ngữ tốc thành độc lập (không gộp vào lộ trình Hán ngữ chính).',
    status:'published',lessonOrder:[],createdAt:now,updatedAt:now
  });

  // Nhóm D: Bổ trợ Chữ Hán (Hack não 3000 & Sơ đồ tư duy 3300 — độc lập)
  const hn1Pack=getPackManifestForVol('hacknao_1');
  const hn1Chapters=[
    {n:1,title:'Tập 1 · Phần 1: 100 chữ cơ bản (一 – 印)',pages:'2–26',zh:'第一册 · 1–100字',py:'96 chữ cơ bản đầu tiên (Tập 1)',cnt:96},
    {n:2,title:'Tập 1 · Phần 2: Chữ 101–192 (什 – 馆)',pages:'27–51',zh:'第一册 · 101–192字',py:'92 chữ ghép bộ thủ đầu tiên (Tập 1)',cnt:92},
    {n:3,title:'Tập 1 · Phần 3: Chữ 193–300 (棺 – 娘)',pages:'52–80',zh:'第一册 · 193–300字',py:'108 chữ ghép bộ thủ (Tập 1)',cnt:108},
    {n:4,title:'Tập 1 · Phần 4: Chữ 301–400 (狼 – 寄)',pages:'80–105',zh:'第一册 · 301–400字',py:'99 chữ ghép bộ thủ (Tập 1)',cnt:99},
    {n:5,title:'Tập 1 · Phần 5: Chữ 401–500 (骑 – 肥)',pages:'106–131',zh:'第一册 · 401–500字',py:'96 chữ ghép bộ thủ (thiếu trang in 121: 476–479)',cnt:96},
    {n:6,title:'Tập 1 · Phần 6: Chữ 501–600 (芭 – 掠)',pages:'132–158',zh:'第一册 · 501–600字',py:'100 chữ ghép bộ thủ (Tập 1)',cnt:100},
    {n:7,title:'Tập 1 · Phần 7: Chữ 601–700 (就 – 规)',pages:'159–185',zh:'第一册 · 601–700字',py:'99 chữ ghép bộ thủ (Tập 1)',cnt:99},
    {n:8,title:'Tập 1 · Phần 8: Chữ 701–800 (窥 – 辞)',pages:'186–212',zh:'第一册 · 701–800字',py:'100 chữ ghép bộ thủ (Tập 1)',cnt:100},
    {n:9,title:'Tập 1 · Phần 9: Chữ 801–900 (敌 – 熏)',pages:'213–240',zh:'第一册 · 801–900字',py:'99 chữ ghép bộ thủ (Tập 1)',cnt:99},
    {n:10,title:'Tập 1 · Phần 10: Chữ 901–1000 (墨 – 毒)',pages:'241–275',zh:'第一册 · 901–1000字',py:'100 chữ ghép bộ thủ (Tập 1)',cnt:100}
  ];
  const hnOrder=[];
  hn1Chapters.forEach(hc=>{
    const cLid=`lesson_hacknao_t1_c${hc.n}`;
    hnOrder.push(cLid);
    const hasHnPack=Boolean(hn1Pack&&Array.isArray(hn1Pack.lessons)&&hn1Pack.lessons.includes(hc.n));
    lessons.push({
      id:cLid,courseId:'course_hacknao_3000',code:`T1·P${hc.n}`,titleVi:hc.title,titleZh:hc.zh,py:hc.py,
      goals:[
        'Học qua Câu chuyện chữ Hán & Chữ Hán giống nhau',
        hasHnPack?`Bấm “Tải bài” để tải ${hc.cnt} chữ Hán + câu chuyện & từ ghép Hán-Việt`:'Chờ trích xuất các phần tiếp theo từ Hack não 3000 chữ Hán'
      ],
      status:'draft',
      downloaded:false,
      sourceRef:{fileName:'Hack não 3000 chữ Hán tập 1.pdf',fileHash:'',pageRange:hc.pages},
      audioTracks:[],workbook:null,optionalExtensions:{hackNaoIds:[],mindMapRootChars:[]},
      originalContent:'Hack não 3000 chữ Hán — Tập 1 (Tiếng Trung 21 Ngày).',
      supplementalContent:'',
      wordIds:[],sentences:[],dialog:[],dialogQuestions:[],grammarPoints:{},grammarQuiz:[],orderBank:[],chars:[],updatedAt:now
    });
  });
  const hn2Pack=getPackManifestForVol('hacknao_2');
  const hn2Chapters=[
    {n:1,title:'Tập 2 · Phần 1: Chữ 1001–1100 (各 – 孙)',pages:'1–26',zh:'第二册 · 1001–1100字',py:'100 chữ ghép bộ thủ (Tập 2)',cnt:100},
    {n:2,title:'Tập 2 · Phần 2: Chữ 1101–1200 (逊 – 晕)',pages:'27–50',zh:'第二册 · 1101–1200字',py:'100 chữ ghép bộ thủ (Tập 2)',cnt:100},
    {n:3,title:'Tập 2 · Phần 3: Chữ 1201–1300 (阵 – 御)',pages:'51–75',zh:'第二册 · 1201–1300字',py:'100 chữ ghép bộ thủ (Tập 2)',cnt:100},
    {n:4,title:'Tập 2 · Phần 4: Chữ 1301–1400 (此 – 亭)',pages:'76–100',zh:'第二册 · 1301–1400字',py:'100 chữ ghép bộ thủ (Tập 2)',cnt:100},
    {n:5,title:'Tập 2 · Phần 5: Chữ 1401–1500 (停 – 暄)',pages:'101–125',zh:'第二册 · 1401–1500字',py:'100 chữ ghép bộ thủ (Tập 2)',cnt:100},
    {n:6,title:'Tập 2 · Phần 6: Chữ 1501–1600 (喧 – 疚)',pages:'126–150',zh:'第二册 · 1501–1600字',py:'100 chữ ghép bộ thủ (Tập 2)',cnt:100},
    {n:7,title:'Tập 2 · Phần 7: Chữ 1601–1700 (欠 – 炭)',pages:'151–176',zh:'第二册 · 1601–1700字',py:'100 chữ ghép bộ thủ (Tập 2)',cnt:100},
    {n:8,title:'Tập 2 · Phần 8: Chữ 1701–1800 (碳 – 橘)',pages:'177–201',zh:'第二册 · 1701–1800字',py:'100 chữ ghép bộ thủ (Tập 2)',cnt:100},
    {n:9,title:'Tập 2 · Phần 9: Chữ 1801–1900 (隶 – 宫)',pages:'202–227',zh:'第二册 · 1801–1900字',py:'100 chữ ghép bộ thủ (Tập 2)',cnt:100},
    {n:10,title:'Tập 2 · Phần 10: Chữ 1901–2002 (营 – 捂)',pages:'228–252',zh:'第二册 · 1901–2002字',py:'102 chữ ghép bộ thủ (Tập 2)',cnt:102}
  ];
  hn2Chapters.forEach(hc=>{
    const cLid=`lesson_hacknao_t2_c${hc.n}`;
    hnOrder.push(cLid);
    const hasHnPack=Boolean(hn2Pack&&Array.isArray(hn2Pack.lessons)&&hn2Pack.lessons.includes(hc.n));
    lessons.push({
      id:cLid,courseId:'course_hacknao_3000',code:`T2·P${hc.n}`,titleVi:hc.title,titleZh:hc.zh,py:hc.py,
      goals:[
        'Học qua Câu chuyện chữ Hán & Chữ Hán giống nhau',
        hasHnPack?`Bấm “Tải bài” để tải ${hc.cnt} chữ Hán + câu chuyện & từ ghép Hán-Việt`:'Chờ trích xuất các phần tiếp theo từ Hack não 3000 chữ Hán'
      ],
      status:'draft',
      downloaded:false,
      sourceRef:{fileName:'Hack não 3000 chữ hán tập 2.pdf',fileHash:'',pageRange:hc.pages},
      audioTracks:[],workbook:null,optionalExtensions:{hackNaoIds:[],mindMapRootChars:[]},
      originalContent:'Hack não 3000 chữ Hán — Tập 2 (Tiếng Trung 21 Ngày).',
      supplementalContent:'',
      wordIds:[],sentences:[],dialog:[],dialogQuestions:[],grammarPoints:{},grammarQuiz:[],orderBank:[],chars:[],updatedAt:now
    });
  });
  const hnBooks=[
    {id:'lesson_hacknao_t3',code:'Tập 3',titleVi:'Hack não 3000 chữ Hán · Tập 3 (Chữ 2003–3123)',titleZh:'汉字记忆 · 第三册',py:'Chữ 2003–3123 + Bảng tra Bộ thủ',file:'Hack_nao_3000_chu_Han_tap_3_nen.pdf',pages:'339 trang',note:'Chữ 2003–3123 hoàn thiện bộ 3000 chữ Hán thông dụng cùng bảng tra bộ thủ & Pinyin/Hán-Việt.'}
  ];
  hnBooks.forEach(hb=>{
    hnOrder.push(hb.id);
    lessons.push({
      id:hb.id,courseId:'course_hacknao_3000',code:hb.code,titleVi:hb.titleVi,titleZh:hb.titleZh,py:hb.py,
      goals:['Học qua Câu chuyện chữ Hán & Chữ Hán giống nhau','Tra cứu nhanh khi gặp chữ khó trong bài học chính (không ép SRS)'],
      status:'published',
      sourceRef:{fileName:hb.file,fileHash:'',pageRange:hb.pages},
      audioTracks:[],workbook:null,optionalExtensions:{hackNaoIds:[hb.py],mindMapRootChars:[]},
      originalContent:hb.note,supplementalContent:'Chờ nạp chi tiết sau khi hoàn thành Tập 2.',
      wordIds:[],sentences:[],dialog:[],dialogQuestions:[],grammarPoints:{},grammarQuiz:[],orderBank:[],chars:[],updatedAt:now
    });
  });
  courses.push({
    id:'course_hacknao_3000',title:'Hack não 3000 chữ Hán (Tập 1–3)',group:'hanzi',systemTrack:'hanzi',
    versionLabel:'Đủ Tập 1–2 (1.991 chữ) + Tập 3',source:'Hack não 3000 chữ Hán Tập 1, 2, 3 (.pdf)',level:'Bổ trợ chữ Hán',
    desc:'Bộ sách ghi nhớ chữ Hán qua Câu chuyện & Chữ giống nhau (Tiếng Trung 21 Ngày). Đã có gói tải đầy đủ Tập 1–2 (1.991 chữ Hán từ mã 1–2002); Tập 3 nạp tiếp theo đợt.',
    status:'published',lessonOrder:hnOrder,createdAt:now,updatedAt:now
  });

  const mmPack=getPackManifestForVol('mindmap_3300');
  const mmChapters=[
    {n:1,title:'Chương 1 · Chữ gốc 1–25 (你 – 越)',pages:'5–29',zh:'第一部分 · 1–25字',py:'25 chữ gốc đầu tiên (Hán ngữ 1)'},
    {n:2,title:'Chương 2 · Chữ gốc 26–50 (中 – 有)',pages:'30–54',zh:'第二部分 · 26–50字',py:'25 chữ gốc tiếp theo (Hán ngữ 1)'},
    {n:3,title:'Chương 3 · Chữ gốc 51–75 (做 – 帮)',pages:'55–79',zh:'第三部分 · 51–75字',py:'25 chữ gốc Đợt 2 (Hán ngữ 1)'},
    {n:4,title:'Chương 4 · Chữ gốc 76–99 (等 – 流)',pages:'80–104',zh:'第四部分 · 76–99字',py:'24 chữ gốc Đợt 2 (Hán ngữ 1)'},
    {n:5,title:'Chương 5 · Chữ gốc 100–124',pages:'105–129',zh:'第五部分 · 100–124字',py:'Chờ nạp Đợt 3'},
    {n:6,title:'Chương 6 · Chữ gốc 125–149',pages:'130–154',zh:'第六部分 · 125–149字',py:'Chờ nạp Đợt 3'},
    {n:7,title:'Chương 7 · Chữ gốc 150–174',pages:'155–179',zh:'第七部分 · 150–174字',py:'Chờ nạp Đợt 4'},
    {n:8,title:'Chương 8 · Chữ gốc 175–199',pages:'180–204',zh:'第八部分 · 175–199字',py:'Chờ nạp Đợt 4'},
    {n:9,title:'Chương 9 · Chữ gốc 200–214',pages:'205–219',zh:'第九部分 · 200–214字',py:'Chờ nạp Đợt 4'}
  ];
  const mmOrder=[];
  mmChapters.forEach(mc=>{
    const cLid=`lesson_mindmap_3300_c${mc.n}`;
    mmOrder.push(cLid);
    const hasMmPack=Boolean(mmPack&&Array.isArray(mmPack.lessons)&&mmPack.lessons.includes(mc.n));
    const chWordCnt=(mc.n===4)?24:25;
    lessons.push({
      id:cLid,courseId:'course_mindmap_3300',code:`Phần ${mc.n}`,titleVi:mc.title,titleZh:mc.zh,py:mc.py,
      goals:[
        'Phát triển mạng lưới chữ Hán từ chữ gốc & câu chuyện liên tưởng',
        hasMmPack?`Bấm “Tải bài” để tải ${chWordCnt} chữ gốc + sơ đồ tư duy & ví dụ chi tiết`:'Chờ trích xuất Đợt 3–4 từ Sơ đồ tư duy 3300 chữ Hán'
      ],
      status:'draft',
      downloaded:false,
      sourceRef:{fileName:'Sơ đồ tư duy 3300 chữ Hán.pdf',fileHash:'',pageRange:mc.pages},
      audioTracks:[],workbook:null,optionalExtensions:{hackNaoIds:[],mindMapRootChars:[]},
      originalContent:'Sơ đồ tư duy 3300 chữ Hán (Tập 1+2) — Phạm Dương Châu & Dương Hương Giang (NXB Thanh Niên).',
      supplementalContent:'',
      wordIds:[],sentences:[],dialog:[],dialogQuestions:[],grammarPoints:{},grammarQuiz:[],orderBank:[],chars:[],updatedAt:now
    });
  });
  courses.push({
    id:'course_mindmap_3300',title:'Sơ đồ tư duy 3300 chữ Hán (1+2)',group:'hanzi',systemTrack:'hanzi',
    versionLabel:'9 phần · Đã có Phần 1–4 (99 chữ gốc)',source:'Sơ đồ tư duy 3300 chữ Hán.pdf',level:'Bổ trợ chữ Hán',
    desc:'Hệ thống phát triển từ vựng theo sơ đồ tư duy từ 214 chữ gốc. Đợt 1+2 đã có gói tải Phần 1–4 (99 chữ gốc đầu tiên + đầy đủ nhánh từ ghép); các phần còn lại nạp tiếp ở Đợt 3–4.',
    status:'published',lessonOrder:mmOrder,createdAt:now,updatedAt:now
  });

  return {courses,lessons};
}

async function seedStandardCatalog(interactive=true){
  const {courses,lessons}=buildStandardCatalogSeed();
  let addedC=0,updatedL=0;
  for(const c of courses){
    const ex=COURSES.find(x=>x.id===c.id);
    if(!ex){
      COURSES.push(c);await HanyuIDB.put('courses',c);addedC++;
    }else{
      let chg=false;
      if(!ex.desc||ex.desc!==c.desc){ex.desc=c.desc;ex.versionLabel=c.versionLabel;ex.source=c.source||ex.source;chg=true;}
      if(Array.isArray(c.lessonOrder)&&c.lessonOrder.length>(ex.lessonOrder||[]).length){ex.lessonOrder=c.lessonOrder.slice();chg=true;}
      if(chg)await HanyuIDB.put('courses',ex);
    }
  }
  // Nâng cấp khung Sơ đồ tư duy cũ (1 bài tổng -> 9 phần tải theo yêu cầu) nếu tồn tại trong IDB
  const oldMmIdx=LESSONS.findIndex(x=>x.id==='lesson_mindmap_3300_all');
  if(oldMmIdx>=0){
    LESSONS.splice(oldMmIdx,1);
    await HanyuIDB.del('lessons','lesson_mindmap_3300_all');
  }
  const hasDownloadedMm=Array.isArray(store.downloadedLessonIds)&&store.downloadedLessonIds.some(id=>/^lesson_mindmap_3300_c\d+$/.test(id));
  if(hasDownloadedMm){
    loadVolumePack('mindmap_3300').then(vd=>{if(vd&&vd.entries)mergeMindmapEntries(vd.entries);}).catch(()=>{});
  }
  const oldHnIdx=LESSONS.findIndex(x=>x.id==='lesson_hacknao_t1');
  if(oldHnIdx>=0){
    LESSONS.splice(oldHnIdx,1);
    await HanyuIDB.del('lessons','lesson_hacknao_t1');
  }
  const hasDownloadedHn1=Array.isArray(store.downloadedLessonIds)&&store.downloadedLessonIds.some(id=>/^lesson_hacknao_t1_c\d+$/.test(id));
  if(hasDownloadedHn1){
    loadVolumePack('hacknao_1').then(vd=>{if(vd&&vd.entries)mergeHackNaoEntries(vd.entries);}).catch(()=>{});
  }
  const oldHn2Idx=LESSONS.findIndex(x=>x.id==='lesson_hacknao_t2');
  if(oldHn2Idx>=0){
    LESSONS.splice(oldHn2Idx,1);
    await HanyuIDB.del('lessons','lesson_hacknao_t2');
  }
  const hasDownloadedHn2=Array.isArray(store.downloadedLessonIds)&&store.downloadedLessonIds.some(id=>/^lesson_hacknao_t2_c\d+$/.test(id));
  if(hasDownloadedHn2){
    loadVolumePack('hacknao_2').then(vd=>{if(vd&&vd.entries)mergeHackNaoEntries(vd.entries);}).catch(()=>{});
  }
  for(const l of lessons){
    const idx=LESSONS.findIndex(x=>x.id===l.id);
    if(idx<0){
      LESSONS.push(l);await HanyuIDB.put('lessons',l);updatedL++;
    }else{
      const ex=LESSONS[idx];
      if(ex.status==='draft'&&!isLessonContentLoaded(ex)){
        if(isLessonContentLoaded(l)){
          LESSONS[idx]=l;await HanyuIDB.put('lessons',l);updatedL++;
        }else{
          const isLegacySeed=!ex.updatedAt||ex.updatedAt===SEED_TS||/^HSK \d+ \(3\.0\) · Bài \d+$/.test(ex.titleVi||'')||/^Đề thi thử Nghe HSK \d+/.test(ex.titleVi||'');
          let lChg=false;
          if(Array.isArray(l.goals)&&JSON.stringify(ex.goals||[])!==JSON.stringify(l.goals)){ex.goals=l.goals.slice();lChg=true;}
          if(isLegacySeed){
            if(l.titleVi&&ex.titleVi!==l.titleVi){ex.titleVi=l.titleVi;lChg=true;}
            if(l.titleZh&&ex.titleZh!==l.titleZh){ex.titleZh=l.titleZh;lChg=true;}
            if(l.py&&ex.py!==l.py){ex.py=l.py;lChg=true;}
            if(l.sourceRef&&JSON.stringify(ex.sourceRef||{})!==JSON.stringify(l.sourceRef)){ex.sourceRef=Object.assign({},l.sourceRef);lChg=true;}
            if(l.workbook&&!ex.workbook){ex.workbook=Object.assign({},l.workbook);lChg=true;}
            if(Array.isArray(l.audioTracks)&&l.audioTracks.length&&(!Array.isArray(ex.audioTracks)||!ex.audioTracks.length)){ex.audioTracks=l.audioTracks.slice();lChg=true;}
          }
          if(lChg){await HanyuIDB.put('lessons',ex);updatedL++;}
        }
      }else if(l.optionalExtensions&&((!ex.optionalExtensions||!(ex.optionalExtensions.hackNaoIds||[]).length)&&((l.optionalExtensions.hackNaoIds||[]).length||(l.optionalExtensions.mindMapRootChars||[]).length))){
        ex.optionalExtensions=l.optionalExtensions;
        await HanyuIDB.put('lessons',ex);
        updatedL++;
      }
    }
  }
  saveStore(store);
  renderLibrary();renderRoadmap();
  if(curView==='course-detail')renderCourseDetail();
  if(curView==='lesson')applyActiveLesson();
  if(interactive)toast(`Đã đồng bộ giáo trình Hán ngữ 1–6 (${updatedL} bài cập nhật)`);
}

function buildSampleCurriculum(){
  DEFAULT_WORDS_SNAP.forEach(w=>registerVocabWord(w));
  const cId='course_sample_hn1',lId='lesson_sample_b4';
  const sampleCourse={
    id:cId,
    title:'Giáo trình mẫu: Hán ngữ (Minh họa)',
    group:'hanngu',
    versionLabel:'Bài 4 mẫu có sẵn (chưa phải toàn bộ sách)',
    source:'Dữ liệu mẫu tích hợp từ Công đoạn 1–7',
    level:'Sơ cấp',
    desc:'Chứa Bài 4 “Sở thích của tôi” đầy đủ 7 kỹ năng để học thử. Bạn có thể tạo giáo trình mới hoặc nhập file PDF của bạn.',
    status:'published',
    lessonOrder:[lId],
    createdAt:1700000000000,
    updatedAt:1700000000000
  };
  const sampleLesson={
    id:lId,
    courseId:cId,
    code:'Bài 4',
    titleVi:'Sở thích của tôi',
    titleZh:'我的爱好',
    py:'Wǒ de àihào',
    goals:['Học 10 từ vựng về sở thích','Dùng cấu trúc “喜欢…” và “也”','Nghe, nói, viết chữ Hán cơ bản'],
    status:'published',
    sourceRef:{fileName:'Dữ liệu mẫu Hanyu AI',fileHash:'',pageRange:'—'},
    originalContent:'',
    supplementalContent:'Bài học mẫu mặc định có đầy đủ 10 từ vựng, 2 điểm ngữ pháp, hội thoại, bài tập, luyện nghe và 8 chữ Hán.',
    wordIds:DEFAULT_WORDS_SNAP.map(w=>w.id),
    sentences:DEFAULT_SENT_SNAP,
    dialog:DEFAULT_LISTEN_DIALOG_SNAP,
    dialogQuestions:DEFAULT_DIALOG_QUESTIONS_SNAP,
    grammarPoints:DEFAULT_GRAMMAR_POINTS_SNAP,
    grammarQuiz:DEFAULT_GRAMMAR_QUIZ_SNAP,
    orderBank:DEFAULT_ORDER_BANK_SNAP,
    chars:DEFAULT_CHARS_SNAP,
    updatedAt:1700000000000
  };
  return {sampleCourse,sampleLesson};
}

async function pruneLegacyUnstudiedLessons(){
  if(store.lazyPrunedV1)return;
  const completedSet=new Set();
  Object.values(store.courseProgress||{}).forEach(cp=>{
    if(cp&&Array.isArray(cp.completedLessonIds)){
      cp.completedLessonIds.forEach(id=>completedSet.add(id));
    }
  });
  const preDefault=(typeof DEFAULT_PRELOADED_LESSON_IDS!=='undefined'&&Array.isArray(DEFAULT_PRELOADED_LESSON_IDS))
    ?DEFAULT_PRELOADED_LESSON_IDS:['lesson_hn1_b1','lesson_hn1_b2','lesson_hsk30_1_b1','lesson_hsk30_1_b2'];
  const keepLessonIds=new Set(preDefault);
  for(const l of LESSONS){
    const info=parseHnLessonId(l.id);
    if(!info||!hasPackForLesson(l.id))continue;
    const isPre=preDefault.includes(l.id);
    const isDone=completedSet.has(l.id);
    const isCustomEdited=Boolean(l.updatedAt&&l.updatedAt!==SEED_TS);
    if(isPre||isDone||isCustomEdited){
      if(isLessonContentLoaded(l))keepLessonIds.add(l.id);
      continue;
    }
    if(isLessonContentLoaded(l)||l.status==='published'){
      const mp3=`Quyển ${info.vol} Bài ${info.num}.mp3`;
      l.status='draft';
      l.downloaded=false;
      l.wordIds=[];
      l.sentences=[];
      l.dialog=[];
      l.grammarPoints={};
      l.chars=[];
      l.sourceRef={fileName:`GT Hán Ngữ ${info.vol}.pdf`,fileHash:'',pageRange:'—'};
      l.goals=[`Đối chiếu audio: ${mp3}`,'Bấm “Tải bài” để tải từ vựng, bài khóa, ngữ pháp & tập viết'];
      l.updatedAt=SEED_TS;
      await HanyuIDB.put('lessons',l);
    }
  }
  const keepWordIds=new Set([
    ...DEFAULT_WORDS_SNAP.map(w=>w.id),
    ...Object.keys(store.words||{}),
    ...(store.difficultIds||[]),
    ...(store.favoriteIds||[])
  ]);
  LESSONS.forEach(l=>{
    if(Array.isArray(l.wordIds))l.wordIds.forEach(wid=>keepWordIds.add(wid));
  });
  if(store.vocabBank&&typeof store.vocabBank==='object'){
    Object.keys(store.vocabBank).forEach(wid=>{
      if(!keepWordIds.has(wid))delete store.vocabBank[wid];
    });
  }
  store.downloadedLessonIds=[...keepLessonIds];
  store.lazyPrunedV1=true;
  saveStore(store);
}

function getCourseIdForTrack(level,track){
  const lv=Math.min(6,Math.max(1,Number(level)||1));
  return track==='hsk30'?`course_hsk30_lv${lv}`:`course_hn_${lv}`;
}

function getCourseProgressStats(courseId){
  const allLs=getCourseLessons(courseId,true);
  const regularLs=allLs.filter(l=>!/^lesson_hsk30_\d+_mock$/.test(l.id));
  const baseLs=regularLs.length?regularLs:allLs;
  const prog=getCourseProg(courseId);
  const doneSet=new Set(prog.completedLessonIds||[]);
  const doneCnt=baseLs.filter(l=>doneSet.has(l.id)).length;
  const total=baseLs.length;
  const pct=total?Math.round(doneCnt*100/total):0;
  return {doneCnt,total,pct,doneSet,lessons:allLs,baseLessons:baseLs};
}

function switchToCourse(courseId,lessonId){
  if(store.activeCourseId&&store.activeLessonId){
    const prevC=COURSES.find(x=>x.id===store.activeCourseId);
    if(prevC&&getCourseLessons(prevC.id,true).some(l=>l.id===store.activeLessonId)){
      getCourseProg(prevC.id).currentLessonId=store.activeLessonId;
    }
  }
  const c=COURSES.find(x=>x.id===courseId);
  if(!c)return;
  const ls=getCourseLessons(c.id,true);
  const prog=getCourseProg(c.id);
  const doneSet=new Set(prog.completedLessonIds||[]);
  let targetLid=null;
  if(lessonId&&ls.some(l=>l.id===lessonId))targetLid=lessonId;
  else if(prog.currentLessonId&&ls.some(l=>l.id===prog.currentLessonId))targetLid=prog.currentLessonId;
  else{
    const nextL=ls.find(l=>!doneSet.has(l.id))||ls[0];
    targetLid=nextL?nextL.id:null;
  }
  store.activeCourseId=c.id;
  store.activeLessonId=targetLid;
  prog.currentLessonId=targetLid;
  if(!store.learningSetup||typeof store.learningSetup!=='object'){
    store.learningSetup={completed:false,level:1,mode:'hanngu',activeTrack:'hanngu',updatedAt:null};
  }
  if(c.group==='hsk')store.learningSetup.activeTrack='hsk30';
  else if(c.group==='hanngu')store.learningSetup.activeTrack='hanngu';
  saveStore(store);
  applyActiveLesson();
  if(typeof refreshDashboards==='function')refreshDashboards();
  renderRoadmap();
  renderLibrary();
  if(typeof renderLearnRoadmap==='function')renderLearnRoadmap(c.id);
}

async function initCurriculumStore(){
  DEFAULT_WORDS_SNAP.forEach(w=>registerVocabWord(w));
  const prefCid=(store.learningSetup&&store.learningSetup.completed)
    ?getCourseIdForTrack(store.learningSetup.level,store.learningSetup.mode==='hsk30'?'hsk30':(store.learningSetup.activeTrack||'hanngu'))
    :'course_hn_1';
  // Pre-seed synchronously so courses/lessons render immediately even if IndexedDB is slow or blocked
  try{
    const seed0=buildStandardCatalogSeed();
    if(!COURSES.length)COURSES=seed0.courses.slice();
    if(!LESSONS.length)LESSONS=seed0.lessons.slice();
    if(!store.activeCourseId||store.activeCourseId==='course_sample_hn1'||!COURSES.some(c=>c.id===store.activeCourseId)){store.activeCourseId=(COURSES.find(c=>c.id===prefCid)||COURSES.find(c=>c.id==='course_hn_1')||COURSES[0]).id;}
    const actC0=COURSES.find(c=>c.id===store.activeCourseId)||COURSES[0];
    if(actC0){
      const cl0=getCourseLessons(actC0.id);
      if(!cl0.some(l=>l.id===store.activeLessonId)&&cl0[0])store.activeLessonId=cl0[0].id;
    }
    applyActiveLesson();
    renderLibrary();
    renderRoadmap();
  }catch(_){}
  let cs=await HanyuIDB.getAll('courses');
  let ls=await HanyuIDB.getAll('lessons');
  if(!cs.length){
    const {sampleCourse,sampleLesson}=buildSampleCurriculum();
    cs=[sampleCourse];
    ls=[sampleLesson];
    await HanyuIDB.put('courses',sampleCourse);
    await HanyuIDB.put('lessons',sampleLesson);
  }
  COURSES=cs;
  LESSONS=ls;
  await pruneLegacyUnstudiedLessons();
  await seedStandardCatalog(false);
  // Recover autosaved editor draft if browser closed unexpectedly
  try{
    const dRaw=localStorage.getItem('hanyu_ai_editor_draft');
    if(dRaw){
      const d=JSON.parse(dRaw);
      if(d&&d.lesson&&d.lesson.id){
        const idx=LESSONS.findIndex(x=>x.id===d.lesson.id);
        if(idx>=0)LESSONS[idx]=d.lesson;else LESSONS.push(d.lesson);
      }
    }
  }catch(_){}
  if(!store.activeCourseId||store.activeCourseId==='course_sample_hn1'||!COURSES.some(c=>c.id===store.activeCourseId)){
    store.activeCourseId=(COURSES.find(c=>c.id===prefCid)||COURSES.find(c=>c.id==='course_hn_1')||COURSES[0]).id;
  }
  const activeC=COURSES.find(c=>c.id===store.activeCourseId);
  const cLessons=getCourseLessons(activeC.id);
  if(!cLessons.some(l=>l.id===store.activeLessonId)){
    store.activeLessonId=cLessons[0]?cLessons[0].id:null;
  }
  saveStore(store);
  applyActiveLesson();
  if(typeof refreshDashboards==='function')refreshDashboards();
  renderLibrary();
  renderRoadmap();
  if((!store.learningSetup||!store.learningSetup.completed)&&curView==='home'){
    setTimeout(()=>{
      const mb=$('#hanyu-modal');
      if((!store.learningSetup||!store.learningSetup.completed)&&curView==='home'&&mb&&mb.classList.contains('hide')){
        if(typeof window.HanyuAuth!=='undefined'&&typeof window.HanyuAuth.openWelcomeModal==='function'){
          window.HanyuAuth.openWelcomeModal(true);
        }else if(typeof openLearningSetupModal==='function'){
          openLearningSetupModal(1,true);
        }
      }
    },180);
  }
}

function getCourseLessons(courseId,includeDraft=true){
  const c=COURSES.find(x=>x.id===courseId);
  const list=LESSONS.filter(l=>l.courseId===courseId&&(includeDraft||l.status==='published'));
  if(!c||!Array.isArray(c.lessonOrder)||!c.lessonOrder.length)return list;
  const orderMap=new Map(c.lessonOrder.map((id,i)=>[id,i]));
  return list.slice().sort((a,b)=>{
    const ia=orderMap.has(a.id)?orderMap.get(a.id):9999;
    const ib=orderMap.has(b.id)?orderMap.get(b.id):9999;
    return ia-ib;
  });
}

function getCourseProg(courseId){
  if(!store.courseProgress)store.courseProgress={};
  if(!store.courseProgress[courseId])store.courseProgress[courseId]={completedLessonIds:[],currentLessonId:null};
  return store.courseProgress[courseId];
}

function markLessonCompleted(lessonId){
  const l=LESSONS.find(x=>x.id===lessonId);
  if(!l)return;
  const p=getCourseProg(l.courseId);
  if(!p.completedLessonIds.includes(lessonId))p.completedLessonIds.push(lessonId);
  saveStore(store);
  if(typeof refreshDashboards==='function')refreshDashboards();
  renderRoadmap();
  renderLibrary();
  if(typeof renderLearnRoadmap==='function')renderLearnRoadmap();
}

