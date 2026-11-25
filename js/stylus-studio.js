/* ==========================================================================
   Hanyu AI — Stylus Studio (S-Pen / Apple Pencil, Chống tì đè tay & Khóa Zoom)
   ========================================================================== */
window.HanyuStylus = (function(){
  const PREFS_KEY = 'hanyu_stylus_prefs';
  const PRESET_COLORS = ['#2B1B15', '#B93F34', '#1E4E79', '#1F6E43', '#6B3E26', '#5B3A7D', '#D9822B'];
  const PEN_TYPES = [
    { id: 'ballpoint', label: 'Bút bi' },
    { id: 'fountain',  label: 'Bút máy' },
    { id: 'brush',     label: 'Bút lông' },
    { id: 'highlighter', label: 'Dạ quang' }
  ];

  const DEFAULTS = {
    inputMode: 'pen',      // 'pen' | 'keyboard'
    allowTouchDraw: false, // false = chỉ cho S-Pen/Stylus (tay chạm không hiện nét)
    tool: 'pen',           // 'pen' | 'eraser'
    penType: 'fountain',   // 'ballpoint' | 'fountain' | 'brush' | 'highlighter'
    penSize: 3.2,
    eraserSize: 18,
    softness: 0.1,         // 0..1
    opacity: 1.0,          // 0.2..1
    color: '#2B1B15',
    zoomScale: 1.0,        // 1.0..2.0
    zoomLocked: false,
    dockOpen: false
  };

  function loadPrefs(){
    try{
      const raw = localStorage.getItem(PREFS_KEY);
      if(!raw) return Object.assign({}, DEFAULTS);
      const p = JSON.parse(raw);
      return Object.assign({}, DEFAULTS, p && typeof p === 'object' ? p : {});
    }catch(_){
      return Object.assign({}, DEFAULTS);
    }
  }

  const state = loadPrefs();
  if(state.inputMode !== 'pen' && state.inputMode !== 'keyboard') state.inputMode = 'pen';
  if(state.tool !== 'pen' && state.tool !== 'eraser') state.tool = 'pen';
  if(!PEN_TYPES.some(t => t.id === state.penType)) state.penType = 'fountain';
  state.penSize = Math.max(1, Math.min(24, Number(state.penSize) || 3.2));
  state.eraserSize = Math.max(6, Math.min(40, Number(state.eraserSize) || 18));
  state.softness = Math.max(0, Math.min(1, Number.isFinite(Number(state.softness)) ? Number(state.softness) : 0.1));
  state.opacity = Math.max(0.2, Math.min(1, Number(state.opacity) || 1.0));
  state.zoomScale = Math.max(1.0, Math.min(2.0, Number(state.zoomScale) || 1.0));
  state.zoomLocked = !!state.zoomLocked;
  state.allowTouchDraw = !!state.allowTouchDraw;

  let saveTimer = null;
  function savePrefs(){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try{ localStorage.setItem(PREFS_KEY, JSON.stringify(state)); }catch(_){}
    }, 120);
  }

  const listeners = new Set();
  const mountedPanels = [];
  const viewActions = {};
  let activeViewName = 'home';
  let lastBlockMsgAt = 0;
  let lastWarnFlashAt = 0;
  let blockFlashTimer = null;
  let floatingDock = null;
  let floatingMount = null;

  // Lưu viewport gốc (không thêm maximum-scale để tránh tụt pinch-zoom khi khóa)
  const metaViewport = document.querySelector('meta[name="viewport"]');
  const baseViewportContent = metaViewport ? (metaViewport.getAttribute('content') || 'width=device-width,initial-scale=1,viewport-fit=cover') : '';

  function getActiveView(){
    if(typeof curView === 'string' && curView) return curView;
    const el = document.querySelector('.view.on');
    return (el && el.dataset && el.dataset.view) ? el.dataset.view : activeViewName;
  }

  function applyZoomAndLockToDom(){
    const root = document.documentElement;
    if(root) root.style.setProperty('--sz-scale', state.zoomScale.toFixed(2));
    if(document.body){
      document.body.classList.toggle('stylus-zoom-locked', !!state.zoomLocked);
      document.body.classList.toggle('stylus-mode-pen', state.inputMode === 'pen');
      document.body.classList.toggle('stylus-mode-keyboard', state.inputMode === 'keyboard');
    }
    if(metaViewport && baseViewportContent){
      const clean = baseViewportContent
        .split(',')
        .map(s => s.trim())
        .filter(s => s && !/^user-scalable\s*=/i.test(s));
      if(state.zoomLocked) clean.push('user-scalable=no');
      metaViewport.setAttribute('content', clean.join(','));
    }
  }

  // Chặn pinch-zoom 2 ngón / ctrl+wheel toàn trang khi đang bật Khóa zoom
  document.addEventListener('touchstart', e => {
    if(state.zoomLocked && e.touches && e.touches.length >= 2){
      e.preventDefault();
    }
  }, { passive: false, capture: true });

  document.addEventListener('touchmove', e => {
    if(state.zoomLocked && e.touches && e.touches.length >= 2){
      e.preventDefault();
    }
  }, { passive: false, capture: true });

  ['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => {
    document.addEventListener(ev, e => {
      if(state.zoomLocked) e.preventDefault();
    }, { passive: false, capture: true });
  });

  document.addEventListener('wheel', e => {
    if(state.zoomLocked && (e.ctrlKey || e.metaKey)){
      e.preventDefault();
    }
  }, { passive: false, capture: true });

  function notifyPalmBlocked(reason){
    const now = Date.now();
    if(now - lastWarnFlashAt >= 450){
      lastWarnFlashAt = now;
      mountedPanels.forEach(p => {
        if(p.statusEl){
          p.statusEl.classList.add('warn');
          clearTimeout(blockFlashTimer);
          blockFlashTimer = setTimeout(() => {
            mountedPanels.forEach(x => x.statusEl && x.statusEl.classList.remove('warn'));
          }, 900);
        }
      });
    }
    if(now - lastBlockMsgAt > 2400 && reason === 'keyboard' && typeof toast === 'function'){
      lastBlockMsgAt = now;
      toast('Đang ở chế độ Gõ phím · Bấm “Viết bút” để vẽ S-Pen');
    }
  }

  function isStylusLikeEvent(e){
    if(!e) return false;
    if(e.pointerType === 'pen' || e.touchType === 'stylus') return true;
    if(Math.abs(e.tiltX || 0) > 0 || Math.abs(e.tiltY || 0) > 0 || Math.abs(e.twist || 0) > 0) return true;
    if(e.pointerType === 'touch' && Number(e.width) > 0 && Number(e.width) <= 4 && Number(e.height) > 0 && Number(e.height) <= 4 && Number.isFinite(e.pressure) && e.pressure > 0 && e.pressure !== 0.5 && e.pressure !== 1){
      return true;
    }
    return false;
  }

  function extractSamplePressure(e, hasRealPressure){
    if(isStylusLikeEvent(e) && Number.isFinite(e.pressure) && e.pressure > 0){
      if(e.pressure !== 0.5 && e.pressure !== 1){
        return { p: Math.min(1, Math.max(0.05, e.pressure)), real: true };
      }
      if(hasRealPressure){
        return { p: Math.min(1, Math.max(0.05, e.pressure)), real: true };
      }
    }
    return { p: 0.5, real: false };
  }

  function computeStrokeWidth(penType, baseSize, pressure, hasRealPressure, velocityPxPerMs, angleRad){
    const base = Number(baseSize) || 3.2;
    if(penType === 'highlighter') return base * 2.35;
    const vNorm = Math.min(1, Math.max(0, (velocityPxPerMs || 0) / 1.8));
    const nibAngle = Math.PI * 0.24;
    const nibFactor = 0.72 + 0.52 * Math.abs(Math.sin((angleRad || 0) - nibAngle));
    const effP = hasRealPressure
      ? Math.min(1, Math.max(0.04, (Number(pressure) || 0.5) * 0.8 + (1 - vNorm) * 0.25))
      : Math.min(1, Math.max(0.12, 1.0 - vNorm * 0.82));
    if(penType === 'ballpoint') return Math.max(0.8, base * (0.86 + effP * 0.28));
    if(penType === 'brush') return Math.max(0.8, base * (0.18 + Math.pow(effP, 1.35) * 2.15) * (0.85 + 0.25 * (1 - vNorm)));
    return Math.max(0.7, base * (0.30 + Math.pow(effP, 1.15) * 1.25) * nibFactor * (0.88 + 0.22 * (1 - vNorm)));
  }

  function isHardwareEraser(e){
    return !!(e && isStylusLikeEvent(e) && (e.buttons === 32 || e.button === 5));
  }

  function shouldAcceptPointer(e, lastPenAt){
    if(state.inputMode === 'keyboard'){
      notifyPalmBlocked('keyboard');
      return false;
    }
    if(!e) return true;
    if(isStylusLikeEvent(e)) return true;
    const pt = e.pointerType;
    if(pt === 'pen' || pt === 'mouse' || !pt) return true;
    if(pt === 'touch'){
      if(!state.allowTouchDraw){
        notifyPalmBlocked('touch');
        return false;
      }
      if((e.width && e.width > 20) || (e.height && e.height > 20)){
        notifyPalmBlocked('palm');
        return false;
      }
      if(lastPenAt && (Date.now() - lastPenAt < 10000)){
        notifyPalmBlocked('palm');
        return false;
      }
      return true;
    }
    return true;
  }

  // Bảo vệ riêng cho SVG của HanziWriter (Tô mẫu / Hướng dẫn) trước chạm tay/bàn tay
  function attachHanziWriterGuard(hwEl, getLastPenAt){
    if(!hwEl || hwEl.dataset.szGuardAttached) return;
    hwEl.dataset.szGuardAttached = '1';
    let penDown = false;
    let activePenPtrId = null;
    let allowPenTouchUntil = 0;
    let rejectTouchUntil = 0;

    function hasStylusTouch(e){
      const lists = [e && e.touches, e && e.changedTouches];
      for(let li = 0; li < lists.length; li++){
        const lst = lists[li];
        if(!lst) continue;
        for(let i = 0; i < lst.length; i++){
          if(lst[i] && lst[i].touchType === 'stylus') return true;
        }
      }
      return false;
    }

    hwEl.addEventListener('pointerdown', e => {
      if(isStylusLikeEvent(e)){
        if(state.inputMode === 'keyboard'){
          e.stopPropagation();
          e.preventDefault();
          notifyPalmBlocked('keyboard');
          return;
        }
        penDown = true;
        activePenPtrId = e.pointerId;
        allowPenTouchUntil = Date.now() + 1000;
        return;
      }
      const lp = typeof getLastPenAt === 'function' ? getLastPenAt() : 0;
      if(!shouldAcceptPointer(e, lp)){
        rejectTouchUntil = Date.now() + 260;
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);

    hwEl.addEventListener('pointermove', e => {
      if(isStylusLikeEvent(e) || (activePenPtrId !== null && e.pointerId === activePenPtrId)){
        allowPenTouchUntil = Date.now() + 500;
        return;
      }
      if(e.pointerType === 'touch' && (Date.now() < rejectTouchUntil || !shouldAcceptPointer(e, typeof getLastPenAt === 'function' ? getLastPenAt() : 0))){
        e.stopPropagation();
      }
    }, true);

    function endPenPtr(e){
      if(activePenPtrId !== null && e.pointerId === activePenPtrId){
        penDown = false;
        activePenPtrId = null;
        allowPenTouchUntil = Date.now() + 160;
      }
    }
    hwEl.addEventListener('pointerup', endPenPtr, true);
    hwEl.addEventListener('pointercancel', endPenPtr, true);

    hwEl.addEventListener('touchstart', e => {
      if(e.touches && e.touches.length >= 2) return;
      const now = Date.now();
      if(state.inputMode === 'keyboard'){
        e.stopPropagation();
        e.preventDefault();
        notifyPalmBlocked('keyboard');
        return;
      }
      if(penDown || hasStylusTouch(e) || now <= allowPenTouchUntil) return;
      if(now < rejectTouchUntil || !state.allowTouchDraw){
        e.stopPropagation();
        e.preventDefault();
        notifyPalmBlocked('touch');
      }
    }, { passive: false, capture: true });

    hwEl.addEventListener('touchmove', e => {
      if(e.touches && e.touches.length >= 2) return;
      const now = Date.now();
      if(state.inputMode === 'keyboard'){
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      if(penDown || hasStylusTouch(e) || now <= allowPenTouchUntil) return;
      if(now < rejectTouchUntil || !state.allowTouchDraw){
        e.stopPropagation();
        e.preventDefault();
      }
    }, { passive: false, capture: true });
  }

  function emitChange(kind){
    applyZoomAndLockToDom();
    savePrefs();
    syncAllPanels();
    listeners.forEach(fn => {
      try{ fn(getState(), kind); }catch(err){ console.error(err); }
    });
    if(kind === 'zoom'){
      Object.values(viewActions).forEach(act => {
        if(act && typeof act.onZoomResize === 'function'){
          requestAnimationFrame(() => act.onZoomResize(state.zoomScale));
        }
      });
    }
    if(kind === 'inputMode'){
      const v = getActiveView();
      const act = viewActions[v];
      if(act && typeof act.onInputModeChange === 'function') act.onInputModeChange(state.inputMode);
    }
  }

  function getState(){
    return Object.assign({}, state);
  }

  function setInputMode(mode, silent){
    const next = (mode === 'keyboard') ? 'keyboard' : 'pen';
    if(state.inputMode === next){
      if(!silent) emitChange('inputMode');
      return;
    }
    state.inputMode = next;
    emitChange('inputMode');
  }

  function setAllowTouchDraw(allow){
    state.allowTouchDraw = !!allow;
    emitChange('touch');
  }

  function setTool(tool){
    state.tool = (tool === 'eraser') ? 'eraser' : 'pen';
    emitChange('tool');
  }

  function setPenType(penType){
    if(PEN_TYPES.some(t => t.id === penType)){
      state.penType = penType;
      state.tool = 'pen';
      emitChange('style');
    }
  }

  function setSize(val){
    const num = Number(val);
    if(!Number.isFinite(num)) return;
    if(state.tool === 'eraser'){
      state.eraserSize = Math.max(6, Math.min(40, Math.round(num * 10) / 10));
    }else{
      state.penSize = Math.max(1, Math.min(24, Math.round(num * 10) / 10));
    }
    emitChange('style');
  }

  function setSoftness(val){
    const num = Number(val);
    if(!Number.isFinite(num)) return;
    state.softness = Math.max(0, Math.min(1, Math.round(num * 100) / 100));
    emitChange('style');
  }

  function setOpacity(val){
    const num = Number(val);
    if(!Number.isFinite(num)) return;
    state.opacity = Math.max(0.2, Math.min(1, Math.round(num * 100) / 100));
    emitChange('style');
  }

  function setColor(hex){
    if(typeof hex === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(hex.trim())){
      state.color = hex.trim();
      state.tool = 'pen';
      emitChange('style');
    }
  }

  function setZoomScale(val){
    if(state.zoomLocked){
      if(typeof toast === 'function') toast('Đang bật Khóa thu phóng · Bấm Mở khóa để chỉnh zoom');
      return;
    }
    const num = Math.max(1.0, Math.min(2.0, Math.round(Number(val) * 100) / 100));
    state.zoomScale = num;
    emitChange('zoom');
  }

  function stepZoom(delta){
    setZoomScale(state.zoomScale + delta);
  }

  function setZoomLocked(locked){
    state.zoomLocked = !!locked;
    emitChange('zoomLock');
    if(typeof toast === 'function'){
      toast(state.zoomLocked
        ? 'Đã khóa thu phóng màn hình · Giữ nguyên khung để viết'
        : 'Đã mở khóa thu phóng màn hình');
    }
  }

  function runViewAction(actName){
    const v = getActiveView();
    const act = viewActions[v];
    if(actName === 'undo'){
      if(act && typeof act.onUndo === 'function') act.onUndo();
    }else if(actName === 'clear'){
      if(act && typeof act.onClear === 'function') act.onClear();
    }else if(actName === 'save'){
      if(act && typeof act.onSave === 'function') act.onSave();
    }
  }

  function drawPreviewCanvas(cv){
    if(!cv) return;
    const rect = cv.getBoundingClientRect();
    const w = Math.max(180, Math.round(rect.width || cv.width || 240));
    const h = Math.max(38, Math.round(rect.height || cv.height || 44));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if(cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)){
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext('2d');
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const cy = h * 0.52;
    const pts = [];
    const steps = 32;
    for(let i = 0; i <= steps; i++){
      const t = i / steps;
      const x = 16 + t * (w - 32);
      const y = cy + Math.sin(t * Math.PI * 2.2) * (h * 0.22);
      const p = 0.25 + 0.72 * Math.sin(t * Math.PI);
      pts.push([x, y, p]);
    }

    if(state.tool === 'eraser'){
      ctx.strokeStyle = '#9E8579';
      ctx.lineWidth = Math.min(h * 0.65, state.eraserSize);
      ctx.lineCap = 'round';
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for(let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const base = state.penSize;
    const softPx = state.softness > 0 ? Math.max(0.5, state.softness * (base * 1.4 + 4)) : 0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = state.color;

    if(state.penType === 'highlighter'){
      ctx.globalAlpha = Math.min(0.42, state.opacity * 0.42);
      ctx.lineWidth = Math.min(h * 0.72, base * 2.3);
      if(softPx){ ctx.shadowBlur = softPx; ctx.shadowColor = state.color; }
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for(let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.globalAlpha = state.opacity;
    if(softPx){ ctx.shadowBlur = softPx; ctx.shadowColor = state.color; }
    for(let i = 1; i < pts.length; i++){
      const a = pts[i - 1], b = pts[i];
      const p = (a[2] + b[2]) / 2;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const lw = computeStrokeWidth(state.penType, base, p, true, 0.55 * (1.15 - p), ang);
      ctx.lineWidth = Math.max(0.7, Math.min(h * 0.76, lw));
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    ctx.restore();
  }

  function renderPanelMarkup(opts){
    const showSave = !!(opts && opts.showSave);
    const swHtml = PRESET_COLORS.map(c =>
      `<button type="button" class="sz-swatch" data-szcolor="${c}" aria-label="Màu ${c}" style="--sw:${c}"></button>`
    ).join('');
    const typeHtml = PEN_TYPES.map(t =>
      `<button type="button" class="sz-type-btn" data-sztype="${t.id}">${t.label}</button>`
    ).join('');

    return `<div class="sz-panel">
      <div class="sz-sec">
        <div class="sz-sec-hd"><span>Chế độ nhập</span><span class="sz-shield" data-sz-status>Chống tì đè tay</span></div>
        <div class="sz-seg2">
          <button type="button" data-szmode="pen">
            <svg class="ic"><use href="#i-pencil"></use></svg><span>Viết bút</span>
          </button>
          <button type="button" data-szmode="keyboard">
            <svg class="ic" viewBox="0 0 24 24"><rect height="12" rx="2" width="18" x="3" y="6"></rect><path d="M7 10h.01M10 10h.01M13 10h.01M16 10h.01M7 14h10"></path></svg><span>Gõ phím</span>
          </button>
        </div>
        <label class="sz-touch-opt">
          <input type="checkbox" data-sz-touch/>
          <span>Cho phép ngón tay vẽ (tắt = chỉ bút S-Pen)</span>
        </label>
      </div>

      <div class="sz-sec">
        <div class="sz-actions${showSave ? ' has-save' : ''}">
          <button type="button" data-szact="pen">
            <svg class="ic"><use href="#i-pencil"></use></svg><span>Bút</span>
          </button>
          <button type="button" data-szact="eraser">
            <svg class="ic" viewBox="0 0 24 24"><path d="M20 20H7l-4-4a2 2 0 0 1 0-2.8L12.8 3.4a2 2 0 0 1 2.8 0l5.1 5.1a2 2 0 0 1 0 2.8L12 20"></path><path d="M7.5 8.5l8 8"></path></svg><span>Tẩy</span>
          </button>
          <button type="button" data-szact="undo">
            <svg class="ic" viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"></path><path d="M4 9h10a6 6 0 0 1 0 12h-3"></path></svg><span>Hoàn tác</span>
          </button>
          <button type="button" data-szact="clear">
            <svg class="ic"><use href="#i-trash"></use></svg><span>Xóa</span>
          </button>
          <button type="button" class="sz-save-btn" data-szact="save">
            <svg class="ic" viewBox="0 0 24 24"><path d="M12 4v10"></path><path d="M8 10l4 4 4-4"></path><path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"></path></svg><span>Lưu</span>
          </button>
        </div>
      </div>

      <div class="sz-sec sz-zoom-sec">
        <div class="sz-sec-hd"><span>Phóng to vùng viết</span><span class="sz-zoom-note" data-sz-zoom-note>Có thể thu phóng</span></div>
        <div class="sz-zoom-row">
          <button type="button" class="sz-zbtn" data-szzoom="-0.15" aria-label="Thu nhỏ">−</button>
          <button type="button" class="sz-zval" data-szzoom="reset" title="Bấm để đặt lại 100%">100%</button>
          <button type="button" class="sz-zbtn" data-szzoom="0.15" aria-label="Phóng to">+</button>
          <button type="button" class="sz-zlock" data-szzoom="lock">
            <svg class="ic"><use href="#i-lock"></use></svg><span>Khóa zoom</span>
          </button>
        </div>
      </div>

      <div class="sz-pen-body" data-sz-penbody>
        <div class="sz-preview-box">
          <canvas class="sz-preview-cv" width="240" height="44"></canvas>
        </div>

        <div class="sz-sec">
          <div class="sz-sec-hd"><span>Loại bút &amp; Nét bút</span></div>
          <div class="sz-types">${typeHtml}</div>
        </div>

        <div class="sz-sec sz-sliders">
          <label class="sz-slider-row">
            <span data-sz-size-lbl>Kích cỡ bút</span>
            <input type="range" data-szrange="size" min="1" max="24" step="0.5" value="3.2"/>
            <b data-sz-size-val>3.2px</b>
          </label>
          <label class="sz-slider-row">
            <span>Độ mềm nét</span>
            <input type="range" data-szrange="softness" min="0" max="100" step="5" value="10"/>
            <b data-sz-soft-val>10%</b>
          </label>
          <label class="sz-slider-row">
            <span>Độ đậm mực</span>
            <input type="range" data-szrange="opacity" min="20" max="100" step="5" value="100"/>
            <b data-sz-op-val>100%</b>
          </label>
        </div>

        <div class="sz-sec">
          <div class="sz-sec-hd"><span>Màu bút</span><b class="sz-hex" data-sz-hex>#2B1B15</b></div>
          <div class="sz-colors">
            ${swHtml}
            <label class="sz-color-pick" title="Chọn màu tự do">
              <input type="color" data-szcolorpick value="#2B1B15"/>
              <span>+</span>
            </label>
          </div>
        </div>
      </div>
    </div>`;
  }

  function syncPanelInstance(inst){
    const root = inst.el;
    if(!root) return;
    const isPen = state.inputMode === 'pen';
    const isCustomSave = !!inst.opts.showSave || getActiveView() === 'copy';
    const actionsBox = root.querySelector('.sz-actions');
    if(actionsBox) actionsBox.classList.toggle('has-save', isCustomSave);

    root.querySelectorAll('[data-szmode]').forEach(b => {
      b.classList.toggle('on', b.dataset.szmode === state.inputMode);
    });

    const touchChk = root.querySelector('[data-sz-touch]');
    if(touchChk){
      touchChk.checked = !!state.allowTouchDraw;
      touchChk.disabled = !isPen;
    }
    const touchWrap = root.querySelector('.sz-touch-opt');
    if(touchWrap) touchWrap.classList.toggle('disabled', !isPen);

    if(inst.statusEl){
      if(!isPen){
        inst.statusEl.textContent = 'Đang khóa viết tay';
        inst.statusEl.classList.remove('active');
      }else if(state.allowTouchDraw){
        inst.statusEl.textContent = 'Chống tì đè · Tay + Bút';
        inst.statusEl.classList.add('active');
      }else{
        inst.statusEl.textContent = 'Chống tì đè · Chỉ S-Pen';
        inst.statusEl.classList.add('active');
      }
    }

    root.querySelectorAll('[data-szact="pen"], [data-szact="eraser"]').forEach(b => {
      b.classList.toggle('on', isPen && b.dataset.szact === state.tool);
    });

    const penBody = root.querySelector('[data-sz-penbody]');
    if(penBody) penBody.classList.toggle('dim', !isPen);

    const zValBtn = root.querySelector('[data-szzoom="reset"]');
    if(zValBtn) zValBtn.textContent = `${Math.round(state.zoomScale * 100)}%`;
    root.querySelectorAll('[data-szzoom="-0.15"], [data-szzoom="0.15"], [data-szzoom="reset"]').forEach(b => {
      b.disabled = !!state.zoomLocked;
    });
    const zLockBtn = root.querySelector('[data-szzoom="lock"]');
    if(zLockBtn){
      zLockBtn.classList.toggle('on', !!state.zoomLocked);
      const sp = zLockBtn.querySelector('span');
      if(sp) sp.textContent = state.zoomLocked ? 'Mở khóa' : 'Khóa zoom';
    }
    const zNote = root.querySelector('[data-sz-zoom-note]');
    if(zNote){
      zNote.textContent = state.zoomLocked ? 'Đã khóa giữ khung viết' : 'Có thể thu phóng';
      zNote.classList.toggle('on', !!state.zoomLocked);
    }

    root.querySelectorAll('[data-sztype]').forEach(b => {
      b.classList.toggle('on', state.tool === 'pen' && b.dataset.sztype === state.penType);
    });

    const sizeLbl = root.querySelector('[data-sz-size-lbl]');
    const sizeRange = root.querySelector('[data-szrange="size"]');
    const sizeVal = root.querySelector('[data-sz-size-val]');
    if(sizeRange){
      if(state.tool === 'eraser'){
        sizeRange.min = '6';
        sizeRange.max = '40';
        sizeRange.step = '1';
        sizeRange.value = String(state.eraserSize);
        if(sizeLbl) sizeLbl.textContent = 'Kích cỡ tẩy';
        if(sizeVal) sizeVal.textContent = `${Math.round(state.eraserSize)}px`;
      }else{
        sizeRange.min = '1';
        sizeRange.max = '24';
        sizeRange.step = '0.5';
        sizeRange.value = String(state.penSize);
        if(sizeLbl) sizeLbl.textContent = 'Kích cỡ bút';
        if(sizeVal) sizeVal.textContent = `${state.penSize}px`;
      }
    }

    const softRange = root.querySelector('[data-szrange="softness"]');
    const softVal = root.querySelector('[data-sz-soft-val]');
    const softPct = Math.round(state.softness * 100);
    if(softRange) softRange.value = String(softPct);
    if(softVal) softVal.textContent = `${softPct}%`;

    const opRange = root.querySelector('[data-szrange="opacity"]');
    const opVal = root.querySelector('[data-sz-op-val]');
    const opPct = Math.round(state.opacity * 100);
    if(opRange) opRange.value = String(opPct);
    if(opVal) opVal.textContent = `${opPct}%`;

    const hexEl = root.querySelector('[data-sz-hex]');
    if(hexEl) hexEl.textContent = state.color.toUpperCase();
    const pickEl = root.querySelector('[data-szcolorpick]');
    if(pickEl) pickEl.value = state.color;

    let hitPreset = false;
    root.querySelectorAll('[data-szcolor]').forEach(b => {
      const eq = b.dataset.szcolor.toLowerCase() === state.color.toLowerCase();
      if(eq) hitPreset = true;
      b.classList.toggle('on', eq);
    });
    const pickWrap = root.querySelector('.sz-color-pick');
    if(pickWrap) pickWrap.classList.toggle('on', !hitPreset);

    drawPreviewCanvas(inst.previewCv);
  }

  function syncAllPanels(){
    mountedPanels.forEach(syncPanelInstance);
    syncFloatingDock();
  }

  function bindPanelEvents(inst){
    const root = inst.el;
    root.addEventListener('click', e => {
      const mBtn = e.target.closest('[data-szmode]');
      if(mBtn){ setInputMode(mBtn.dataset.szmode); return; }

      const aBtn = e.target.closest('[data-szact]');
      if(aBtn){
        const act = aBtn.dataset.szact;
        if(act === 'pen' || act === 'eraser'){
          if(state.inputMode === 'keyboard') setInputMode('pen');
          setTool(act);
        }else{
          runViewAction(act);
        }
        return;
      }

      const zBtn = e.target.closest('[data-szzoom]');
      if(zBtn){
        const zv = zBtn.dataset.szzoom;
        if(zv === 'lock') setZoomLocked(!state.zoomLocked);
        else if(zv === 'reset') setZoomScale(1.0);
        else stepZoom(Number(zv));
        return;
      }

      const tBtn = e.target.closest('[data-sztype]');
      if(tBtn){
        if(state.inputMode === 'keyboard') setInputMode('pen');
        setPenType(tBtn.dataset.sztype);
        return;
      }

      const cBtn = e.target.closest('[data-szcolor]');
      if(cBtn){
        if(state.inputMode === 'keyboard') setInputMode('pen');
        setColor(cBtn.dataset.szcolor);
      }
    });

    root.addEventListener('change', e => {
      if(e.target.matches('[data-sz-touch]')){
        setAllowTouchDraw(e.target.checked);
      }
    });

    root.addEventListener('input', e => {
      const t = e.target;
      if(t.matches('[data-szrange="size"]')){
        setSize(t.value);
      }else if(t.matches('[data-szrange="softness"]')){
        setSoftness(Number(t.value) / 100);
      }else if(t.matches('[data-szrange="opacity"]')){
        setOpacity(Number(t.value) / 100);
      }else if(t.matches('[data-szcolorpick]')){
        if(state.inputMode === 'keyboard') setInputMode('pen');
        setColor(t.value);
      }
    });
  }

  function mountPanel(containerEl, opts){
    if(!containerEl) return null;
    opts = opts || {};
    containerEl.innerHTML = renderPanelMarkup(opts);
    const inst = {
      el: containerEl,
      opts,
      statusEl: containerEl.querySelector('[data-sz-status]'),
      previewCv: containerEl.querySelector('.sz-preview-cv')
    };
    bindPanelEvents(inst);
    mountedPanels.push(inst);
    syncPanelInstance(inst);
    return inst;
  }

  function ensureFloatingDock(){
    if(floatingDock) return floatingDock;
    const wrap = document.createElement('div');
    wrap.id = 'hanyu-stylus-floating-dock';
    wrap.className = 'sz-float-dock hide';
    wrap.innerHTML = `
      <div class="sz-dock-drawer hide" id="sz-dock-drawer">
        <div class="sz-dock-drawer-hd">
          <b>Bảng bút viết S-Pen</b>
          <button type="button" class="sz-dock-close" aria-label="Thu gọn"><svg class="ic"><use href="#i-x"></use></svg></button>
        </div>
        <div id="sz-dock-body"></div>
      </div>
      <div class="sz-dock-rail" role="toolbar" aria-label="Thanh công cụ bút viết nhanh">
        <button type="button" class="sz-rail-btn on" data-szf="pen" title="Chế độ Bút / Ngón bút"><svg class="ic"><use href="#i-pencil"></use></svg><span>Bút</span></button>
        <button type="button" class="sz-rail-btn" data-szf="eraser" title="Tẩy"><svg class="ic" viewBox="0 0 24 24"><path d="M20 20H7l-4-4a2 2 0 0 1 0-2.8L12.8 3.4a2 2 0 0 1 2.8 0l5.1 5.1a2 2 0 0 1 0 2.8L12 20"></path><path d="M7.5 8.5l8 8"></path></svg><span>Tẩy</span></button>
        <button type="button" class="sz-rail-btn" data-szf="undo" title="Hoàn tác"><svg class="ic" viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"></path><path d="M4 9h10a6 6 0 0 1 0 12h-3"></path></svg><span>Lùi</span></button>
        <button type="button" class="sz-rail-btn" data-szf="clear" title="Xóa nét"><svg class="ic"><use href="#i-trash"></use></svg><span>Xóa</span></button>
        <button type="button" class="sz-rail-btn" data-szf="lock" title="Khóa / Mở thu phóng"><svg class="ic"><use href="#i-lock"></use></svg><span>Khóa</span></button>
        <button type="button" class="sz-rail-btn" data-szf="more" title="Cỡ, độ mềm, loại &amp; màu bút"><svg class="ic"><use href="#i-brush"></use></svg><span>Nét</span></button>
      </div>`;
    document.body.appendChild(wrap);
    floatingDock = wrap;
    const bodyEl = wrap.querySelector('#sz-dock-body');
    floatingMount = mountPanel(bodyEl, { showSave: false });

    wrap.querySelector('.sz-dock-close').onclick = () => {
      wrap.querySelector('#sz-dock-drawer').classList.add('hide');
      wrap.querySelector('[data-szf="more"]').classList.remove('on');
    };

    wrap.querySelector('.sz-dock-rail').addEventListener('click', e => {
      const b = e.target.closest('[data-szf]');
      if(!b) return;
      const act = b.dataset.szf;
      if(act === 'pen' || act === 'eraser'){
        if(state.inputMode === 'keyboard') setInputMode('pen');
        setTool(act);
      }else if(act === 'undo'){
        runViewAction('undo');
      }else if(act === 'clear'){
        runViewAction('clear');
      }else if(act === 'lock'){
        setZoomLocked(!state.zoomLocked);
      }else if(act === 'more'){
        const dr = wrap.querySelector('#sz-dock-drawer');
        const open = dr.classList.toggle('hide') === false;
        b.classList.toggle('on', open);
        if(open && floatingMount) drawPreviewCanvas(floatingMount.previewCv);
      }
    });
    return wrap;
  }

  function syncFloatingDock(){
    const dock = ensureFloatingDock();
    const v = getActiveView();
    const isPenCapableView = (v === 'copy' || v === 'trans' || v === 'writing' || v === 'dialog');
    dock.classList.toggle('hide', !isPenCapableView);
    dock.dataset.forView = v;
    if(!isPenCapableView){
      dock.querySelector('#sz-dock-drawer').classList.add('hide');
      dock.querySelector('[data-szf="more"]').classList.remove('on');
      return;
    }
    const penBtn = dock.querySelector('[data-szf="pen"]');
    const erBtn = dock.querySelector('[data-szf="eraser"]');
    const lkBtn = dock.querySelector('[data-szf="lock"]');
    if(penBtn) penBtn.classList.toggle('on', state.inputMode === 'pen' && state.tool === 'pen');
    if(erBtn) erBtn.classList.toggle('on', state.inputMode === 'pen' && state.tool === 'eraser');
    if(lkBtn){
      lkBtn.classList.toggle('on', !!state.zoomLocked);
      const sp = lkBtn.querySelector('span');
      if(sp) sp.textContent = state.zoomLocked ? 'Mở' : 'Khóa';
    }
  }

  function registerViewActions(viewName, handlers){
    viewActions[viewName] = handlers || {};
    syncAllPanels();
  }

  function syncActiveView(viewName){
    activeViewName = viewName || getActiveView();
    if(floatingDock){
      floatingDock.querySelector('#sz-dock-drawer').classList.add('hide');
      const mb = floatingDock.querySelector('[data-szf="more"]');
      if(mb) mb.classList.remove('on');
    }
    syncAllPanels();
    // Mount rail cho Luyện viết chữ Hán nếu chưa có
    if(activeViewName === 'writing'){
      const wr = document.getElementById('w-side-rail');
      if(wr && !wr.dataset.szMounted){
        wr.dataset.szMounted = '1';
        mountPanel(wr, { showSave: false });
      }
    }
  }

  function subscribe(fn){
    if(typeof fn === 'function') listeners.add(fn);
    return () => listeners.delete(fn);
  }

  // Khởi tạo ngay khi DOM sẵn sàng
  applyZoomAndLockToDom();
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      ensureFloatingDock();
      syncActiveView(getActiveView());
    });
  }else{
    ensureFloatingDock();
    syncActiveView(getActiveView());
  }

  return {
    PRESET_COLORS,
    PEN_TYPES,
    getState,
    setInputMode,
    setAllowTouchDraw,
    setTool,
    setPenType,
    setSize,
    setSoftness,
    setOpacity,
    setColor,
    setZoomScale,
    stepZoom,
    setZoomLocked,
    shouldAcceptPointer,
    isStylusLikeEvent,
    extractSamplePressure,
    computeStrokeWidth,
    isHardwareEraser,
    attachHanziWriterGuard,
    mountPanel,
    registerViewActions,
    syncActiveView,
    subscribe,
    redrawPreviews(){ mountedPanels.forEach(p => drawPreviewCanvas(p.previewCv)); }
  };
})();
