/* ---------- Dữ liệu mẫu (thay bằng API sau) ---------- */
let WORDS=[
 {id:'b4_xihuan',zh:'喜欢',py:'xǐhuan',vi:'thích, yêu thích',ex:'我喜欢喝茶。',exPy:'Wǒ xǐhuan hē chá.',exVi:'Tôi thích uống trà.'},
 {id:'b4_yundong',zh:'运动',py:'yùndòng',vi:'thể thao, vận động',ex:'我喜欢运动。',exPy:'Wǒ xǐhuan yùndòng.',exVi:'Tôi thích thể thao.'},
 {id:'b4_dianying',zh:'电影',py:'diànyǐng',vi:'phim, điện ảnh',ex:'我喜欢看电影。',exPy:'Wǒ xǐhuan kàn diànyǐng.',exVi:'Tôi thích xem phim.'},
 {id:'b4_yinyue',zh:'音乐',py:'yīnyuè',vi:'âm nhạc',ex:'我喜欢听音乐。',exPy:'Wǒ xǐhuan tīng yīnyuè.',exVi:'Tôi thích nghe nhạc.'},
 {id:'b4_kanshu',zh:'看书',py:'kàn shū',vi:'đọc sách',ex:'他喜欢看书。',exPy:'Tā xǐhuan kàn shū.',exVi:'Anh ấy thích đọc sách.'},
 {id:'b4_hecha',zh:'喝茶',py:'hē chá',vi:'uống trà',ex:'她常常喝茶。',exPy:'Tā chángcháng hē chá.',exVi:'Cô ấy thường uống trà.'},
 {id:'b4_aihao',zh:'爱好',py:'àihào',vi:'sở thích',ex:'你的爱好是什么？',exPy:'Nǐ de àihào shì shénme?',exVi:'Sở thích của bạn là gì?'},
 {id:'b4_changge',zh:'唱歌',py:'chànggē',vi:'hát, ca hát',ex:'我喜欢唱歌。',exPy:'Wǒ xǐhuan chànggē.',exVi:'Tôi thích hát.'},
 {id:'b4_youyong',zh:'游泳',py:'yóuyǒng',vi:'bơi lội',ex:'他会游泳。',exPy:'Tā huì yóuyǒng.',exVi:'Anh ấy biết bơi.'},
 {id:'b4_lvyou',zh:'旅游',py:'lǚyóu',vi:'du lịch',ex:'我想去旅游。',exPy:'Wǒ xiǎng qù lǚyóu.',exVi:'Tôi muốn đi du lịch.'}
];
let SENT=[
 {zh:'你喜欢什么？',py:'Nǐ xǐhuan shénme?',vi:'Bạn thích gì?'},
 {zh:'我喜欢喝茶，也喜欢看书。',py:'Wǒ xǐhuan hē chá, yě xǐhuan kàn shū.',vi:'Tôi thích uống trà, cũng thích đọc sách.'},
 {zh:'你喜欢运动吗？',py:'Nǐ xǐhuan yùndòng ma?',vi:'Bạn có thích thể thao không?'},
 {zh:'我喜欢游泳。',py:'Wǒ xǐhuan yóuyǒng.',vi:'Tôi thích bơi.'},
 {zh:'我们一起去吧！',py:'Wǒmen yìqǐ qù ba!',vi:'Chúng ta cùng đi nhé!'}
];
const PRACTICE=[SENT[1],{zh:'我喜欢看电影。',py:'Wǒ xǐhuan kàn diànyǐng.',vi:'Tôi thích xem phim.'},{zh:'我也喜欢看书。',py:'Wǒ yě xǐhuan kàn shū.',vi:'Tôi cũng thích đọc sách.'}];
PRACTICE.unshift({zh:'我喜欢喝茶。',py:'Wǒ xǐhuan hē chá.',vi:'Tôi thích uống trà.'}); PRACTICE.splice(1,1);
let CHARS=[
 {id:'c_xi',ch:'喜',py:'xǐ',vi:'thích',rad:'口 (khẩu)',strokes:12},
 {id:'c_huan',ch:'欢',py:'huān',vi:'vui mừng',rad:'欠 (khiếm)',strokes:6},
 {id:'c_ai',ch:'爱',py:'ài',vi:'yêu',rad:'爫 (trảo)',strokes:10},
 {id:'c_hao',ch:'好',py:'hǎo',vi:'tốt, thích',rad:'女 (nữ)',strokes:6},
 {id:'c_yin',ch:'音',py:'yīn',vi:'âm thanh',rad:'音 (âm)',strokes:9},
 {id:'c_yue',ch:'乐',py:'yuè',vi:'nhạc',rad:'丿 (phiệt)',strokes:5},
 {id:'c_kan',ch:'看',py:'kàn',vi:'nhìn, xem',rad:'目 (mục)',strokes:9},
 {id:'c_cha',ch:'茶',py:'chá',vi:'trà',rad:'艹 (thảo)',strokes:9}
];
const SKILLS=[['head','Nghe',16,20,'o'],['mic','Nói',12,20,''],['book','Đọc',15,20,''],['brush','Viết',13,20,'']];
const WEEK=[['T2',40],['T3',25],['T4',55],['T5',30],['T6',50],['T7',45],['CN',15]];

