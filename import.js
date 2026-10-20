/* ZIP importer for Brilliant B1. Creates flashcards automatically from its vocabulary PDF. */
(() => {
  const $ = s => document.querySelector(s);
  const form = $('#zipImportForm');
  if (!form) return;
  if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const status = s => { $('#zipImportStatus').textContent = s; };
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random());
  const guessKind = en => { const n=en.trim().split(/\s+/).length; return n===1?'word':n<=4?'phrase':'sentence'; };

  // Preserve PDF text positions so entries in separate columns are not merged into one line.
  async function pdfPages(file) {
    const doc = await pdfjsLib.getDocument({data: await file.async('uint8array')}).promise;
    const pages = [];
    for (let n=1;n<=doc.numPages;n++) {
      const page=await doc.getPage(n), content=await page.getTextContent();
      const items=content.items.filter(x=>x.str && x.str.trim()).map(x=>({
        text:x.str.trim(), x:Math.round(x.transform[4]), y:Math.round(x.transform[5])
      }));
      const rows=[];
      for (const item of items) {
        let row=rows.find(r=>Math.abs(r.y-item.y)<=3);
        if(!row){row={y:item.y,items:[]};rows.push(row);}
        row.items.push(item);
      }
      rows.sort((a,b)=>b.y-a.y);
      pages.push(rows.map(r=>r.items.sort((a,b)=>a.x-b.x).map(x=>x.text).join(' | ')));
    }
    return pages.flat();
  }
  function extractPairs(lines) {
    const out=[], seen=new Set();
    const polish=/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
    const skip=/^(brilliant|vocabulary|lesson\s*\d*|superstar|english|polish|word|phrase|example|unit\s*\d*)$/i;
    for(const raw of lines) {
      const cells=raw.split(/\s*\|\s*/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
      if(cells.length<2) continue;
      // English is normally the first cell and Polish the next cell. Ignore example columns.
      const en=cells[0].replace(/^\d+[.)]?\s*/,'').trim();
      let pl=cells.find((s,i)=>i>0 && polish.test(s));
      if(!pl || !en || en.length>100 || pl.length>180 || !/[A-Za-z]/.test(en) || polish.test(en) || skip.test(en)) continue;
      if(/^(the |a |an )?(english|polish|translation|meaning)$/i.test(en)) continue;
      const key=(en+'|'+pl).toLocaleLowerCase();
      if(seen.has(key)) continue;
      seen.add(key);
      out.push({id:uid(),pl,en,kind:guessKind(en),flash:true});
    }
    return out;
  }
  function openDb() {
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open('racibo-english-audio',1);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('audio'))req.result.createObjectStore('audio',{keyPath:'id'});};
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
    });
  }
  async function saveAudio(file,lessonId) {
    const db=await openDb(), id=uid();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction('audio','readwrite');
      tx.objectStore('audio').put({id,lessonId,name:file.name,type:file.type||'audio/mp4',blob:file});
      tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
    });
    db.close(); return {id,name:file.name};
  }

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const zipFile=$('#zipFile').files[0]; if(!zipFile)return;
    if(!window.JSZip||!window.pdfjsLib){status('Nie załadowały się biblioteki ZIP/PDF. Odśwież stronę i spróbuj ponownie.');return;}
    const button=form.querySelector('button[type="submit"]'); button.disabled=true;
    $('#zipImportPreview').innerHTML='';
    status('Otwieram ZIP. Wyszukuję wyłącznie materiały Brilliant B1…');
    try {
      const zip=await JSZip.loadAsync(zipFile);
      const files=Object.values(zip.files).filter(f=>!f.dir);
      const pdfs=files.filter(f=>/\.pdf$/i.test(f.name));
      const audios=files.filter(f=>/\.(m4a|mp3|wav|ogg|aac)$/i.test(f.name));
      // Never silently import the other course (e.g. Superstar B2+).
      const brilliantPdfs=pdfs.filter(f=>/brilliant/i.test(f.name) && !/superstar/i.test(f.name));
      const brilliantAudio=audios.filter(f=>/brilliant/i.test(f.name) && !/superstar/i.test(f.name));
      if(!brilliantPdfs.length) {
        status('Nie znaleziono pliku PDF z nazwą Brilliant. Niczego nie zaimportowano, aby nie pomylić grup. Sprawdź nazwę pliku w ZIP.');
        $('#zipImportPreview').innerHTML='<p class="hint">Obsługiwane są wyłącznie materiały Brilliant B1. Pliki Superstar i inne grupy są pomijane.</p>';
        return;
      }
      let items=[];
      for(const pdf of brilliantPdfs) items.push(...extractPairs(await pdfPages(pdf)));
      const unique=new Map(); items.forEach(i=>unique.set((i.en+'|'+i.pl).toLocaleLowerCase(),i)); items=[...unique.values()];
      if(!items.length) {
        status('PDF Brilliant został znaleziony, ale nie udało się automatycznie rozpoznać par angielski–polski. Nie utworzyłem pustej lekcji.');
        $('#zipImportPreview').innerHTML='<p class="hint">Układ tego PDF wymaga dopasowania parsera. Niczego nie zapisano — nie musisz przepisywać słówek ręcznie.</p>';
        return;
      }
      const title=$('#zipLessonTitle').value.trim()||'Lekcja — Brilliant B1';
      const lesson={id:uid(),title,date:new Date().toISOString().slice(0,10),items,group:'brilliant',sourceFiles:[],audioFiles:[]};
      for(const pdf of brilliantPdfs) lesson.sourceFiles.push({name:pdf.name,type:'pdf'});
      for(const audio of brilliantAudio) {
        const blob=await audio.async('blob');
        lesson.audioFiles.push(await saveAudio(new File([blob],audio.name,{type:'audio/mp4'}),lesson.id));
      }
      const key='racibo-english-notebook-v1';
      const state=JSON.parse(localStorage.getItem(key)||'{"lessons":[]}');
      state.lessons=state.lessons||[];
      state.lessons.unshift(lesson);
      localStorage.setItem(key,JSON.stringify(state));
      const skipped=pdfs.length-brilliantPdfs.length, skippedAudio=audios.length-brilliantAudio.length;
      status('Gotowe: automatycznie dodano '+items.length+' fiszek Brilliant B1 i '+lesson.audioFiles.length+' nagrań.');
      $('#zipImportPreview').innerHTML='<div class="import-summary"><strong>Import zakończony</strong><p>Utworzono lekcję „'+esc(title)+'” z '+items.length+' fiszkami. Wszystkie rozpoznane pozycje zostały automatycznie oznaczone jako fiszki.</p><p>Oryginalne nagrania Brilliant: '+lesson.audioFiles.length+'. Pominięte pliki innych grup: '+(skipped+skippedAudio)+'.</p><button type="button" class="secondary" id="refreshAfterImport">Pokaż zaimportowaną lekcję</button></div>';
      $('#refreshAfterImport').onclick=()=>location.reload();
    } catch(err) {
      status('Błąd importu ZIP: '+err.message);
    } finally { button.disabled=false; }
  });
})();