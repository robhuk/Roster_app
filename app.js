const STORAGE_KEY = "roster-manager-xc-data-v1";
const APP_ID = "roster-manager-xc-pwa-v1";
const $ = id => document.getElementById(id);
const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
let data = loadData();

function loadData(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||defaultData()}catch{return defaultData()}}
function defaultData(){return {name:"",startLine:1,startDate:"",cycleLength:1,lines:[],overrides:{}}}
function saveData(){localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}
function dateOnly(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d,12)}
function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function sundayOf(d){const x=new Date(d);x.setDate(x.getDate()-x.getDay());x.setHours(12,0,0,0);return x}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function daysBetween(a,b){return Math.round((sundayOf(a)-sundayOf(b))/86400000)}
function parseLines(text){return text.split(/\n/).map(s=>s.trim()).filter(Boolean).map((line,i)=>{let cells=line.includes("|")?line.split("|"):line.split(",");cells=cells.map(x=>x.trim()).filter((x,j)=>x!==""||j<7);return {name:`Week line ${i+1}`,days:cells.slice(0,7)}}).filter(x=>x.days.length)}
function getEntry(date){
 const key=iso(date);if(data.overrides[key])return data.overrides[key];
 if(!data.startDate||!data.lines.length)return "";
 const start=dateOnly(data.startDate), targetWeek=sundayOf(date), startWeek=sundayOf(start);
 const weekOffset=Math.floor((targetWeek-startWeek)/604800000);
 const idx=((Number(data.startLine||1)-1+weekOffset)%data.lines.length+data.lines.length)%data.lines.length;
 const day=data.lines[idx]?.days?.[date.getDay()];
 return day||"";
}
function classify(code){
 const c=String(code||"").trim().toUpperCase();
 if(!c)return "orange";
 if(c==="RD"||c==="REST"||c==="OFF"||c==="DAY OFF")return "green";
 if(c==="AL"||c==="ALR"||c==="A/R"||c==="AR"||c==="A\\R")return "orange";
 return "red";
}
function rangeLabel(start){const end=addDays(start,6);return `${start.getDate()} ${start.toLocaleString("en-GB",{month:"short"})} – ${end.getDate()} ${end.toLocaleString("en-GB",{month:"short"})}`}
function renderWeek(containerId,start,rangeId){
 const container=$(containerId);container.innerHTML="";$(rangeId).textContent=rangeLabel(start);
 for(let i=0;i<7;i++){
  const d=addDays(start,i), code=getEntry(d), kind=classify(code), el=document.createElement("button");
  el.className="day"+(iso(d)===iso(new Date())?" today":"");el.setAttribute("aria-label",`${dayNames[d.getDay()]} ${iso(d)}: ${code||"No roster entry"}`);
  el.innerHTML=`<span class="dow">${dayNames[d.getDay()]}</span><span class="date">${d.getDate()}</span><i class="dot ${kind}"></i><span class="code"></span>`;
  el.querySelector(".code").textContent=code||"Not set";
  el.addEventListener("click",()=>{ $("lookupDate").value=iso(d);showLookup(d); });
  container.appendChild(el);
 }
}
function showLookup(d){
 const code=getEntry(d),kind=classify(code);
 $("lookupResult").innerHTML="";
 const strong=document.createElement("strong");strong.textContent=d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
 const p=document.createElement("p");p.style.margin="8px 0 0";const dot=document.createElement("i");dot.className=`dot ${kind}`;dot.style.marginRight="8px";
 p.append(dot,document.createTextNode(code?`Expected shift: ${code}`:"No shift found — configure or check the roster."));
 $("lookupResult").append(strong,p);
}
function render(){
 const today=new Date();today.setHours(12,0,0,0);const thisStart=sundayOf(today);
 renderWeek("thisWeek",thisStart,"thisWeekRange");renderWeek("nextWeek",addDays(thisStart,7),"nextWeekRange");
 $("rosterName").value=data.name||"";$("weekLine").value=data.startLine||1;$("startDate").value=data.startDate||"";$("cycleLength").value=data.cycleLength||Math.max(1,data.lines.length);$("rosterText").value=data.lines.map(l=>l.days.join(", ")).join("\n");
 $("status").textContent=data.startDate&&data.lines.length?`Roster saved: ${data.name||"Unnamed roster"} · ${data.lines.length} week line(s)`:"Set up your roster to calculate expected shifts.";
}
function openSettings(){$("settingsDialog").showModal()}
$("settingsBtn").addEventListener("click",openSettings);$("settingsShortcut").addEventListener("click",openSettings);
$("lookupDate").value=iso(new Date());$("lookupBtn").addEventListener("click",()=>{if($("lookupDate").value)showLookup(dateOnly($("lookupDate").value))});
$("settingsForm").addEventListener("submit",e=>{
 if(e.submitter?.id!=="saveSettings")return;
 e.preventDefault();
 const lines=parseLines($("rosterText").value);
 data={...data,name:$("rosterName").value.trim(),startLine:Math.max(1,Number($("weekLine").value)||1),startDate:$("startDate").value,cycleLength:Math.max(1,Number($("cycleLength").value)||lines.length||1),lines,overrides:data.overrides||{}};
 if(lines.length && data.startLine>lines.length){alert(`You have ${lines.length} week lines. The starting line has been reset to 1.`);data.startLine=1}
 saveData();$("settingsDialog").close();render();showLookup(dateOnly($("lookupDate").value||iso(new Date())));
});
$("pdfFile").addEventListener("change",async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  if(!window.pdfjsLib){await loadPdfJs()}
  const buf=await file.arrayBuffer(),pdf=await pdfjsLib.getDocument({data:buf}).promise;let text="";
  for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n),content=await page.getTextContent();text+=content.items.map(x=>x.str).join(" ")+"\n"}
  $("rosterText").value=text.trim();
  alert("PDF text extracted. Check and format it into one line per week, with seven daily entries separated by commas, then save.");
 }catch(err){alert("Could not extract this PDF. It may be scanned or image-based. You can still enter the roster text manually.");}
});
function loadPdfJs(){return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";s.onload=()=>{pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";resolve()};s.onerror=reject;document.head.appendChild(s)})}
function allCalendarEntries(){
 const entries=[],from=sundayOf(new Date()),weeks=Math.max(1,Math.min(104,data.lines.length?52:1));
 for(let i=0;i<weeks*7;i++){const d=addDays(from,i),code=getEntry(d);if(code)entries.push({date:d,code})}
 return entries;
}
function icsEscape(s){return String(s).replace(/\\/g,"\\\\").replace(/,/g,"\\,").replace(/;/g,"\\;").replace(/\n/g,"\\n")}
function exportIcs(){
 const entries=allCalendarEntries();if(!entries.length){alert("Configure your roster first so the app has shifts to export.");return}
 const stamp=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
 const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Roster Manager XC//Roster Manager v1//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
 entries.forEach((x,i)=>{const day=iso(x.date).replace(/-/g,"");const summary=classify(x.code)==="green"?"Rest day":classify(x.code)==="orange"?`Roster: ${x.code}`:`Shift: ${x.code}`;
 lines.push("BEGIN:VEVENT",`UID:${APP_ID}-${day}-${i}@roster-manager`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${day}`,`DTEND;VALUE=DATE:${iso(addDays(x.date,1)).replace(/-/g,"")}`,`SUMMARY:${icsEscape(summary)}`,`DESCRIPTION:${icsEscape("Expected roster entry: "+x.code+". Check for engineering or other short-term alterations.")}`,"END:VEVENT")});
 lines.push("END:VCALENDAR");const blob=new Blob([lines.join("\r\n")],{type:"text/calendar;charset=utf-8"});downloadBlob(blob,"roster-manager.ics");
}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$("calendarBtn").addEventListener("click",exportIcs);
$("emailBtn").addEventListener("click",()=>{
 const entries=allCalendarEntries();if(!entries.length){alert("Configure your roster first so the app has shifts to email.");return}
 const body=entries.map(x=>`${x.date.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}: ${x.code}`).join("\n");
 const subject=encodeURIComponent(`Roster Manager – ${data.name||"expected shifts"}`);
 const text=encodeURIComponent(`Expected roster shifts for ${data.name||"Roster"}\n\n${body}\n\nReminder: Make sure to check for engineering or other short-term alterations.`);
 location.href=`mailto:?subject=${subject}&body=${text}`;
});
// Update policy: check at launch, but no more than once every 12 hours.
// This timestamp is app-specific; roster data is never cleared during updates.
if("serviceWorker" in navigator)window.addEventListener("load",async()=>{
 try{
  const registration=await navigator.serviceWorker.register("./service-worker.js",{scope:"./",updateViaCache:"none"});
  const updateKey="roster-manager-xc-last-update-check-v1";
  const last=Number(localStorage.getItem(updateKey)||0);
  if(Date.now()-last>=12*60*60*1000){
   await registration.update();
   localStorage.setItem(updateKey,String(Date.now()));
  }
  registration.addEventListener("updatefound",()=>{
   const worker=registration.installing;
   if(worker)worker.addEventListener("statechange",()=>{
    if(worker.state==="installed"&&navigator.serviceWorker.controller){
     // New version is installed; activate it without touching saved roster data.
     worker.postMessage({type:"SKIP_WAITING"});
    }
   });
  });
  let refreshing=false;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
   if(!refreshing){refreshing=true;window.location.reload()}
  });
 }catch(err){console.warn("Roster Manager update check unavailable",err)}
});
render();showLookup(dateOnly($("lookupDate").value));
