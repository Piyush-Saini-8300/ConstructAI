import React, {useEffect, useState} from 'react';
import {
  ShieldCheck, ScanLine, Calculator, CloudSun, MessageCircle, Activity,
  HardHat, Upload, AlertTriangle, LoaderCircle, ClipboardList, BookOpen,
  CalendarDays, Building2, Send, FileText, CheckCircle2, Menu, X, Hammer,
  ChevronRight, CloudRain, ThermometerSun, Wind, Download
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const money = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n)||0);
async function call(path, options={}) {
  const response = await fetch(API + path, options);
  const body = await response.json().catch(()=>({detail:'The server returned an unreadable response.'}));
  if (!response.ok) throw new Error(body.detail || body.error || `Request failed (${response.status})`);
  return body;
}
function downloadJson(data, name='site-report.json') {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a=document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url);
}
function Button({children, className='', ...props}) { return <button className={`btn ${className}`} {...props}>{children}</button>; }
function Panel({title, subtitle, icon:Icon, children, className=''}) {
  return <section className={`panel ${className}`}><div className="panel-title">{Icon&&<span className="panel-icon"><Icon size={19}/></span>}<div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div></div>{children}</section>;
}
function Field({label, children, className=''}) { return <label className={`field ${className}`}><span>{label}</span>{children}</label>; }
function ErrorMsg({children}) { return children ? <div className="error-msg"><AlertTriangle size={16}/><span>{children}</span></div> : null; }
function ResultList({title, items}) { if(!items?.length)return null; return <div className="result-block"><h4>{title}</h4><ul>{items.map((x,i)=><li key={i}>{typeof x==='string'?x:JSON.stringify(x)}</li>)}</ul></div>; }

function ImageAnalysis({kind}) {
  const isSafety=kind==='safety', [file,setFile]=useState(null), [description,setDescription]=useState(''), [data,setData]=useState(null), [busy,setBusy]=useState(false), [error,setError]=useState('');
  async function submit(e){e.preventDefault();if(!file){setError('Please choose an image first.');return;}setBusy(true);setError('');setData(null);
    const fd=new FormData();fd.append('file',file);
    try{setData(await call(isSafety?'/api/safety/analyze':'/api/cracks/analyze',{method:'POST',body:fd}));}
    catch(err){setError(err.message);}
    finally{setBusy(false);}
  }
  return <div className="two-col">
    <Panel title={isSafety?'Input data':'Input analysis data'} subtitle={isSafety?'Add an observation and site photo for a PPE review.':'Describe the crack location and upload a close-up image.'} icon={isSafety?ShieldCheck:ScanLine}>
      <form onSubmit={submit} className="stack">
        <Field label={isSafety?'Observation log':'Description'}>
          <textarea rows="4" value={description} onChange={e=>setDescription(e.target.value)} placeholder={isSafety?'Describe the scene, e.g. workers on scaffold without harness…':'Describe the crack location, pattern, and when it appeared…'}/>
        </Field>
        <Field label={isSafety?'Site photo':'Crack image'}>
          <div className="upload-box"><Upload size={21}/><b>{file?file.name:(isSafety?'Click to upload image':'Upload close-up image')}</b><small>JPG, PNG or WEBP · max 10 MB</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{setFile(e.target.files?.[0]||null);setData(null);setError('')}}/></div>
        </Field>
        <Button disabled={busy||!file}>{busy?<><LoaderCircle className="spin" size={16}/> Analyzing…</>:isSafety?'Analyze hazards':'Run diagnosis'}</Button>
      </form>
      <ErrorMsg>{error}</ErrorMsg>
    </Panel>
    <Panel title="Analysis results" subtitle="AI-assisted findings appear here." icon={Activity}>
      {!data&&!busy&&<div className="empty-state"><ScanLine size={34}/><span>Waiting for input…</span></div>}
      {busy&&<div className="empty-state"><LoaderCircle className="spin" size={28}/><span>Analyzing image…</span></div>}
      {data&&<div className="analysis-result">
        <div className="result-heading"><b>{isSafety?'Safety assessment':'Crack assessment'}</b><span className={`pill ${String(data.overall_status||data.urgency||'review').toLowerCase()}`}>{data.overall_status||data.urgency||data.mode||'Review'}</span></div>
        {data.safety_score!==undefined&&<div className="score-card"><strong>{data.safety_score}/100</strong><span>Safety score</span></div>}
        {data.disclaimer&&<p className="disclaimer">{data.disclaimer}</p>}
        {data.items&&<ResultList title="PPE checklist" items={data.items.map(x=>`${x.item}: ${x.status} — ${x.note}`)}/>}
        {data.visible_observations&&<ResultList title="Visible observations" items={data.visible_observations}/>}
        {data.possible_patterns&&<ResultList title="Possible patterns" items={data.possible_patterns}/>}
        {data.hazards&&<ResultList title="Hazards" items={data.hazards}/>}
        {data.recommended_actions&&<ResultList title="Recommended actions" items={data.recommended_actions}/>}
        {data.limitations&&<ResultList title="Limitations" items={data.limitations}/>}
        <Button className="btn-outline" onClick={()=>downloadJson(data,isSafety?'safety-report.json':'crack-diagnosis.json')}><Download size={15}/> Download report</Button>
      </div>}
    </Panel>
  </div>;
}

