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
    if(!existing.ex&&w.ex){existing.ex=w.ex;existing.exPy=w.exPy||'';existing.exVi=w.exVi||'';}
    return existing.id;
  }
  const id=w.id||genId('w');
  store.vocabBank[id]={id,zh:w.zh.trim(),py:(w.py||'').trim(),vi:(w.vi||'').trim(),ex:w.ex||'',exPy:w.exPy||'',exVi:w.exVi||'',canonicalKey:ck,createdAt:Date.now()};
  return id;
}


/* ---------- Khung Giáo trình chuẩn đã đối chiếu (8C) ---------- */
function normMediaName(name){
  return String(name||'').trim().toLowerCase().normalize('NFC').replace(/\s+/g,' ');
}
function makeAudioTrack(fileName,section,label){
  return {id:normMediaName(fileName),fileName,section:section||'lesson',label:label||fileName,verified:true};
}

function buildStandardCatalogSeed(){
  const now=1700000200000;
  const courses=[],lessons=[];
  const hnMeta={
    1:{lvl:'Sơ cấp',desc:'Giáo trình Hán ngữ Quyển 1 (15 bài · 15 MP3). Đã nạp đầy đủ nội dung chi tiết cả 15 bài (Từ mới, Bài khóa, Ngữ pháp, Chữ Hán).'},
    2:{lvl:'Sơ cấp',desc:'Giáo trình Hán ngữ Quyển 2 (Bài 16–30 · 15 MP3). Đã nạp sẵn danh mục 15 bài từ sách gốc.'},
    3:{lvl:'Sơ trung cấp',desc:'Giáo trình Hán ngữ Quyển 3 (10 bài · 10 MP3). Đã nạp sẵn danh mục 10 bài từ sách gốc.'},
    4:{lvl:'Trung cấp',desc:'Giáo trình Hán ngữ Quyển 4 (Bài 11–20 · 10 MP3). Đã nạp sẵn danh mục 10 bài từ sách gốc.'},
    5:{lvl:'Trung cao cấp',desc:'Giáo trình Hán ngữ Quyển 5 (13 bài · 13 MP3). Đã nạp sẵn danh mục 13 bài từ sách gốc.'},
    6:{lvl:'Cao cấp',desc:'Giáo trình Hán ngữ Quyển 6 (Bài 14–26 · 13 MP3). Đã nạp sẵn danh mục 13 bài từ sách gốc.'}
  };
  [1,2,3,4,5,6].forEach(num=>{
    const cId=`course_hn_${num}`,order=[],list=HN_CATALOG_TITLES[num]||[];
    list.forEach(([b,zhTitle,pyTitle,viTitle])=>{
      const lId=`lesson_hn${num}_b${b}`;
      order.push(lId);
      const mp3=`Quyển ${num} Bài ${b}.mp3`;
      const full=(num===1&&HN1_FULL_DATA[b])?HN1_FULL_DATA[b]:null;
      const wordIds=[];
      if(full&&full.words){
        full.words.forEach(w=>{const wid=registerVocabWord(w);if(wid&&!wordIds.includes(wid))wordIds.push(wid);});
      }
      const chars=(full&&full.chars)?full.chars.map(ch=>({id:'c_'+ch.charCodeAt(0),ch,py:'',vi:'',rad:'',strokes:0})):[];
      const dlg=(full&&full.dialog)?full.dialog:[];
      lessons.push({
        id:lId,courseId:cId,code:`Bài ${b}`,titleVi:viTitle,titleZh:zhTitle,py:pyTitle,
        goals:[`Đối chiếu audio: ${mp3}`,full?'Đã nạp từ vựng, bài khóa, ngữ pháp & tập viết':'Nhập thêm từ vựng/bài khóa từ PDF GT Hán Ngữ '+num],
        status:full?'published':'draft',
        sourceRef:{fileName:`GT Hán Ngữ ${num}.pdf`,fileHash:'',pageRange:full?full.pages:'—'},
        audioTracks:[makeAudioTrack(mp3,'dialog',`Audio bài khóa (${mp3})`)],
        workbook:null,optionalExtensions:(num===1&&HN1_EXT_MAP[b])?HN1_EXT_MAP[b]:{hackNaoIds:[],mindMapRootChars:[]},
        originalContent:'',supplementalContent:'',
        wordIds,
        sentences:dlg.map(d=>({zh:d.zh,py:d.py,vi:d.vi})),
        dialog:dlg,
        dialogQuestions:[],
        grammarPoints:(full&&full.grammar)?full.grammar:{},
        grammarQuiz:[],orderBank:[],chars,updatedAt:now
      });
    });
    courses.push({
      id:cId,title:`Giáo trình Hán ngữ ${num}`,group:'hanngu',systemTrack:'hanngu',
      versionLabel:`Quyển ${num} (${order.length} bài · ${order.length} MP3)`,
      source:`GT Hán Ngữ ${num}.pdf + MP3 Q${num}`,level:hnMeta[num].lvl,desc:hnMeta[num].desc,
      status:'published',lessonOrder:order,createdAt:now,updatedAt:now
    });
  });

  // Nhóm C: NEW HSK 3.0 Cấp 1–3 (độc lập, đã ánh xạ đủ 407 track MP3 từ 5 gói ZIP)
  const hskDefs=[
    {lvl:1,cnt:15,title:'NEW HSK 3.0 · Cấp 1',ver:'HSK 3.0 · 93 MP3 giáo trình + 34 MP3 SBT 1',src:'HSK1 - Tiếng Việt (3.0).pdf + HSK 1 Audio.zip + HSK SBT 1 Audio.zip',hasSbt:true},
    {lvl:2,cnt:15,title:'NEW HSK 3.0 · Cấp 2',ver:'HSK 3.0 · 120 MP3 giáo trình + 16 MP3 SBT 2',src:'HSK2 - Tiếng Việt (3.0).pdf + HSK 2 Audio.zip + HSK SBT 2 Audio.zip',hasSbt:true},
    {lvl:3,cnt:18,title:'NEW HSK 3.0 · Cấp 3',ver:'HSK 3.0 · 144 MP3 giáo trình',src:'HSK3 - Tiếng Việt (3.0).pdf + HSK 3 Audio.zip',hasSbt:false}
  ];
  hskDefs.forEach(h=>{
    const cId=`course_hsk30_lv${h.lvl}`,order=[];
    const mainMap=HSK_AUDIO_MANIFEST[`hsk${h.lvl}`]||{};
    const sbtMap=h.hasSbt?(HSK_AUDIO_MANIFEST[`sbt${h.lvl}`]||{}):{};
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
      lessons.push({
        id:lId,courseId:cId,code:`Bài ${b}`,titleVi:`HSK ${h.lvl} (3.0) · Bài ${b}`,titleZh:'',py:'',
        goals:[`Đã gắn ${tracks.length} file MP3 (${mainFiles.length} giáo trình${sbtFiles.length?` + ${sbtFiles.length} SBT`:''})`,h.hasSbt?`Kèm SBT HSK ${h.lvl} & Đáp án`:'Nhập nội dung chi tiết từ PDF HSK 3.0'],
        status:'draft',
        sourceRef:{fileName:`HSK${h.lvl} - Tiếng Việt (3.0).pdf`,fileHash:'',pageRange:'—'},
        audioTracks:tracks,
        workbook:h.hasSbt?{exercisesNote:`Tham chiếu SBT HSK${h.lvl} - Tiếng Việt (3.0).pdf (Bài ${b})`,answerKeyNote:`Tham chiếu Đáp án SBT HSK ${h.lvl}.pdf`,transcriptNote:h.lvl===2?'Tham chiếu Lời thoại phần nghe SBT HSK2.pdf':''}:null,
        optionalExtensions:{hackNaoIds:[],mindMapRootChars:[]},
        originalContent:'',supplementalContent:'',wordIds:[],sentences:[],dialog:[],dialogQuestions:[],grammarPoints:{},grammarQuiz:[],orderBank:[],chars:[],updatedAt:now
      });
    }
    if(h.hasSbt&&Array.isArray(sbtMap['mock'])&&sbtMap['mock'].length){
      const mockId=`lesson_hsk30_${h.lvl}_mock`;
      order.push(mockId);
      const mockTracks=sbtMap['mock'].map(fn=>makeAudioTrack(`sbt${h.lvl}/${fn}`,'workbook',`Đề thi thử HSK ${h.lvl} (${fn})`));
      lessons.push({
        id:mockId,courseId:cId,code:'Thi thử',titleVi:`Đề thi thử Nghe HSK ${h.lvl} (SBT ${h.lvl})`,titleZh:'模拟测试',py:'Mónǐ cèshì',
        goals:[`Audio đề thi thử chính thức từ HSK SBT ${h.lvl} (HSK3.0) Audio.zip`],
        status:'draft',
        sourceRef:{fileName:`SBT HSK${h.lvl} - Tiếng Việt (3.0).pdf`,fileHash:'',pageRange:'Cuối sách'},
        audioTracks:mockTracks,
        workbook:{exercisesNote:`Đề thi thử trong SBT HSK${h.lvl} - Tiếng Việt (3.0).pdf`,answerKeyNote:`Đáp án SBT HSK ${h.lvl}.pdf`,transcriptNote:h.lvl===2?'Lời thoại phần nghe SBT HSK2.pdf':''},
        optionalExtensions:{hackNaoIds:[],mindMapRootChars:[]},
        originalContent:'',supplementalContent:'',wordIds:[],sentences:[],dialog:[],dialogQuestions:[],grammarPoints:{},grammarQuiz:[],orderBank:[],chars:[],updatedAt:now
      });
    }
    courses.push({
      id:cId,title:h.title,group:'hsk',systemTrack:'hsk30',versionLabel:h.ver,source:h.src,level:`HSK ${h.lvl} (3.0)`,
      desc:`Hệ thống NEW HSK 3.0 Cấp ${h.lvl} độc lập. Đã ánh xạ đủ toàn bộ track MP3 giáo trình & SBT; hỗ trợ nạp thẳng file .zip/.mp3 từ máy.`,
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
  const hnBooks=[
    {id:'lesson_hacknao_t1',code:'Tập 1',titleVi:'Hack não 3000 chữ Hán · Tập 1 (Chữ 1–1000)',titleZh:'汉字记忆 · 第一册',py:'100 chữ cơ bản + Chữ 101–1000',file:'Hack não 3000 chữ Hán tập 1.pdf',pages:'275 trang',note:'100 chữ Hán cơ bản nhất & chữ 101–1000 qua 2 phương pháp: Câu chuyện chữ Hán và Chữ Hán giống nhau (Lưu ý: tệp PDF tải lên bị cắt ở mốc 64 MiB nên đã khôi phục cấu trúc 275 trang).'},
    {id:'lesson_hacknao_t2',code:'Tập 2',titleVi:'Hack não 3000 chữ Hán · Tập 2 (Chữ 1001–2002)',titleZh:'汉字记忆 · 第二册',py:'Chữ 1001–2002 + Bảng tra Pinyin/Hán-Việt',file:'Hack não 3000 chữ hán tập 2.pdf',pages:'294 trang',note:'Chữ 1001–2002 kèm câu chuyện liên tưởng bộ thủ, chữ Hán giống nhau và bảng tra cứu Hán-Việt / Pinyin cuối sách.'},
    {id:'lesson_hacknao_t3',code:'Tập 3',titleVi:'Hack não 3000 chữ Hán · Tập 3 (Chữ 2003–3123)',titleZh:'汉字记忆 · 第三册',py:'Chữ 2003–3123 + Bảng tra Bộ thủ',file:'Hack_nao_3000_chu_Han_tap_3_nen.pdf',pages:'339 trang',note:'Chữ 2003–3123 hoàn thiện bộ 3000 chữ Hán thông dụng cùng bảng tra bộ thủ & Pinyin/Hán-Việt.'}
  ];
  hnBooks.forEach(hb=>{
    lessons.push({
      id:hb.id,courseId:'course_hacknao_3000',code:hb.code,titleVi:hb.titleVi,titleZh:hb.titleZh,py:hb.py,
      goals:['Học qua Câu chuyện chữ Hán & Chữ Hán giống nhau','Tra cứu nhanh khi gặp chữ khó trong bài học chính (không ép SRS)'],
      status:'published',
      sourceRef:{fileName:hb.file,fileHash:'',pageRange:hb.pages},
      audioTracks:[],workbook:null,optionalExtensions:{hackNaoIds:[hb.py],mindMapRootChars:[]},
      originalContent:hb.note,supplementalContent:'Mở mục Nhập PDF để nạp trực tiếp tệp PDF từ máy vào IndexedDB và đọc ngay trong app.',
      wordIds:[],sentences:[],dialog:[],dialogQuestions:[],grammarPoints:{},grammarQuiz:[],orderBank:[],chars:[],updatedAt:now
    });
  });
  courses.push({
    id:'course_hacknao_3000',title:'Hack não 3000 chữ Hán (Tập 1–3)',group:'hanzi',systemTrack:'hanzi',
    versionLabel:'3 Tập · 3.123 chữ Hán',source:'Hack não 3000 chữ Hán Tập 1, 2, 3 (.pdf)',level:'Bổ trợ chữ Hán',
    desc:'Bộ sách ghi nhớ chữ Hán qua Câu chuyện & Chữ giống nhau (Tiếng Trung 21 Ngày). Đã liên kết gợi ý vào 15 bài Hán ngữ Quyển 1.',
    status:'published',lessonOrder:hnBooks.map(x=>x.id),createdAt:now,updatedAt:now
  });

  const mmId='lesson_mindmap_3300_all';
  lessons.push({
    id:mmId,courseId:'course_mindmap_3300',code:'1+2',titleVi:'Sơ đồ tư duy 3300 chữ Hán (Tập 1+2)',titleZh:'3300汉字思维导图',py:'214 bộ thủ & chữ gốc mở rộng',
    goals:['Phát triển mạng lưới chữ Hán từ 214 chữ gốc / bộ thủ','Đối chiếu chữ gốc ngay trong 15 bài Hán ngữ Quyển 1'],
    status:'published',
    sourceRef:{fileName:'So_do_tu_duy_3300_chu_Han_nen.pdf',fileHash:'',pageRange:'217 trang'},
    audioTracks:[],workbook:null,optionalExtensions:{hackNaoIds:[],mindMapRootChars:['一','人','口','木','水','火','土','心','言','手','日','月','女','金','辵']},
    originalContent:'Sơ đồ tư duy 3300 chữ Hán (Tập 1+2) — Phạm Dương Châu & Dương Hương Giang (NXB Thanh Niên): 214 bộ thủ/chữ gốc phát triển thành 3.300 chữ Hán kèm bảng tra cứu cuối sách.',
    supplementalContent:'Mở mục Nhập PDF để nạp tệp So_do_tu_duy_3300_chu_Han_nen.pdf từ máy và đọc trực tiếp.',
    wordIds:[],sentences:[],dialog:[],dialogQuestions:[],grammarPoints:{},grammarQuiz:[],orderBank:[],chars:[],updatedAt:now
  });
  courses.push({
    id:'course_mindmap_3300',title:'Sơ đồ tư duy 3300 chữ Hán (1+2)',group:'hanzi',systemTrack:'hanzi',
    versionLabel:'214 chữ gốc · 217 trang',source:'So_do_tu_duy_3300_chu_Han_nen.pdf',level:'Bổ trợ chữ Hán',
    desc:'Hệ thống phát triển từ vựng chữ Hán theo sơ đồ tư duy từ 214 chữ gốc. Đã liên kết chữ gốc vào 15 bài Hán ngữ Quyển 1.',
    status:'published',lessonOrder:[mmId],createdAt:now,updatedAt:now
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
  for(const l of lessons){
    const idx=LESSONS.findIndex(x=>x.id===l.id);
    if(idx<0){
      LESSONS.push(l);await HanyuIDB.put('lessons',l);updatedL++;
    }else{
      const ex=LESSONS[idx];
      if(ex.status==='draft'&&!(ex.wordIds&&ex.wordIds.length)&&!(ex.dialog&&ex.dialog.length)){
        LESSONS[idx]=l;await HanyuIDB.put('lessons',l);updatedL++;
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

async function initCurriculumStore(){
  DEFAULT_WORDS_SNAP.forEach(w=>registerVocabWord(w));
  // Pre-seed synchronously so courses/lessons render immediately even if IndexedDB is slow or blocked
  try{
    const seed0=buildStandardCatalogSeed();
    if(!COURSES.length)COURSES=seed0.courses.slice();
    if(!LESSONS.length)LESSONS=seed0.lessons.slice();
    if(!store.activeCourseId||store.activeCourseId==='course_sample_hn1'||!COURSES.some(c=>c.id===store.activeCourseId)){store.activeCourseId=(COURSES.find(c=>c.id==='course_hn_1')||COURSES[0]).id;}
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
    store.activeCourseId=(COURSES.find(c=>c.id==='course_hn_1')||COURSES[0]).id;
  }
  const activeC=COURSES.find(c=>c.id===store.activeCourseId);
  const cLessons=getCourseLessons(activeC.id);
  if(!cLessons.some(l=>l.id===store.activeLessonId)){
    store.activeLessonId=cLessons[0]?cLessons[0].id:null;
  }
  saveStore(store);
  applyActiveLesson();
  renderLibrary();
  renderRoadmap();
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
  renderRoadmap();
  renderLibrary();
}

