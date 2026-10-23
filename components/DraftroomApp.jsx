'use client';
import {useState} from 'react';
import {WorkspaceProvider,useWorkspace,Button} from './workspace';
import {monday} from '../lib/model';
import {Overview,Ideas,Calendar,Series,Production,Analytics} from './views';
import Modals from './editors';
import {SyncNotice} from './account';
import {downloadWorkspace} from '../lib/workspace-data.js';
const pages={Overview:['◫','A little space to create.','Your ideas, your plans, and the little steps that bring them to life.'],Calendar:['▦','Your creative calendar','A gentle rhythm for everything you want to share.'],Ideas:['☷','Good things start with an idea.','Collect the sparks. Make something you love.'],Series:['▧','Find your creative rhythm.','Familiar formats, fresh little stories.'],Production:['☑','Let’s make a little progress.','The next small steps, gathered in one place.'],Analytics:['◴','From idea to impact.','Keep your publications connected to the ideas behind them.']};
function Draftroom() {
  const {state,storageStatus,storageTone,setModal,message,cloud,authUser,signOut,syncError,cacheError,conflict,retrySync,resolveConflict}=useWorkspace();
  const [view,setView]=useState('Overview'),[week,setWeek]=useState('2026-10-26');
  const navigate=name=>{setView(name);if(name==='Overview')setWeek(w=>monday(w))};
  const exportData=()=>downloadWorkspace(state);
  if(!state)return <div className="loading"><span className="brandmark">✳</span><h1>Opening draftroom…</h1></div>;
  return <><div className="shell"><aside className="sidebar"><div className="brand"><span className="brandmark">✳</span>draftroom</div><div className="tagline">your little creative workspace</div><p className="workspace">YOUR WORKSPACE</p><nav className="nav" aria-label="Workspace">{Object.entries(pages).map(([name,[icon]])=><Button key={name} className={view===name?'active':''} aria-current={view===name?'page':undefined} onClick={()=>navigate(name)}><span className="ico" aria-hidden="true">{icon}</span>{name}</Button>)}</nav><div className="sidebar-bottom"><div className="gentle">✧<b>A little, often.</b>You don’t have to make everything today. Just make a start.</div><div className="profile"><div className="avatar">☼</div><div><b>@morningswithemi</b><div className="tiny muted">{authUser?.email||'Your personal workspace'}</div></div></div></div></aside><main className="main"><div className="topbar"><span>My workspace <span style={{margin:'0 10px'}}>/</span> {view}</span><span className={`saved ${storageTone}`} role="status"><i className="dot" aria-hidden="true"/>{storageStatus}<Button className="link" onClick={exportData}>Export</Button>{cloud&&<Button className="link" onClick={signOut}>Sign out</Button>}</span></div><SyncNotice cloud={cloud} error={syncError} cacheError={cacheError} conflict={conflict} retry={retrySync} resolve={resolveConflict} exportData={exportData}/><div className="heading"><div><h1>{pages[view][1]}</h1><p className="subtitle">{pages[view][2]}</p></div><Button className="primary" onClick={()=>setModal({type:'add'})}>+ Add idea</Button></div>
  {view==='Overview'&&<Overview week={week} setWeek={setWeek} navigate={navigate}/>}{view==='Calendar'&&<Calendar week={week} setWeek={setWeek}/>}{view==='Ideas'&&<Ideas/>}{view==='Series'&&<Series/>}{view==='Production'&&<Production/>}{view==='Analytics'&&<Analytics/>}
  </main></div><Modals/>{message&&<div id="toast" style={{display:'block'}} role="status">{message}</div>}</>;
}
export default function DraftroomApp(){return <WorkspaceProvider><Draftroom/></WorkspaceProvider>}