function Valuation() {
  const [f,setF]=useState({location:'',area:1500,age:5,type:'Residential',amenities:'Parking, balcony'}),[result,setResult]=useState(null);
  const [error,setError]=useState('');
  function calculate(e){e.preventDefault();setError('');const area=Number(f.area), age=Number(f.age);if(area<=0){setError('Enter a positive area.');return;}
    // Clearly labelled indicative local-market heuristic; not a formal valuation.
    const base={Residential:3500,Apartment:4200,Commercial:5200,Industrial:2800}[f.type]||3500;
    const ageFactor=Math.max(.55,1-Math.max(0,age)*.012), amenityFactor=f.amenities.trim()?1.08:1;
    const estimated=area*base*ageFactor*amenityFactor;
    setResult({location:f.location||'Location not specified',area_sqft:area,property_age_years:age,property_type:f.type,estimated_value_inr:Math.round(estimated),rate_per_sqft_inr:Math.round(estimated/area),assumptions:['Illustrative estimate using a simple area-rate heuristic.','Not a formal valuation; actual prices depend on locality, condition, legal status, and comparable sales.','Validate with recent local transactions or a qualified valuer.']});
  }
  return <div className="two-col"><Panel title="Property details" subtitle="Enter property details to estimate indicative value." icon={Building2}><form className="stack" onSubmit={calculate}>
    <Field label="Location"><input value={f.location} onChange={e=>setF({...f,location:e.target.value})} placeholder="City, locality"/></Field>
    <div className="form-row"><Field label="Area (sq ft)"><input type="number" min="1" value={f.area} onChange={e=>setF({...f,area:e.target.value})}/></Field><Field label="Age (years)"><input type="number" min="0" value={f.age} onChange={e=>setF({...f,age:e.target.value})}/></Field></div>
    <Field label="Property type"><select value={f.type} onChange={e=>setF({...f,type:e.target.value})}>{['Residential','Apartment','Commercial','Industrial'].map(x=><option key={x}>{x}</option>)}</select></Field>
    <Field label="Amenities"><textarea rows="2" value={f.amenities} onChange={e=>setF({...f,amenities:e.target.value})} placeholder="Pool, gym, parking…"/></Field>
    <Button>Calculate value</Button></form><ErrorMsg>{error}</ErrorMsg></Panel>
    <Panel title="Valuation result" subtitle="Indicative estimate in Indian rupees." icon={Calculator}>{result?<><div className="big-value">{money(result.estimated_value_inr)}</div><p className="sub-value">Approx. {money(result.rate_per_sqft_inr)} per sq ft</p><div className="summary-grid"><div><small>Area</small><b>{result.area_sqft.toLocaleString('en-IN')} sq ft</b></div><div><small>Property type</small><b>{result.property_type}</b></div><div><small>Location</small><b>{result.location}</b></div></div><ResultList title="Assumptions" items={result.assumptions}/><Button className="btn-outline" onClick={()=>downloadJson(result,'property-valuation.json')}>Download report</Button></>:<div className="empty-state"><Building2 size={34}/><span>Enter property details to calculate value.</span></div>}</Panel></div>;
}

