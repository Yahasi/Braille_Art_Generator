// Braille ASCII Art Generator - standalone JS file
// Assumes the HTML page has elements with IDs used below (file, outWidth, outHeight, keepAspect, threshold, invert, generate, output, srcCanvas, resCanvas, downloadTxt, copy, downloadPng, fontSize)
(function(){
  // DOM refs
  const fileInput = document.getElementById('file');
  const outW = document.getElementById('outWidth');
  const outH = document.getElementById('outHeight');
  const keepAspect = document.getElementById('keepAspect');
  const thresholdEl = document.getElementById('threshold');
  const thresholdVal = document.getElementById('thresholdVal');
  const invertEl = document.getElementById('invert');
  const generateBtn = document.getElementById('generate');
  const outputPre = document.getElementById('output');
  const srcCanvas = document.getElementById('srcCanvas');
  const resCanvas = document.getElementById('resCanvas');
  const downloadTxt = document.getElementById('downloadTxt');
  const copyBtn = document.getElementById('copy');
  const downloadPng = document.getElementById('downloadPng');
  const fontSizeIn = document.getElementById('fontSize');

  let img = new Image();
  let srcCtx = srcCanvas.getContext('2d');
  let resCtx = resCanvas.getContext('2d');

  thresholdEl && (thresholdEl.oninput = ()=> thresholdVal && (thresholdVal.textContent = thresholdEl.value));

  fileInput && fileInput.addEventListener('change', async (e)=>{
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    const url = URL.createObjectURL(f);
    img = new Image();
    img.onload = ()=>{
      const maxW = 480; const maxH = 360;
      let w = img.width, h = img.height;
      const scale = Math.min(maxW/w, maxH/h, 1);
      w = Math.round(w*scale); h = Math.round(h*scale);
      srcCanvas.width = w; srcCanvas.height = h;
      srcCtx.imageSmoothingEnabled = true;
      srcCtx.clearRect(0,0,w,h);
      srcCtx.drawImage(img,0,0,w,h);
    };
    img.src = url;
  });

  function rgbaToLuma(r,g,b){return 0.299*r + 0.587*g + 0.114*b}

  function generateBraille(image, charsW, charsH, threshold, invert){
    const pxW = charsW * 2;
    const pxH = charsH * 4;
    resCanvas.width = pxW; resCanvas.height = pxH;
    const off = document.createElement('canvas');
    off.width = pxW; off.height = pxH;
    const offCtx = off.getContext('2d');
    offCtx.imageSmoothingEnabled = true;
    offCtx.clearRect(0,0,pxW,pxH);
    const iw = image.width, ih = image.height;
    const scale = Math.min(pxW/iw, pxH/ih);
    const dw = Math.round(iw*scale), dh = Math.round(ih*scale);
    const dx = Math.round((pxW - dw)/2), dy = Math.round((pxH - dh)/2);
    offCtx.drawImage(image, 0,0,iw,ih, dx,dy,dw,dh);
    resCtx.clearRect(0,0,pxW,pxH);
    resCtx.drawImage(off,0,0);

    const imgd = offCtx.getImageData(0,0,pxW,pxH).data;
    let out = '';
    for(let cy=0; cy<charsH; cy++){
      let line = '';
      for(let cx=0; cx<charsW; cx++){
        let mask = 0;
        for(let r=0;r<4;r++){
          for(let c=0;c<2;c++){
            const px = cx*2 + c;
            const py = cy*4 + r;
            const idx = (py*pxW + px) * 4;
            const rcol = imgd[idx];
            const gcol = imgd[idx+1];
            const bcol = imgd[idx+2];
            const l = rgbaToLuma(rcol,gcol,bcol);
            const dotOn = invert ? (l < threshold) : (l > threshold);
            if(dotOn){
              let dot;
              if(c===0){ dot = [1,2,3,7][r]; }
              else { dot = [4,5,6,8][r]; }
              mask |= (1 << (dot-1));
            }
          }
        }
        const ch = String.fromCharCode(0x2800 + mask);
        line += ch;
      }
      out += line + '\n';
    }
    return out;
  }

  generateBtn && generateBtn.addEventListener('click', ()=>{
    if(!img || !img.complete){alert('Сначала загрузите изображение');return}
    let w = parseInt(outW.value) || 80;
    let h = parseInt(outH.value) || 30;
    const thresh = parseInt(thresholdEl.value);
    const inv = invertEl.value === '1';
    if(keepAspect && keepAspect.checked){
      const pxW = w*2;
      const pxH = Math.round(img.height * (pxW / img.width));
      h = Math.max(1, Math.round(pxH / 4));
      outH.value = h;
    }
    w = Math.max(1, Math.min(400, w));
    h = Math.max(1, Math.min(400, h));
    const txt = generateBraille(img, w, h, thresh, inv);
    outputPre.textContent = txt;
    outputPre.style.fontSize = fontSizeIn.value + 'px';
  });

  downloadTxt && downloadTxt.addEventListener('click', ()=>{
    const txt = outputPre.textContent || '';
    const blob = new Blob([txt], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'braille.txt';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  copyBtn && copyBtn.addEventListener('click', async ()=>{
    try{
      await navigator.clipboard.writeText(outputPre.textContent || '');
      copyBtn.textContent = 'Скопировано!';
      setTimeout(()=> copyBtn.textContent = 'Копировать', 1200);
    }catch(e){alert('Не удалось скопировать: ' + e)}
  });

  downloadPng && downloadPng.addEventListener('click', ()=>{
    const txt = outputPre.textContent || '';
    if(!txt) return alert('Нет данных для экспорта');
    const lines = txt.split('\n');
    const fs = parseInt(fontSizeIn.value) || 12;
    const charW = Math.ceil(fs * 0.6);
    const charH = Math.ceil(fs * 0.95);
    const width = (lines[0]?.length || 0) * charW || 1;
    const height = lines.length * charH || 1;
    const c = document.createElement('canvas');
    c.width = Math.min(8192, width);
    c.height = Math.min(8192, height);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#00121a'; ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle = '#e6eef6'; ctx.font = fs + 'px monospace'; ctx.textBaseline = 'top';
    for(let i=0;i<lines.length;i++){
      ctx.fillText(lines[i], 0, i*charH + 1);
    }
    const url = c.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url; a.download = 'braille.png'; document.body.appendChild(a); a.click(); a.remove();
  });

})();