/* ---------- Tiện ích ---------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let toastT;
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2400)}
let zhWarned=false;
function speak(text,rate){
  if(!text)return;
  if(typeof speechSynthesis==='undefined'||typeof SpeechSynthesisUtterance==='undefined'){
    toast('Thiết bị chưa hỗ trợ đọc mẫu');return;
  }
  try{
    const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=+rate||.9;
    const voices=speechSynthesis.getVoices()||[];
    const v=voices.find(x=>x.lang&&x.lang.toLowerCase().startsWith('zh'));
    if(v)u.voice=v;
    else if(voices.length>0&&!zhWarned){zhWarned=true;toast('Thiết bị chưa có giọng đọc tiếng Trung (zh-CN)');}
    u.onerror=()=>{if(!zhWarned){zhWarned=true;toast('Không thể phát âm thanh tiếng Trung trên thiết bị này');}};
    speechSynthesis.cancel();speechSynthesis.speak(u);
  }catch(e){toast('Thiết bị chưa hỗ trợ đọc mẫu')}
}
if(typeof speechSynthesis!=='undefined'&&speechSynthesis.addEventListener){
  try{speechSynthesis.addEventListener('voiceschanged',()=>{zhWarned=false});}catch(e){}
}
const rnd=(a,b)=>Math.round(a+Math.random()*(b-a));
function newScores(){const s={init:rnd(72,96),fin:rnd(72,96),tone:rnd(64,94),flu:rnd(70,95)};s.total=Math.floor((s.init+s.fin+s.tone+s.flu)/4);return s}
const labelOf=t=>t>=90?'Rất tốt':t>=80?'Khá tốt':'Cần luyện thêm';
const TIPS={init:"Âm đầu của ‘xǐhuan’ chưa rõ, thử đặt đầu lưỡi sau răng dưới khi phát âm ‘x’.",fin:"Vần ‘uan’ cần tròn môi hơn và đọc liền mạch.",tone:"Thanh điệu của ‘xǐhuan’ chưa rõ, thử nâng rõ thanh 3 ở âm ‘xǐ’.",flu:"Đọc liền hơi hơn, tránh ngắt giữa các âm tiết."};
function weakest(s){return ['init','fin','tone','flu'].reduce((a,b)=>s[b]<s[a]?b:a,'init')}
function fakeRecord(btn,label,done){
  if(btn.classList.contains('rec'))return;
  btn.classList.add('rec');label.textContent='Đang ghi âm…';
  setTimeout(()=>{btn.classList.remove('rec');label.textContent='Nhấn để ghi âm';done(newScores())},1600);
}

/* ---------- Router (hoạt động cả khi WebView chặn hashchange) ---------- */
const TAB={home:'home',learn:'learn',lesson:'learn',vocab:'learn',exercise:'learn',grammar:'learn',dialog:'learn',listen:'learn',writing:'learn',review:'review',wordbook:'review',speak:'speak',me:'me','course-detail':'learn','lesson-editor':'learn','pdf-import':'learn','textbook-reader':'learn'};
let curView='home';
function route(forced){
  if(window._activeTimeReady&&typeof touchActiveTime==='function')touchActiveTime();
  const h=(typeof forced==='string'&&forced)?forced:((location.hash&&location.hash.length>1)?location.hash.slice(1):curView);
  const id=$(`.view[data-view="${h}"]`)?h:'home';
  curView=id;
  $$('.view').forEach(v=>v.classList.toggle('on',v.dataset.view===id));
  $$('.tabs a').forEach(a=>{const on=a.dataset.tab===TAB[id];a.classList.toggle('on',on);on?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current')});
  const sbTab=(id==='wordbook')?'wordbook':TAB[id];
  $$('.sidebar [data-tab]').forEach(a=>{const on=a.dataset.tab===sbTab;a.classList.toggle('on',on);on?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current')});
  document.body.classList.toggle('sub',['lesson','vocab','exercise','grammar','dialog','listen','writing','wordbook','course-detail','lesson-editor','pdf-import','textbook-reader'].includes(id));
  try{window.scrollTo(0,0);}catch(_){}
  if(id!=='listen'&&window._stopListen)window._stopListen();
  if(id!=='speak'&&window._stopSpeak)window._stopSpeak();
  if(id==='writing'&&typeof setupPadForChar==='function'){fitPad();setupPadForChar();}
  if(window._v8Ready&&typeof onViewEntered==='function')onViewEntered(id);
}
function goView(id){route(id);}
addEventListener('hashchange',()=>route());
route('home');

/* ---------- Click chung ---------- */
document.addEventListener('click',e=>{
  const navLink=e.target.closest('[data-go]');
  if(navLink&&!navLink.hasAttribute('data-gosk')){
    e.preventDefault();
    goView(navLink.dataset.go);
    return;
  }
  const t=e.target.closest('[data-toast],[data-say],[data-task],[data-sw],[data-quiz] .opt,[data-gosk]');
  if(!t)return;
  if(t.dataset.toast)toast(t.dataset.toast);
  else if(t.dataset.say)speak(t.dataset.say);
  else if(t.hasAttribute('data-task'))t.parentElement.classList.toggle('done');
  else if(t.dataset.sw){const on=t.getAttribute('aria-checked')==='true';t.setAttribute('aria-checked',String(!on));t.closest('.view').classList.toggle(t.dataset.sw,on)}
  else if(t.hasAttribute('data-gosk')){e.preventDefault();$('#mtabs [data-m="sk"]').click()}
  else if(t.classList.contains('opt')){
    const box=t.closest('[data-quiz]'),fb=box.parentElement.querySelector('.fb');
    $$('.opt',box).forEach(o=>o.classList.remove('ok','no'));
    const ok=t.hasAttribute('data-ok');t.classList.add(ok?'ok':'no');
    fb.className='fb '+(ok?'ok':'no');fb.textContent=ok?'Chính xác! Làm tốt lắm.':'Chưa đúng, thử lại nhé.';
  }
});

/* ---------- Kho lưu trữ localStorage (version 2 & migrate) + SRS + Sổ từ ---------- */
const STORAGE_KEY='hanyu_ai_data';
const SCHEMA_VERSION=10;
const DAY_MS=86400000;
const RELEARN_MS=10*60*1000;
function wordById(id){
  const w=WORDS.find(x=>x.id===id);
  if(w)return w;
  try{return (store&&store.vocabBank&&store.vocabBank[id])||null;}catch(_){return null;}
}

function defaultStore(){
  return {
    version:SCHEMA_VERSION,words:{},difficultIds:[],favoriteIds:[],
    settings:{showPinyin:true,showVi:true,flashMode:'zh',slowAudio:false,showOptionalExt:true},
    exercises:{attempts:0,bestPct:0,sessions:[],active:null},
    grammarQuiz:{attempts:0,bestPct:0,sessions:[]},
    listening:{speed:1,showZh:true,showPy:true,showVi:false,attempts:0,bestPct:0,sessions:[],wrongIds:[]},
    writing:{mode:'trace',chars:{}},
    speaking:{mode:'sentence',maxSec:15,items:{}},
    goals:{minutes:20,newWords:5,reviews:10,listen:1,speak:3,write:2},
    daily:{},
    events:[],
    downloadedLessonIds:['lesson_hn1_b1','lesson_hn1_b2'],
    lazyPrunedV1:false,
    lessonSections:{}
  };
}
function sanitizeWordRec(r){
  if(!r||typeof r!=='object')return null;
  const status=(r.status==='learning'||r.status==='review')?r.status:'new';
  return {
    status,
    reps:Number.isFinite(r.reps)&&r.reps>=0?r.reps:0,
    lapses:Number.isFinite(r.lapses)&&r.lapses>=0?r.lapses:0,
    intervalDays:Number.isFinite(r.intervalDays)&&r.intervalDays>=0?r.intervalDays:0,
    ease:Number.isFinite(r.ease)&&r.ease>=1.3?r.ease:2.5,
    dueAt:Number.isFinite(r.dueAt)?r.dueAt:null,
    lastReviewedAt:Number.isFinite(r.lastReviewedAt)?r.lastReviewedAt:null,
    wrongCount:Number.isFinite(r.wrongCount)&&r.wrongCount>=0?r.wrongCount:0,
    history:Array.isArray(r.history)?r.history.slice(-30):[]
  };
}
function mapLegacyId(k,bank){
  if(WORDS.some(w=>w.id===k))return k;
  if(bank&&bank[k])return k;
  if(typeof k==='string'&&k.startsWith('w_'))return k;
  const idx=Number(k);
  if(Number.isInteger(idx)&&idx>=0&&idx<WORDS.length)return WORDS[idx].id;
  return null;
}
function migrateStore(raw){
  const base=defaultStore();
  if(!raw||typeof raw!=='object')return base;
  if(raw.vocabBank&&typeof raw.vocabBank==='object')base.vocabBank=raw.vocabBank;
  if(raw.settings&&typeof raw.settings==='object'){
    base.settings.showPinyin=raw.settings.showPinyin!==false;
    base.settings.showVi=raw.settings.showVi!==false;
    base.settings.slowAudio=Boolean(raw.settings.slowAudio);
    base.settings.showOptionalExt=raw.settings.showOptionalExt!==false;
    if(['zh','vi','listen'].includes(raw.settings.flashMode))base.settings.flashMode=raw.settings.flashMode;
  }
  if(raw.words&&typeof raw.words==='object'){
    for(const [k,v] of Object.entries(raw.words)){
      const id=mapLegacyId(k,base.vocabBank),rec=id?sanitizeWordRec(v):null;
      if(id&&rec)base.words[id]=rec;
    }
  }
  if(raw.mem&&typeof raw.mem==='object'){
    const now=Date.now();
    for(const [k,v] of Object.entries(raw.mem)){
      const id=mapLegacyId(k,base.vocabBank);if(!id||base.words[id])continue;
      const r=Number(v);
      base.words[id]={status:r===2?'review':'learning',reps:r>0?1:0,lapses:r===0?1:0,intervalDays:r===2?3:r===1?1:0,ease:2.5,
        dueAt:r===2?now+3*DAY_MS:r===1?now+DAY_MS:now+RELEARN_MS,lastReviewedAt:now,wrongCount:r===0?1:0,history:[{at:now,rating:r,mode:'zh',intervalDays:r===2?3:r===1?1:0}]};
    }
  }
  const difSrc=Array.isArray(raw.difficultIds)?raw.difficultIds:(Array.isArray(raw.hard)?raw.hard:[]);
  const favSrc=Array.isArray(raw.favoriteIds)?raw.favoriteIds:(Array.isArray(raw.star)?raw.star:[]);
  base.difficultIds=[...new Set(difSrc.map(x=>mapLegacyId(x,base.vocabBank)).filter(Boolean))];
  base.favoriteIds=[...new Set(favSrc.map(x=>mapLegacyId(x,base.vocabBank)).filter(Boolean))];
  if(raw.exercises&&typeof raw.exercises==='object'){
    base.exercises.attempts=Number.isFinite(raw.exercises.attempts)?raw.exercises.attempts:0;
    base.exercises.bestPct=Number.isFinite(raw.exercises.bestPct)?raw.exercises.bestPct:0;
    base.exercises.sessions=Array.isArray(raw.exercises.sessions)?raw.exercises.sessions.slice(-20):[];
    base.exercises.active=(raw.exercises.active&&typeof raw.exercises.active==='object')?raw.exercises.active:null;
  }
  if(raw.grammarQuiz&&typeof raw.grammarQuiz==='object'){
    base.grammarQuiz.attempts=Number.isFinite(raw.grammarQuiz.attempts)?raw.grammarQuiz.attempts:0;
    base.grammarQuiz.bestPct=Number.isFinite(raw.grammarQuiz.bestPct)?raw.grammarQuiz.bestPct:0;
    base.grammarQuiz.sessions=Array.isArray(raw.grammarQuiz.sessions)?raw.grammarQuiz.sessions.slice(-20):[];
  }
  if(raw.listening&&typeof raw.listening==='object'){
    const L=raw.listening;
    if([0.75,1,1.25].includes(Number(L.speed)))base.listening.speed=Number(L.speed);
    base.listening.showZh=L.showZh!==false;
    base.listening.showPy=L.showPy!==false;
    base.listening.showVi=Boolean(L.showVi);
    base.listening.attempts=Number.isFinite(L.attempts)?L.attempts:0;
    base.listening.bestPct=Number.isFinite(L.bestPct)?L.bestPct:0;
    base.listening.sessions=Array.isArray(L.sessions)?L.sessions.slice(-20):[];
    base.listening.wrongIds=Array.isArray(L.wrongIds)?L.wrongIds:[];
  }
  if(raw.writing&&typeof raw.writing==='object'){
    if(['order','trace','guided','free'].includes(raw.writing.mode))base.writing.mode=raw.writing.mode;
    if(raw.writing.chars&&typeof raw.writing.chars==='object'){
      for(const [k,v] of Object.entries(raw.writing.chars)){
        if(!v||typeof v!=='object')continue;
        base.writing.chars[k]={
          attempts:Number.isFinite(v.attempts)?v.attempts:0,
          guidedCompleted:Number.isFinite(v.guidedCompleted)?v.guidedCompleted:0,
          acceptedStrokes:Number.isFinite(v.acceptedStrokes)?v.acceptedStrokes:0,
          mistakes:Number.isFinite(v.mistakes)?v.mistakes:0,
          hintsUsed:Number.isFinite(v.hintsUsed)?v.hintsUsed:0,
          lastPracticedAt:Number.isFinite(v.lastPracticedAt)?v.lastPracticedAt:null,
          selfStatus:v.selfStatus==='ok'||v.selfStatus==='retry'?v.selfStatus:null,
          needsPractice:Boolean(v.needsPractice)
        };
      }
    }
  }
  if(raw.speaking&&typeof raw.speaking==='object'){
    if(['word','sentence','dialog'].includes(raw.speaking.mode))base.speaking.mode=raw.speaking.mode;
    if([15,30].includes(Number(raw.speaking.maxSec)))base.speaking.maxSec=Number(raw.speaking.maxSec);
    if(raw.speaking.items&&typeof raw.speaking.items==='object'){
      for(const [k,v] of Object.entries(raw.speaking.items)){
        if(!v||typeof v!=='object')continue;
        base.speaking.items[k]={
          attempts:Number.isFinite(v.attempts)?v.attempts:0,
          assessRequests:Number.isFinite(v.assessRequests)?v.assessRequests:0,
          lastPracticedAt:Number.isFinite(v.lastPracticedAt)?v.lastPracticedAt:null,
          lastResult:v.lastResult&&typeof v.lastResult==='object'?v.lastResult:null,
          needsPractice:Boolean(v.needsPractice),
          history:Array.isArray(v.history)?v.history.slice(-10):[]
        };
      }
    }
  }
  if(raw.goals&&typeof raw.goals==='object'){
    ['minutes','newWords','reviews','listen','speak','write'].forEach(k=>{
      if(Number.isFinite(Number(raw.goals[k]))&&Number(raw.goals[k])>0)base.goals[k]=Math.round(Number(raw.goals[k]));
    });
  }
  if(raw.daily&&typeof raw.daily==='object'){
    for(const [dk,dv] of Object.entries(raw.daily)){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(dk)||!dv||typeof dv!=='object')continue;
      base.daily[dk]={
        minutes:Number.isFinite(dv.minutes)?dv.minutes:0,
        seconds:Number.isFinite(dv.seconds)?dv.seconds:0,
        newWords:Number.isFinite(dv.newWords)?dv.newWords:0,
        reviews:Number.isFinite(dv.reviews)?dv.reviews:0,
        listen:Number.isFinite(dv.listen)?dv.listen:0,
        speak:Number.isFinite(dv.speak)?dv.speak:0,
        write:Number.isFinite(dv.write)?dv.write:0,
        correct:Number.isFinite(dv.correct)?dv.correct:0,
        events:Number.isFinite(dv.events)?dv.events:0
      };
    }
  }
  if(typeof raw.activeCourseId==='string'&&raw.activeCourseId)base.activeCourseId=raw.activeCourseId;
  if(typeof raw.activeLessonId==='string'&&raw.activeLessonId)base.activeLessonId=raw.activeLessonId;
  if(typeof raw.freeExplore==='boolean')base.freeExplore=raw.freeExplore;
  if(raw.courseProgress&&typeof raw.courseProgress==='object')base.courseProgress=raw.courseProgress;
  if(Array.isArray(raw.downloadedLessonIds)){
    base.downloadedLessonIds=[...new Set(['lesson_hn1_b1','lesson_hn1_b2',...raw.downloadedLessonIds.filter(x=>typeof x==='string'&&x)])];
  }
  if(typeof raw.lazyPrunedV1==='boolean')base.lazyPrunedV1=raw.lazyPrunedV1;
  if(raw.lessonSections&&typeof raw.lessonSections==='object'&&!Array.isArray(raw.lessonSections)){
    base.lessonSections=raw.lessonSections;
  }
  if(Array.isArray(raw.events)){
    base.events=raw.events.filter(e=>e&&typeof e==='object'&&e.id&&e.type).slice(-200);
  }
  return base;
}
function loadStore(){
  try{
    if(typeof localStorage==='undefined')return defaultStore();
    const s=localStorage.getItem(STORAGE_KEY);if(!s)return defaultStore();
    const p=JSON.parse(s),m=migrateStore(p);
    if(!p.version||p.version<SCHEMA_VERSION)saveStore(m);
    return m;
  }catch(e){return defaultStore();}
}
let storageWarned=false;
function saveStore(st){
  try{if(typeof localStorage!=='undefined')localStorage.setItem(STORAGE_KEY,JSON.stringify(st));}
  catch(e){if(!storageWarned){storageWarned=true;toast('Không thể lưu tiến độ vào bộ nhớ trình duyệt');}}
}
const store=loadStore();
const getWordState=id=>store.words[id]||{status:'new',reps:0,lapses:0,intervalDays:0,ease:2.5,dueAt:null,lastReviewedAt:null,wrongCount:0,history:[]};
const isDue=(id,now=Date.now())=>{const s=store.words[id];return Boolean(s&&s.status!=='new'&&Number.isFinite(s.dueAt)&&s.dueAt<=now);};
const isDifficult=id=>store.difficultIds.includes(id);
const isFavorite=id=>store.favoriteIds.includes(id);
function toggleDifficult(id){
  const idx=store.difficultIds.indexOf(id);
  if(idx>=0)store.difficultIds.splice(idx,1);else store.difficultIds.push(id);
  saveStore(store);
}
function toggleFavorite(id){
  const idx=store.favoriteIds.indexOf(id);
  if(idx>=0)store.favoriteIds.splice(idx,1);else store.favoriteIds.push(id);
  saveStore(store);
}
/* Thuật toán SRS minh bạch (SM-2 rút gọn, không gọi là FSRS) */
function recordWord(id,rating,mode){
  const now=Date.now(),prev=getWordState(id);
  let {status,reps,lapses,intervalDays,ease,wrongCount,history}=prev;
  history=Array.isArray(history)?history.slice(-29):[];
  let dueAt;
  if(rating===0){status='learning';reps=0;lapses+=1;wrongCount+=1;intervalDays=0;ease=Math.max(1.3,+(ease-0.2).toFixed(2));dueAt=now+RELEARN_MS;}
  else if(rating===1){status=reps===0?'learning':'review';reps+=1;ease=Math.max(1.3,+(ease-0.05).toFixed(2));intervalDays=reps<=1?1:Math.max(1,Math.round((intervalDays||1)*1.2));dueAt=now+intervalDays*DAY_MS;}
  else{status='review';reps+=1;ease=Math.min(2.8,+(ease+0.1).toFixed(2));intervalDays=reps<=1?3:Math.max(intervalDays+1,Math.round((intervalDays||1)*ease));dueAt=now+intervalDays*DAY_MS;}
  history.push({at:now,rating,mode:mode||store.settings.flashMode,intervalDays});
  store.words[id]={status,reps,lapses,intervalDays,ease,dueAt,lastReviewedAt:now,wrongCount,history};
  saveStore(store);
  return store.words[id];
}
function formatSrsBadge(id){
  const s=getWordState(id);
  if(s.status==='new')return 'Từ mới';
  if(isDue(id))return 'Đến hạn';
  if(s.intervalDays===0)return 'Ôn lại sớm';
  return `Sau ${s.intervalDays} ngày`;
}

const PY_MAP={'ā':'a','á':'a','ǎ':'a','à':'a','ē':'e','é':'e','ě':'e','è':'e','ī':'i','í':'i','ǐ':'i','ì':'i','ō':'o','ó':'o','ǒ':'o','ò':'o','ū':'u','ú':'u','ǔ':'u','ù':'u','ǖ':'u','ǘ':'u','ǚ':'u','ǜ':'u','ü':'u'};
function normText(s){
  return String(s||'').toLowerCase()
    .replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g,ch=>PY_MAP[ch]||ch)
    .replace(/đ/g,'d').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim();
}
function matchWord(w,q){
  if(!q)return true;
  const nq=normText(q);
  return w.zh.includes(q.trim())||normText(w.py).includes(nq)||normText(w.vi).includes(nq);
}

function highlightText(txt,sub){
  if(!sub||!txt.includes(sub))return txt;
  return txt.split(sub).join(`<em>${sub}</em>`);
}

function applySettingsUI(){
  const {showPinyin,showVi,flashMode,slowAudio}=store.settings;
  $$('#vocab,#review').forEach(v=>{
    v.classList.toggle('nopy',!showPinyin);
    v.classList.toggle('novi',!showVi);
    $$('[data-f="fmode"] button',v).forEach(b=>b.classList.toggle('on',b.dataset.fm===flashMode));
    const tpy=$('[data-f="tog-py"]',v);if(tpy){tpy.classList.toggle('on',!showPinyin);tpy.querySelector('span').textContent=showPinyin?'Ẩn pinyin':'Hiện pinyin';}
    const tvi=$('[data-f="tog-vi"]',v);if(tvi){tvi.classList.toggle('on',!showVi);tvi.querySelector('span').textContent=showVi?'Ẩn nghĩa':'Hiện nghĩa';}
    const tsl=$('[data-f="tog-slow"]',v);if(tsl){tsl.classList.toggle('on',slowAudio);tsl.querySelector('span').textContent=slowAudio?'Đọc 0.6x':'Nghe chậm';}
  });
}

function updateGlobalCounts(){
  const now=Date.now();
  const dueCnt=WORDS.filter(w=>isDue(w.id,now)).length;
  const newCnt=WORDS.filter(w=>getWordState(w.id).status==='new').length;
  const hardCnt=store.difficultIds.filter(id=>wordById(id)).length;
  const favCnt=store.favoriteIds.filter(id=>wordById(id)).length;
  const wrongCnt=WORDS.filter(w=>getWordState(w.id).wrongCount>0).length;

  const set=(s,v)=>{const el=$(s);if(el)el.textContent=v;};
  set('#home-due',`${dueCnt} từ đến hạn`);
  set('#srs-due-n',dueCnt);
  set('#srs-hard-n',hardCnt);
  set('#srs-total-n',WORDS.length);
  set('#cnt-due',dueCnt);
  set('#cnt-hard',hardCnt);
  set('#cnt-all',WORDS.length);
  set('#cnt-new',newCnt);
  set('#wb-cnt-hard',hardCnt);
  set('#wb-cnt-fav',favCnt);
  set('#wb-cnt-wrong',wrongCnt);
}