function Planner() {
  const [brief,setBrief]=useState('Create a plan for a 20×30 ft residential slab construction.'),[plan,setPlan]=useState(null);
  function generate(e){e.preventDefault();const m=brief.match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i);const area=m?Number(m[1])*Number(m[2]):600;const vol=area*.12;const cement=Math.ceil(vol*7.5),sand=Number((vol*.45).toFixed(1)),agg=Number((vol*.9).toFixed(1)),steel=Math.ceil(area*3.5);
    setPlan({brief,area_sqft:area,concrete_volume_m3:Number((vol*.0283168).toFixed(2)),cement_bags:cement,sand_tons:sand,aggregate_tons:agg,steel_kg:steel,materials_cost_inr:Math.round(area*950),labour_cost_inr:Math.round(area*350),finishing_cost_inr:Math.round(area*450),duration_days:14,tasks:[['Day 1–2','Site preparation and safety checks'],['Day 3–4','Formwork and reinforcement'],['Day 5','Pre-pour inspection'],['Day 6','Concrete placement'],['Day 7–14','Curing and quality checks']],note:'Planning values are indicative only. Confirm quantities, structural design, mix design, costs, and schedule with qualified professionals.'});
  }
  return <Panel title="Construction project planner" subtitle="Create a preliminary material, cost, and time plan from a project brief." icon={CalendarDays}>
    <form className="planner-form" onSubmit={generate}><Field label="Project brief"><input value={brief} onChange={e=>setBrief(e.target.value)} placeholder="e.g. Create full plan for 20×30 slab construction"/></Field><Button>Generate plan</Button></form>
    {plan?<div className="planner-results"><div className="planner-columns"><div className="table-card"><h3>Material estimator</h3><table><tbody>{[['Cement',`${plan.cement_bags} bags`],['Sand',`${plan.sand_tons} tons (approx.)`],['Aggregate',`${plan.aggregate_tons} tons (approx.)`],['Steel',`${plan.steel_kg} kg (allowance)`],['Concrete volume',`${plan.concrete_volume_m3} m³`]].map(r=><tr key={r[0]}><td>{r[0]}</td><th>{r[1]}</th></tr>)}</tbody></table></div><div className="table-card"><h3>Cost estimator</h3><table><tbody>{[['Materials',money(plan.materials_cost_inr)],['Labour',money(plan.labour_cost_inr)],['Finishing',money(plan.finishing_cost_inr)],['TOTAL',money(plan.materials_cost_inr+plan.labour_cost_inr+plan.finishing_cost_inr)]].map(r=><tr key={r[0]}><td>{r[0]}</td><th>{r[1]}</th></tr>)}</tbody></table></div><div className="table-card"><h3>Time schedule</h3>{plan.tasks.map(([day,task])=><div className="schedule-row" key={day}><b>{day}</b><span>{task}</span></div>)}</div></div><p className="disclaimer">{plan.note}</p><Button className="btn-outline" onClick={()=>downloadJson(plan,'project-plan.json')}>Download project plan</Button></div>:<div className="empty-state compact"><ClipboardList size={32}/><span>Your project plan will appear here.</span></div>}
  </Panel>;
}

