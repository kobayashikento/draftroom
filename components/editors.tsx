'use client';
import { useWorkspace } from './workspace/workspace-context';
import AddIdea from './editors/add-idea';
import ContentEditor from './editors/content-editor';
import RescheduleEditor from './editors/reschedule-editor';
import SeriesEditor from './editors/series-editor';
import StageEditor from './editors/stage-editor';

export default function Modals() {
  const { modal, setModal, state } = useWorkspace();
  if (!modal) return null;
  const close = () => setModal(null);
  if (modal.type === 'add')
    return (
      <AddIdea
        key={`add-${modal.seriesId || ''}-${modal.date || ''}-${modal.platform || ''}`}
        modal={modal}
        close={close}
      />
    );
  if (modal.type === 'series')
    return <SeriesEditor key={modal.id || 'new'} id={modal.id} close={close} />;
  if (modal.type === 'stages') return <StageEditor close={close} />;
  const item = state.items.find((p) => p.id === modal.id);
  if (modal.type === 'reschedule') {
    const publication = item?.publications.find((pub) => pub.id === modal.publicationId);
    return item && publication ? (
      <RescheduleEditor key={publication.id} item={item} publication={publication} close={close} />
    ) : null;
  }
  return item ? (
    <ContentEditor key={item.id} item={item} initialTab={modal.tab} close={close} />
  ) : null;
}
