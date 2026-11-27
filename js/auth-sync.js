/* ==========================================================================
   Hanyu AI — Tài khoản, Chế độ Học ngay (Khách), Hồ sơ/Avatar & Đồng bộ Supabase
   ========================================================================== */
window.HanyuAuth = (function(){
  const CFG_KEY = 'hanyu_supabase_cfg';
  const SESS_KEY = 'hanyu_auth_session';
  const SYNC_META_KEY = 'hanyu_cloud_sync_meta';

  const AVATAR_PRESETS = [
    { id: 'panda',   icon: '🐼', bg1: '#EA7053', bg2: '#B93F34', label: 'Gấu trúc' },
    { id: 'lantern', icon: '🏮', bg1: '#DF4B38', bg2: '#9A271D', label: 'Đèn lồng' },
    { id: 'blossom', icon: '🌸', bg1: '#F08CA2', bg2: '#C44C69', label: 'Hoa đào' },
    { id: 'tea',     icon: '🍵', bg1: '#6BA368', bg2: '#3B7441', label: 'Trà xanh' },
    { id: 'brush',   icon: '🖌️', bg1: '#856B56', bg2: '#4B382A', label: 'Bút lông' },
    { id: 'dragon',  icon: '🐉', bg1: '#E39B3C', bg2: '#B46916', label: 'Thanh long' },
    { id: 'fox',     icon: '🦊', bg1: '#EC7B40', bg2: '#C24D19', label: 'Tiểu hồ' },
    { id: 'cat',     icon: '🐱', bg1: '#EAA552', bg2: '#BE7223', label: 'Mèo nhỏ' },
    { id: 'bamboo',  icon: '🎋', bg1: '#5A9E7D', bg2: '#2F6E53', label: 'Trúc xanh' },
    { id: 'torii',   icon: '⛩️', bg1: '#C7463B', bg2: '#8B2E2E', label: 'Cổ tự' },
    { id: 'grad',    icon: '🎓', bg1: '#5B73B8', bg2: '#334785', label: 'Học giả' },
    { id: 'hanzi',   icon: '汉', bg1: '#C7463B', bg2: '#7B2219', label: 'Hán tự' }
  ];

  const esc = s => (typeof escHtml === 'function')
    ? escHtml(s)
    : String(s == null ? '' : s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function readJsonLS(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(_){ return fallback; }
  }
  function writeJsonLS(key, val){
    try{
      if(val == null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(val));
    }catch(_){}
  }

  function getSupabaseConfig(){
    const saved = readJsonLS(CFG_KEY, null);
    const preset = (typeof window.HANYU_SUPABASE_CONFIG === 'object' && window.HANYU_SUPABASE_CONFIG) || {};
    const url = String((saved && saved.url) || preset.url || '').trim().replace(/\/+$/, '');
    const anonKey = String((saved && saved.anonKey) || preset.anonKey || '').trim();
    return {
      url,
      anonKey,
      configured: /^https?:\/\/.+/.test(url) && anonKey.length > 12,
      fromLocal: Boolean(saved && saved.url && saved.anonKey)
    };
  }

  function setSupabaseConfig(url, anonKey){
    const u = String(url || '').trim().replace(/\/+$/, '');
    const k = String(anonKey || '').trim();
    if(!u && !k){
      writeJsonLS(CFG_KEY, null);
    }else{
      writeJsonLS(CFG_KEY, { url: u, anonKey: k });
    }
    syncProfileUI();
    return getSupabaseConfig();
  }

  function getSession(){
    const s = readJsonLS(SESS_KEY, null);
    if(!s || !s.access_token || !s.user || !s.user.id) return null;
    return s;
  }
  function setSession(s){
    writeJsonLS(SESS_KEY, s);
  }
  function getSyncMeta(){
    return readJsonLS(SYNC_META_KEY, { dirty: false, lastSyncedAt: 0, lastStatus: '', lastError: '' });
  }
  function setSyncMeta(patch){
    const next = Object.assign(getSyncMeta(), patch);
    writeJsonLS(SYNC_META_KEY, next);
    return next;
  }

  function showModalHtml(html){
    if(typeof openModal === 'function'){
      openModal(html);
      return;
    }
    const box = document.getElementById('hanyu-modal-box');
    const bg = document.getElementById('hanyu-modal');
    if(box) box.innerHTML = html;
    if(bg) bg.classList.remove('hide');
  }
  function hideModal(){
    if(typeof closeModal === 'function'){ closeModal(); return; }
    const bg = document.getElementById('hanyu-modal');
    if(bg) bg.classList.add('hide');
  }

  function getPresetSvgUrl(presetId){
    const p = AVATAR_PRESETS.find(x => x.id === presetId) || AVATAR_PRESETS[0];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${p.bg1}"/><stop offset="100%" stop-color="${p.bg2}"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#g)"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="56" font-family="Be Vietnam Pro,Noto Serif SC,sans-serif" font-weight="700" fill="#ffffff">${p.icon}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function getDefaultAvatarUrl(){
    const topLogo = document.querySelector('.top .logo') || document.getElementById('sb-logo-img');
    if(topLogo && topLogo.src && topLogo.src.startsWith('data:image/png')) return topLogo.src;
    return getPresetSvgUrl('panda');
  }

  function getProfile(){
    const st = (typeof store !== 'undefined' && store) ? store : {};
    const pf = (st.profile && typeof st.profile === 'object') ? st.profile : {};
    const sess = getSession();
    return {
      name: pf.name || '',
      avatarType: ['default', 'preset', 'image'].includes(pf.avatarType) ? pf.avatarType : 'default',
      avatarValue: pf.avatarValue || '',
      mode: sess ? 'account' : (pf.mode === 'account' ? 'account' : 'guest'),
      updatedAt: pf.updatedAt || null
    };
  }

  function getAvatarUrl(profileObj){
    const pf = profileObj || getProfile();
    if(pf.avatarType === 'image' && pf.avatarValue && pf.avatarValue.startsWith('data:image/')){
      return pf.avatarValue;
    }
    if(pf.avatarType === 'preset' && pf.avatarValue){
      return getPresetSvgUrl(pf.avatarValue);
    }
    return getDefaultAvatarUrl();
  }

  function compressAvatarFile(file){
    return new Promise((resolve, reject) => {
      if(!file || !file.type || !file.type.startsWith('image/')){
        reject(new Error('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WebP)'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Không đọc được tệp ảnh'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Tệp ảnh bị lỗi hoặc không hỗ trợ'));
        img.onload = () => {
          const size = 160;
          const cv = document.createElement('canvas');
          cv.width = size;
          cv.height = size;
          const ctx = cv.getContext('2d');
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          resolve(cv.toDataURL('image/jpeg', 0.84));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function hasSubstantialData(raw){
    if(!raw || typeof raw !== 'object') return false;
    if(raw.words && Object.keys(raw.words).length > 0) return true;
    if(raw.daily && Object.keys(raw.daily).length > 0) return true;
    if(raw.lessonSections && Object.keys(raw.lessonSections).length > 0) return true;
    if(raw.lessonNotes && Object.keys(raw.lessonNotes).length > 0) return true;
    if(raw.copyDrafts && Object.keys(raw.copyDrafts).length > 0) return true;
    if(raw.copyTextDrafts && Object.keys(raw.copyTextDrafts).length > 0) return true;
    if(Array.isArray(raw.events) && raw.events.length > 0) return true;
    if(Array.isArray(raw.favoriteIds) && raw.favoriteIds.length > 0) return true;
    if(Array.isArray(raw.savedLessonIds) && raw.savedLessonIds.length > 0) return true;
    return false;
  }

  function unionStrings(a, b){
    return [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].filter(x => typeof x === 'string' && x))];
  }

  function mergeStores(localRaw, remoteRaw){
    const mig = (typeof window.migrateStore === 'function') ? window.migrateStore : (x => x);
    const L = mig(localRaw || {});
    const R = mig(remoteRaw || {});
    const out = mig(R);

    // Words SRS: giữ bản mới hơn theo lastReviewedAt hoặc số lần ôn nhiều hơn
    const allWordIds = new Set([...Object.keys(R.words || {}), ...Object.keys(L.words || {})]);
    out.words = {};
    allWordIds.forEach(id => {
      const rw = R.words[id], lw = L.words[id];
      if(!rw) out.words[id] = lw;
      else if(!lw) out.words[id] = rw;
      else{
        const rt = rw.lastReviewedAt || 0, lt = lw.lastReviewedAt || 0;
        out.words[id] = (lt > rt || (lt === rt && (lw.reps || 0) > (rw.reps || 0))) ? lw : rw;
      }
    });

    out.difficultIds = unionStrings(R.difficultIds, L.difficultIds);
    out.favoriteIds = unionStrings(R.favoriteIds, L.favoriteIds);
    out.savedLessonIds = unionStrings(R.savedLessonIds, L.savedLessonIds);
    out.downloadedLessonIds = unionStrings(R.downloadedLessonIds, L.downloadedLessonIds);
    if(L.vocabBank || R.vocabBank){
      out.vocabBank = Object.assign({}, R.vocabBank || {}, L.vocabBank || {});
    }

    // Daily stats: lấy max từng ngày
    out.daily = Object.assign({}, R.daily || {});
    Object.entries(L.daily || {}).forEach(([dk, dv]) => {
      if(!out.daily[dk]){ out.daily[dk] = dv; return; }
      const rv = out.daily[dk];
      const mergedDay = {};
      ['minutes','seconds','newWords','reviews','listen','speak','write','correct','events'].forEach(f => {
        mergedDay[f] = Math.max(Number(rv[f]) || 0, Number(dv[f]) || 0);
      });
      out.daily[dk] = mergedDay;
    });

    // Events: hợp nhất theo id
    const evMap = new Map();
    [...(R.events || []), ...(L.events || [])].forEach(ev => {
      if(ev && ev.id) evMap.set(ev.id, ev);
    });
    out.events = [...evMap.values()].sort((a, b) => (a.at || 0) - (b.at || 0)).slice(-200);

    // Lesson sections completion
    out.lessonSections = {};
    const lsIds = new Set([...Object.keys(R.lessonSections || {}), ...Object.keys(L.lessonSections || {})]);
    lsIds.forEach(lid => {
      out.lessonSections[lid] = Object.assign({}, (R.lessonSections && R.lessonSections[lid]) || {}, (L.lessonSections && L.lessonSections[lid]) || {});
    });

    // Notes & Copy drafts
    out.lessonNotes = Object.assign({}, R.lessonNotes || {});
    Object.entries(L.lessonNotes || {}).forEach(([lid, ln]) => {
      const rn = out.lessonNotes[lid];
      if(!rn){ out.lessonNotes[lid] = ln; return; }
      const rTxt = rn.text || '', lTxt = ln.text || '';
      const text = (lTxt.length >= rTxt.length) ? lTxt : rTxt;
      const strokes = (Array.isArray(ln.strokes) && ln.strokes.length >= (Array.isArray(rn.strokes) ? rn.strokes.length : 0)) ? ln.strokes : (rn.strokes || []);
      out.lessonNotes[lid] = { text, strokes };
    });
    out.copyDrafts = Object.assign({}, R.copyDrafts || {}, L.copyDrafts || {});
    out.copyTextDrafts = Object.assign({}, R.copyTextDrafts || {}, L.copyTextDrafts || {});

    // Writing & Speaking items
    const wIds = new Set([...Object.keys((R.writing && R.writing.chars) || {}), ...Object.keys((L.writing && L.writing.chars) || {})]);
    out.writing.chars = {};
    wIds.forEach(id => {
      const rw = R.writing.chars[id], lw = L.writing.chars[id];
      if(!rw) out.writing.chars[id] = lw;
      else if(!lw) out.writing.chars[id] = rw;
      else out.writing.chars[id] = ((lw.lastPracticedAt || 0) >= (rw.lastPracticedAt || 0)) ? lw : rw;
    });

    const sIds = new Set([...Object.keys((R.speaking && R.speaking.items) || {}), ...Object.keys((L.speaking && L.speaking.items) || {})]);
    out.speaking.items = {};
    sIds.forEach(id => {
      const rs = R.speaking.items[id], ls = L.speaking.items[id];
      if(!rs) out.speaking.items[id] = ls;
      else if(!ls) out.speaking.items[id] = rs;
      else out.speaking.items[id] = ((ls.lastPracticedAt || 0) >= (rs.lastPracticedAt || 0)) ? ls : rs;
    });

    // Quizzes stats
    out.exercises.attempts = Math.max(R.exercises.attempts || 0, L.exercises.attempts || 0);
    out.exercises.bestPct = Math.max(R.exercises.bestPct || 0, L.exercises.bestPct || 0);
    out.grammarQuiz.attempts = Math.max(R.grammarQuiz.attempts || 0, L.grammarQuiz.attempts || 0);
    out.grammarQuiz.bestPct = Math.max(R.grammarQuiz.bestPct || 0, L.grammarQuiz.bestPct || 0);
    out.listening.attempts = Math.max(R.listening.attempts || 0, L.listening.attempts || 0);
    out.listening.bestPct = Math.max(R.listening.bestPct || 0, L.listening.bestPct || 0);

    // Course progress
    out.courseProgress = {};
    const cpIds = new Set([...Object.keys(R.courseProgress || {}), ...Object.keys(L.courseProgress || {})]);
    cpIds.forEach(cid => {
      const rcp = R.courseProgress[cid] || {}, lcp = L.courseProgress[cid] || {};
      out.courseProgress[cid] = {
        completedLessonIds: unionStrings(rcp.completedLessonIds, lcp.completedLessonIds),
        currentLessonId: rcp.currentLessonId || lcp.currentLessonId || null
      };
    });

    // learningSetup & profile
    const rLsTime = (R.learningSetup && R.learningSetup.updatedAt) || 0;
    const lLsTime = (L.learningSetup && L.learningSetup.updatedAt) || 0;
    if(L.learningSetup && L.learningSetup.completed && (!R.learningSetup || !R.learningSetup.completed || lLsTime > rLsTime)){
      out.learningSetup = L.learningSetup;
      if(L.activeCourseId) out.activeCourseId = L.activeCourseId;
      if(L.activeLessonId) out.activeLessonId = L.activeLessonId;
    }

    const rPfTime = (R.profile && R.profile.updatedAt) || 0;
    const lPfTime = (L.profile && L.profile.updatedAt) || 0;
    const pickLocalPf = (!R.profile || (!R.profile.name && L.profile && L.profile.name) || lPfTime > rPfTime);
    out.profile = Object.assign({}, pickLocalPf ? (L.profile || {}) : (R.profile || {}), { mode: 'account' });
    if(!out.profile.name && R.profile && R.profile.name) out.profile.name = R.profile.name;
    if(!out.profile.name && L.profile && L.profile.name) out.profile.name = L.profile.name;

    return mig(out);
  }

  function parseApiError(data, status){
    const msg = String((data && (data.error_description || data.msg || data.message || data.error)) || '');
    const low = msg.toLowerCase();
    if(low.includes('invalid login credentials')) return 'Sai email hoặc mật khẩu';
    if(low.includes('already registered')) return 'Email này đã được đăng ký, hãy chuyển sang Đăng nhập';
    if(low.includes('email not confirmed')) return 'Email chưa được xác nhận · Hãy kiểm tra hộp thư (hoặc tắt Confirm Email trong Supabase)';
    if(low.includes('password should be at least')) return 'Mật khẩu cần tối thiểu 6 ký tự';
    if(low.includes('relation') && low.includes('hanyu_user_data')) return 'Chưa tạo bảng hanyu_user_data trên Supabase (hãy chạy SQL trong docs/SUPABASE_SETUP.sql)';
    if(low.includes('permission denied') && low.includes('hanyu_user_data')) return 'Thiếu quyền truy cập bảng hanyu_user_data trên Supabase — hãy chạy lệnh GRANT trong docs/SUPABASE_SETUP.sql tại SQL Editor';
    if(status === 0 || low.includes('failed to fetch')) return 'Không kết nối được tới Supabase (kiểm tra mạng hoặc URL dự án)';
    return msg || `Lỗi kết nối (${status})`;
  }

  async function supaFetch(path, opts){
    const cfg = getSupabaseConfig();
    if(!cfg.configured) throw new Error('Chưa cấu hình Supabase URL & Anon Key');
    opts = opts || {};
    const headers = Object.assign({
      'apikey': cfg.anonKey,
      'Content-Type': 'application/json'
    }, opts.headers || {});
    const res = await fetch(cfg.url + path, Object.assign({}, opts, { headers }));
    let data = null;
    const txt = await res.text();
    if(txt){
      try{ data = JSON.parse(txt); }catch(_){ data = { message: txt }; }
    }
    if(!res.ok){
      throw new Error(parseApiError(data, res.status));
    }
    return data;
  }

  async function ensureValidToken(){
    const sess = getSession();
    const cfg = getSupabaseConfig();
    if(!sess || !cfg.configured) return null;
    const nowSec = Math.floor(Date.now() / 1000);
    if(sess.expires_at && sess.expires_at > nowSec + 60){
      return sess.access_token;
    }
    if(!sess.refresh_token) return sess.access_token;
    try{
      const data = await supaFetch('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: sess.refresh_token })
      });
      if(data && data.access_token){
        const updated = {
          access_token: data.access_token,
          refresh_token: data.refresh_token || sess.refresh_token,
          expires_at: data.expires_at || (nowSec + (data.expires_in || 3600)),
          user: data.user || sess.user
        };
        setSession(updated);
        return updated.access_token;
      }
    }catch(err){
      setSyncMeta({ lastError: err.message });
    }
    return null;
  }

  async function fetchRemoteRow(accessToken, userId){
    const rows = await supaFetch(
      `/rest/v1/hanyu_user_data?user_id=eq.${encodeURIComponent(userId)}&select=payload,display_name,updated_at`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  async function upsertRemotePayload(accessToken, userId, email, st, useKeepAlive){
    const pfName = (st && st.profile && st.profile.name) || '';
    const body = {
      user_id: userId,
      email: email || '',
      display_name: pfName,
      payload: st,
      updated_at: new Date().toISOString()
    };
    const cfg = getSupabaseConfig();
    if(!cfg.configured) return;
    const res = await fetch(cfg.url + '/rest/v1/hanyu_user_data?on_conflict=user_id', {
      method: 'POST',
      keepalive: !!useKeepAlive,
      headers: {
        'apikey': cfg.anonKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(body)
    });
    if(!res.ok){
      const txt = await res.text();
      let data = null;
      try{ data = JSON.parse(txt); }catch(_){}
      throw new Error(parseApiError(data, res.status));
    }
  }

  let pushTimer = null;
  let pushingNow = false;

  async function pushCloud(st, useKeepAlive){
    const sess = getSession();
    const cfg = getSupabaseConfig();
    if(!sess || !cfg.configured || pushingNow) return false;
    pushingNow = true;
    try{
      const token = await ensureValidToken();
      if(!token) return false;
      const curStore = st || (typeof store !== 'undefined' ? store : null);
      if(!curStore) return false;
      if(!curStore.profile || typeof curStore.profile !== 'object'){
        curStore.profile = { name: '', avatarType: 'default', avatarValue: '', mode: 'account', updatedAt: Date.now() };
      }else{
        curStore.profile.mode = 'account';
      }
      await upsertRemotePayload(token, sess.user.id, sess.user.email, curStore, useKeepAlive);
      setSyncMeta({ dirty: false, lastSyncedAt: Date.now(), lastStatus: 'Đã đồng bộ Cloud', lastError: '' });
      syncProfileUI();
      return true;
    }catch(err){
      setSyncMeta({ dirty: true, lastError: err.message || 'Lỗi đồng bộ' });
      syncProfileUI();
      return false;
    }finally{
      pushingNow = false;
    }
  }

  function scheduleCloudPush(st){
    const sess = getSession();
    const cfg = getSupabaseConfig();
    if(!sess || !cfg.configured) return;
    setSyncMeta({ dirty: true });
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      pushCloud(st || (typeof store !== 'undefined' ? store : null), false);
    }, 2200);
  }

  async function syncNow(silent){
    const sess = getSession();
    const cfg = getSupabaseConfig();
    if(!sess || !cfg.configured) return false;
    try{
      const token = await ensureValidToken();
      if(!token) throw new Error('Phiên đăng nhập hết hạn, hãy đăng nhập lại');
      const row = await fetchRemoteRow(token, sess.user.id);
      const localSt = typeof store !== 'undefined' ? store : {};
      const meta = getSyncMeta();
      const remotePayload = row && row.payload && typeof row.payload === 'object' ? row.payload : null;
      const remoteMs = row && row.updated_at ? Date.parse(row.updated_at) || 0 : 0;

      if(remotePayload && hasSubstantialData(remotePayload)){
        if(meta.dirty || remoteMs <= (meta.lastSyncedAt || 0)){
          const merged = mergeStores(localSt, remotePayload);
          if(typeof window.applySyncedStore === 'function') window.applySyncedStore(merged);
          await upsertRemotePayload(token, sess.user.id, sess.user.email, merged, false);
        }else if(remoteMs > (meta.lastSyncedAt || 0)){
          const merged = mergeStores(localSt, remotePayload);
          if(typeof window.applySyncedStore === 'function') window.applySyncedStore(merged);
        }
      }else{
        await upsertRemotePayload(token, sess.user.id, sess.user.email, localSt, false);
      }
      setSyncMeta({ dirty: false, lastSyncedAt: Date.now(), lastStatus: 'Đã đồng bộ Cloud', lastError: '' });
      syncProfileUI();
      if(!silent && typeof toast === 'function') toast('Đã đồng bộ dữ liệu tài khoản thành công!');
      return true;
    }catch(err){
      setSyncMeta({ lastError: err.message });
      syncProfileUI();
      if(!silent && typeof toast === 'function') toast(err.message);
      return false;
    }
  }

  async function signIn(email, password){
    const em = String(email || '').trim().toLowerCase();
    const pw = String(password || '');
    if(!em || !pw) throw new Error('Vui lòng nhập đầy đủ Email và Mật khẩu');

    const data = await supaFetch('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email: em, password: pw })
    });
    if(!data || !data.access_token || !data.user){
      throw new Error('Không nhận được phiên đăng nhập từ máy chủ');
    }
    const nowSec = Math.floor(Date.now() / 1000);
    setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token || '',
      expires_at: data.expires_at || (nowSec + (data.expires_in || 3600)),
      user: data.user
    });

    const row = await fetchRemoteRow(data.access_token, data.user.id);
    const localSt = typeof store !== 'undefined' ? store : {};
    const remotePayload = row && row.payload && typeof row.payload === 'object' ? row.payload : null;
    let msg = 'Đã đăng nhập thành công!';

    if(remotePayload && (hasSubstantialData(remotePayload) || (remotePayload.learningSetup && remotePayload.learningSetup.completed))){
      const localWasGuestActive = (localSt.profile && localSt.profile.mode !== 'account') && hasSubstantialData(localSt);
      const finalStore = localWasGuestActive ? mergeStores(localSt, remotePayload) : mergeStores(remotePayload, remotePayload);
      if(!finalStore.profile) finalStore.profile = {};
      if(!finalStore.profile.name){
        finalStore.profile.name = (row.display_name || (data.user.user_metadata && data.user.user_metadata.display_name) || em.split('@')[0]);
      }
      finalStore.profile.mode = 'account';
      finalStore.learningSetup = finalStore.learningSetup || {};
      finalStore.learningSetup.completed = true;
      if(typeof window.applySyncedStore === 'function') window.applySyncedStore(finalStore);
      if(localWasGuestActive){
        await upsertRemotePayload(data.access_token, data.user.id, em, finalStore, false);
        msg = 'Đã gộp dữ liệu Học ngay vào tài khoản & đồng bộ Cloud!';
      }else{
        msg = 'Đã đăng nhập & khôi phục dữ liệu từ tài khoản!';
      }
    }else{
      if(!localSt.profile) localSt.profile = {};
      if(!localSt.profile.name){
        localSt.profile.name = (data.user.user_metadata && data.user.user_metadata.display_name) || em.split('@')[0];
      }
      localSt.profile.mode = 'account';
      localSt.profile.updatedAt = Date.now();
      if(!localSt.learningSetup) localSt.learningSetup = { completed: true, level: 1, mode: 'parallel', activeTrack: 'hanngu', updatedAt: Date.now() };
      else localSt.learningSetup.completed = true;
      if(typeof saveStore === 'function') saveStore(localSt, { skipCloud: true });
      await upsertRemotePayload(data.access_token, data.user.id, em, localSt, false);
      msg = 'Đã đăng nhập & sao lưu tiến độ hiện tại lên tài khoản!';
    }
    setSyncMeta({ dirty: false, lastSyncedAt: Date.now(), lastStatus: 'Đã đồng bộ Cloud', lastError: '' });
    syncProfileUI();
    return { message: msg };
  }

  async function signUp(email, password, displayName, quickSetup){
    const em = String(email || '').trim().toLowerCase();
    const pw = String(password || '');
    const nm = String(displayName || '').trim() || em.split('@')[0] || 'Học viên';
    if(!em || !em.includes('@')) throw new Error('Vui lòng nhập Email hợp lệ');
    if(pw.length < 6) throw new Error('Mật khẩu cần tối thiểu 6 ký tự');

    const data = await supaFetch('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: em,
        password: pw,
        data: { display_name: nm }
      })
    });

    if(data && data.access_token && data.user){
      const nowSec = Math.floor(Date.now() / 1000);
      setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token || '',
        expires_at: data.expires_at || (nowSec + (data.expires_in || 3600)),
        user: data.user
      });
      const st = typeof store !== 'undefined' ? store : {};
      st.profile = {
        name: nm,
        avatarType: (quickSetup && quickSetup.avatarType) || (st.profile && st.profile.avatarType) || 'default',
        avatarValue: (quickSetup && quickSetup.avatarValue) || (st.profile && st.profile.avatarValue) || '',
        mode: 'account',
        updatedAt: Date.now()
      };
      if(quickSetup && quickSetup.level){
        const chosenMode = quickSetup.mode || 'parallel';
        const chosenTrack = chosenMode === 'hsk30' ? 'hsk30' : 'hanngu';
        st.learningSetup = {
          completed: true,
          level: quickSetup.level,
          mode: chosenMode,
          activeTrack: chosenTrack,
          updatedAt: Date.now()
        };
        if(typeof getCourseIdForTrack === 'function'){
          st.activeCourseId = getCourseIdForTrack(quickSetup.level, chosenTrack);
        }
      }else if(st.learningSetup){
        st.learningSetup.completed = true;
      }
      if(typeof window.applySyncedStore === 'function') window.applySyncedStore(st);
      await upsertRemotePayload(data.access_token, data.user.id, em, st, false);
      setSyncMeta({ dirty: false, lastSyncedAt: Date.now(), lastStatus: 'Đã đồng bộ Cloud', lastError: '' });
      syncProfileUI();
      return { needEmailConfirm: false, message: 'Đăng ký thành công & đã đồng bộ dữ liệu lên tài khoản!' };
    }

    // Supabase yêu cầu xác nhận email trước khi cấp session
    return {
      needEmailConfirm: true,
      message: 'Đăng ký thành công! Hãy mở email bấm liên kết xác nhận, rồi quay lại tab Đăng nhập để đồng bộ dữ liệu.'
    };
  }

  async function signOut(resetLocal){
    clearTimeout(pushTimer);
    const sess = getSession();
    const cfg = getSupabaseConfig();
    if(sess && cfg.configured){
      try{ await pushCloud(typeof store !== 'undefined' ? store : null, false); }catch(_){}
      try{
        await fetch(cfg.url + '/auth/v1/logout', {
          method: 'POST',
          headers: { 'apikey': cfg.anonKey, 'Authorization': `Bearer ${sess.access_token}` }
        });
      }catch(_){}
    }
    setSession(null);
    setSyncMeta({ dirty: false, lastSyncedAt: 0, lastStatus: '', lastError: '' });
    if(resetLocal && typeof window.defaultStore === 'function' && typeof window.applySyncedStore === 'function'){
      window.applySyncedStore(window.defaultStore());
      syncProfileUI();
      if(typeof toast === 'function') toast('Đã đăng xuất & tạo không gian học mới trên thiết bị');
      openWelcomeModal(true);
      return;
    }
    if(typeof store !== 'undefined' && store){
      if(!store.profile) store.profile = {};
      store.profile.mode = 'guest';
      if(typeof saveStore === 'function') saveStore(store, { skipCloud: true });
    }
    syncProfileUI();
    if(typeof toast === 'function') toast('Đã đăng xuất · Dữ liệu hiện tại chuyển về lưu cục bộ trên máy này');
  }

  function saveGuestOnboarding(opts){
    const st = typeof store !== 'undefined' ? store : null;
    if(!st) return;
    const lv = Math.max(1, Math.min(6, Number(opts.level) || 1));
    const chosenMode = ['hanngu', 'hsk30', 'parallel'].includes(opts.mode) ? opts.mode : 'parallel';
    const chosenTrack = chosenMode === 'hsk30' ? 'hsk30' : 'hanngu';
    st.profile = {
      name: String(opts.name || '').trim().slice(0, 48),
      avatarType: ['default', 'preset', 'image'].includes(opts.avatarType) ? opts.avatarType : 'default',
      avatarValue: String(opts.avatarValue || ''),
      mode: getSession() ? 'account' : 'guest',
      updatedAt: Date.now()
    };
    st.learningSetup = {
      completed: true,
      level: lv,
      mode: chosenMode,
      activeTrack: chosenTrack,
      updatedAt: Date.now()
    };
    const targetCid = typeof getCourseIdForTrack === 'function' ? getCourseIdForTrack(lv, chosenTrack) : `course_hn_${lv}`;
    if(typeof saveStore === 'function') saveStore(st);
    hideModal();
    if(typeof switchToCourse === 'function') switchToCourse(targetCid);
    else{
      st.activeCourseId = targetCid;
      if(typeof renderRoadmap === 'function') renderRoadmap();
    }
    if(typeof refreshDashboards === 'function') refreshDashboards();
    syncProfileUI();
    const who = st.profile.name ? st.profile.name : 'bạn';
    if(typeof toast === 'function'){
      toast(`Chào ${who}! Đã sẵn sàng học ở cấp HSK ${lv}`);
    }
  }

  function openWelcomeModal(isFirstRun){
    const pf = getProfile();
    const ls = (typeof store !== 'undefined' && store.learningSetup) ? store.learningSetup : { level: 1, mode: 'parallel' };
    const cfg = getSupabaseConfig();
    let tab = 'guest'; // 'guest' | 'auth'
    let authSub = 'login'; // 'login' | 'signup'
    let draft = {
      name: pf.name || '',
      avatarType: pf.avatarType || 'default',
      avatarValue: pf.avatarValue || '',
      level: ls.level || 1,
      mode: ls.completed ? (ls.mode || 'parallel') : 'parallel'
    };

    const hskLevels = [
      [1, 'HSK 1', 'Mới bắt đầu'],
      [2, 'HSK 2', 'Sơ cấp'],
      [3, 'HSK 3', 'Trung cấp nền'],
      [4, 'HSK 4', 'Trung cấp'],
      [5, 'HSK 5', 'Nâng cao'],
      [6, 'HSK 6', 'Cao cấp']
    ];

    const render = () => {
      const avUrl = getAvatarUrl(draft);
      const presetsRow = `
        <button type="button" class="au-av-opt ${draft.avatarType==='default'?'on':''}" data-av-t="default" data-av-v="" title="Mặc định">
          <img src="${esc(getDefaultAvatarUrl())}" alt="Mặc định"/>
        </button>
        ${AVATAR_PRESETS.slice(0, 5).map(p => `
          <button type="button" class="au-av-opt ${draft.avatarType==='preset'&&draft.avatarValue===p.id?'on':''}" data-av-t="preset" data-av-v="${p.id}" title="${esc(p.label)}">
            <img src="${esc(getPresetSvgUrl(p.id))}" alt="${esc(p.label)}"/>
          </button>
        `).join('')}
        <button type="button" class="au-av-more" id="au-open-all-av" title="Chọn thêm hoặc tải ảnh">+</button>
      `;

      const guestPane = `
        <div class="au-pane">
          <div class="au-prof-preview">
            <img class="au-big-av" id="au-prev-av" src="${esc(avUrl)}" alt="Avatar"/>
            <div class="au-prof-fields">
              <label class="au-lbl">Tên của bạn</label>
              <input class="au-inp" id="au-guest-name" type="text" maxlength="40" value="${esc(draft.name)}" placeholder="Ví dụ: Minh, Lan..."/>
            </div>
          </div>
          <div class="au-lbl-row"><span>Chọn nhanh Avatar</span><label class="au-upload-lbl">📷 Tải ảnh lên<input type="file" id="au-guest-file" accept="image/*" hidden/></label></div>
          <div class="au-av-strip">${presetsRow}</div>

          <div class="au-lbl" style="margin-top:10px">Cấp độ tiếng Trung muốn học</div>
          <div class="au-lvl-grid">
            ${hskLevels.map(([lv, lbl, sub]) => `
              <button type="button" class="au-lvl-btn ${draft.level===lv?'on':''}" data-glvl="${lv}">
                <b>${lbl}</b><span>${sub}</span>
              </button>
            `).join('')}
          </div>

          <div class="au-lbl" style="margin-top:10px">Lộ trình giáo trình</div>
          <div class="au-mode-grid">
            <button type="button" class="au-mode-btn ${draft.mode==='parallel'?'on':''}" data-gmode="parallel"><b>Song song</b><span>Hán ngữ + HSK 3.0</span></button>
            <button type="button" class="au-mode-btn ${draft.mode==='hanngu'?'on':''}" data-gmode="hanngu"><b>Hán ngữ</b><span>Quyển ${draft.level}</span></button>
            <button type="button" class="au-mode-btn ${draft.mode==='hsk30'?'on':''}" data-gmode="hsk30"><b>NEW HSK 3.0</b><span>Cấp ${draft.level}</span></button>
          </div>

          <div class="au-notice warn">
            <span>📱</span>
            <span><b>Chế độ Học ngay:</b> Dữ liệu chỉ lưu trên thiết bị này — chuyển sang thiết bị khác sẽ không mang theo tiến độ. Bạn có thể đăng nhập/đăng ký bất kỳ lúc nào để đồng bộ.</span>
          </div>

          <div class="au-foot">
            ${!isFirstRun ? '<button type="button" class="btn ghost sm" id="au-cancel-btn">Đóng</button>' : '<button type="button" class="btn ghost sm" id="au-go-auth-btn">Đăng nhập / Lưu Cloud</button>'}
            <button type="button" class="btn sm" id="au-start-guest-btn">Bắt đầu học ngay →</button>
          </div>
        </div>`;

      const authPane = renderAuthFormHtml(authSub, cfg, draft.name, isFirstRun);

      showModalHtml(`
        <div class="au-modal">
          <div class="au-head">
            <h2>Chào mừng đến Hanyu AI</h2>
            <p>Chọn chế độ <b>Học ngay</b> trên máy này hoặc <b>Đăng nhập</b> để đồng bộ mọi thiết bị</p>
          </div>
          <div class="au-tabs">
            <button type="button" class="${tab==='guest'?'on':''}" data-autab="guest">🚀 Học ngay (Khách)</button>
            <button type="button" class="${tab==='auth'?'on':''}" data-autab="auth">☁️ Tài khoản Cloud</button>
          </div>
          ${tab === 'guest' ? guestPane : authPane}
        </div>
      `);

      $$('#hanyu-modal-box [data-autab]').forEach(b => b.onclick = () => { tab = b.dataset.autab; render(); });

      if(tab === 'guest'){
        const nameInp = $('#au-guest-name');
        if(nameInp) nameInp.oninput = () => { draft.name = nameInp.value; };

        $$('#hanyu-modal-box [data-av-t]').forEach(b => b.onclick = () => {
          draft.avatarType = b.dataset.avT;
          draft.avatarValue = b.dataset.avV;
          render();
        });
        const moreBtn = $('#au-open-all-av');
        if(moreBtn) moreBtn.onclick = () => {
          const allHtml = `<div class="au-av-grid">${AVATAR_PRESETS.map(p => `<button type="button" class="au-av-opt ${draft.avatarType==='preset'&&draft.avatarValue===p.id?'on':''}" data-av-t="preset" data-av-v="${p.id}" title="${esc(p.label)}"><img src="${esc(getPresetSvgUrl(p.id))}" alt="${esc(p.label)}"/></button>`).join('')}</div>`;
          const strip = $('#hanyu-modal-box .au-av-strip');
          if(strip){
            strip.outerHTML = allHtml;
            $$('#hanyu-modal-box [data-av-t]').forEach(b => b.onclick = () => {
              draft.avatarType = b.dataset.avT;
              draft.avatarValue = b.dataset.avV;
              const prev = $('#au-prev-av');
              if(prev) prev.src = getAvatarUrl(draft);
              $$('#hanyu-modal-box [data-av-t]').forEach(x => x.classList.toggle('on', x === b));
            });
          }
        };
        const fInp = $('#au-guest-file');
        if(fInp) fInp.onchange = async () => {
          const file = fInp.files && fInp.files[0];
          if(!file) return;
          try{
            const dataUrl = await compressAvatarFile(file);
            draft.avatarType = 'image';
            draft.avatarValue = dataUrl;
            const prev = $('#au-prev-av');
            if(prev) prev.src = dataUrl;
            if(typeof toast === 'function') toast('Đã chọn ảnh đại diện mới');
          }catch(err){
            if(typeof toast === 'function') toast(err.message);
          }
        };

        $$('#hanyu-modal-box [data-glvl]').forEach(b => b.onclick = () => {
          draft.level = Number(b.dataset.glvl) || 1;
          render();
        });
        $$('#hanyu-modal-box [data-gmode]').forEach(b => b.onclick = () => {
          draft.mode = b.dataset.gmode;
          render();
        });
        if($('#au-go-auth-btn')) $('#au-go-auth-btn').onclick = () => { tab = 'auth'; render(); };
        if($('#au-cancel-btn')) $('#au-cancel-btn').onclick = hideModal;
        if($('#au-start-guest-btn')) $('#au-start-guest-btn').onclick = () => {
          saveGuestOnboarding(draft);
        };
      }else{
        bindAuthFormEvents(authSub, nextSub => { authSub = nextSub; render(); }, draft, () => openWelcomeModal(isFirstRun));
      }
    };
    render();
  }

  function renderAuthFormHtml(authSub, cfg, defaultName, isFirstRun){
    const hasGuestProgress = hasSubstantialData(typeof store !== 'undefined' ? store : {});
    return `
      <div class="au-pane">
        ${!cfg.configured ? `
          <div class="au-cfg-warn">
            <div>
              <b>Chưa kết nối Supabase</b>
              <p>Để bật đồng bộ xuyên thiết bị miễn phí, hãy dán Project URL và Anon Key từ Supabase.</p>
            </div>
            <button type="button" class="btn ghost sm" id="au-open-cfg-btn">⚙️ Cài đặt Supabase</button>
          </div>` : `
          <div class="au-cfg-ok">
            <span>☁️ Đã kết nối Supabase</span>
            <button type="button" class="au-link-btn" id="au-open-cfg-btn">Đổi cấu hình</button>
          </div>`}

        <div class="au-subseg">
          <button type="button" class="${authSub==='login'?'on':''}" data-ausub="login">Đăng nhập</button>
          <button type="button" class="${authSub==='signup'?'on':''}" data-ausub="signup">Đăng ký tài khoản</button>
        </div>

        <form class="au-form" id="au-auth-form">
          ${authSub === 'signup' ? `
            <div class="au-fld">
              <label>Tên hiển thị</label>
              <input class="au-inp" id="au-name" type="text" maxlength="40" value="${esc(defaultName || '')}" placeholder="Tên của bạn (ví dụ: Minh)"/>
            </div>` : ''}
          <div class="au-fld">
            <label>Email</label>
            <input class="au-inp" id="au-email" type="email" autocomplete="email" required placeholder="tenban@gmail.com"/>
          </div>
          <div class="au-fld">
            <label>Mật khẩu</label>
            <input class="au-inp" id="au-pass" type="password" autocomplete="${authSub==='signup'?'new-password':'current-password'}" minlength="6" required placeholder="Tối thiểu 6 ký tự"/>
          </div>
          <div class="au-err hide" id="au-err"></div>

          <div class="au-notice info">
            <span>☁️</span>
            <span>${hasGuestProgress
              ? 'Dữ liệu <b>Học ngay</b> hiện tại trên máy sẽ tự động được <b>gộp &amp; đồng bộ</b> vào tài khoản sau khi ' + (authSub === 'signup' ? 'đăng ký' : 'đăng nhập') + '.'
              : 'Chỉ cần đăng nhập tài khoản trên bất kỳ thiết bị nào để khôi phục toàn bộ từ vựng, bài học và tiến độ.'}</span>
          </div>

          <div class="au-foot">
            <button type="button" class="btn ghost sm" id="au-close-auth-btn">${isFirstRun ? 'Học ngay không cần TK' : 'Đóng'}</button>
            <button type="submit" class="btn sm" id="au-submit-btn">${authSub === 'signup' ? 'Đăng ký &amp; Đồng bộ' : 'Đăng nhập &amp; Đồng bộ'}</button>
          </div>
        </form>
      </div>`;
  }

  function bindAuthFormEvents(authSub, onSwitchSub, quickSetup, onBack){
    $$('#hanyu-modal-box [data-ausub]').forEach(b => b.onclick = () => onSwitchSub(b.dataset.ausub));
    const cfgBtn = $('#au-open-cfg-btn');
    if(cfgBtn) cfgBtn.onclick = () => openSupabaseConfigModal(onBack);

    const closeBtn = $('#au-close-auth-btn');
    if(closeBtn) closeBtn.onclick = () => hideModal();

    const form = $('#au-auth-form');
    if(!form) return;
    form.onsubmit = async e => {
      e.preventDefault();
      const errEl = $('#au-err');
      const subBtn = $('#au-submit-btn');
      const email = $('#au-email') ? $('#au-email').value : '';
      const pass = $('#au-pass') ? $('#au-pass').value : '';
      const name = $('#au-name') ? $('#au-name').value : '';
      if(errEl){ errEl.classList.add('hide'); errEl.textContent = ''; }
      if(!getSupabaseConfig().configured){
        if(errEl){
          errEl.textContent = 'Hãy bấm “Cài đặt Supabase” phía trên để nhập Project URL và Anon Key trước khi đăng nhập.';
          errEl.classList.remove('hide');
        }
        return;
      }
      if(subBtn){ subBtn.disabled = true; subBtn.textContent = 'Đang xử lý...'; }
      try{
        const res = authSub === 'signup'
          ? await signUp(email, pass, name, quickSetup)
          : await signIn(email, pass);
        if(res && res.needEmailConfirm){
          if(errEl){
            errEl.style.color = '#1D6530';
            errEl.style.background = '#EAF6ED';
            errEl.textContent = res.message;
            errEl.classList.remove('hide');
          }
          if(subBtn){ subBtn.disabled = false; subBtn.textContent = 'Đăng ký & Đồng bộ'; }
          return;
        }
        hideModal();
        if(typeof toast === 'function') toast(res.message || 'Đồng bộ tài khoản thành công!');
      }catch(err){
        if(errEl){
          errEl.style.color = '';
          errEl.style.background = '';
          errEl.textContent = err.message || 'Không thể đăng nhập';
          errEl.classList.remove('hide');
        }
        if(subBtn){
          subBtn.disabled = false;
          subBtn.textContent = authSub === 'signup' ? 'Đăng ký & Đồng bộ' : 'Đăng nhập & Đồng bộ';
        }
      }
    };
  }

  function openAuthModal(initialSub){
    let authSub = initialSub === 'signup' ? 'signup' : 'login';
    const pf = getProfile();
    const render = () => {
      const cfg = getSupabaseConfig();
      showModalHtml(`
        <div class="au-modal">
          <div class="au-head">
            <h2>Tài khoản &amp; Đồng bộ thiết bị</h2>
            <p>Lưu tiến độ trên đám mây (Supabase) để chuyển thiết bị không bị mất dữ liệu</p>
          </div>
          ${renderAuthFormHtml(authSub, cfg, pf.name || '', false)}
        </div>
      `);
      bindAuthFormEvents(authSub, next => { authSub = next; render(); }, null, () => openAuthModal(authSub));
    };
    render();
  }

  function openProfileModal(){
    const pf = getProfile();
    const sess = getSession();
    const cfg = getSupabaseConfig();
    const meta = getSyncMeta();
    let draft = {
      name: pf.name || '',
      avatarType: pf.avatarType || 'default',
      avatarValue: pf.avatarValue || ''
    };

    const render = () => {
      const avUrl = getAvatarUrl(draft);
      const badgeTxt = sess
        ? `☁️ Tài khoản: ${sess.user.email || 'Đã kết nối'}`
        : '📱 Chế độ Học ngay (Chỉ lưu trên thiết bị này)';

      showModalHtml(`
        <div class="au-modal">
          <div class="au-head">
            <h2>Hồ sơ học viên</h2>
            <p>${esc(badgeTxt)}</p>
          </div>

          <div class="au-prof-preview">
            <img class="au-big-av" id="pf-prev-av" src="${esc(avUrl)}" alt="Avatar"/>
            <div class="au-prof-fields">
              <label class="au-lbl">Tên hiển thị</label>
              <input class="au-inp" id="pf-name-inp" type="text" maxlength="40" value="${esc(draft.name)}" placeholder="Nhập tên của bạn..."/>
              <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">
                <label class="au-upload-lbl">📷 Chọn ảnh từ máy<input type="file" id="pf-file-inp" accept="image/*" hidden/></label>
                <button type="button" class="au-upload-lbl" id="pf-setup-lvl">🎯 Đổi cấp độ / giáo trình</button>
              </div>
            </div>
          </div>

          <div class="au-lbl" style="margin-top:10px">Hoặc chọn nhanh Avatar có sẵn</div>
          <div class="au-av-grid">
            <button type="button" class="au-av-opt ${draft.avatarType==='default'?'on':''}" data-pfav-t="default" data-pfav-v="" title="Mặc định">
              <img src="${esc(getDefaultAvatarUrl())}" alt="Mặc định"/>
            </button>
            ${AVATAR_PRESETS.map(p => `
              <button type="button" class="au-av-opt ${draft.avatarType==='preset'&&draft.avatarValue===p.id?'on':''}" data-pfav-t="preset" data-pfav-v="${p.id}" title="${esc(p.label)}">
                <img src="${esc(getPresetSvgUrl(p.id))}" alt="${esc(p.label)}"/>
              </button>
            `).join('')}
          </div>

          ${sess ? `
            <div class="au-acc-actions">
              <button type="button" class="btn ghost sm" id="pf-sync-now">🔄 Đồng bộ ngay${meta.lastSyncedAt ? ' (' + new Date(meta.lastSyncedAt).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) + ')' : ''}</button>
              <button type="button" class="btn ghost sm" id="pf-signout-keep">Đăng xuất (giữ bài ở máy)</button>
              <button type="button" class="btn ghost sm" id="pf-signout-reset" style="color:var(--accent)">Đăng xuất &amp; học mới</button>
            </div>
          ` : `
            <div class="au-notice warn" style="margin-top:10px">
              <span>⚠️</span>
              <span>Bạn đang dùng <b>Học ngay</b>. Hãy đăng nhập hoặc đăng ký để không mất dữ liệu khi đổi thiết bị.</span>
            </div>
            <div class="au-acc-actions">
              <button type="button" class="btn sm" id="pf-open-login">☁️ Đăng nhập / Đăng ký để đồng bộ</button>
              ${!cfg.configured ? '<button type="button" class="btn ghost sm" id="pf-open-cfg">⚙️ Cài đặt Supabase</button>' : ''}
            </div>
          `}

          <div class="au-foot">
            <button type="button" class="btn ghost sm" id="pf-close-btn">Hủy</button>
            <button type="button" class="btn sm" id="pf-save-btn">Lưu hồ sơ</button>
          </div>
        </div>
      `);

      const nameInp = $('#pf-name-inp');
      if(nameInp) nameInp.oninput = () => { draft.name = nameInp.value; };
      $$('#hanyu-modal-box [data-pfav-t]').forEach(b => b.onclick = () => {
        draft.avatarType = b.dataset.pfavT;
        draft.avatarValue = b.dataset.pfavV;
        render();
      });
      const fInp = $('#pf-file-inp');
      if(fInp) fInp.onchange = async () => {
        const file = fInp.files && fInp.files[0];
        if(!file) return;
        try{
          const url = await compressAvatarFile(file);
          draft.avatarType = 'image';
          draft.avatarValue = url;
          render();
          if(typeof toast === 'function') toast('Đã nạp ảnh đại diện — bấm “Lưu hồ sơ” để áp dụng');
        }catch(err){
          if(typeof toast === 'function') toast(err.message);
        }
      };
      if($('#pf-setup-lvl')) $('#pf-setup-lvl').onclick = () => {
        if(typeof openLearningSetupModal === 'function') openLearningSetupModal(1, false);
      };
      if($('#pf-open-login')) $('#pf-open-login').onclick = () => openAuthModal('login');
      if($('#pf-open-cfg')) $('#pf-open-cfg').onclick = () => openSupabaseConfigModal(openProfileModal);
      if($('#pf-sync-now')) $('#pf-sync-now').onclick = () => syncNow(false);
      if($('#pf-signout-keep')) $('#pf-signout-keep').onclick = async () => { hideModal(); await signOut(false); };
      if($('#pf-signout-reset')) $('#pf-signout-reset').onclick = async () => { hideModal(); await signOut(true); };
      if($('#pf-close-btn')) $('#pf-close-btn').onclick = hideModal;
      if($('#pf-save-btn')) $('#pf-save-btn').onclick = () => {
        if(typeof store !== 'undefined' && store){
          store.profile = {
            name: String(draft.name || '').trim().slice(0, 48),
            avatarType: draft.avatarType,
            avatarValue: draft.avatarValue,
            mode: sess ? 'account' : 'guest',
            updatedAt: Date.now()
          };
          if(typeof saveStore === 'function') saveStore(store);
          syncProfileUI();
          if(typeof refreshDashboards === 'function') refreshDashboards();
        }
        hideModal();
        if(typeof toast === 'function') toast(sess ? 'Đã cập nhật hồ sơ & đồng bộ tài khoản!' : 'Đã cập nhật hồ sơ trên thiết bị!');
      };
    };
    render();
  }

  function openSupabaseConfigModal(onBack){
    const cfg = getSupabaseConfig();
    showModalHtml(`
      <div class="au-modal">
        <div class="au-head">
          <h2>Kết nối Supabase miễn phí</h2>
          <p>Dán Project URL và Anon Key từ bảng điều khiển Supabase của bạn</p>
        </div>
        <div class="au-notice info">
          <span>📋</span>
          <span>Mở <b>Supabase Dashboard</b> → <b>SQL Editor</b> chạy file <code>docs/SUPABASE_SETUP.sql</code> → lấy <b>Project URL</b> &amp; <b>anon key</b> trong <b>Project Settings → Data API</b>.</span>
        </div>
        <div class="au-form" style="margin-top:10px">
          <div class="au-fld">
            <label>Supabase Project URL</label>
            <input class="au-inp" id="cfg-url" type="url" value="${esc(cfg.url)}" placeholder="https://xxxxxxxxxxxx.supabase.co"/>
          </div>
          <div class="au-fld">
            <label>Anon / Publishable Key</label>
            <textarea class="au-inp" id="cfg-key" rows="3" placeholder="eyJhbGciOi... hoặc sb_publishable_...">${esc(cfg.anonKey)}</textarea>
          </div>
          <div class="au-err hide" id="cfg-msg"></div>
          <div class="au-foot">
            <button type="button" class="btn ghost sm" id="cfg-back-btn">Quay lại</button>
            <button type="button" class="btn ghost sm" id="cfg-test-btn">Kiểm tra</button>
            <button type="button" class="btn sm" id="cfg-save-btn">Lưu cấu hình</button>
          </div>
        </div>
      </div>
    `);
    if($('#cfg-back-btn')) $('#cfg-back-btn').onclick = () => {
      if(typeof onBack === 'function') onBack();
      else hideModal();
    };
    if($('#cfg-test-btn')) $('#cfg-test-btn').onclick = async () => {
      const msg = $('#cfg-msg');
      const u = ($('#cfg-url').value || '').trim().replace(/\/+$/, '');
      const k = ($('#cfg-key').value || '').trim();
      if(!/^https?:\/\/.+/.test(u) || k.length < 12){
        msg.textContent = 'URL hoặc Anon Key chưa đúng định dạng';
        msg.classList.remove('hide');
        return;
      }
      msg.textContent = 'Đang kiểm tra kết nối...';
      msg.classList.remove('hide');
      try{
        const res = await fetch(u + '/auth/v1/settings', { headers: { 'apikey': k } });
        if(!res.ok) throw new Error('Mã phản hồi HTTP ' + res.status);
        msg.style.color = '#1D6530';
        msg.style.background = '#EAF6ED';
        msg.textContent = '✓ Kết nối Supabase hợp lệ!';
      }catch(err){
        msg.style.color = '';
        msg.style.background = '';
        msg.textContent = 'Không kết nối được: ' + (err.message || 'Kiểm tra lại URL/Key');
      }
    };
    if($('#cfg-save-btn')) $('#cfg-save-btn').onclick = () => {
      const next = setSupabaseConfig($('#cfg-url').value, $('#cfg-key').value);
      if(typeof toast === 'function') toast(next.configured ? 'Đã lưu kết nối Supabase!' : 'Đã xóa cấu hình Supabase');
      if(typeof onBack === 'function') onBack();
      else hideModal();
    };
  }

  function syncProfileUI(){
    const pf = getProfile();
    const sess = getSession();
    const meta = getSyncMeta();
    const displayName = pf.name || (sess && sess.user && sess.user.email ? sess.user.email.split('@')[0] : 'Học viên Hanyu AI');
    const avUrl = getAvatarUrl(pf);

    // 1. Lời chào Trang chủ (#hm-hello)
    const helloEl = document.getElementById('hm-hello');
    if(helloEl){
      helloEl.textContent = pf.name ? `Chào ${pf.name}! 👋` : 'Chào bạn! 👋';
    }

    // 2. Nút hồ sơ ở Sidebar trái (#sb-account-btn)
    const sbBtn = document.getElementById('sb-account-btn');
    if(sbBtn){
      sbBtn.innerHTML = `
        <img class="sb-acc-av" src="${esc(avUrl)}" alt=""/>
        <div class="sb-acc-txt">
          <b>${esc(pf.name || (sess ? sess.user.email.split('@')[0] : 'Hồ sơ học tập'))}</b>
          <span>${sess ? '☁️ Đã đồng bộ' : '📱 Học ngay · Lưu tại máy'}</span>
        </div>
      `;
    }

    // 3. Thẻ Hồ sơ trong tab Cá nhân (#me)
    const meNameEl = document.getElementById('me-profile-name');
    if(meNameEl) meNameEl.textContent = displayName;
    const meAvEl = document.getElementById('me-avatar-img');
    if(meAvEl) meAvEl.src = avUrl;

    const accBox = document.getElementById('me-account-box');
    if(accBox){
      if(sess){
        const syncDesc = meta.lastError
          ? `Lỗi đồng bộ: ${meta.lastError}`
          : (meta.lastSyncedAt ? `Đồng bộ lúc ${new Date(meta.lastSyncedAt).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}` : 'Đang đồng bộ tự động');
        accBox.innerHTML = `
          <div class="me-acc-info">
            <span class="me-acc-pill cloud">☁️ Đã đăng nhập</span>
            <div class="me-acc-txt"><b>${esc(sess.user.email || '')}</b><span>${esc(syncDesc)}</span></div>
          </div>
          <div class="me-acc-btns">
            <button type="button" class="me-mini-btn" data-au-act="sync">Đồng bộ</button>
            <button type="button" class="me-mini-btn" data-au-act="profile">Đổi tên / Avatar</button>
            <button type="button" class="me-mini-btn ghost" data-au-act="logout">Đăng xuất</button>
          </div>`;
      }else{
        accBox.innerHTML = `
          <div class="me-acc-info">
            <span class="me-acc-pill guest">📱 Chế độ Học ngay</span>
            <div class="me-acc-txt"><b>Chỉ lưu trên thiết bị này</b><span>Đổi máy khác dữ liệu sẽ mất — đăng nhập để đồng bộ</span></div>
          </div>
          <div class="me-acc-btns">
            <button type="button" class="me-mini-btn pri" data-au-act="login">Đăng nhập / Đăng ký</button>
            <button type="button" class="me-mini-btn" data-au-act="profile">Đổi tên / Avatar</button>
          </div>`;
      }
    }
  }

  // Event delegation chung cho các nút hồ sơ / đăng nhập
  document.addEventListener('click', e => {
    const actBtn = e.target.closest('[data-au-act]');
    if(actBtn){
      const act = actBtn.dataset.auAct;
      if(act === 'login') openAuthModal('login');
      else if(act === 'signup') openAuthModal('signup');
      else if(act === 'profile') openProfileModal();
      else if(act === 'sync') syncNow(false);
      else if(act === 'logout') openProfileModal();
      return;
    }
    if(e.target.closest('#sb-account-btn') || e.target.closest('#me-edit-avatar-btn')){
      openProfileModal();
    }
  });

  // Đẩy dữ liệu chưa đồng bộ khi thoát trang / chuyển tab
  window.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'hidden' && getSyncMeta().dirty && getSession()){
      pushCloud(typeof store !== 'undefined' ? store : null, true);
    }
  });
  window.addEventListener('online', () => {
    if(getSession()) syncNow(true);
  });

  function initOnBoot(){
    syncProfileUI();
    if(getSession()){
      setTimeout(() => { syncNow(true); }, 900);
    }
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initOnBoot);
  }else{
    setTimeout(initOnBoot, 150);
  }

  return {
    AVATAR_PRESETS,
    getSupabaseConfig,
    setSupabaseConfig,
    getSession,
    getProfile,
    getAvatarUrl,
    getPresetSvgUrl,
    mergeStores,
    signIn,
    signUp,
    signOut,
    pushCloud,
    scheduleCloudPush,
    syncNow,
    syncProfileUI,
    openWelcomeModal,
    openAuthModal,
    openProfileModal,
    openSupabaseConfigModal
  };
})();
