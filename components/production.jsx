'use client';
import {useId,useState} from 'react';
import {Tabs} from '@chakra-ui/react';
import {ArrowRight, Check, ChevronDown, ChevronRight, FolderCheck, ListTodo} from 'lucide-react';
import {Button, PriorityButton} from './ui';
import {useWorkspace, StagePill, TaskRow, fmt, today} from './workspace';
import {addDays, monday, kind, productionQueue} from '../lib/model';

function Checklist({item,tasks,finished}) {
 const {updateItem,open}=useWorkspace();
 const [expanded,setExpanded]=useState(!finished);
 const contentId=useId();
 const done=item.tasks.filter(task=>task.done).length;
 return <section className="panel production-checklist">
  <div className="checklist-header">
    <Button className="checklist-toggle" aria-label={`${expanded?'Collapse':'Expand'} checklist for ${item.title}`} aria-expanded={expanded} aria-controls={contentId} onClick={()=>setExpanded(value=>!value)}>
     {expanded?<ChevronDown size={18} aria-hidden="true"/>:<ChevronRight size={18} aria-hidden="true"/>}
     <span className="checklist-heading"><span className="checklist-title">{item.title}</span><span className="tiny muted">{item.format} · {done}/{item.tasks.length} completed</span></span>
    </Button>
   <div className="checklist-actions"><StagePill item={item}/>
    <PriorityButton label={`project: ${item.title}`} active={item.priority==='High'} onClick={()=>updateItem(item.id,p=>p.priority=p.priority==='High'?'Normal':'High')}/>
   </div>
  </div>
  <div id={contentId} hidden={!expanded}>
   <div className="checklist-body">{tasks.map(({t})=><TaskRow key={t.id} item={item} task={t} prioritizable/>)}
    <Button className="link checklist-edit" onClick={()=>open(item.id,'Production')}>Edit checklist <ArrowRight size={14} aria-hidden="true"/></Button>
   </div>
  </div>
 </section>;
}

export default function Production() {
 const {state,updateItem,open}=useWorkspace();
 const [range,setRange]=useState('All'),[tab,setTab]=useState('active');
 const start=range==='All'?'':range==='Today'?today():monday(today());
 const end=range==='All'?'':range==='Today'?today():addDays(start,6);
 const queue=productionQueue(state,{start,end});
 const groups=tab==='active'?queue.active:queue.completed;
 const next=queue.next;
 return <Tabs.Root value={tab} onValueChange={({value})=>setTab(value)} colorPalette="pistachio" variant="subtle">
  <div className="toolbar production-controls">
   <Tabs.List className="production-tabs" aria-label="Production checklists">
    <Tabs.Trigger value="active"><ListTodo size={16} aria-hidden="true"/>To do <span className="tab-count">{queue.active.length}</span></Tabs.Trigger>
    <Tabs.Trigger value="completed"><FolderCheck size={16} aria-hidden="true"/>Completed <span className="tab-count">{queue.completed.length}</span></Tabs.Trigger>
   </Tabs.List>
   <div className="segmented" role="group" aria-label="Task due date">{['All','Today','This week'].map(value=><Button key={value} className={range===value?'active':''} aria-pressed={range===value} onClick={()=>setRange(value)}>{value}</Button>)}</div>
   <span className="tiny muted" role="status">{queue.remaining} {queue.remaining===1?'task':'tasks'} left in this range</span>
  </div>
  <p className="production-hint">Flag a task or reel to bring it forward. Priority tasks come first, then priority projects, then due dates.</p>
  <Tabs.Content value={tab} className="production-content">
   {tab==='active'&&next&&<section className="panel production-next" aria-label="Up next">
    <div className="next-copy" aria-live="polite"><div className="meta">UP NEXT{next.t.priority==='High'||next.p.priority==='High'?' · PRIORITY':''}</div><h2>{next.t.title}</h2>
     <Button className="link next-project" onClick={()=>open(next.p.id,'Production')}>{next.p.title} <ArrowRight size={14} aria-hidden="true"/></Button>
     <span className="tiny muted">{next.t.due?`Due ${fmt(next.t.due)}`:'No due date'} · {next.p.format}</span>
    </div>
    <Button className="primary" onClick={()=>updateItem(next.p.id,p=>p.tasks.find(task=>task.id===next.t.id).done=true)}><Check size={16} aria-hidden="true"/>Complete & next</Button>
   </section>}
   {groups.map(({item,tasks})=><Checklist key={item.id} item={item} tasks={tasks} finished={tab==='completed'}/>)}
   {!groups.length&&<div className="panel empty">{tab==='completed'?'Your finished checklists will have a home here.':'A little breathing room. No unfinished checklists in this range.'}{tab==='active'&&queue.completed.length>0&&<div><Button className="link" onClick={()=>setTab('completed')}>View completed checklists <ArrowRight size={14} aria-hidden="true"/></Button></div>}</div>}
   {tab==='completed'&&groups.length>0&&<p className="footnote">Expand a checklist to review it or uncheck a task to reopen it. If the idea is Ready or Posted, move it back to a working stage to return it to To do.</p>}
  </Tabs.Content>
  {state.items.filter(p=>kind(state,p)==='ready'&&p.tasks.some(task=>!task.done)).map(p=><p className="warning" key={p.id}>{p.title} is Ready with unfinished tasks. <Button className="link" onClick={()=>open(p.id,'Production')}>Review checklist</Button></p>)}
 </Tabs.Root>;
}
