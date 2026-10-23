'use client';
import {Button, Input, Badge, PriorityButton} from './ui';
import {useWorkspace} from './workspace-provider';
export {WorkspaceProvider, useWorkspace} from './workspace-provider';
export {Button, Field, Select} from './ui';
import {dateString, parseDate} from '../lib/model.js';
export const fmt = (s, options = {month:'short',day:'numeric'}) => parseDate(s).toLocaleDateString('en-CA', options);
export const today = () => dateString(new Date());
export function StagePill({item}) { const {state} = useWorkspace(); const stage=state.stages.find(s=>s.id===item.stageId); return <Badge className={`pill ${item.stageId}`} data-stage-kind={stage?.kind}>{stage?.name}</Badge>; }
export function Artwork({item}) {
  const type=item.seriesId||'joys';
  return <div className="art" style={{background:type==='matcha'?'var(--dr-art-pistachio)':'var(--dr-art-oat)'}}><svg viewBox="0 0 260 160" aria-hidden="true">
    {type==='emi'?<><ellipse cx="130" cy="126" rx="65" ry="43" fill="var(--dr-art-shadow)"/><path d="M87 75 87 27 112 50Q133 43 154 50L180 25 177 83Q166 120 132 119 94 116 87 75" fill="var(--dr-art-paper)"/><path d="m88 31 24 23-24 17m89-40-22 23 22 17" fill="var(--dr-art-mid)"/><ellipse cx="114" cy="77" rx="9" ry="7" fill="var(--dr-art-accent)"/><ellipse cx="154" cy="77" rx="9" ry="7" fill="var(--dr-art-accent)"/><path d="m128 91 10 0-5 6z" fill="var(--dr-art-dark)"/><path d="M55 146Q20 88 69 100" fill="none" stroke="var(--dr-art-shadow)" strokeWidth="17"/></>:
    type==='matcha'?<><ellipse cx="134" cy="130" rx="76" ry="15" fill="var(--dr-art-shadow)"/><path d="M83 65h97l-8 56q-38 34-80 0z" fill="var(--dr-art-paper)"/><ellipse cx="131" cy="65" rx="49" ry="18" fill="var(--dr-art-mid)"/><ellipse cx="131" cy="64" rx="41" ry="12" fill="var(--dr-art-accent)"/><path d="M180 77q49-9 25 33l-28 5" fill="none" stroke="var(--dr-art-paper)" strokeWidth="12"/><path d="m129 34 3-18m14 19 7-20" stroke="var(--dr-art-glint)" strokeWidth="4" strokeLinecap="round"/></>:
    type==='obsessed'?<><g transform="rotate(-12 85 80)"><rect x="35" y="27" width="83" height="108" rx="3" fill="var(--dr-art-paper)"/><rect x="43" y="35" width="67" height="73" fill="var(--dr-art-pistachio)"/><circle cx="76" cy="72" r="22" fill="var(--dr-art-cream)"/><circle cx="76" cy="72" r="16" fill="var(--dr-art-accent)"/></g><g transform="rotate(12 170 80)"><rect x="132" y="30" width="80" height="108" fill="var(--dr-art-paper)"/><rect x="140" y="38" width="64" height="72" fill="var(--dr-art-cream)"/><path d="M148 93q20-55 48 0" fill="var(--dr-art-mid)"/></g></>:
    <><rect x="34" y="25" width="85" height="109" fill="var(--dr-art-paper)" transform="rotate(-8 70 80)"/><rect x="43" y="35" width="67" height="75" fill="var(--dr-art-cream)"/><path d="M49 98q25-55 52 0" fill="var(--dr-art-mid)"/><rect x="140" y="37" width="82" height="100" fill="var(--dr-art-paper)" transform="rotate(10 170 80)"/><path d="M154 107V59h50v48" fill="var(--dr-art-accent)"/><circle cx="178" cy="78" r="13" fill="var(--dr-art-cream)"/></>}
  </svg><span className="format-tag">{item.format==='Reel'?'▹':'▧'} {item.format}</span></div>;
}
export function ContentCard({item}) {
  const {state,open}=useWorkspace(); const series=state.series.find(s=>s.id===item.seriesId); const dates=item.publications.filter(p=>p.date).sort((a,b)=>a.date.localeCompare(b.date));
  return <article className="card"><Button className="open-card" aria-label={`Open ${item.title}`} onClick={()=>open(item.id)}><Artwork item={item}/><div className="card-body"><div className="meta">{series?.name||'A new little idea'}</div><h3>{item.title}</h3><StagePill item={item}/><div className="card-foot"><span>{dates.map(x=>x.platform==='Instagram'?'◎':'♪').join(' ')||'Unscheduled'} · {item.tasks.filter(t=>t.done).length}/{item.tasks.length} tasks</span><span>{dates[0]?fmt(dates[0].date):'No date yet'}</span></div></div></Button></article>;
}
export function TaskRow({item,task,prioritizable=false}) {
 const {updateItem,open}=useWorkspace();
 return <div className={`taskrow ${task.done?'checked':''}`}>
  <Input type="checkbox" aria-label={task.title} checked={task.done} onChange={e=>{const done=e.target.checked;updateItem(item.id,p=>p.tasks.find(t=>t.id===task.id).done=done)}}/>
  <div className="tasktext"><span className="task-title">{task.title}</span><small><Button className="link" onClick={()=>open(item.id,'Production')}>{item.title}</Button></small></div>
  <span className="date-chip">{task.due?fmt(task.due):'No due date'}</span>
  {prioritizable&&<PriorityButton label={`task: ${task.title}`} active={task.priority==='High'} onClick={()=>updateItem(item.id,p=>{const target=p.tasks.find(t=>t.id===task.id);target.priority=target.priority==='High'?'Normal':'High'})}/>}
 </div>;
}
export function reorder(list,id,delta) {const i=list.findIndex(x=>x.id===id),j=i+delta;if(i>=0&&j>=0&&j<list.length)[list[i],list[j]]=[list[j],list[i]];}