function Knowledge() {
  const [tab,setTab]=useState('Safety'),[q,setQ]=useState(''),[answer,setAnswer]=useState('');
  const content={
    Safety:['Scaffolding: inspect base plates, bracing, platforms, guardrails, and access before use.','PPE: select equipment for the task and check fit, condition, and certification.','Excavations: verify protective systems, access, utilities, and competent-person inspections.'],
    Technique:['Concrete: verify formwork, reinforcement, cover, mix delivery, placement, compaction, and curing.','Quality: follow approved drawings, method statements, inspection plans, and hold points.','Cracks: record location, pattern, date, and change over time; escalate concerning movement or leakage.'],
    'Doc gen':['Daily report: date, weather, workforce, work completed, deliveries, inspections, incidents, and blockers.','Method statement: scope, resources, sequence, hazards, controls, inspections, and emergency arrangements.','Toolbox talk: task hazards, controls, PPE, site-specific risks, and worker questions.']
  };
  const ask=()=>{const query=q.trim();if(!query)return;const source=content[tab];setAnswer(`${tab} guidance for “${query}”\n\n${source.join('\n\n')}\n\nUse approved project documents and competent-person instructions; this guidance is not a substitute for site-specific procedures.`)};
  return <Panel title="Knowledge assistant" subtitle="Quick reference guidance for construction teams." icon={BookOpen}><div className="tabs">{['Safety','Technique','Doc gen'].map(t=><button key={t} className={tab===t?'selected':''} onClick={()=>{setTab(t);setAnswer('')}}>{t==='Safety'?<ShieldCheck size={15}/>:t==='Technique'?<Hammer size={15}/>:<FileText size={15}/>} {t}</button>)}</div><Field label="Ask about a construction topic"><textarea rows="3" value={q} onChange={e=>setQ(e.target.value)} placeholder="e.g. Steps for scaffolding, concrete curing, or daily site report…"/></Field><Button onClick={ask}>Ask expert</Button>{answer&&<div className="result-block answer-block"><h4>Knowledge response</h4><p>{answer}</p></div>}</Panel>;
}

