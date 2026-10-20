/* ZIP lesson importer: client-side only. PDF.js extracts text; JSZip reads archive. */
(() => {
  const $ = s => document.querySelector(s);
  const form = $('#zipImportForm');
  if (!form) return;
  if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  let pendingItems = [], pendingAudio = [], pendingLessonTitle = '';
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const status = s => { $('#zipImportStatus').textContent = s; };
  function guessKind(en) { const n=en.trim().split(/\s+/).length; return n===1?'word':n<=4?'phrase':'sentence'; }
  function extractPairs(text) {
    const rows = text.split(/\n+/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
    const out=[], seen=new Set();
    for (const row of rows) {
      // Most lesson vocabulary sheets put English and Polish in separate columns.
      let m = row.match(/^(.{1,90}?)\s{2,}(.{2,140})$/);
      if (!m) m = row.match(/^([A-Za-z][A-Za-z'’\- ]{0,70})\s+[–—-]\s+(.{2,140})$/);
      if (!m) continue;
      let en=m[1].trim(), pl=m[2].trim();
      if (!/[A-Za-z]/.test(en) || !/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/i.test(pl)) continue;
      if (/^(brilliant|vocabulary|lesson|superstar|english|polish|word|phrase|example)$/i.test(en)) continue;
      const key=(en+'|'+pl).toLowerCase();
      if(seen.has(key)) continue; seen.add(key);
      out.push({pl,en,kind:guessKind(en),flash:true});
    }
    return out;
  }
  async function pdfText(file) {
    const doc=await pdfjsLib.getDocument({data:await file.async('uint8array')}).promise;
    let text='';
    for(let n=1;n<=doc.numPages;n++){const page=await doc.getPage(n),c=await page.getTextContent();text+=c.items.map(x=>x.str).join('  ')+'\n';}
    return text;
  }
  function openDb() { return new Promise((resolve,reject)=>{const r=indexedDB.open('racibo-english-audio',1);r.onupgradeneeded=()=>r.result.createObjectStore('audio',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function saveAudio(file,lessonId) {
    const db=await openDb(), id=crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random());
    await new Promise((resolve,reject)=>{const tx=db.transaction('audio','readwrite');tx.objectStore('audio').put({id,lessonId,name:file.name,type:file.type||'audio/mp4',blob:file});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
    db.close(); return {id,name:file.name};
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault(); const file=$('#zipFile').files[0]; if(!file)return;
    if(!window.JSZip||!window.pdfjsLib){status('Nie udało się załadować bibliotek importu. Odśwież stronę i spróbuj ponownie.');return;}
    $('#zipImportPreview').innerHTML=''; pendingItems=[];pendingAudio=[];pendingLessonTitle=$('#zipLessonTitle').value.trim();
    status('Otwieram ZIP i analizuję pliki…');
    try {
      const zip=await JSZip.loadAsync(file), files=Object.values(zip.files).filter(f=>!f.dir);
      const pdfs=files.filter(f=>/\.pdf$/i.test(f.name));
      const audios=files.filter(f=>/\.(m4a|mp3|wav|ogg|aac)$/i.test(f.name));
      const chosenPdf=pdfs.find(f=>/brilliant/i.test(f.name))||pdfs[0];
      if(chosenPdf){const text=await pdfText(chosenPdf);pendingItems=extractPairs(text);}
      pendingAudio=audios.filter(f=>/brilliant/i.test(f.name)||audios.length===1);
      if(!pendingAudio.length) pendingAudio=audios;
      let html='<div class="import-summary"><strong>Znalezione pliki</strong><ul>'+files.map(f=>'<li>'+esc(f.name)+'</li>').join('')+'</ul>';
      html+='<p>'+pdfs.length+' PDF · '+audios.length+' plików audio · '+pendingItems.length+' potencjalnych fiszek z pliku '+esc(chosenPdf?chosenPdf.name:'PDF nie znaleziono')+'</p></div>';
      if(!pendingItems.length) html+='<p class="hint">Nie udało się pewnie rozdzielić słówek z PDF. Możesz dodać fiszki ręcznie po imporcie; oryginalny PDF zostanie zachowany w materiałach.</p>';
      else html+='<h3>Sprawdź fiszki przed importem</h3><div class="import-items">'+pendingItems.map((i,n)=>'<label class="import-item"><input type="checkbox" data-import-item="'+n+'" checked><span><input data-en="'+n+'" value="'+esc(i.en)+'" aria-label="Angielski"><input data-pl="'+n+'" value="'+esc(i.pl)+'" aria-label="Polski"></span></label>').join('')+'</div>';
      html+='<button type="button" class="primary wide" id="confirmZipImport">Zapisz lekcję i materiały</button>';
      $('#zipImportPreview').innerHTML=html;
      $('#confirmZipImport').onclick=async()=>{
        const title=pendingLessonTitle||'Importowana lekcja';
        const l={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),title,date:new Date().toISOString().slice(0,10),items:[],group:'brilliant',sourceFiles:[],audioFiles:[]};
        pendingItems.forEach((i,n)=>{const checked=$('[data-import-item="'+n+'"]');if(!checked||!checked.checked)return;const en=$('[data-en="'+n+'"]').value.trim(),pl=$('[data-pl="'+n+'"]').value.trim();if(en&&pl)l.items.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),en,pl,kind:guessKind(en),flash:true});});
        try {
          for(const f of files){
            if(/\.(m4a|mp3|wav|ogg|aac)$/i.test(f.name)){if(pendingAudio.some(a=>a.name===f.name)){const audioFile=new File([await f.async('blob')],f.name,{type:'audio/mp4'});l.audioFiles.push(await saveAudio(audioFile,l.id));}}
            else if(/\.pdf$/i.test(f.name)){l.sourceFiles.push({name:f.name,type:'pdf'});}
          }
          const key='racibo-english-notebook-v1';let state=JSON.parse(localStorage.getItem(key)||'{"lessons":[]}');state.lessons=state.lessons||[];state.lessons.unshift(l);localStorage.setItem(key,JSON.stringify(state));
          status('Zapisano lekcję: '+l.items.length+' fiszek, '+l.audioFiles.length+' nagrań. Odśwież stronę, aby zobaczyć lekcję.');
          $('#zipImportPreview').innerHTML='<p class="success-note">Import zakończony. Lekcja zapisana na tym urządzeniu.</p><button type="button" class="secondary" onclick="location.reload()">Odśwież aplikację</button>';
        } catch(err){status('Nie udało się zapisać materiałów: '+err.message);}
      };
      status('Analiza zakończona. Sprawdź wykryte fiszki i zatwierdź import.');
    } catch(err){status('Błąd importu ZIP: '+err.message);}
  });
})();