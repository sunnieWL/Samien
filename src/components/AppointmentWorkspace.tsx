import { useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import thLocale from '@fullcalendar/core/locales/th'
import type { EventClickArg } from '@fullcalendar/core'
import { Check, ChevronLeft, ChevronRight, CircleAlert, Mail, X } from 'lucide-react'
import { SamienMascot } from './SamienMascot'
import type { DocumentFixture } from '../data/documents'
import { existingCalendarEvent, getCalendarConflicts, teachingSchedule, type CalendarConflict } from '../data/calendarDemo'
import './TeachingCalendar.css'

type RecordAction = 'pending' | 'signed' | 'accepted' | 'read'
type Props = {
  docs: DocumentFixture[]
  records: Record<string, { action: RecordAction }>
  selected: string[]
  clear: () => void
  openDoc: (id: string) => void
  accept: (ids: string[], override: boolean) => void
  renderInvitation: (doc: DocumentFixture) => React.ReactNode
  renderAllDone: () => React.ReactNode
  requests: { conflictId: string; target: 'existing' | 'invitation' }[]
  onRequestEmail: (conflict: CalendarConflict) => void
}

const date = (iso: string) => new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' }).format(new Date(iso))
const time = (iso: string) => new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Bangkok' }).format(new Date(iso))
const period = (start: string, end: string) => `${time(start)}–${time(end)} น.`
const conflictPeriod = (conflict: CalendarConflict) => `${date(conflict.overlapStart)} ${period(conflict.overlapStart, conflict.overlapEnd)}`
const calendarTitle = (doc: DocumentFixture) => ({ '04': 'ประชุมภาควิชา', '05': 'อบรม AI ในการสอน', '06': 'สอบโครงร่าง (เวลาใหม่)' })[doc.id] ?? doc.title

export function AppointmentWorkspace({ docs, records, selected, clear, openDoc, accept, renderInvitation, renderAllDone, requests, onRequestEmail }: Props) {
  const calendar = useRef<FullCalendar>(null)
  const [view, setView] = useState<'timeGridWeek' | 'dayGridMonth'>('timeGridWeek')
  const [range, setRange] = useState('5–11 ตุลาคม 2569')
  const [allowConflict, setAllowConflict] = useState(false)
  const [existingOpen, setExistingOpen] = useState(false)
  const [teachingOpen, setTeachingOpen] = useState<{ id: string; start: string; end: string } | null>(null)
  const pending = docs.filter(doc => records[doc.id]?.action === 'pending')
  const selectedPending = selected.filter(id => records[id]?.action === 'pending')
  const conflicts = getCalendarConflicts(docs)
  const visibleConflicts = conflicts.filter(conflict => records[conflict.invitationId]?.action === 'pending' || (conflict.otherInvitationId && records[conflict.otherInvitationId]?.action === 'pending'))
  const relevant = conflicts.filter(conflict => selectedPending.includes(conflict.invitationId) && (conflict.isExisting || (conflict.otherInvitationId && (selectedPending.includes(conflict.otherInvitationId) || records[conflict.otherInvitationId]?.action === 'accepted'))) || (conflict.otherInvitationId && selectedPending.includes(conflict.otherInvitationId) && records[conflict.invitationId]?.action === 'accepted'))
  const conflictIds = new Set(conflicts.flatMap(conflict => [conflict.invitationId, conflict.otherInvitationId].filter((id): id is string => Boolean(id))))
  const events = [
    ...docs.map(doc => ({
      id: doc.id, title: calendarTitle(doc), start: doc.appointment!.start, end: doc.appointment!.end,
      classNames: [records[doc.id]?.action === 'accepted' ? 'event-accepted' : 'event-pending', selected.includes(doc.id) ? 'event-selected' : '', conflictIds.has(doc.id) ? 'event-conflict' : ''].filter(Boolean),
      extendedProps: { location: doc.appointment?.location ?? '', status: records[doc.id]?.action === 'accepted' ? 'ยอมรับแล้ว' : 'รอตอบรับ', demo: false },
    })),
    { id: existingCalendarEvent.id, title: existingCalendarEvent.title, start: existingCalendarEvent.start, end: existingCalendarEvent.end, classNames: ['event-existing'], extendedProps: { location: existingCalendarEvent.location, status: 'งานเดิม · ข้อมูลจำลอง', demo: true } },
    ...teachingSchedule.map(session => ({
      id: session.id, title: `${session.courseCode} ${session.courseName}`,
      daysOfWeek: [session.weekday], startTime: session.firstStart.slice(11, 19), endTime: session.firstEnd.slice(11, 19),
      startRecur: '2026-10-05', endRecur: '2026-12-12', classNames: ['event-teaching'],
      extendedProps: { location: session.location, status: `${session.section} · ตารางสอนจำลอง`, demo: true },
    })),
  ]
  const updateRange = () => {
    const api = calendar.current?.getApi()
    if (!api) return
    if (api.view.type === 'dayGridMonth') {
      setRange(new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' }).format(api.view.currentStart))
      return
    }
    const end = new Date(api.view.activeEnd.getTime() - 86400000)
    const startLabel = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' }).format(api.view.activeStart)
    const endLabel = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' }).format(end)
    setRange(`${startLabel} – ${endLabel}`)
  }
  const changeView = (next: typeof view) => { setView(next); calendar.current?.getApi().changeView(next) }
  const openCalendarEvent = (id: string, start: string, end: string) => {
    if (id === existingCalendarEvent.id) { setExistingOpen(true); setTeachingOpen(null); return }
    if (teachingSchedule.some(session => session.id === id)) {
      setTeachingOpen({ id, start, end })
      setExistingOpen(false)
      return
    }
    openDoc(id)
  }
  const onEventClick = (info: EventClickArg) => openCalendarEvent(info.event.id, info.event.startStr, info.event.endStr)
  const sorted = [...docs].sort((a, b) => a.appointment!.start.localeCompare(b.appointment!.start))
  const teachingDetail = teachingSchedule.find(session => session.id === teachingOpen?.id)
  const agenda = [
    ...sorted.map(doc => ({ id: doc.id, title: doc.title, start: doc.appointment!.start, end: doc.appointment!.end, location: doc.appointment?.location ?? '', status: records[doc.id]?.action === 'accepted' ? 'ยอมรับแล้ว' : 'รอตอบรับ' })),
    { ...existingCalendarEvent, status: 'งานเดิม · ข้อมูลจำลอง' },
    ...teachingSchedule.map(session => ({ id: session.id, title: `${session.courseCode} ${session.courseName} · ${session.section}`, start: session.firstStart, end: session.firstEnd, location: session.location, status: 'ตารางสอนจำลอง' })),
  ].sort((a, b) => a.start.localeCompare(b.start))

  return <div className="appointment-workspace"><section className="invitation-panel"><div className="invite-head"><h2>คำเชิญใหม่</h2><span>{pending.length} ฉบับรอตอบรับ</span></div>
    {selectedPending.length > 0 && <div className="invite-selection"><strong>เลือกแล้ว {selectedPending.length} นัดหมาย</strong><button className="button button-plain" onClick={() => { clear(); setAllowConflict(false) }}>ยกเลิก</button></div>}
    <div className={pending.length === 0 ? 'invite-list invite-list--empty' : 'invite-list'}>{pending.length === 0 ? renderAllDone() : pending.map(renderInvitation)}</div>
    {visibleConflicts.length > 0 && <div className="conflict-box"><div className="conflict-with-mascot"><SamienMascot variant="conflict" size="sm" /><div className="conflict-copy"><div className="conflict-title"><CircleAlert size={17} />เวลาทับซ้อน</div>
      {visibleConflicts.map(conflict => <div className="conflict-entry" key={conflict.id}><p>{conflict.titleA} ↔ {conflict.titleB}<strong>{conflictPeriod(conflict)}</strong></p>{conflict.isExisting && <div className="conflict-entry-actions"><button className="button button-secondary" onClick={() => onRequestEmail(conflict)}><Mail size={15} />ส่งอีเมลขอเลื่อน</button>{requests.some(request => request.conflictId === conflict.id) && <small><Check size={14} />บันทึกคำขอในเดโมแล้ว</small>}</div>}</div>)}
      {relevant.length > 0 && <label className="override-check"><input type="checkbox" checked={allowConflict} onChange={event => setAllowConflict(event.target.checked)} />ยืนยันยอมรับนัดที่เวลาชนกัน</label>}</div></div></div>}
    {selectedPending.length > 0 && <div className="invite-footer"><button className="button button-primary" disabled={relevant.length > 0 && !allowConflict} onClick={() => { accept(selectedPending, allowConflict); setAllowConflict(false) }}>ยอมรับ {selectedPending.length} นัดหมาย</button>{relevant.length > 0 && !allowConflict && <small>ยกเลิกเลือกบางรายการ ส่งอีเมลขอเลื่อน หรือยืนยันการชนกันด้านบน</small>}</div>}
  </section><section className="calendar-panel"><div className="calendar-toolbar"><div className="calendar-nav"><button className="button button-secondary" onClick={() => calendar.current?.getApi().today()}>วันนี้</button><button className="icon-button" aria-label="ช่วงก่อนหน้า" onClick={() => calendar.current?.getApi().prev()}><ChevronLeft size={20} /></button><button className="icon-button" aria-label="ช่วงถัดไป" onClick={() => calendar.current?.getApi().next()}><ChevronRight size={20} /></button><strong>{range}</strong></div><div className="view-switch"><button className={view === 'timeGridWeek' ? 'active' : ''} onClick={() => changeView('timeGridWeek')}>สัปดาห์</button><button className={view === 'dayGridMonth' ? 'active' : ''} onClick={() => changeView('dayGridMonth')}>เดือน</button></div></div>
    <div className="calendar-desktop"><FullCalendar ref={calendar} plugins={[dayGridPlugin, timeGridPlugin]} locales={[thLocale]} locale="th" timeZone="Asia/Bangkok" initialDate="2026-10-05" initialView="timeGridWeek" headerToolbar={false} allDaySlot={false} slotMinTime="08:00:00" slotMaxTime="18:00:00" slotDuration="00:30:00" height="auto" nowIndicator={false} weekends firstDay={1} dayHeaderFormat={view === 'dayGridMonth' ? { weekday: 'short' } : { weekday: 'short', day: 'numeric', month: 'short' }} events={events} eventClick={onEventClick} datesSet={updateRange} eventContent={arg => <div className="calendar-event"><strong>{arg.event.title}</strong><span>{period(arg.event.startStr, arg.event.endStr)}</span><span>{arg.event.extendedProps.location}</span><em>{arg.event.extendedProps.status}</em></div>} /></div>
    <div className="calendar-agenda"><h3>กำหนดการ <small>รวมตารางสอนจำลอง</small></h3>{agenda.map(event => <button key={event.id} className={`agenda-item${teachingSchedule.some(session => session.id === event.id) ? ' agenda-item--teaching' : ''}`} onClick={() => openCalendarEvent(event.id, event.start, event.end)}><span>{date(event.start)} · {period(event.start, event.end)}</span><strong>{event.title}</strong><span>{event.location} · {event.status}</span></button>)}</div>
    <div className="calendar-legend"><span className="scroll-hint">เลื่อนแนวนอนเพื่อดูทั้งสัปดาห์</span><span><i className="legend-teaching" />ตารางสอน (จำลอง)</span><span><i className="legend-solid" />ยอมรับแล้ว</span><span><i className="legend-dashed" />รอตอบรับ</span><span><i className="legend-orange" />เวลาทับซ้อน</span><span><i className="legend-existing" />งานเดิม (เดโม)</span></div>
    {existingOpen && <div className="existing-event-detail" role="dialog" aria-modal="false" aria-label="รายละเอียดงานเดิมในปฏิทิน"><button className="icon-button" aria-label="ปิดรายละเอียดงานเดิม" onClick={() => setExistingOpen(false)}><X size={18} /></button><strong>{existingCalendarEvent.title}</strong><span>{date(existingCalendarEvent.start)} · {period(existingCalendarEvent.start, existingCalendarEvent.end)}</span><span>{existingCalendarEvent.location}</span><small>รายการนี้เป็นข้อมูลจำลองแยกจากเอกสาร PDF ทั้ง 9 ฉบับ</small></div>}
    {teachingOpen && teachingDetail && <div className="teaching-event-detail" role="region" aria-label="รายละเอียดตารางสอนจำลอง"><button className="icon-button" aria-label="ปิดรายละเอียดตารางสอน" onClick={() => setTeachingOpen(null)}><X size={18} /></button><strong>{teachingDetail.courseCode} {teachingDetail.courseName}</strong><span>{teachingDetail.section} · {teachingDetail.teachingMode}</span><span>{date(teachingOpen.start)} · {period(teachingOpen.start, teachingOpen.end)}</span><span>{teachingDetail.location}</span><small>ตารางสอนตัวอย่างสำหรับเดโม ไม่ใช่ข้อมูลจาก PDF และไม่ใช่คำเชิญใหม่</small></div>}
  </section></div>
}