function Chatbot() {
  const [question,setQuestion]=useState(''),[weather,setWeather]=useState('Normal'),[messages,setMessages]=useState([{role:'assistant',text:'Hello! How can I assist with your construction query today?'}]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function send(e, suggestion){e?.preventDefault();const q=(suggestion||question).trim();if(!q||busy)return;setMessages(m=>[...m,{role:'user',text:q}]);setQuestion('');setError('');setBusy(true);
    try{const d=await call('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,weather})});setMessages(m=>[...m,{role:'assistant',text:d.answer||JSON.stringify(d),note:d.safety_note,mode:d.mode}]);}
    catch(err){setError(err.message);setMessages(m=>[...m,{role:'assistant',text:'I could not reach the AI service. Check the backend terminal and configured Gemini model, then try again.'}]);}
    finally{setBusy(false);}
  }
  return <Panel title="Construction chatbot" subtitle="Ask practical construction, planning, and safety questions." icon={MessageCircle}><div className="chat-controls"><Field label="Reported weather"><select value={weather} onChange={e=>setWeather(e.target.value)}>{['Normal','High Wind','Heavy Rain','Extreme Heat'].map(x=><option key={x}>{x}</option>)}</select></Field></div><div className="chat-window">{messages.map((m,i)=><div key={i} className={`message ${m.role==='user'?'user-message':''}`}><span>{m.text}</span>{m.note&&<small>{m.note}</small>}</div>)}{busy&&<div className="message"><LoaderCircle size={15} className="spin"/> Thinking…</div>}</div><div className="suggestions">{['Ask a safety question','Get a construction tip','Discuss a project'].map((s,i)=><button key={s} onClick={()=>send(null,['What are the key construction site safety checks?','Give me one practical concrete quality-control tip.','Help me outline a construction project plan.'][i])}>{s}</button>)}</div><form className="chat-input" onSubmit={send}><input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Type your question…"/><Button disabled={busy||!question.trim()} aria-label="Send question"><Send size={16}/></Button></form><ErrorMsg>{error}</ErrorMsg></Panel>;
}

function DailyAssistant() {
  const [activity,setActivity]=useState('Concreting'),[workers,setWorkers]=useState(10),[condition,setCondition]=useState('Normal'),[result,setResult]=useState(null);
  function generate(){const risks=condition==='Normal'?['Confirm toolbox talk and PPE checks.','Inspect access routes and equipment.']:condition==='High Wind'?['Assess lifting and work-at-height restrictions.','Secure loose materials and temporary works.','Pause tasks that exceed site wind limits.']:condition==='Heavy Rain'?['Check drainage, electrical protection, and excavation stability.','Inspect slippery access routes.','Pause unsafe outdoor activities.']:['Provide water, shade, and scheduled rest breaks.','Watch for heat-stress symptoms.','Move strenuous tasks to cooler hours if possible.'];setResult({activity,workers:Number(workers),condition,tasks:[`Prepare the work area for ${activity.toLowerCase()}.`,'Conduct a pre-task briefing and verify approved method statement.',`Assign responsibilities across ${workers} workers.`,'Inspect tools, equipment, and work area.','Complete quality checks and record progress.'],safety_checks:['Hard hat and task-appropriate PPE','Safety boots and suitable gloves','Equipment inspection and exclusion zones'],risk_alerts:risks});}
  return <div className="two-col"><Panel title="Site input" subtitle="Set today's planned work and site conditions." icon={ClipboardList}><div className="stack"><Field label="Planned activity"><select value={activity} onChange={e=>setActivity(e.target.value)}>{['Concreting','Excavation','Masonry','Scaffolding','Electrical work','Painting','Material lifting'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Labour count"><input type="number" min="1" max="10000" value={workers} onChange={e=>setWorkers(e.target.value)}/></Field><Field label="Site condition"><select value={condition} onChange={e=>setCondition(e.target.value)}>{['Normal','High Wind','Heavy Rain','Extreme Heat'].map(x=><option key={x}>{x}</option>)}</select></Field><Button onClick={generate}>Generate today's plan</Button></div></Panel><Panel title="Today's execution plan" subtitle="A starting checklist to review with the site supervisor." icon={CheckCircle2}>{result?<><ResultList title="Tasks" items={result.tasks}/><ResultList title="Safety checks" items={result.safety_checks}/><ResultList title="Risk alerts" items={result.risk_alerts}/><Button className="btn-outline" onClick={()=>downloadJson(result,'daily-site-plan.json')}>Download plan</Button></>:<div className="empty-state"><ClipboardList size={34}/><span>Generate a plan to see tasks and risk alerts.</span></div>}</Panel></div>;
}

function WeatherAdvisor() {
  const [activity,setActivity]=useState('Slab conversion'),[weather,setWeather]=useState('Cloudy'),[result,setResult]=useState(null);
  const data={
    Sunny:{headline:'PROCEED WITH PRECAUTIONS',hazards:['Heat exposure','Dehydration','Glare'],precautions:['Provide water, shade, and rest breaks.','Use appropriate sun protection.','Monitor heat-stress conditions.']},
    Cloudy:{headline:'PROCEED WITH CAUTION',hazards:['Reduced visibility','Possible scattered showers','Slippery surfaces if rain begins'],precautions:['Ensure suitable site lighting.','Prepare a contingency plan for rain.','Use slip-resistant access routes.']},
    Rainy:{headline:'REASSESS OUTDOOR WORK',hazards:['Slippery surfaces','Water ingress','Excavation instability'],precautions:['Inspect drainage and excavations.','Protect electrical equipment.','Pause unsafe work and follow site procedures.']},
    Windy:{headline:'CHECK WIND LIMITS',hazards:['Unstable loads','Falling objects','Work-at-height risk'],precautions:['Secure loose materials.','Check crane and lifting wind limits.','Suspend unsafe elevated work.']}
  };
  function check(){setResult({...data[weather],activity,weather,note:'Illustrative advisory based on the selected condition, not a live weather forecast. Check official local alerts and site-specific thresholds.'});}
  return <div className="two-col"><Panel title="Check weather impact" subtitle="Choose a reported or forecast condition." icon={CloudSun}><div className="stack"><Field label="Planned activity"><input value={activity} onChange={e=>setActivity(e.target.value)} placeholder="e.g. Slab conversion"/></Field><Field label="Current / forecast weather"><select value={weather} onChange={e=>setWeather(e.target.value)}>{['Sunny','Cloudy','Rainy','Windy'].map(x=><option key={x}>{x}</option>)}</select></Field><Button onClick={check}>Check feasibility</Button></div></Panel><Panel title="Weather impact assessment" subtitle="Recommended precautions for selected conditions." icon={weather==='Rainy'?CloudRain:weather==='Windy'?Wind:ThermometerSun}>{result?<><h2 className="weather-headline">{result.headline}</h2><p className="muted">Activity: {result.activity}</p><ResultList title="Hazards" items={result.hazards}/><ResultList title="Required precautions" items={result.precautions}/><p className="disclaimer">{result.note}</p></>:<div className="empty-state"><CloudSun size={34}/><span>Choose conditions and check feasibility.</span></div>}</Panel></div>;
}

const NAV=[
  {id:'safety',label:'Safety Monitor',icon:ShieldCheck},
  {id:'cracks',label:'Crack Detection',icon:ScanLine},
  {id:'valuation',label:'Real Estate Valuation',icon:Building2},
  {id:'planner',label:'Project Planner',icon:CalendarDays},
  {id:'knowledge',label:'Knowledge Base',icon:BookOpen},
  {id:'chatbot',label:'Chatbot',icon:MessageCircle},
  {id:'daily',label:'Daily Site Assistant',icon:ClipboardList},
  {id:'weather',label:'Weather Advisor',icon:CloudSun}
];
const PAGE_INFO={
 safety:['SITE SAFETY MONITOR','Review visible PPE and site hazards.'],
 cracks:['STRUCTURAL CRACK DIAGNOSIS','Document surface patterns and inspection urgency.'],
 valuation:['REAL ESTATE ESTIMATOR','Calculate an illustrative property value in INR.'],
 planner:['CONSTRUCTION PROJECT PLANNER','Build a preliminary material, cost, and time plan.'],
 knowledge:['KNOWLEDGE ASSISTANT','Find practical construction safety and technical guidance.'],
 chatbot:['CONSTRUCTION CHATBOT','Ask construction and project-planning questions.'],
 daily:['DAILY SITE ASSISTANT','Generate a task plan, safety checks, and risk alerts.'],
 weather:['WEATHER ADVISOR','Check how weather conditions may affect planned work.']
};
export default function App(){
  const [page,setPage]=useState('safety'),[health,setHealth]=useState(null),[mobileOpen,setMobileOpen]=useState(false);
  useEffect(()=>{call('/api/health').then(setHealth).catch(()=>setHealth({status:'offline'}));},[]);
  const info=PAGE_INFO[page]||PAGE_INFO.safety;
  function navigate(id){setPage(id);setMobileOpen(false);}
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen?'sidebar-open':''}`}>
      <div className="brand"><span className="brand-mark"><HardHat size={21}/></span><b>CONSTRUCT<span>AI</span></b><button className="mobile-close" onClick={()=>setMobileOpen(false)}><X size={18}/></button></div>
      <nav className="side-nav">{NAV.map(({id,label,icon:Icon})=><button key={id} className={page===id?'nav-item active':'nav-item'} onClick={()=>navigate(id)}><Icon size={16}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-footer"><small>v1.0.0 ConstructionGPT</small><span><i className={health?.status==='ok'?'status-dot':'status-dot offline'}/>{health?.status==='ok'?'System Online':'API Offline'}</span></div>
    </aside>
    {mobileOpen&&<button className="mobile-backdrop" aria-label="Close navigation" onClick={()=>setMobileOpen(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setMobileOpen(true)}><Menu size={19}/></button><div><small className="eyebrow">FIELD OPERATIONS / INTELLIGENCE</small><h1>{info[0]}</h1><p>{info[1]}</p></div><div className="ai-status"><span className={health?.status==='ok'?'status-dot':'status-dot offline'}/>{health?.status==='ok'?(health.ai_configured?'AI ACTIVE':'DEMO MODE'):'API OFFLINE'}</div></header>
      <div className="page-content">
        {page==='safety'&&<ImageAnalysis kind="safety"/>}
        {page==='cracks'&&<ImageAnalysis kind="cracks"/>}
        {page==='valuation'&&<Valuation/>}
        {page==='planner'&&<Planner/>}
        {page==='knowledge'&&<Knowledge/>}
        {page==='chatbot'&&<Chatbot/>}
        {page==='daily'&&<DailyAssistant/>}
        {page==='weather'&&<WeatherAdvisor/>}
      </div>
      <footer className="footer"><span>ConstructAI · Educational decision-support use only</span><span>React + FastAPI</span></footer>
    </main>
  </div>;
}
