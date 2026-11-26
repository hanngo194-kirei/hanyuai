/* ==========================================================================
   ĐỢT 2: Bài khóa (tra từ bấm chọn), Chép bài khóa (ô kẻ viết tay),
   Luyện dịch (viết tay Apple Pencil / S Pen & Bàn phím), Bảng Ghi chú 3 cột
   ========================================================================== */

(function(){
  const esc = s => (typeof escHtml === 'function')
    ? escHtml(s)
    : String(s == null ? '' : s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  /* ---------- 1. BỘ VIẾT TAY STYLUS DÙNG CHUNG (Apple Pencil / S Pen) ---------- */
  function createStylusPad(canvas, opts){
    opts = opts || {};
    let localTool = null;
    let strokes = [];
    let activeStroke = null;
    let activePtrId = null;
    let lastPenAt = 0;
    let lastTime = 0;
    let smoothW = 0;
    let hasRealPressure = false;
    let cssW = 0, cssH = 0, dpr = 1;
    const ctx = canvas.getContext('2d');
    canvas.style.touchAction = 'none';

    function getStudioState(){
      return (typeof window.HanyuStylus !== 'undefined') ? window.HanyuStylus.getState() : null;
    }
    function currentTool(){
      const st = getStudioState();
      return st ? st.tool : (localTool || 'pen');
    }
    function emitChange(){
      if(typeof opts.onChange === 'function') opts.onChange(strokes);
    }
    function sampleMeta(e){
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || cssW || 1, h = rect.height || cssH || 1;
      const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / w));
      const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / h));
      let p = 0.5, real = false;
      if(window.HanyuStylus && window.HanyuStylus.extractSamplePressure){
        const res = window.HanyuStylus.extractSamplePressure(e, hasRealPressure);
        p = res.p;
        real = res.real;
      }else if(e.pointerType === 'pen' && Number.isFinite(e.pressure) && e.pressure > 0 && e.pressure !== 0.5 && e.pressure !== 1){
        p = Math.min(1, Math.max(0.05, e.pressure));
        real = true;
      }
      if(real) hasRealPressure = true;
      return { nx, ny, p, real, xPx: nx * (cssW || w), yPx: ny * (cssH || h) };
    }
    function computeWidth(s, pressure, vel, ang){
      const base = Number(s.size) || opts.baseWidth || 2.8;
      const penType = s.penType || 'fountain';
      if(window.HanyuStylus && window.HanyuStylus.computeStrokeWidth){
        return window.HanyuStylus.computeStrokeWidth(penType, base, pressure, true, vel || 0, ang || 0);
      }
      if(penType === 'ballpoint') return base * (0.9 + pressure * 0.2);
      if(penType === 'brush') return Math.max(1, base * (0.25 + Math.pow(pressure, 1.35) * 1.95));
      if(penType === 'highlighter') return base * 2.35;
      return Math.max(0.8, base * (0.45 + pressure * 1.15)); // fountain mặc định
    }
    function pointWidth(s, pt){
      const base = Number(s.size) || opts.baseWidth || 2.8;
      if(pt && pt.length >= 4 && Number.isFinite(pt[3]) && pt[3] > 0){
        return Math.max(0.6, base * pt[3]);
      }
      return computeWidth(s, (pt && pt[2]) || 0.55, 0.35, 0);
    }
    function drawTaperedCurve(x0, y0, cx0, cy0, x1, y1, w0, w1){
      const len = Math.hypot(cx0 - x0, cy0 - y0) + Math.hypot(x1 - cx0, y1 - cy0);
      if(len < 0.05){
        ctx.lineWidth = (w0 + w1) * 0.5;
        ctx.beginPath();
        ctx.arc(x0, y0, ctx.lineWidth * 0.5, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      const steps = Math.max(1, Math.min(24, Math.ceil(len / 2.5)));
      if(steps === 1 || Math.abs(w1 - w0) < 0.12){
        ctx.lineWidth = (w0 + w1) * 0.5;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(cx0, cy0, x1, y1);
        ctx.stroke();
        return;
      }
      let px = x0, py = y0;
      for(let k = 1; k <= steps; k++){
        const t = k / steps;
        const mt = 1 - t;
        const qx = mt * mt * x0 + 2 * mt * t * cx0 + t * t * x1;
        const qy = mt * mt * y0 + 2 * mt * t * cy0 + t * t * y1;
        const tm = (k - 0.5) / steps;
        ctx.lineWidth = Math.max(0.6, w0 + (w1 - w0) * tm);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(qx, qy);
        ctx.stroke();
        px = qx;
        py = qy;
      }
    }
    function drawFullStroke(s){
      if(!s || !s.pts || !s.pts.length || !cssW || !cssH) return;
      const pts = s.pts;
      const isEraser = s.tool === 'eraser';
      const penType = s.penType || 'fountain';
      const color = s.color || opts.color || '#2B1B15';
      const softness = Number.isFinite(Number(s.softness)) ? Number(s.softness) : 0;
      const rawOp = Number(s.opacity);
      const opacity = Number.isFinite(rawOp) && rawOp > 0 ? rawOp : 1;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if(isEraser){
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        const ew = Number(s.size) || opts.eraserWidth || 18;
        if(pts.length === 1){
          ctx.beginPath();
          ctx.arc(pts[0][0] * cssW, pts[0][1] * cssH, ew * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }else{
          ctx.lineWidth = ew;
          ctx.beginPath();
          ctx.moveTo(pts[0][0] * cssW, pts[0][1] * cssH);
          for(let i = 1; i < pts.length; i++){
            ctx.lineTo(pts[i][0] * cssW, pts[i][1] * cssH);
          }
          ctx.stroke();
        }
        ctx.restore();
        return;
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      const base = Number(s.size) || opts.baseWidth || 2.8;
      if(softness > 0){
        ctx.shadowBlur = Math.max(0.5, softness * (base * 1.35 + 3.5));
        ctx.shadowColor = color;
      }

      if(penType === 'highlighter'){
        ctx.globalAlpha = Math.min(0.42, opacity * 0.42);
        const hw = base * 2.35;
        if(pts.length === 1){
          ctx.beginPath();
          ctx.arc(pts[0][0] * cssW, pts[0][1] * cssH, hw * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }else{
          ctx.lineWidth = hw;
          ctx.beginPath();
          ctx.moveTo(pts[0][0] * cssW, pts[0][1] * cssH);
          for(let i = 1; i < pts.length; i++){
            const p0 = pts[i - 1], p1 = pts[i];
            const xc = (p0[0] + p1[0]) * 0.5 * cssW, yc = (p0[1] + p1[1]) * 0.5 * cssH;
            ctx.quadraticCurveTo(p0[0] * cssW, p0[1] * cssH, xc, yc);
          }
          const last = pts[pts.length - 1];
          ctx.lineTo(last[0] * cssW, last[1] * cssH);
          ctx.stroke();
        }
        ctx.restore();
        return;
      }

      ctx.globalAlpha = opacity;
      if(pts.length === 1){
        const r = pointWidth(s, pts[0]) * 0.5;
        ctx.beginPath();
        ctx.arc(pts[0][0] * cssW, pts[0][1] * cssH, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
      if(pts.length === 2){
        const x0 = pts[0][0] * cssW, y0 = pts[0][1] * cssH;
        const x1 = pts[1][0] * cssW, y1 = pts[1][1] * cssH;
        drawTaperedCurve(x0, y0, (x0 + x1) * 0.5, (y0 + y1) * 0.5, x1, y1, pointWidth(s, pts[0]), pointWidth(s, pts[1]));
        ctx.restore();
        return;
      }
      let prevX = pts[0][0] * cssW, prevY = pts[0][1] * cssH;
      let prevW = pointWidth(s, pts[0]);
      for(let i = 1; i < pts.length - 1; i++){
        const p0 = pts[i], p1 = pts[i + 1];
        const x0 = p0[0] * cssW, y0 = p0[1] * cssH;
        const xc = (x0 + p1[0] * cssW) * 0.5, yc = (y0 + p1[1] * cssH) * 0.5;
        const w0 = pointWidth(s, p0), w1 = (w0 + pointWidth(s, p1)) * 0.5;
        drawTaperedCurve(prevX, prevY, x0, y0, xc, yc, prevW, w1);
        prevX = xc; prevY = yc; prevW = w1;
      }
      const last = pts[pts.length - 1];
      const lx = last[0] * cssW, ly = last[1] * cssH;
      drawTaperedCurve(prevX, prevY, (prevX + lx) * 0.5, (prevY + ly) * 0.5, lx, ly, prevW, pointWidth(s, last));
      ctx.restore();
    }
    function strokeLastSegment(s){
      if(!s || !s.pts.length || !cssW || !cssH) return;
      if(s.penType === 'highlighter' || s.pts.length === 1){
        if(s.pts.length === 1 && s.penType !== 'highlighter' && s.tool !== 'eraser'){
          ctx.save();
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.fillStyle = s.color || opts.color || '#2B1B15';
          const rawOp = Number(s.opacity);
          ctx.globalAlpha = Number.isFinite(rawOp) && rawOp > 0 ? rawOp : 1;
          const r = pointWidth(s, s.pts[0]) * 0.5;
          ctx.beginPath();
          ctx.arc(s.pts[0][0] * cssW, s.pts[0][1] * cssH, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          return;
        }
        redraw();
        return;
      }
      const pts = s.pts;
      const i = pts.length - 1;
      const isEraser = s.tool === 'eraser';
      const color = s.color || opts.color || '#2B1B15';
      const softness = Number.isFinite(Number(s.softness)) ? Number(s.softness) : 0;
      const rawOp = Number(s.opacity);
      const opacity = Number.isFinite(rawOp) && rawOp > 0 ? rawOp : 1;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if(isEraser){
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = Number(s.size) || opts.eraserWidth || 18;
        const p0 = pts[i - 1], p1 = pts[i];
        ctx.beginPath();
        ctx.moveTo(p0[0] * cssW, p0[1] * cssH);
        ctx.lineTo(p1[0] * cssW, p1[1] * cssH);
        ctx.stroke();
        ctx.restore();
        return;
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      const base = Number(s.size) || opts.baseWidth || 2.8;
      if(softness > 0){
        ctx.shadowBlur = Math.max(0.5, softness * (base * 1.35 + 3.5));
        ctx.shadowColor = color;
      }
      const p0 = pts[i - 1], p1 = pts[i];
      const x0 = p0[0] * cssW, y0 = p0[1] * cssH;
      const x1 = p1[0] * cssW, y1 = p1[1] * cssH;
      const w0 = pointWidth(s, p0), w1 = pointWidth(s, p1);
      if(i >= 2){
        const pm = pts[i - 2];
        const xm = (pm[0] * cssW + x0) * 0.5, ym = (pm[1] * cssH + y0) * 0.5;
        const wm = (pointWidth(s, pm) + w0) * 0.5;
        const xc = (x0 + x1) * 0.5, yc = (y0 + y1) * 0.5;
        const wc = (w0 + w1) * 0.5;
        drawTaperedCurve(xm, ym, x0, y0, xc, yc, wm, wc);
        drawTaperedCurve(xc, yc, (xc + x1) * 0.5, (yc + y1) * 0.5, x1, y1, wc, w1);
      }else{
        drawTaperedCurve(x0, y0, (x0 + x1) * 0.5, (y0 + y1) * 0.5, x1, y1, w0, w1);
      }
      ctx.restore();
    }
    function redraw(){
      if(!cssW || !cssH) return;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      for(let si = 0; si < strokes.length; si++){
        drawFullStroke(strokes[si]);
      }
      ctx.restore();
    }
    function resize(){
      const rect = canvas.getBoundingClientRect();
      if(rect.width < 8 || rect.height < 8) return false;
      dpr = Math.min(2.5, window.devicePixelRatio || 1);
      cssW = rect.width;
      cssH = rect.height;
      const targetW = Math.round(cssW * dpr), targetH = Math.round(cssH * dpr);
      if(canvas.width !== targetW || canvas.height !== targetH){
        canvas.width = targetW;
        canvas.height = targetH;
      }
      redraw();
      return true;
    }

    canvas.addEventListener('pointerdown', e => {
      if(e.button && e.button !== 0 && !(window.HanyuStylus && window.HanyuStylus.isHardwareEraser(e))) return;
      if(activePtrId !== null && e.pointerId !== activePtrId) return;
      const isPen = (window.HanyuStylus && window.HanyuStylus.isStylusLikeEvent)
        ? window.HanyuStylus.isStylusLikeEvent(e)
        : (e.pointerType === 'pen');
      if(isPen) lastPenAt = Date.now();
      if(window.HanyuStylus){
        if(!window.HanyuStylus.shouldAcceptPointer(e, lastPenAt)) return;
      }else if(e.pointerType === 'touch' && (Date.now() - lastPenAt < 10000) && ((e.width && e.width > 24) || (e.height && e.height > 24))){
        return;
      }
      e.preventDefault();
      if(!cssW || !cssH) resize();
      activePtrId = e.pointerId;
      try{ canvas.setPointerCapture(e.pointerId); }catch(_){}
      hasRealPressure = false;
      const sm = sampleMeta(e);
      const st = getStudioState();
      const hwErase = window.HanyuStylus && window.HanyuStylus.isHardwareEraser(e);
      const useTool = hwErase ? 'eraser' : currentTool();
      const baseScaleRatio = opts.widthRatio || 1;
      const penType = st ? st.penType : 'fountain';
      const strokeSz = useTool === 'eraser'
        ? (st ? st.eraserSize : (opts.eraserWidth || 18))
        : ((st ? st.penSize : (opts.baseWidth || 2.8)) * baseScaleRatio);
      const w0 = (window.HanyuStylus && window.HanyuStylus.computeStrokeWidth)
        ? window.HanyuStylus.computeStrokeWidth(penType, strokeSz, sm.p, sm.real, 0.12, 0)
        : strokeSz;
      smoothW = w0;
      lastTime = e.timeStamp || performance.now();
      const pt = [Number(sm.nx.toFixed(4)), Number(sm.ny.toFixed(4)), Number(sm.p.toFixed(2)), Number((w0 / Math.max(0.5, strokeSz)).toFixed(3))];
      activeStroke = {
        tool: useTool,
        penType,
        size: strokeSz,
        softness: st ? st.softness : 0,
        opacity: st ? st.opacity : 1,
        color: st ? st.color : (opts.color || '#2B1B15'),
        pts: [pt]
      };
      strokes.push(activeStroke);
      strokeLastSegment(activeStroke);
      if(typeof opts.onInteract === 'function') opts.onInteract();
    });
    canvas.addEventListener('pointermove', e => {
      if(!activeStroke || e.pointerId !== activePtrId) return;
      const isPen = (window.HanyuStylus && window.HanyuStylus.isStylusLikeEvent)
        ? window.HanyuStylus.isStylusLikeEvent(e)
        : (e.pointerType === 'pen');
      if(isPen) lastPenAt = Date.now();
      else if(e.pointerType === 'touch' && window.HanyuStylus && !window.HanyuStylus.shouldAcceptPointer(e, lastPenAt)) return;
      e.preventDefault();
      const evList = (typeof e.getCoalescedEvents === 'function' && e.getCoalescedEvents().length) ? e.getCoalescedEvents() : [e];
      const baseSz = Math.max(0.5, Number(activeStroke.size) || opts.baseWidth || 2.8);
      for(let ei = 0; ei < evList.length; ei++){
        const ev = evList[ei];
        const sm = sampleMeta(ev);
        const last = activeStroke.pts[activeStroke.pts.length - 1];
        const dx = (sm.nx - last[0]) * cssW, dy = (sm.ny - last[1]) * cssH;
        const dist = Math.hypot(dx, dy);
        if(dist < 1.1) continue;
        const nowT = ev.timeStamp || performance.now();
        const dt = Math.max(1, nowT - lastTime);
        lastTime = nowT;
        const vel = dist / dt;
        const ang = Math.atan2(dy, dx);
        const targetW = (window.HanyuStylus && window.HanyuStylus.computeStrokeWidth)
          ? window.HanyuStylus.computeStrokeWidth(activeStroke.penType, baseSz, sm.p, sm.real || hasRealPressure, vel, ang)
          : computeWidth(activeStroke, sm.p, vel, ang);
        smoothW = smoothW ? (smoothW * 0.65 + targetW * 0.35) : targetW;
        const pt = [Number(sm.nx.toFixed(4)), Number(sm.ny.toFixed(4)), Number(sm.p.toFixed(2)), Number((smoothW / baseSz).toFixed(3))];
        activeStroke.pts.push(pt);
        strokeLastSegment(activeStroke);
      }
    });
    function finishPtr(e){
      if(!activeStroke || e.pointerId !== activePtrId) return;
      try{ canvas.releasePointerCapture(e.pointerId); }catch(_){}
      const needRedraw = activeStroke.penType === 'highlighter';
      activeStroke = null;
      activePtrId = null;
      smoothW = 0;
      hasRealPressure = false;
      if(needRedraw) redraw();
      emitChange();
    }
    canvas.addEventListener('pointerup', finishPtr);
    canvas.addEventListener('pointercancel', finishPtr);
    ['touchstart', 'touchmove'].forEach(evName => {
      canvas.addEventListener(evName, e => {
        if(e.touches && e.touches.length >= 2) return;
        const st = getStudioState();
        if(activePtrId !== null || (st && st.inputMode === 'pen')) e.preventDefault();
      }, { passive: false });
    });

    return {
      resize,
      redraw,
      setTool(t){ localTool = (t === 'eraser') ? 'eraser' : 'pen'; },
      getTool(){ return currentTool(); },
      undo(){ if(!strokes.length) return false; strokes.pop(); redraw(); emitChange(); return true; },
      clear(){ strokes = []; redraw(); emitChange(); },
      getStrokes(){
        return strokes.map(s => ({
          tool: s.tool,
          penType: s.penType || 'fountain',
          size: s.size,
          softness: s.softness || 0,
          opacity: s.opacity == null ? 1 : s.opacity,
          color: s.color || (opts.color || '#2B1B15'),
          pts: s.pts.map(p => p.slice())
        }));
      },
      setStrokes(arr){
        strokes = Array.isArray(arr)
          ? arr.filter(s => s && Array.isArray(s.pts) && s.pts.length).map(s => ({
              tool: s.tool === 'eraser' ? 'eraser' : 'pen',
              penType: s.penType || 'fountain',
              size: Number(s.size) || 2.8,
              softness: Number(s.softness) || 0,
              opacity: s.opacity == null ? 1 : Number(s.opacity),
              color: s.color || (opts.color || '#2B1B15'),
              pts: s.pts
            }))
          : [];
        if(!resize()) redraw();
      },
      hasInk(){ return strokes.some(s => s.tool !== 'eraser' && s.pts && s.pts.length); }
    };
  }

  /* ---------- 2. TỪ ĐIỂN & TÁCH TỪ BÀI KHÓA (100% DỮ LIỆU THẬT) ---------- */
  const POS_MAP = {
    'danh': 'danh từ', 'động': 'động từ', 'tính': 'tính từ', 'đại': 'đại từ',
    'phó': 'phó từ', 'trợ': 'trợ từ', 'lượng': 'lượng từ', 'số': 'số từ',
    'liên': 'liên từ', 'giới': 'giới từ', 'thán': 'thán từ', 'cụm': 'cụm từ',
    'dt.': 'danh từ', 'đgt.': 'động từ', 'tt.': 'tính từ', 'đt.': 'đại từ',
    'phó.': 'phó từ', 'trợ.': 'trợ từ', 'lượng.': 'lượng từ', 'số.': 'số từ',
    'sl.': 'số lượng từ', 'liên.': 'liên từ', 'giới.': 'giới từ', 'ct.': 'thán từ',
    'đtnn.': 'động từ năng nguyện', 'ttố.': 'tiền tố', 'htố.': 'hậu tố',
    'tượng.': 'từ tượng thanh', 'dt. riêng': 'danh từ riêng'
  };
  const CORE_POS_MAP = {
    '你好':'cụm từ','你':'đại từ','好':'tính từ','一':'số từ','五':'số từ','八':'số từ',
    '大':'tính từ','不':'phó từ','口':'danh từ','白':'tính từ','女':'danh từ','马':'danh từ',
    '忙':'tính từ','吗':'trợ từ nghi vấn','很':'phó từ','汉语':'danh từ','难':'tính từ','太':'phó từ',
    '爸爸':'danh từ','妈妈':'danh từ','他':'đại từ','她':'đại từ','男':'tính từ',
    '哥哥':'danh từ','弟弟':'danh từ','妹妹':'danh từ','学':'động từ','英语':'danh từ',
    '对':'tính từ','明天':'danh từ','见':'động từ','去':'động từ','邮局':'danh từ',
    '寄':'động từ','信':'danh từ','银行':'danh từ','取':'động từ','钱':'danh từ',
    '六':'số từ','七':'số từ','九':'số từ','北京':'danh từ riêng',
    '今天':'danh từ','昨天':'danh từ','星期':'danh từ','几':'đại từ','二':'số từ',
    '三':'số từ','四':'số từ','哪儿':'đại từ','那儿':'đại từ','我':'đại từ',
    '回':'động từ','学校':'danh từ','再见':'cụm từ','对不起':'cụm từ','没关系':'cụm từ',
    '天安门':'danh từ riêng','这':'đại từ','是':'động từ','老师':'danh từ','您':'đại từ',
    '请':'động từ','进':'động từ','坐':'động từ','喝':'động từ','茶':'danh từ',
    '谢谢':'động từ','不客气':'cụm từ','工作':'danh từ / động từ','身体':'danh từ','十':'số từ','日':'danh từ',
    '喜欢':'động từ','爱好':'danh từ','运动':'động từ / danh từ','电影':'danh từ','音乐':'danh từ',
    '看书':'động từ','喝茶':'động từ','唱歌':'động từ','游泳':'động từ','旅游':'động từ',
    '什么':'đại từ','和':'liên từ','也':'phó từ','都':'phó từ','经常':'phó từ',
    '看':'động từ','书':'danh từ','中文':'danh từ','小说':'danh từ','有':'động từ','的':'trợ từ',
    '没':'phó từ','没有':'động từ / phó từ','在':'động từ / giới từ','想':'động từ','能':'động từ năng nguyện'
  };
  function formatPos(rawPos, zh){
    const raw = String(rawPos || '').trim();
    if(raw){
      if(POS_MAP[raw]) return POS_MAP[raw];
      return raw.split('/').map(p => POS_MAP[p.trim()] || p.trim()).join(' / ');
    }
    return CORE_POS_MAP[zh] || 'từ vựng';
  }
  function buildLessonLexicon(){
    const map = new Map();
    const put = (zh, py, vi, pos, prio) => {
      if(!zh) return;
      const cur = map.get(zh);
      if(cur && cur.prio > prio && cur.py && cur.vi) return;
      map.set(zh, {
        zh,
        py: py || (cur && cur.py) || '',
        vi: vi || (cur && cur.vi) || '',
        pos: formatPos(pos, zh),
        prio
      });
    };
    // 1. Từ vựng trong bài đang học (ưu tiên cao nhất)
    (typeof WORDS !== 'undefined' ? WORDS : []).forEach(w => put(w.zh, w.py, w.vi, w.pos, 10));
    (typeof CHARS !== 'undefined' ? CHARS : []).forEach(c => { if(c && c.ch && (c.py || c.vi)) put(c.ch, c.py, c.vi, CORE_POS_MAP[c.ch], 8); });
    // 2. Kho từ vựng toàn app
    try{
      Object.values((store && store.vocabBank) || {}).forEach(w => put(w.zh, w.py, w.vi, w.pos, 7));
    }catch(_){}
    // 3. Các gói starter & full
    const ingestVol = obj => {
      if(!obj || typeof obj !== 'object') return;
      Object.values(obj).forEach(vol => {
        if(!vol || typeof vol !== 'object') return;
        Object.values(vol).forEach(ls => {
          (ls && ls.words || []).forEach(w => put(w.zh, w.py, w.vi, w.pos, 6));
        });
      });
    };
    if(typeof HN_STARTER_DATA !== 'undefined') ingestVol(HN_STARTER_DATA);
    if(typeof HN1_FULL_DATA !== 'undefined') ingestVol({1: HN1_FULL_DATA});
    if(typeof HN2_FULL_DATA !== 'undefined') ingestVol({2: HN2_FULL_DATA});
    if(typeof HSK30_STARTER_DATA !== 'undefined') ingestVol(HSK30_STARTER_DATA);
    if(typeof HSK30_1_FULL_DATA !== 'undefined') ingestVol({1: HSK30_1_FULL_DATA});
    if(typeof HSK30_2_FULL_DATA !== 'undefined') ingestVol({2: HSK30_2_FULL_DATA});
    if(typeof HSK30_3_FULL_DATA !== 'undefined') ingestVol({3: HSK30_3_FULL_DATA});
    // 4. Dữ liệu chữ Hán & từ ghép trong Hack não / Sơ đồ tư duy
    if(typeof HANZI_HACKNAO_DB !== 'undefined'){
      Object.entries(HANZI_HACKNAO_DB).forEach(([ch, e]) => {
        put(ch, e.py, e.meaning, CORE_POS_MAP[ch], 4);
        (e.compounds || []).forEach(cp => put(cp.zh, cp.py, cp.vi, CORE_POS_MAP[cp.zh], 3));
      });
    }
    if(typeof HANZI_MINDMAP_DB !== 'undefined'){
      Object.entries(HANZI_MINDMAP_DB).forEach(([ch, e]) => {
        put(ch, e.py, e.meaning, CORE_POS_MAP[ch], 4);
        (e.groups || []).forEach(g => (g.items || []).forEach(it => put(it.zh, it.py, it.vi, CORE_POS_MAP[it.zh], 3)));
      });
    }
    // Bổ sung các từ cấu trúc cốt lõi xuất hiện thường xuyên trong hội thoại
    [
      ['有什么','yǒu shénme','có ... gì','cụm từ'],
      ['喝茶','hē chá','uống trà','động từ'],
      ['看书','kàn shū','đọc sách','động từ'],
      ['中文小说','Zhōngwén xiǎoshuō','tiểu thuyết tiếng Trung','cụm từ'],
      ['有意思','yǒuyìsi','thú vị, hay','tính từ'],
      ['觉得','juéde','cảm thấy, cho rằng','động từ'],
      ['周末','zhōumò','cuối tuần','danh từ'],
      ['经常','jīngcháng','thường xuyên','phó từ'],
      ['常常','chángcháng','thường thường','phó từ'],
      ['太难','tài nán','khó quá','cụm từ'],
      ['不太难','bú tài nán','không khó lắm','cụm từ'],
      ['小语','Xiǎoyǔ','AI Tiểu Ngữ (trợ giảng thông minh)','danh từ riêng'],
      ['王一飞','Wáng Yīfēi','Vương Nhất Phi (giảng viên)','danh từ riêng'],
      ['李文','Lǐ Wén','Lý Văn (du học sinh)','danh từ riêng'],
      ['白家月','Bái Jiāyuè','Bạch Gia Nguyệt (sinh viên)','danh từ riêng'],
      ['安妮','Ānnī','Annie (sinh viên)','danh từ riêng'],
      ['陈天中','Chén Tiānzhōng','Trần Thiên Trung (sinh viên)','danh từ riêng'],
      ['王一雪','Wáng Yīxuě','Vương Nhất Tuyết (nhân viên công ty)','danh từ riêng'],
      ['刘明','Liú Míng','Lưu Minh (bác sĩ)','danh từ riêng'],
      ['刘小雪','Liú Xiǎoxuě','Lưu Tiểu Tuyết','danh từ riêng'],
      ['刘小明','Liú Xiǎomíng','Lưu Tiểu Minh','danh từ riêng'],
      ['杨同乐','Yáng Tónglè','Dương Đồng Lạc','danh từ riêng'],
      ['胡医生','Hú yīshēng','bác sĩ Hồ','danh từ riêng']
    ].forEach(([zh, py, vi, pos]) => {
      if(!map.has(zh)) put(zh, py, vi, pos, 5);
    });
    return map;
  }
  function tokenizeDialogLine(zh, lexMap){
    const s = String(zh || '');
    const out = [];
    const isHan = c => /[\u4e00-\u9fff]/.test(c);
    let idx = 0;
    while(idx < s.length){
      if(!isHan(s[idx])){
        out.push({type:'sep', text:s[idx]});
        idx++;
        continue;
      }
      let matched = '';
      for(let len = Math.min(4, s.length - idx); len >= 2; len--){
        const cand = s.slice(idx, idx + len);
        if([...cand].every(isHan) && lexMap.has(cand)){
          matched = cand;
          break;
        }
      }
      if(!matched) matched = s[idx];
      out.push({type:'word', text:matched});
      idx += matched.length;
    }
    return out;
  }

  /* ---------- 3. MODULE BÀI KHÓA (#dialog) ---------- */
  const dialogCtrl = (function(){
    let curTab = 'content';
    let speed = 1.0;
    let playing = false;
    let shadowMode = false;
    let playSeqToken = 0;
    let activeAudioEl = null;
    let curLineIdx = -1;
    let curPopWord = null;
    let lexMap = new Map();

    function curLesson(){
      return (typeof LESSONS !== 'undefined') ? (LESSONS.find(x => x.id === store.activeLessonId) || null) : null;
    }
    function stopPlayback(){
      playSeqToken++;
      playing = false;
      shadowMode = false;
      curLineIdx = -1;
      try{ if(activeAudioEl){ activeAudioEl.pause(); activeAudioEl = null; } }catch(_){}
      try{ if(typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); }catch(_){}
      try{ if(typeof AzureSpeech !== 'undefined' && AzureSpeech.stopAudio) AzureSpeech.stopAudio(); }catch(_){}
      const btn = $('#bk-play-btn');
      if(btn) btn.innerHTML = '<svg class="ic f"><use href="#i-play"></use></svg>';
      const actP = $('#bk-act-play'), actS = $('#bk-act-shadow');
      if(actP) actP.classList.add('on');
      if(actS) actS.classList.remove('on');
      $$('#bk-lines .bk-line').forEach(el => el.classList.remove('speaking'));
    }
    function fmtTime(sec){
      if(!Number.isFinite(sec) || sec < 0) return '0:00';
      const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    }
    async function findLessonAudioBlob(){
      // Đã thống nhất dùng giọng đọc tích hợp của app (TTS) theo từng câu để đồng bộ highlight và tốc độ
      return null;
    }
    function syncPlayerUI(){
      const l = curLesson();
      const dlgs = LISTEN_DIALOG && LISTEN_DIALOG.length ? LISTEN_DIALOG : SENT;
      const tTitle = $('#bk-track-title');
      if(tTitle) tTitle.textContent = l ? `Bài khóa · ${l.code || l.titleVi || 'Bài học'}` : 'Bài khóa';
      const spdBtn = $('#bk-speed-btn');
      if(spdBtn) spdBtn.textContent = speed.toFixed(speed === 0.75 ? 2 : 1) + '×';
      const timeEl = $('#bk-time');
      if(timeEl && !activeAudioEl && !playing){
        timeEl.textContent = `0 / ${dlgs.length} câu`;
      }
      const saveBtn = $('#bk-act-save');
      if(saveBtn && l){
        const saved = Array.isArray(store.savedLessonIds) && store.savedLessonIds.includes(l.id);
        saveBtn.classList.toggle('saved', saved);
        const sp = saveBtn.querySelector('span');
        if(sp) sp.textContent = saved ? 'Đã lưu bài' : 'Lưu bài';
      }
    }
    async function startPlay(shadow){
      const dlgs = LISTEN_DIALOG && LISTEN_DIALOG.length ? LISTEN_DIALOG : SENT;
      if(!dlgs.length){ toast('Bài này chưa có nội dung bài khóa'); return; }
      if(playing && shadow === shadowMode){
        stopPlayback();
        return;
      }
      stopPlayback();
      playing = true;
      shadowMode = !!shadow;
      const myToken = ++playSeqToken;
      const playBtn = $('#bk-play-btn');
      if(playBtn) playBtn.innerHTML = '<svg class="ic" viewBox="0 0 24 24"><rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/></svg>';
      const actP = $('#bk-act-play'), actS = $('#bk-act-shadow');
      if(actP) actP.classList.toggle('on', !shadowMode);
      if(actS) actS.classList.toggle('on', shadowMode);

      if(typeof markLessonSectionDone === 'function' && store.activeLessonId){
        markLessonSectionDone(store.activeLessonId, 'dialog', true);
      }

      if(!shadowMode){
        const media = await findLessonAudioBlob();
        if(myToken !== playSeqToken) return;
        if(media && media.blob){
          const url = URL.createObjectURL(media.blob);
          const audio = new Audio(url);
          activeAudioEl = audio;
          audio.playbackRate = speed;
          audio.volume = 1.0;
          if(typeof boostAudioEl === 'function') boostAudioEl(audio, 1.75);
          const seek = $('#bk-seek'), tEl = $('#bk-time');
          audio.ontimeupdate = () => {
            if(myToken !== playSeqToken) return;
            const dur = audio.duration || 0, cur = audio.currentTime || 0;
            if(seek && dur > 0) seek.value = String(Math.round(cur / dur * 100));
            if(tEl) tEl.textContent = `${fmtTime(cur)} / ${fmtTime(dur)}`;
          };
          audio.onended = () => {
            URL.revokeObjectURL(url);
            if(myToken === playSeqToken){
              stopPlayback();
              openDialogSummary();
            }
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            activeAudioEl = null;
            playTtsSeq(0, myToken);
          };
          audio.play().catch(() => {
            URL.revokeObjectURL(url);
            activeAudioEl = null;
            playTtsSeq(0, myToken);
          });
          return;
        }
      }
      playTtsSeq(0, myToken);
    }
    function playTtsSeq(startIdx, myToken){
      const dlgs = LISTEN_DIALOG && LISTEN_DIALOG.length ? LISTEN_DIALOG : SENT;
      let idx = startIdx;
      const step = () => {
        if(myToken !== playSeqToken || idx >= dlgs.length){
          if(myToken === playSeqToken){
            const finished = idx >= dlgs.length && dlgs.length > 0;
            stopPlayback();
            if(finished) openDialogSummary();
          }
          return;
        }
        curLineIdx = idx;
        const line = dlgs[idx];
        $$('#bk-lines .bk-line').forEach((el, i) => el.classList.toggle('speaking', i === idx));
        const seek = $('#bk-seek'), tEl = $('#bk-time');
        if(seek) seek.value = String(Math.round((idx + 1) / dlgs.length * 100));
        if(tEl) tEl.textContent = `${idx + 1} / ${dlgs.length} câu`;
        const effSpeed = shadowMode ? Math.min(speed, 0.8) : speed;
        const delayMs = shadowMode ? 1100 : 280;
        let doneCalled = false;
        const nextLine = () => {
          if(doneCalled) return;
          doneCalled = true;
          idx++;
          setTimeout(step, delayMs);
        };
        if(typeof AzureSpeech !== 'undefined' && AzureSpeech.speak && line.zh){
          const maxWait = AzureSpeech.isTtsEnabled && AzureSpeech.isTtsEnabled()
            ? Math.max(8000, (line.zh.length || 6) * 800)
            : Math.max(2800, (line.zh.length || 6) * 480);
          const fbTimer = setTimeout(nextLine, maxWait);
          AzureSpeech.speak(line.zh, effSpeed, () => {
            clearTimeout(fbTimer);
            nextLine();
          });
        }else if(typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined' && line.zh){
          try{
            const u = new SpeechSynthesisUtterance(line.zh);
            u.lang = 'zh-CN';
            u.volume = 1.0;
            u.rate = effSpeed;
            const vs = speechSynthesis.getVoices() || [];
            const v = vs.find(x => x.lang && x.lang.toLowerCase().startsWith('zh'));
            if(v) u.voice = v;
            u.onend = nextLine;
            u.onerror = nextLine;
            speechSynthesis.cancel();
            speechSynthesis.speak(u);
            setTimeout(nextLine, Math.max(2400, (line.zh.length || 6) * 450));
          }catch(_){
            setTimeout(nextLine, 1800);
          }
        }else{
          setTimeout(nextLine, 1800);
        }
      };
      step();
    }

    function openTokenPop(tokText, lineEl, tokBtn){
      const pop = $('#bk-pop');
      if(!pop) return;
      const info = lexMap.get(tokText) || { zh: tokText, py: '', vi: 'Chưa có nghĩa đối chiếu cho từ này', pos: formatPos('', tokText) };
      curPopWord = info;
      $$('#bk-lines .bk-tok').forEach(b => b.classList.toggle('on', b === tokBtn));
      $('#bk-pop-zh').textContent = info.zh;
      $('#bk-pop-py').textContent = info.py || '—';
      $('#bk-pop-vi').textContent = info.vi || '—';
      $('#bk-pop-pos').textContent = info.pos || 'từ vựng';
      if(lineEl && lineEl.parentNode) lineEl.after(pop);
      pop.classList.remove('hide');
    }
    function closePop(){
      const pop = $('#bk-pop');
      if(pop) pop.classList.add('hide');
      $$('#bk-lines .bk-tok').forEach(b => b.classList.remove('on'));
      curPopWord = null;
    }

    function render(){
      const l = curLesson();
      lexMap = buildLessonLexicon();
      const subEl = $('#bk-sub');
      if(subEl) subEl.textContent = l ? `${l.code || 'Bài học'} · ${l.titleVi || l.titleZh || ''}` : 'Hội thoại mẫu';
      const pop = $('#bk-pop'), paneContent = $('#bk-pane-content');
      if(pop && paneContent && pop.parentNode !== paneContent) paneContent.appendChild(pop);
      closePop();

      const dlgs = LISTEN_DIALOG && LISTEN_DIALOG.length ? LISTEN_DIALOG : SENT;
      const linesEl = $('#bk-lines');
      if(linesEl){
        if(!dlgs.length){
          linesEl.innerHTML = '<p class="muted small" style="padding:12px">Bài học này chưa có hội thoại bài khóa.</p>';
        }else{
          let prevSec = '';
          linesEl.innerHTML = dlgs.map((d, i) => {
            let secHd = '';
            if(d.section && d.section !== prevSec){
              prevSec = d.section;
              secHd = `<div class="bk-sec-hd"><div class="bk-sec-top"><b>${esc(d.section)}</b>${d.audio ? `<span class="bk-sec-aud">${esc(d.audio)}</span>` : ''}</div>${d.context ? `<div class="bk-sec-ctx">${esc(d.context)}</div>` : ''}</div>`;
            }
            const spk = esc(d.speaker || (i % 2 === 0 ? 'A' : 'B'));
            const isB = spk === 'B' || i % 2 === 1;
            const toks = tokenizeDialogLine(d.zh, lexMap).map(tk =>
              tk.type === 'word'
                ? `<button class="bk-tok" data-bktok="${esc(tk.text)}" type="button">${esc(tk.text)}</button>`
                : `<span class="bk-sep">${esc(tk.text)}</span>`
            ).join('');
            return secHd + `<div class="bk-line" data-bkline="${i}">
              <button aria-label="Nghe câu ${i + 1}" class="bk-spk${isB ? ' b' : ''}" data-say="${esc(d.zh)}" type="button">${spk}</button>
              <div class="bk-line-body">
                <div class="bk-zh-row">${toks}</div>
              </div>
              <button aria-label="Đọc câu ${i + 1}" class="bk-line-say" data-say="${esc(d.zh)}" type="button"><svg class="ic"><use href="#i-vol"></use></svg></button>
            </div>`;
          }).join('');
        }
      }

      // Tab Từ mới
      const wBox = $('#bk-pane-words');
      if(wBox){
        if(!WORDS.length){
          wBox.innerHTML = '<p class="muted small" style="padding:12px">Bài học chưa có danh sách từ mới.</p>';
        }else{
          wBox.innerHTML = `<div class="bk-wlist">${WORDS.map(w => `<div class="bk-wrow" data-say="${esc(w.zh)}">
            <div class="bk-wzh">${esc(w.zh)}</div>
            <div class="bk-wmid"><b>${esc(w.py || '')}</b><span>${esc(w.vi || '')}</span></div>
            <span class="bk-wpos">${esc(formatPos(w.pos, w.zh))}</span>
          </div>`).join('')}</div>`;
        }
      }

      // Tab Ngữ pháp
      const gBox = $('#bk-pane-grammar');
      if(gBox){
        const gList = Object.values(GRAMMAR_POINTS || {});
        if(!gList.length){
          gBox.innerHTML = '<p class="muted small" style="padding:12px">Bài học chưa có ghi chú ngữ pháp.</p>';
        }else{
          gBox.innerHTML = `<div class="bk-glist">${gList.map(g => `<div class="bk-gitem">
            <b>${esc(g.title || '')}</b>
            ${g.explain ? `<p>${esc(g.explain)}</p>` : ''}
            ${g.ex ? `<div class="bk-gex" data-say="${esc(g.ex)}">${esc(g.ex)}</div>` : ''}
            ${Array.isArray(g.examples) ? g.examples.map(ex => `<div class="bk-gex" data-say="${esc(ex.zh)}"><b>${esc(ex.zh)}</b>${ex.py ? ' · ' + esc(ex.py) : ''}${ex.vi ? ' — ' + esc(ex.vi) : ''}</div>`).join('') : ''}
          </div>`).join('')}</div>`;
        }
      }

      if(paneContent) paneContent.classList.toggle('hide', curTab !== 'content');
      if(wBox) wBox.classList.toggle('hide', curTab !== 'words');
      if(gBox) gBox.classList.toggle('hide', curTab !== 'grammar');
      $$('#bk-tabs button').forEach(b => b.classList.toggle('on', b.dataset.bktab === curTab));
      syncPlayerUI();
    }

    if($('#bk-tabs')) $('#bk-tabs').addEventListener('click', e => {
      const b = e.target.closest('button[data-bktab]');
      if(!b) return;
      curTab = b.dataset.bktab;
      render();
    });
    if($('#bk-lines')) $('#bk-lines').addEventListener('click', e => {
      const tb = e.target.closest('[data-bktok]');
      if(!tb) return;
      const lineEl = tb.closest('.bk-line');
      openTokenPop(tb.dataset.bktok, lineEl, tb);
      if(typeof speak === 'function') speak(tb.dataset.bktok, speed);
    });
    if($('#bk-pop-close')) $('#bk-pop-close').onclick = closePop;
    if($('#bk-pop-spk')) $('#bk-pop-spk').onclick = () => { if(curPopWord && typeof speak === 'function') speak(curPopWord.zh, speed); };
    if($('#bk-pop-note-btn')) $('#bk-pop-note-btn').onclick = () => {
      if(!curPopWord) return;
      const line = `• ${curPopWord.zh}${curPopWord.py ? ' (' + curPopWord.py + ')' : ''}: ${curPopWord.vi}${curPopWord.pos ? ' [' + curPopWord.pos + ']' : ''}`;
      if(typeof appendLessonNote === 'function') appendLessonNote(line);
      toast(`Đã lưu "${curPopWord.zh}" vào Ghi chú`);
    };
    if($('#bk-play-btn')) $('#bk-play-btn').onclick = () => startPlay(false);
    if($('#bk-act-play')) $('#bk-act-play').onclick = () => startPlay(false);
    if($('#bk-act-shadow')) $('#bk-act-shadow').onclick = () => startPlay(true);
    if($('#bk-speed-btn')) $('#bk-speed-btn').onclick = () => {
      const order = [1.0, 0.75, 1.25];
      speed = order[(order.indexOf(speed) + 1) % order.length];
      if(activeAudioEl) activeAudioEl.playbackRate = speed;
      syncPlayerUI();
    };
    if($('#bk-seek')) $('#bk-seek').addEventListener('input', e => {
      const pct = Number(e.target.value) || 0;
      if(activeAudioEl && Number.isFinite(activeAudioEl.duration) && activeAudioEl.duration > 0){
        activeAudioEl.currentTime = activeAudioEl.duration * pct / 100;
      }else if(playing){
        const dlgs = LISTEN_DIALOG && LISTEN_DIALOG.length ? LISTEN_DIALOG : SENT;
        const target = Math.min(dlgs.length - 1, Math.floor(dlgs.length * pct / 100));
        const wasShadow = shadowMode;
        stopPlayback();
        playing = true;
        shadowMode = wasShadow;
        playTtsSeq(target, ++playSeqToken);
      }
    });
    if($('#bk-act-save')) $('#bk-act-save').onclick = () => {
      const lid = store.activeLessonId;
      if(!lid) return;
      if(!Array.isArray(store.savedLessonIds)) store.savedLessonIds = [];
      const idx = store.savedLessonIds.indexOf(lid);
      if(idx >= 0){
        store.savedLessonIds.splice(idx, 1);
        saveStore(store);
        toast('Đã bỏ lưu bài khóa');
      }else{
        store.savedLessonIds.push(lid);
        if(typeof markLessonSectionDone === 'function') markLessonSectionDone(lid, 'dialog', true);
        else saveStore(store);
        toast('Đã lưu bài khóa để xem lại nhanh');
      }
      syncPlayerUI();
    };
    function openDialogSummary(){
      const lid = store.activeLessonId;
      const dlgs = LISTEN_DIALOG && LISTEN_DIALOG.length ? LISTEN_DIALOG : SENT;
      if(typeof showSectionSummary === 'function'){
        showSectionSummary('dialog', {
          doneCount: dlgs.length || 1,
          totalCount: dlgs.length || 1,
          unit: 'câu',
          errors: 0,
          accuracy: 100,
          wrongItems: []
        }, { lessonId: lid, onRetryAll: () => render() });
      }else if(typeof markLessonSectionDone === 'function' && lid){
        markLessonSectionDone(lid, 'dialog', false);
        toast('Đã hoàn thành Bài khóa!');
      }
    }
    if($('#bk-done-btn')) $('#bk-done-btn').onclick = openDialogSummary;

    window._stopDialog = stopPlayback;
    return {
      render,
      enter(){
        render();
        if(typeof notesCtrl !== 'undefined') notesCtrl.sync();
      },
      stop: stopPlayback
    };
  })();

  /* ---------- 4. MODULE CHÉP BÀI KHÓA (#copy) ---------- */
  const copyCtrl = (function(){
    let rowPads = [];
    let rowInputs = [];
    let activeRow = 0;
    let curTool = 'pen';
    let showGuide = true;
    let autoSumDone = false;
    let autoSumTimer = null;

    function getLines(){
      const src = (LISTEN_DIALOG && LISTEN_DIALOG.length) ? LISTEN_DIALOG : SENT;
      return (src || []).filter(x => x && x.zh);
    }
    function isRowFilled(idx){
      const p = rowPads[idx];
      if(p && p.hasInk()) return true;
      const inp = rowInputs[idx];
      return !!(inp && inp.value && inp.value.trim().length > 0);
    }
    function countFilled(){
      const lines = getLines();
      let c = 0;
      for(let i = 0; i < lines.length; i++){
        if(isRowFilled(i)) c++;
      }
      return c;
    }
    function openCopySummary(){
      clearTimeout(autoSumTimer);
      persistDrafts(true);
      const lid = store.activeLessonId;
      const lines = getLines();
      const total = lines.length || 1;
      const filled = countFilled();
      if(typeof recordLearningEvent === 'function'){
        recordLearningEvent({type:'write', skill:'write', title:'Chép bài khóa', result:`${filled}/${lines.length} dòng`, view:'copy'});
      }
      if(typeof showSectionSummary === 'function'){
        showSectionSummary('copy', {
          doneCount: filled || total,
          totalCount: total,
          unit: 'dòng',
          errors: 0,
          accuracy: filled ? Math.min(100, Math.round(filled * 100 / total)) : 100,
          wrongItems: []
        }, { lessonId: lid, onRetryAll: () => render() });
      }else if(typeof markLessonSectionDone === 'function' && lid){
        markLessonSectionDone(lid, 'copy', false);
        toast('Đã hoàn thành Chép bài khóa!');
      }
    }
    function updateProg(){
      const lines = getLines();
      const total = lines.length;
      const filled = countFilled();
      const bar = $('#cp-bar'), cnt = $('#cp-cnt');
      if(bar) bar.style.width = total ? Math.round(filled / total * 100) + '%' : '0%';
      if(cnt) cnt.textContent = `${filled} / ${total} dòng`;
      if(total > 0 && filled >= total && !autoSumDone){
        autoSumDone = true;
        clearTimeout(autoSumTimer);
        autoSumTimer = setTimeout(() => {
          if(typeof curView === 'undefined' || curView === 'copy') openCopySummary();
        }, 1200);
      }
    }
    function persistDrafts(silent){
      const lid = store.activeLessonId;
      if(!lid) return;
      if(!store.copyDrafts || typeof store.copyDrafts !== 'object') store.copyDrafts = {};
      if(!store.copyTextDrafts || typeof store.copyTextDrafts !== 'object') store.copyTextDrafts = {};
      const out = {};
      rowPads.forEach((p, idx) => {
        if(!p) return;
        const st = p.getStrokes();
        if(st.length) out[idx] = st;
      });
      store.copyDrafts[lid] = out;
      const txtOut = {};
      rowInputs.forEach((inp, idx) => {
        if(inp && inp.value && inp.value.trim()) txtOut[idx] = inp.value;
      });
      store.copyTextDrafts[lid] = txtOut;
      saveStore(store);
      if(!silent) toast('Đã lưu bài chép vào máy');
    }
    let draftTimer = null;
    function scheduleSave(){
      clearTimeout(draftTimer);
      draftTimer = setTimeout(() => persistDrafts(true), 600);
    }
    function setActiveTool(t, fromStudio){
      curTool = (t === 'eraser') ? 'eraser' : 'pen';
      const pBtn = $('#cp-tool-pen'), eBtn = $('#cp-tool-eraser');
      if(pBtn) pBtn.classList.toggle('on', curTool === 'pen');
      if(eBtn) eBtn.classList.toggle('on', curTool === 'eraser');
      rowPads.forEach(p => { if(p) p.setTool(curTool); });
      if(!fromStudio && typeof window.HanyuStylus !== 'undefined'){
        window.HanyuStylus.setTool(curTool);
      }
    }
    function syncInputMode(){
      const st = (typeof window.HanyuStylus !== 'undefined') ? window.HanyuStylus.getState() : { inputMode: 'pen' };
      const isKb = st.inputMode === 'keyboard';
      const box = $('#cp-rows');
      if(box) box.classList.toggle('cp-kb-mode', isKb);
      const hintEl = $('#copy .cp-hint-pill span');
      if(hintEl){
        hintEl.textContent = isKb
          ? 'Đang ở chế độ Gõ phím · Bấm “Viết bút” ở bảng bên để dùng S-Pen.'
          : (st.allowTouchDraw
              ? 'Đang bật viết bút + ngón tay · Đã kích hoạt chống tì đè lòng bàn tay.'
              : 'Đang ở chế độ chỉ bút S-Pen / Apple Pencil · Chạm tay sẽ không vẽ nét.');
      }
      if(!isKb) requestAnimationFrame(resizeAll);
    }
    function syncRowFocus(){
      $$('#cp-rows .cp-card').forEach((c, idx) => c.classList.toggle('active', idx === activeRow));
    }

    function render(){
      const l = (typeof LESSONS !== 'undefined') ? LESSONS.find(x => x.id === store.activeLessonId) : null;
      const sub = $('#cp-sub');
      if(sub) sub.textContent = l ? `${l.code || 'Bài học'} · ${l.titleVi || l.titleZh || ''}` : 'Chép bài khóa';
      const guideBtn = $('#cp-guide-btn');
      if(guideBtn) guideBtn.classList.toggle('on', showGuide);

      const box = $('#cp-rows');
      if(!box) return;
      const lines = getLines();
      clearTimeout(autoSumTimer);
      autoSumDone = false;
      rowPads = [];
      rowInputs = [];
      activeRow = 0;
      if(!lines.length){
        box.innerHTML = '<div class="card"><p class="muted small" style="margin:0">Bài học này chưa có câu bài khóa để chép.</p></div>';
        updateProg();
        return;
      }
      const lid = store.activeLessonId;
      const savedDrafts = (store.copyDrafts && lid && store.copyDrafts[lid]) || {};
      const savedTextDrafts = (store.copyTextDrafts && lid && store.copyTextDrafts[lid]) || {};

      box.innerHTML = lines.map((line, idx) => {
        const chars = [...String(line.zh || '')].filter(c => !/\s/.test(c));
        const cols = Math.min(14, Math.max(10, chars.length));
        const rowsCnt = chars.length > 14 ? Math.ceil(chars.length / cols) : 1;
        const cellCount = cols * rowsCnt;
        const cellsHtml = Array.from({length: cellCount}, (_, ci) => {
          const ch = chars[ci] || '';
          return `<span class="cp-cell">${showGuide && ch ? `<i>${esc(ch)}</i>` : ''}</span>`;
        }).join('');
        const kbVal = savedTextDrafts[idx] || '';
        return `<div class="cp-card${idx === 0 ? ' active' : ''}" data-cprow="${idx}">
          <div class="cp-head">
            <div class="cp-model">
              ${line.py ? `<div class="cp-py">${esc(line.py)}</div>` : ''}
              <div class="cp-zh">${esc(line.zh)}</div>
            </div>
            <button aria-label="Nghe câu ${idx + 1}" class="cp-say" data-say="${esc(line.zh)}" type="button"><svg class="ic"><use href="#i-vol"></use></svg></button>
          </div>
          <div class="cp-grid-box${rowsCnt > 1 ? ' multi' : ''}" data-cols="${cols}" style="--cp-cols:${cols};--cp-rows:${rowsCnt}">
            <div aria-hidden="true" class="cp-cells">${cellsHtml}</div>
            <canvas class="cp-cv" id="cp-cv-${idx}"></canvas>
          </div>
          <div class="cp-kb-box">
            <input class="cp-kb-input" id="cp-kb-${idx}" data-cpkb="${idx}" type="text" value="${esc(kbVal)}" placeholder="Gõ lại câu ${idx + 1}: ${esc(line.zh)}" autocomplete="off" autocorrect="off" spellcheck="false"/>
          </div>
        </div>`;
      }).join('');

      lines.forEach((_, idx) => {
        const cvEl = $(`#cp-cv-${idx}`);
        if(cvEl){
          const pad = createStylusPad(cvEl, {
            baseWidth: 2.6,
            widthRatio: 0.85,
            eraserWidth: 16,
            onInteract(){
              activeRow = idx;
              syncRowFocus();
            },
            onChange(){
              updateProg();
              scheduleSave();
            }
          });
          pad.setTool(curTool);
          if(Array.isArray(savedDrafts[idx])) pad.setStrokes(savedDrafts[idx]);
          rowPads[idx] = pad;
        }
        const kbEl = $(`#cp-kb-${idx}`);
        if(kbEl){
          kbEl.addEventListener('focus', () => { activeRow = idx; syncRowFocus(); });
          kbEl.addEventListener('input', () => {
            activeRow = idx;
            syncRowFocus();
            updateProg();
            scheduleSave();
          });
          rowInputs[idx] = kbEl;
        }
      });
      syncInputMode();
      updateProg();
    }

    function resizeAll(){
      rowPads.forEach(p => { if(p) p.resize(); });
    }
    function doUndo(){
      const p = rowPads[activeRow] || rowPads.find(x => x && x.hasInk());
      if(p) p.undo();
    }
    function doClear(){
      const isKb = typeof window.HanyuStylus !== 'undefined' && window.HanyuStylus.getState().inputMode === 'keyboard';
      if(isKb && rowInputs[activeRow]){
        rowInputs[activeRow].value = '';
        persistDrafts(true);
        updateProg();
        toast(`Đã xóa chữ ở dòng ${activeRow + 1}`);
        return;
      }
      const p = rowPads[activeRow];
      if(p){ p.clear(); persistDrafts(true); toast(`Đã xóa nét ở dòng ${activeRow + 1}`); }
    }

    if($('#cp-guide-btn')) $('#cp-guide-btn').onclick = () => {
      persistDrafts(true);
      showGuide = !showGuide;
      render();
      requestAnimationFrame(resizeAll);
    };
    if($('#cp-tool-pen')) $('#cp-tool-pen').onclick = () => setActiveTool('pen');
    if($('#cp-tool-eraser')) $('#cp-tool-eraser').onclick = () => setActiveTool('eraser');
    if($('#cp-tool-undo')) $('#cp-tool-undo').onclick = doUndo;
    if($('#cp-tool-clear')) $('#cp-tool-clear').onclick = doClear;
    if($('#cp-tool-save')) $('#cp-tool-save').onclick = () => persistDrafts(false);
    if($('#cp-info-btn')) $('#cp-info-btn').onclick = () => toast('Khung viết hỗ trợ Apple Pencil / S Pen, chống tì đè tay và khóa zoom');
    if($('#cp-done-btn')) $('#cp-done-btn').onclick = openCopySummary;
    window.addEventListener('resize', () => {
      if(typeof curView !== 'undefined' && curView === 'copy') requestAnimationFrame(resizeAll);
    });

    if(typeof window.HanyuStylus !== 'undefined'){
      window.HanyuStylus.registerViewActions('copy', {
        onUndo: doUndo,
        onClear: doClear,
        onSave: () => persistDrafts(false),
        onInputModeChange: () => syncInputMode(),
        onZoomResize: () => resizeAll()
      });
      window.HanyuStylus.subscribe((st, kind) => {
        setActiveTool(st.tool, true);
        if(kind === 'inputMode' || kind === 'touch') syncInputMode();
      });
    }

    return {
      render,
      enter(){
        render();
        requestAnimationFrame(resizeAll);
        if(typeof notesCtrl !== 'undefined') notesCtrl.sync();
      },
      getPads(){ return rowPads; }
    };
  })();

  /* ---------- 5. MODULE LUYỆN DỊCH (#trans) ---------- */
  const transCtrl = (function(){
    let dir = 'vi2zh';
    let inputMode = (typeof window.HanyuStylus !== 'undefined' && window.HanyuStylus.getState().inputMode === 'keyboard') ? 'type' : 'draw';
    let tool = (typeof window.HanyuStylus !== 'undefined') ? window.HanyuStylus.getState().tool : 'pen';
    let qi = 0;
    let pad = null;
    let doneSet = new Set();

    function getItems(){
      const out = [], seen = new Set();
      (LISTEN_DIALOG || []).concat(SENT || []).forEach(x => {
        if(!x || !x.zh || !x.vi || seen.has(x.zh)) return;
        seen.add(x.zh);
        out.push({ zh: x.zh, py: x.py || '', vi: x.vi });
      });
      return out;
    }
    function syncWatermark(){
      const wm = $('#tr-watermark');
      if(!wm) return;
      const hide = inputMode !== 'draw' || (pad && pad.hasInk());
      wm.classList.toggle('hide', !!hide);
      const pEl = wm.querySelector('p');
      if(pEl) pEl.textContent = dir === 'vi2zh' ? 'Viết câu dịch bằng chữ Hán vào đây' : 'Viết câu dịch bằng tiếng Việt vào đây';
    }
    function initPad(){
      const cv = $('#tr-cv');
      if(!cv || pad) return;
      pad = createStylusPad(cv, {
        baseWidth: 2.9,
        widthRatio: 0.95,
        eraserWidth: 18,
        onChange(){ syncWatermark(); }
      });
    }
    let transErrors = 0;
    const transWrongItems = [];
    function openTransSummary(){
      const itemsNow = getItems();
      const total = itemsNow.length || 1;
      const doneCnt = doneSet.size || total;
      const acc = Math.max(0, Math.min(100, Math.round((doneCnt) * 100 / Math.max(1, doneCnt + transErrors))));
      if(typeof showSectionSummary === 'function'){
        showSectionSummary('trans', {
          doneCount: doneCnt,
          totalCount: total,
          unit: 'câu',
          errors: transErrors,
          accuracy: acc,
          wrongItems: transWrongItems
        }, { lessonId: store.activeLessonId, onRetryAll: () => { qi = 0; doneSet.clear(); transErrors = 0; transWrongItems.length = 0; if(pad) pad.clear(); if($('#tr-textarea')) $('#tr-textarea').value = ''; render(); } });
      }
    }
    function markTransComplete(){
      const lid = store.activeLessonId;
      const items = getItems();
      if(typeof markLessonSectionDone === 'function' && lid){
        markLessonSectionDone(lid, 'trans', false);
      }
      if(typeof recordLearningEvent === 'function'){
        recordLearningEvent({type:'exercise', skill:'read', title:'Luyện dịch Việt ↔ Trung', result:`${doneSet.size || 1}/${items.length} câu`, view:'trans'});
      }
    }

    function render(){
      const l = (typeof LESSONS !== 'undefined') ? LESSONS.find(x => x.id === store.activeLessonId) : null;
      const sub = $('#tr-sub');
      if(sub) sub.textContent = l ? `${l.code || 'Bài học'} · ${l.titleVi || l.titleZh || ''}` : 'Luyện dịch';
      $$('#tr-dir-tabs button').forEach(b => b.classList.toggle('on', b.dataset.trdir === dir));
      $$('#tr-input-tabs button').forEach(b => b.classList.toggle('on', b.dataset.trmode === inputMode));
      const drawWrap = $('#tr-draw-wrap'), typeWrap = $('#tr-type-wrap');
      if(drawWrap) drawWrap.classList.toggle('hide', inputMode !== 'draw');
      if(typeWrap) typeWrap.classList.toggle('hide', inputMode !== 'type');
      const tp = $('#tr-tool-pen'), te = $('#tr-tool-eraser');
      if(tp) tp.classList.toggle('on', tool === 'pen');
      if(te) te.classList.toggle('on', tool === 'eraser');
      const badgeEl = $('#trans .tr-stylus-badge span');
      if(badgeEl && typeof window.HanyuStylus !== 'undefined'){
        const st = window.HanyuStylus.getState();
        badgeEl.textContent = inputMode === 'type'
          ? 'Đang ở chế độ Bàn phím · Không nhận nét bút'
          : (st.allowTouchDraw ? 'Bút + ngón tay · Chống tì đè lòng bàn tay' : 'Chỉ S-Pen / Apple Pencil · Tay chạm không vẽ');
      }

      const items = getItems();
      const cnt = $('#tr-cnt'), lbl = $('#tr-prompt-lbl'), txt = $('#tr-prompt-txt'), pyEl = $('#tr-prompt-py'), spk = $('#tr-prompt-spk');
      const ansMain = $('#tr-ans-main'), ansPy = $('#tr-ans-py'), ta = $('#tr-textarea');
      $('#tr-hint-box').classList.add('hide');
      $('#tr-fb-box').classList.add('hide');

      if(!items.length){
        if(cnt) cnt.textContent = '0 / 0';
        if(txt) txt.textContent = 'Bài học này chưa có câu ví dụ để luyện dịch.';
        if(pyEl) pyEl.classList.add('hide');
        if(ansMain) ansMain.textContent = '—';
        if(ansPy) ansPy.textContent = '';
        return;
      }
      if(qi >= items.length) qi = items.length - 1;
      if(qi < 0) qi = 0;
      const cur = items[qi];
      if(cnt) cnt.textContent = `${qi + 1} / ${items.length}`;
      if($('#tr-prev')) $('#tr-prev').disabled = (qi <= 0);
      if($('#tr-next')) $('#tr-next').title = (qi + 1 >= items.length) ? 'Hoàn thành & xem tổng kết' : 'Câu sau';
      const lblSpan = lbl && lbl.querySelector('span:last-child');
      if(dir === 'vi2zh'){
        if(lblSpan) lblSpan.textContent = 'Dịch sang tiếng Trung:';
        if(txt) txt.textContent = cur.vi;
        if(pyEl) pyEl.classList.add('hide');
        if(spk) spk.classList.add('hide');
        if(ansMain) ansMain.textContent = cur.zh;
        if(ansPy){ ansPy.textContent = cur.py; ansPy.classList.toggle('hide', !cur.py); }
        if(ta) ta.placeholder = 'Nhập câu dịch bằng chữ Hán (ví dụ: 我喜欢喝茶。)...';
      }else{
        if(lblSpan) lblSpan.textContent = 'Dịch sang tiếng Việt:';
        if(txt) txt.textContent = cur.zh;
        if(pyEl){ pyEl.textContent = cur.py; pyEl.classList.toggle('hide', !cur.py); }
        if(spk) spk.classList.remove('hide');
        if(ansMain) ansMain.textContent = cur.vi;
        if(ansPy) ansPy.classList.add('hide');
        if(ta) ta.placeholder = 'Nhập câu dịch tiếng Việt...';
      }
      syncWatermark();
    }

    function showHint(){
      const items = getItems(), hb = $('#tr-hint-box');
      if(!items.length || !hb) return;
      const cur = items[qi];
      const lex = buildLessonLexicon();
      const hints = [];
      const seen = new Set();
      tokenizeDialogLine(cur.zh, lex).forEach(tk => {
        if(tk.type !== 'word' || seen.has(tk.text)) return;
        seen.add(tk.text);
        const info = lex.get(tk.text);
        if(info) hints.push(`<b>${esc(info.zh)}</b> (${esc(info.py)}): ${esc(info.vi)}`);
      });
      hb.innerHTML = `<div class="small"><b>Gợi ý từ vựng trong câu:</b><div class="tr-hint-chips">${hints.length ? hints.map(h => `<span>${h}</span>`).join('') : esc(cur.py || cur.vi)}</div></div>`;
      hb.classList.remove('hide');
    }

    function normViText(s){
      return String(s || '').toLowerCase().replace(/[.,!?;:"'“”‘’。，！？、\-()]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function checkAnswer(){
      const items = getItems(), fb = $('#tr-fb-box'), ansCard = $('#tr-ans-card');
      if(!items.length || !fb) return;
      const cur = items[qi];
      if(ansCard) ansCard.classList.add('open');

      if(inputMode === 'type'){
        const val = ($('#tr-textarea').value || '').trim();
        if(!val){ toast('Hãy nhập câu dịch trước khi kiểm tra'); return; }
        let ok = false, detail = '';
        if(dir === 'vi2zh'){
          const clean = s => String(s || '').replace(/[.,!?;:"'“”‘’。，！？、\s]/g, '');
          const gotClean = clean(val), expClean = clean(cur.zh);
          if(typeof diffChars === 'function'){
            const r = diffChars(gotClean, expClean);
            ok = r.exact;
            detail = `<div class="diff-line">${r.ops.map(op => op.t === 'ok' ? `<span class="dc ok">${esc(op.ch)}</span>` : op.t === 'sub' ? `<span class="dc sub">${esc(op.got)}→${esc(op.ch)}</span>` : op.t === 'miss' ? `<span class="dc miss">${esc(op.ch)}</span>` : `<span class="dc extra">${esc(op.ch)}</span>`).join('')}</div>`;
          }else{
            ok = gotClean === expClean;
          }
        }else{
          const a = normViText(val), b = normViText(cur.vi);
          const aWords = new Set(a.split(' ').filter(Boolean)), bWords = b.split(' ').filter(Boolean);
          const hit = bWords.filter(w => aWords.has(w)).length;
          ok = a === b || (bWords.length > 0 && hit / bWords.length >= 0.7);
          detail = `<div class="small" style="margin-top:4px">Đáp án mẫu: <b>${esc(cur.vi)}</b></div>`;
        }
        fb.className = 'tr-fb-box ' + (ok ? 'ok' : 'no');
        if(typeof playSfx === 'function') playSfx(ok ? 'ok' : 'no');
        fb.innerHTML = `<b>${ok ? '✓ Chính xác!' : 'Gần đúng — đối chiếu lại với đáp án nhé:'}</b>${detail}`;
        fb.classList.remove('hide');
        if(ok){
          doneSet.add(qi);
          markTransComplete();
          if(qi + 1 >= items.length || doneSet.size >= items.length){
            setTimeout(() => openTransSummary(), 350);
          }
        }else{
          transErrors++;
          if(!transWrongItems.some(x => x.zh === cur.zh)){
            transWrongItems.push({zh: cur.zh || '', py: cur.py || '', vi: cur.vi || '', note: 'Dịch chưa chính xác'});
          }
        }
        return;
      }

      // Chế độ Viết tay (không bịa chấm điểm OCR AI — đối chiếu đáp án tham khảo & tự xác nhận)
      if(!pad || !pad.hasInk()){ toast('Hãy viết câu dịch lên khung trước khi kiểm tra'); return; }
      fb.className = 'tr-fb-box self';
      fb.innerHTML = `<div class="tr-self-txt"><b>Đối chiếu với đáp án tham khảo bên dưới</b><span class="small muted">App chạy offline nên không tự chấm điểm chữ viết tay.</span></div>
        <div class="tr-self-btns">
          <button class="btn ghost sm" id="tr-self-retry" type="button">Viết lại</button>
          <button class="btn sm" id="tr-self-ok" type="button">${qi + 1 >= items.length ? 'Mình viết đúng · Xem kết quả ›' : 'Mình viết đúng · Câu tiếp ›'}</button>
        </div>`;
      fb.classList.remove('hide');
      $('#tr-self-retry').onclick = () => {
        if(typeof playSfx === 'function') playSfx('no');
        transErrors++;
        if(!transWrongItems.some(x => x.zh === cur.zh)){
          transWrongItems.push({zh: cur.zh || '', py: cur.py || '', vi: cur.vi || '', note: 'Cần viết lại'});
        }
        if(pad) pad.clear();
        fb.classList.add('hide');
      };
      $('#tr-self-ok').onclick = () => {
        if(typeof playSfx === 'function') playSfx('ok');
        doneSet.add(qi);
        markTransComplete();
        const itemsNow = getItems();
        if(pad) pad.clear();
        if(qi + 1 < itemsNow.length){ qi += 1; render(); }
        else { openTransSummary(); }
      };
    }

    if($('#tr-dir-tabs')) $('#tr-dir-tabs').addEventListener('click', e => {
      const b = e.target.closest('button[data-trdir]');
      if(!b) return;
      dir = b.dataset.trdir;
      if(pad) pad.clear();
      if($('#tr-textarea')) $('#tr-textarea').value = '';
      render();
    });
    if($('#tr-input-tabs')) $('#tr-input-tabs').addEventListener('click', e => {
      const b = e.target.closest('button[data-trmode]');
      if(!b) return;
      inputMode = b.dataset.trmode;
      if(typeof window.HanyuStylus !== 'undefined'){
        window.HanyuStylus.setInputMode(inputMode === 'type' ? 'keyboard' : 'pen', true);
      }
      render();
      if(inputMode === 'draw') requestAnimationFrame(() => { initPad(); if(pad) pad.resize(); });
    });
    if($('#tr-prev')) $('#tr-prev').onclick = () => { if(qi <= 0) return; qi--; if(pad) pad.clear(); if($('#tr-textarea')) $('#tr-textarea').value = ''; render(); };
    if($('#tr-next')) $('#tr-next').onclick = () => {
      const items = getItems();
      if(!items.length) return;
      if(qi + 1 < items.length){
        qi++;
        if(pad) pad.clear();
        if($('#tr-textarea')) $('#tr-textarea').value = '';
        render();
      }else{
        openTransSummary();
      }
    };
    if($('#tr-prompt-spk')) $('#tr-prompt-spk').onclick = () => { const cur = getItems()[qi]; if(cur && typeof speak === 'function') speak(cur.zh, 0.9); };
    if($('#tr-ans-spk')) $('#tr-ans-spk').onclick = () => { const cur = getItems()[qi]; if(cur && typeof speak === 'function') speak(cur.zh, 0.9); };
    if($('#tr-tool-pen')) $('#tr-tool-pen').onclick = () => {
      tool = 'pen';
      if(pad) pad.setTool('pen');
      if(typeof window.HanyuStylus !== 'undefined') window.HanyuStylus.setTool('pen');
      render();
    };
    if($('#tr-tool-eraser')) $('#tr-tool-eraser').onclick = () => {
      tool = 'eraser';
      if(pad) pad.setTool('eraser');
      if(typeof window.HanyuStylus !== 'undefined') window.HanyuStylus.setTool('eraser');
      render();
    };
    if($('#tr-tool-undo')) $('#tr-tool-undo').onclick = () => { if(pad) pad.undo(); };
    if($('#tr-tool-clear')) $('#tr-tool-clear').onclick = () => {
      if(inputMode === 'type'){
        const ta = $('#tr-textarea');
        if(ta){ ta.value = ''; ta.focus(); }
      }else if(pad){
        pad.clear();
      }
    };
    if($('#tr-type-clr')) $('#tr-type-clr').onclick = () => { const ta = $('#tr-textarea'); if(ta){ ta.value = ''; ta.focus(); } };
    if($('#tr-hint-btn')) $('#tr-hint-btn').onclick = showHint;
    if($('#tr-check-btn')) $('#tr-check-btn').onclick = checkAnswer;
    if($('#tr-ans-toggle')) $('#tr-ans-toggle').onclick = () => { const c = $('#tr-ans-card'); if(c) c.classList.toggle('open'); };
    window.addEventListener('resize', () => {
      if(typeof curView !== 'undefined' && curView === 'trans' && pad) requestAnimationFrame(() => pad.resize());
    });

    if(typeof window.HanyuStylus !== 'undefined'){
      window.HanyuStylus.registerViewActions('trans', {
        onUndo(){ if(pad) pad.undo(); },
        onClear(){
          if(inputMode === 'type'){
            const ta = $('#tr-textarea');
            if(ta){ ta.value = ''; ta.focus(); }
          }else if(pad){
            pad.clear();
          }
        },
        onInputModeChange(m){
          inputMode = (m === 'keyboard') ? 'type' : 'draw';
          render();
          if(inputMode === 'draw') requestAnimationFrame(() => { initPad(); if(pad) pad.resize(); });
        },
        onZoomResize(){
          if(pad) pad.resize();
        }
      });
      window.HanyuStylus.subscribe((st, kind) => {
        tool = st.tool;
        if(pad) pad.setTool(tool);
        if(kind === 'inputMode' || kind === 'touch'){
          const nextMode = st.inputMode === 'keyboard' ? 'type' : 'draw';
          if(inputMode !== nextMode || kind === 'touch'){
            inputMode = nextMode;
            render();
            if(inputMode === 'draw') requestAnimationFrame(() => { initPad(); if(pad) pad.resize(); });
          }
        }else if(kind === 'tool'){
          const tp = $('#tr-tool-pen'), te = $('#tr-tool-eraser');
          if(tp) tp.classList.toggle('on', tool === 'pen');
          if(te) te.classList.toggle('on', tool === 'eraser');
        }
      });
    }

    return {
      render,
      enter(){
        if(typeof window.HanyuStylus !== 'undefined'){
          inputMode = window.HanyuStylus.getState().inputMode === 'keyboard' ? 'type' : 'draw';
          tool = window.HanyuStylus.getState().tool;
        }
        initPad();
        render();
        requestAnimationFrame(() => { if(pad) pad.resize(); });
        if(typeof notesCtrl !== 'undefined') notesCtrl.sync();
      },
      resetSession(){ qi = 0; doneSet.clear(); if(pad) pad.clear(); }
    };
  })();

  /* ---------- 6. BẢNG BÚT VIẾT + GHI CHÚ BÀI HỌC 3 CỘT (TEXT + STYLUS) ---------- */
  const notesCtrl = (function(){
    const panels = [];
    let noteMode = 'text';
    const hostTabMap = { dialog: 'notes', copy: 'stylus', trans: 'stylus' };
    let saveTimer = null;

    function getNoteRec(lid){
      if(!store.lessonNotes || typeof store.lessonNotes !== 'object') store.lessonNotes = {};
      if(!lid) return { text: '', strokes: [] };
      const r = store.lessonNotes[lid];
      return (r && typeof r === 'object') ? r : { text: '', strokes: [] };
    }
    function setNoteText(lid, text){
      if(!lid) return;
      const cur = getNoteRec(lid);
      store.lessonNotes[lid] = { text: String(text || ''), strokes: Array.isArray(cur.strokes) ? cur.strokes : [] };
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveStore(store), 320);
    }
    function setNoteStrokes(lid, strokes){
      if(!lid) return;
      const cur = getNoteRec(lid);
      store.lessonNotes[lid] = { text: cur.text || '', strokes };
      saveStore(store);
    }
    function syncPanelTabs(p){
      const activeTab = hostTabMap[p.hostId] || 'notes';
      p.host.querySelectorAll('[data-railtab]').forEach(b => b.classList.toggle('on', b.dataset.railtab === activeTab));
      p.host.querySelectorAll('[data-railpane]').forEach(pane => pane.classList.toggle('hide', pane.dataset.railpane !== activeTab));
      if(activeTab === 'stylus' && typeof window.HanyuStylus !== 'undefined'){
        requestAnimationFrame(() => window.HanyuStylus.redrawPreviews());
      }
      if(activeTab === 'notes' && noteMode === 'draw'){
        const rec = getNoteRec(store.activeLessonId);
        requestAnimationFrame(() => p.pad.setStrokes(rec.strokes || []));
      }
    }

    function initHosts(){
      if(panels.length) return;
      $$('.d2-notes-panel[data-notes-host]').forEach(host => {
        const hostId = host.dataset.notesHost;
        host.classList.add('d2-side-rail');
        host.innerHTML = `<div class="d2-rail-top">
          <div class="d2-rail-tabs">
            <button type="button" data-railtab="stylus"><svg class="ic"><use href="#i-pencil"></use></svg><span>Bút viết</span></button>
            <button type="button" data-railtab="notes"><svg class="ic"><use href="#i-book"></use></svg><span>Ghi chú</span></button>
          </div>
          <button aria-label="Đóng bảng" class="d2-np-close" type="button"><svg class="ic"><use href="#i-x"></use></svg></button>
        </div>
        <div class="d2-rail-pane" data-railpane="stylus">
          <div class="d2-stylus-host"></div>
        </div>
        <div class="d2-rail-pane" data-railpane="notes">
          <div class="d2-np-head">
            <b>Ghi chú bài học</b>
            <div class="d2-np-tabs">
              <button class="on" data-nptab="text" type="button">Ghi chú</button>
              <button data-nptab="draw" type="button">Viết tay</button>
            </div>
          </div>
          <div class="d2-np-body">
            <textarea class="d2-np-ta" placeholder="Ghi chép từ vựng, ngữ pháp, lưu ý phát âm..."></textarea>
            <div class="d2-np-draw hide">
              <div class="d2-np-paper"><canvas class="d2-np-cv"></canvas></div>
              <div class="d2-np-tools">
                <button class="on" data-nptool="pen" type="button">Bút</button>
                <button data-nptool="eraser" type="button">Tẩy</button>
                <button data-nptool="undo" type="button">Hoàn tác</button>
                <button data-nptool="clear" type="button">Xóa</button>
              </div>
              <button class="d2-np-penlink" type="button">Chỉnh cỡ, màu bút &amp; khóa zoom ›</button>
            </div>
          </div>
          <div class="d2-np-foot">Tự động lưu cục bộ theo từng bài học</div>
        </div>`;

        const stylusHost = host.querySelector('.d2-stylus-host');
        if(stylusHost && typeof window.HanyuStylus !== 'undefined'){
          window.HanyuStylus.mountPanel(stylusHost, { showSave: hostId === 'copy' });
        }

        const ta = host.querySelector('.d2-np-ta');
        const drawBox = host.querySelector('.d2-np-draw');
        const cv = host.querySelector('.d2-np-cv');
        const pad = createStylusPad(cv, {
          baseWidth: 2.3,
          widthRatio: 0.78,
          eraserWidth: 15,
          onChange(st){ setNoteStrokes(store.activeLessonId, st); }
        });

        host.querySelectorAll('[data-railtab]').forEach(b => b.addEventListener('click', () => {
          hostTabMap[hostId] = b.dataset.railtab;
          const curPanel = panels.find(x => x.hostId === hostId);
          if(curPanel) syncPanelTabs(curPanel);
        }));

        const penLinkBtn = host.querySelector('.d2-np-penlink');
        if(penLinkBtn) penLinkBtn.onclick = () => {
          hostTabMap[hostId] = 'stylus';
          const curPanel = panels.find(x => x.hostId === hostId);
          if(curPanel) syncPanelTabs(curPanel);
        };

        ta.addEventListener('input', () => {
          setNoteText(store.activeLessonId, ta.value);
          panels.forEach(p => { if(p.ta !== ta) p.ta.value = ta.value; });
        });
        host.querySelectorAll('[data-nptab]').forEach(b => b.addEventListener('click', () => {
          noteMode = b.dataset.nptab;
          sync();
        }));
        host.querySelector('.d2-np-close').onclick = () => host.classList.remove('open');
        host.querySelectorAll('[data-nptool]').forEach(b => b.addEventListener('click', () => {
          const act = b.dataset.nptool;
          if(act === 'pen' || act === 'eraser'){
            pad.setTool(act);
            if(typeof window.HanyuStylus !== 'undefined') window.HanyuStylus.setTool(act);
            host.querySelectorAll('[data-nptool="pen"],[data-nptool="eraser"]').forEach(x => x.classList.toggle('on', x.dataset.nptool === act));
          }else if(act === 'undo'){
            pad.undo();
          }else if(act === 'clear'){
            pad.clear();
          }
        }));
        const entry = { hostId, host, ta, drawBox, pad };
        panels.push(entry);
        syncPanelTabs(entry);
      });

      if(typeof window.HanyuStylus !== 'undefined'){
        window.HanyuStylus.registerViewActions('dialog', {
          onUndo(){
            const p = panels.find(x => x.hostId === 'dialog');
            if(p && noteMode === 'draw') p.pad.undo();
          },
          onClear(){
            const p = panels.find(x => x.hostId === 'dialog');
            if(p && noteMode === 'draw') p.pad.clear();
          },
          onInputModeChange(m){
            const activeV = (typeof curView === 'string') ? curView : '';
            if(activeV === 'dialog'){
              noteMode = (m === 'keyboard') ? 'text' : 'draw';
              hostTabMap.dialog = 'notes';
              sync();
            }
          },
          onZoomResize(){
            panels.forEach(p => { if(noteMode === 'draw') p.pad.resize(); });
          }
        });
        window.HanyuStylus.subscribe((st, kind) => {
          if(kind === 'tool'){
            panels.forEach(p => {
              p.pad.setTool(st.tool);
              p.host.querySelectorAll('[data-nptool="pen"],[data-nptool="eraser"]').forEach(x => x.classList.toggle('on', x.dataset.nptool === st.tool));
            });
          }
        });
      }
    }

    function sync(){
      initHosts();
      const rec = getNoteRec(store.activeLessonId);
      panels.forEach(p => {
        p.ta.value = rec.text || '';
        p.ta.classList.toggle('hide', noteMode !== 'text');
        p.drawBox.classList.toggle('hide', noteMode !== 'draw');
        p.host.querySelectorAll('[data-nptab]').forEach(b => b.classList.toggle('on', b.dataset.nptab === noteMode));
        syncPanelTabs(p);
        if(noteMode === 'draw'){
          requestAnimationFrame(() => p.pad.setStrokes(rec.strokes || []));
        }
      });
    }

    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-toggle-notes]');
      if(!btn) return;
      initHosts();
      const host = $(`.d2-notes-panel[data-notes-host="${btn.dataset.toggleNotes}"]`);
      if(!host) return;
      hostTabMap[btn.dataset.toggleNotes] = 'notes';
      host.classList.toggle('open');
      if(host.classList.contains('open')) sync();
    });

    return {
      sync,
      initHosts,
      openHostTab(hostId, tab){
        initHosts();
        if(hostId && (tab === 'stylus' || tab === 'notes')) hostTabMap[hostId] = tab;
        const p = panels.find(x => x.hostId === hostId);
        if(p) syncPanelTabs(p);
      }
    };
  })();

  window.appendLessonNote = function(line){
    const lid = store.activeLessonId;
    if(!lid || !line) return;
    if(!store.lessonNotes || typeof store.lessonNotes !== 'object') store.lessonNotes = {};
    const cur = store.lessonNotes[lid] || { text: '', strokes: [] };
    const nextTxt = cur.text ? (cur.text.trimEnd() + '\n' + line) : line;
    store.lessonNotes[lid] = { text: nextTxt, strokes: cur.strokes || [] };
    saveStore(store);
    notesCtrl.openHostTab('dialog', 'notes');
    notesCtrl.sync();
  };

  window.dialogCtrl = dialogCtrl;
  window.copyCtrl = copyCtrl;
  window.transCtrl = transCtrl;
  window.notesCtrl = notesCtrl;
  window.refreshDot2Views = function(){
    try{ dialogCtrl.stop(); }catch(_){}
    try{ dialogCtrl.render(); }catch(_){}
    try{ copyCtrl.render(); }catch(_){}
    try{ transCtrl.resetSession(); transCtrl.render(); }catch(_){}
    try{ notesCtrl.sync(); }catch(_){}
  };

  try{
    notesCtrl.initHosts();
    window.refreshDot2Views();
  }catch(e){ console.error('Dot2 init error:', e); }
})();
