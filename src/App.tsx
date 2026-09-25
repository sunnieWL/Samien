import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Checkbox from '@radix-ui/react-checkbox'
import { Bell, CalendarDays, Check, CheckCheck, ChevronRight, FileCheck2, FileText, FolderClosed, Info, Menu, PenLine, RotateCcw, ScanLine, Search, X } from 'lucide-react'
import { documents, type DocumentFixture } from './data/documents'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { SamienMascot } from './components/SamienMascot'
import { ProfileSettings } from './components/ProfileSettings'
import { AppointmentWorkspace } from './components/AppointmentWorkspace'
import { getCalendarConflicts, type CalendarConflict } from './data/calendarDemo'

type Section = 'signature' | 'appointment' | 'fyi' | 'archive'
type Action = 'pending' | 'signed' | 'accepted' | 'read'
type RecordState = { action: Action; at: string | null; decision: string | null }
type RescheduleRequest = { conflictId: string; target: 'existing' | 'invitation'; recipient: string; subject: string; message: string; at: string }
type Store = { version: 4; records: Record<string, RecordState>; rescheduleRequests: RescheduleRequest[] }
type ScanStep = 'scanning' | 'classifying' | 'done' | null
type SuccessNotice = { action: 'signed' | 'accepted'; ids: string[] } | null

const STORAGE_KEY = 'samien-demo-v4'
const SOURCE_BASE = `${import.meta.env.BASE_URL}docs/`
const defaultRecord = (): RecordState => ({ action: 'pending', at: null, decision: null })
const fullStore = (): Store => ({ version: 4, records: Object.fromEntries(documents.map(doc => [doc.id, defaultRecord()])), rescheduleRequests: [] })
const emptyStore = (): Store => ({ version: 4, records: {}, rescheduleRequests: [] })
function readStore(): Store {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Store | null
    if (parsed?.version === 4 && parsed.records && typeof parsed.records === 'object') return { ...parsed, rescheduleRequests: Array.isArray(parsed.rescheduleRequests) ? parsed.rescheduleRequests : [] }
  } catch { /* reset invalid demo data */ }
  return emptyStore()
}

const dateLong = (value: string | null) => value ? new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' }).format(new Date(value.length === 10 ? `${value}T12:00:00+07:00` : value)) : '—'
const clock = (value: string | null) => value ? new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Bangkok' }).format(new Date(value)) : '—'
const dateTime = (value: string | null) => value ? `${dateLong(value)}${value.includes('T') ? ` · ${clock(value)} น.` : ''}` : '—'
const timeRange = (doc: DocumentFixture) => doc.appointment ? `${dateLong(doc.appointment.start)} · ${clock(doc.appointment.start)}–${clock(doc.appointment.end)} น.` : '—'
// The PDF shown in the app is isolated to this document; sourceFile/sourcePages
// still point to the untouched 11-page bundle for provenance.
const sourceUrl = (doc: DocumentFixture, page = doc.sourcePages[0]) => `${SOURCE_BASE}doc-${doc.id}.pdf#page=${doc.sourcePages.indexOf(page) + 1}`
const done = (action: Action) => action !== 'pending'
const actionLabel = (action: Action, category: DocumentFixture['category']) => action === 'signed' ? 'ลงนามแล้ว' : action === 'accepted' ? 'ยอมรับแล้ว' : action === 'read' ? 'อ่านแล้ว' : category === 'signature' ? 'รอลงนาม' : category === 'appointment' ? 'รอตอบรับ' : 'ยังไม่อ่าน'
const conflictTime = (conflict: CalendarConflict) => `${dateLong(conflict.overlapStart)} ${clock(conflict.overlapStart)}–${clock(conflict.overlapEnd)} น.`

function StatusBadge({ doc, action }: { doc: DocumentFixture; action: Action }) {
  return <Badge variant="secondary" className={`status status-${action}`}>{actionLabel(action, doc.category)}</Badge>
}

function Sidebar({ section, setSection, records, collapsed, setCollapsed }: { section: Section; setSection: (s: Section) => void; records: Store['records']; collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  const [profileOpen, setProfileOpen] = useState(false)
  const items: { id: Section; label: string; icon: typeof FileText; count: number }[] = [
    { id: 'signature', label: 'รอลงนาม', icon: FileCheck2, count: documents.filter(d => d.category === 'signature' && records[d.id]?.action === 'pending').length },
    { id: 'appointment', label: 'นัดหมาย', icon: CalendarDays, count: documents.filter(d => d.category === 'appointment' && records[d.id]?.action === 'pending').length },
    { id: 'fyi', label: 'แจ้งเพื่อทราบ', icon: Bell, count: documents.filter(d => d.category === 'fyi' && records[d.id]?.action === 'pending').length },
    { id: 'archive', label: 'จัดเก็บแล้ว', icon: FolderClosed, count: documents.filter(d => done(records[d.id]?.action ?? 'pending')).length },
  ]
  return <>
    {collapsed && <button className="mobile-scrim" aria-label="ปิดเมนู" onClick={() => setCollapsed(false)} />}
    <aside className={`sidebar ${collapsed ? 'sidebar-open' : ''}`}>
      <div className="brand"><img src={`${import.meta.env.BASE_URL}mascot/brand.png`} alt="" width="50" height="50" /><div><span>Samien</span><small>เอกสารเป็นเรื่องง่าย<br />ให้คุณได้สอนอย่างสบายใจ</small></div></div>
      <nav aria-label="เมนูหลัก">{items.map((item, i) => <button key={item.id} className={`nav-item ${section === item.id ? 'active' : ''} ${i === 3 ? 'nav-separated' : ''}`} onClick={() => { setSection(item.id); setCollapsed(false) }}><item.icon size={20} strokeWidth={1.8} /><span>{item.label}</span><span className="nav-count">{item.count}</span></button>)}</nav>
      <div className="sidebar-user"><div className="avatar">ส</div><div><strong>อาจารย์ ดร.สอนดี ใจดี</strong><small>คณะอักษรศาสตร์</small></div></div>
      <button type="button" className="profile-trigger" aria-label="เปิดตั้งค่าโปรไฟล์" onClick={() => { setCollapsed(false); setProfileOpen(true) }} />
    </aside>
    <ProfileSettings open={profileOpen} onOpenChange={setProfileOpen} />
  </>
}

function Topbar({ section, onScan, onMenu }: { section: Section; onScan: () => void; onMenu: () => void }) {
  const labels: Record<Section, string> = { signature: 'รอลงนาม', appointment: 'นัดหมาย', fyi: 'แจ้งเพื่อทราบ', archive: 'จัดเก็บแล้ว' }
  return <header className="topbar"><div className="breadcrumb"><button className="icon-button menu-button" aria-label="เปิดเมนู" onClick={onMenu}><Menu size={21} /></button><span>คณะอักษรศาสตร์</span><ChevronRight size={16} /><strong>{labels[section]}</strong></div><div className="top-actions"><span className="scanner-status"><span className="online-dot" />เครื่องสแกนพร้อมใช้งาน</span><Button onClick={onScan}><ScanLine size={18} />สแกนเอกสาร</Button></div></header>
}

function AppShell({ section, setSection, records, onScan, children }: { section: Section; setSection: (s: Section) => void; records: Store['records']; onScan: () => void; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return <div className="app-shell"><Sidebar section={section} setSection={setSection} records={records} collapsed={menuOpen} setCollapsed={setMenuOpen} /><div className="app-body"><Topbar section={section} onScan={onScan} onMenu={() => setMenuOpen(true)} />{children}</div></div>
}

function DocumentRow({ doc, record, selected, active, onSelect, onOpen, section }: { doc: DocumentFixture; record: RecordState; selected: boolean; active: boolean; onSelect?: () => void; onOpen: () => void; section: Section }) {
  const onCheckbox = (e: MouseEvent) => e.stopPropagation()
  return <div className={`document-row ${selected ? 'selected' : ''} ${active ? 'active' : ''} ${record.action === 'pending' && doc.category === 'fyi' ? 'unread' : ''}`} onClick={onOpen} role="button" tabIndex={0} onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen() } }}>
    {onSelect && <span className="row-checkbox" onClick={onCheckbox}><Checkbox.Root className="checkbox" checked={selected} onCheckedChange={onSelect} aria-label={`เลือก ${doc.title}`}><Checkbox.Indicator><Check size={14} /></Checkbox.Indicator></Checkbox.Root></span>}
    <div className="row-main"><div className="row-heading"><strong>{doc.title}</strong><StatusBadge doc={doc} action={record.action} /></div><div className="row-sender">{section === 'archive' && <span className="category-chip">{doc.category === 'signature' ? 'ลงนาม' : doc.category === 'appointment' ? 'นัดหมาย' : 'แจ้งเพื่อทราบ'}</span>}{doc.sender ?? 'ไม่ระบุผู้ส่ง'}</div><div className="row-summary">{section === 'appointment' ? timeRange(doc) : doc.summary}</div>{section === 'appointment' && <><div className="row-extra">{doc.appointment?.location ?? 'ไม่ระบุสถานที่'}{doc.appointment?.previousStart && <span className="reschedule-tag">เลื่อนจาก {dateLong(doc.appointment.previousStart)}</span>}</div><div className="row-response">ตอบรับภายใน {dateTime(doc.appointment?.responseDeadline ?? null)}</div></>}</div>
    {section !== 'fyi' && <div className="row-meta"><span>{section === 'appointment' ? 'ตอบรับภายใน' : section === 'archive' ? 'ดำเนินการ' : 'กำหนดส่ง'}</span><strong>{section === 'appointment' ? dateTime(doc.appointment?.responseDeadline ?? null) : section === 'archive' ? dateTime(record.at) : doc.deadline ? dateTime(doc.deadline) : '—'}</strong></div>}
  </div>
}

function DocumentList({ docs, records, selected, activeId, onSelect, onOpen, section, search, setSearch }: { docs: DocumentFixture[]; records: Store['records']; selected: string[]; activeId: string | null; onSelect?: (id: string) => void; onOpen: (id: string) => void; section: Section; search: string; setSearch: (s: string) => void }) {
  return <section className="document-list"><div className="list-search"><Search size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาเรื่อง ผู้ส่ง หรือเลขที่หนังสือ" aria-label="ค้นหาเอกสาร" /></div><div className="list-rows">{docs.length ? docs.map(doc => <DocumentRow key={doc.id} doc={doc} record={records[doc.id] ?? defaultRecord()} selected={selected.includes(doc.id)} active={activeId === doc.id} onSelect={onSelect && records[doc.id]?.action === 'pending' ? () => onSelect(doc.id) : undefined} onOpen={() => onOpen(doc.id)} section={section} />) : <div className="empty-list">ไม่พบเอกสารในรายการนี้</div>}</div></section>
}

function BulkActionBar({ count, label, onAction, onClear, disabled }: { count: number; label: string; onAction: () => void; onClear: () => void; disabled?: boolean }) {
  if (!count) return null
  return <div className="bulk-bar"><strong>เลือกแล้ว {count} ฉบับ</strong><button className="button button-primary" onClick={onAction} disabled={disabled}>{label}</button><button className="button button-plain" onClick={onClear}>ยกเลิกการเลือก</button></div>
}

function PDFViewer({ doc }: { doc: DocumentFixture }) {
  const [page, setPage] = useState(doc.sourcePages[0])
  useEffect(() => setPage(doc.sourcePages[0]), [doc.id, doc.sourcePages])
  return <div className="pdf-viewer"><div className="pdf-tabs"><button className={page === doc.sourcePages[0] ? 'active' : ''} onClick={() => setPage(doc.sourcePages[0])}>{doc.originalSource ? 'PDF ฉบับเดโม' : 'เอกสารต้นฉบับ'} · หน้า {doc.sourcePages[0]}</button>{doc.attachments.map((attachment, i) => <button key={i} className={attachment.sourcePages.includes(page) ? 'active' : ''} onClick={() => setPage(attachment.sourcePages[0])}>{attachment.title} · หน้า {attachment.sourcePages.join(', ')}</button>)}<a href={sourceUrl(doc, page)} target="_blank" rel="noreferrer">เปิดเต็มหน้าจอ</a></div><iframe key={`${doc.id}-${page}`} title={`PDF ${doc.title} หน้า ${page}`} src={sourceUrl(doc, page)} /></div>
}

function DetailPane({ doc, record, onClose, onRead, onAccept, onSign, isMobile }: { doc: DocumentFixture; record: RecordState; onClose: () => void; onRead: (id: string) => void; onAccept: (id: string) => void; onSign: (id: string) => void; isMobile?: boolean }) {
  const [tab, setTab] = useState<'summary' | 'pdf'>('summary')
  useEffect(() => setTab('summary'), [doc.id])
  return <section className={`detail-pane ${isMobile ? 'detail-mobile' : ''}`}><div className="detail-head"><div><span className="eyebrow">{doc.documentNumber ?? 'ไม่ระบุเลขที่หนังสือ'} · ลงวันที่ {dateLong(doc.issuedDate)}</span><h2>{doc.title}</h2><div className="detail-from">จาก {doc.sender ?? 'ไม่ระบุผู้ส่ง'} {doc.recipient && <>· ถึง {doc.recipient}</>}</div></div><button className="icon-button detail-close" aria-label="ปิดรายละเอียด" onClick={onClose}><X size={20} /></button></div><div className="detail-tabs"><button className={tab === 'summary' ? 'active' : ''} onClick={() => setTab('summary')}>สรุป</button><button className={tab === 'pdf' ? 'active' : ''} onClick={() => setTab('pdf')}>{doc.originalSource ? 'PDF ฉบับเดโม' : 'เอกสารต้นฉบับ'}{doc.attachments.length ? ` + แนบ ${doc.attachments.length}` : ''}</button></div>{tab === 'pdf' ? <PDFViewer doc={doc} /> : <div className="detail-content"><div className="detail-summary"><h3>สรุปใจความ</h3><p>{doc.summary}</p></div>{doc.category === 'appointment' && doc.appointment && <div className="fact-grid"><div><span>วันและเวลา</span><strong>{timeRange(doc)}</strong></div><div><span>สถานที่</span><strong>{doc.appointment.location ?? 'ไม่ระบุ'}</strong></div><div><span>ตอบรับภายใน</span><strong>{dateTime(doc.appointment.responseDeadline)}</strong></div>{doc.appointment.previousStart && <div className="full-fact"><span>ประวัติการเลื่อน</span><strong>เลื่อนจาก {dateLong(doc.appointment.previousStart)} {clock(doc.appointment.previousStart)}–{clock(doc.appointment.previousEnd)} น. → {timeRange(doc)}</strong><small>เวลาเดิมถูกยกเลิกตามหนังสือแล้ว</small></div>}</div>}{doc.category !== 'appointment' && <div className="fact-grid"><div><span>สิ่งที่ต้องทำ</span><strong>{doc.requiredAction ?? 'อ่านเพื่อทราบ'}</strong></div><div><span>กำหนดส่ง</span><strong>{doc.deadline ? dateTime(doc.deadline) : 'ไม่มีกำหนดตอบรับ'}</strong></div></div>}<div className="key-facts"><h3>ข้อมูลสำคัญ</h3><ul>{doc.keyFacts.map((fact, i) => <li key={i}>{fact}</li>)}</ul></div>{doc.decisionOptions?.length ? <div className="decision-note"><strong>ตัวเลือกผลการพิจารณาในเอกสาร</strong><p>{doc.decisionOptions.join(' · ')}</p>{record.decision && <p>ผลที่บันทึกในเดโม: {record.decision}</p>}</div> : null}<div className="detail-actions">{doc.category === 'signature' && record.action === 'pending' && <button className="button button-primary" onClick={() => onSign(doc.id)}><PenLine size={17} />ลงนามฉบับนี้</button>}{doc.category === 'appointment' && record.action === 'pending' && <button className="button button-primary" onClick={() => onAccept(doc.id)}><Check size={17} />ยอมรับนัดหมาย</button>}{doc.category === 'fyi' && record.action === 'pending' && <button className="button button-primary" onClick={() => onRead(doc.id)}><CheckCheck size={17} />ทำเครื่องหมายว่าอ่านแล้ว</button>}<button className="button button-secondary" onClick={() => setTab('pdf')}><FileText size={17} />{doc.originalSource ? 'ดู PDF ฉบับเดโม' : 'ดู PDF ต้นฉบับ'}</button></div><p className="source-note">อ้างอิงจาก {doc.sourceFile} หน้า {doc.sourcePages.join(', ')}{doc.originalSource && <> · ฉบับเดโมปรับวันนัดจาก {doc.originalSource.file} หน้า {doc.originalSource.pages.join(', ')}</>}</p></div>}</section>
}

function SignatureDialog({ docs, onClose, onComplete }: { docs: DocumentFixture[]; onClose: () => void; onComplete: (decisions: Record<string, string>) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const drew = useRef(false)
  const [hasInk, setHasInk] = useState(false)
  const [decisions, setDecisions] = useState<Record<string, string>>(() => Object.fromEntries(docs.map(d => [d.id, d.decisionOptions?.[0] ?? 'ลงนาม'])))
  useEffect(() => { const node = canvas.current; if (!node) return; const ratio = window.devicePixelRatio || 1; node.width = node.clientWidth * ratio; node.height = node.clientHeight * ratio; const ctx = node.getContext('2d'); if (ctx) { ctx.scale(ratio, ratio); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.strokeStyle = '#27675D' } }, [])
  const point = (e: PointerEvent<HTMLCanvasElement>) => { const rect = e.currentTarget.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top } }
  const start = (e: PointerEvent<HTMLCanvasElement>) => { e.currentTarget.setPointerCapture(e.pointerId); drawing.current = true; const p = point(e); const ctx = canvas.current?.getContext('2d'); ctx?.beginPath(); ctx?.moveTo(p.x, p.y) }
  const move = (e: PointerEvent<HTMLCanvasElement>) => { if (!drawing.current) return; const p = point(e); const ctx = canvas.current?.getContext('2d'); ctx?.lineTo(p.x, p.y); ctx?.stroke(); drew.current = true; setHasInk(true) }
  const stop = () => { drawing.current = false }
  const clear = () => {
    const node = canvas.current
    const ctx = node?.getContext('2d')
    if (node && ctx) {
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, node.width, node.height)
      ctx.restore()
      ctx.beginPath()
    }
    drawing.current = false
    drew.current = false
    setHasInk(false)
  }
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose() }}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content"><div className="dialog-title-row"><div><Dialog.Title>ลงนาม {docs.length} ฉบับ</Dialog.Title><Dialog.Description>ตรวจผลการพิจารณาแต่ละฉบับ แล้ววาดลายเซ็นจำลอง</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="ปิด"><X size={20} /></Dialog.Close></div><div className="decision-list">{docs.map(doc => <label key={doc.id}><strong>{doc.title}</strong><select value={decisions[doc.id]} onChange={e => setDecisions({ ...decisions, [doc.id]: e.target.value })}>{(doc.decisionOptions ?? ['ลงนาม']).map(option => <option key={option} value={option}>{option}</option>)}</select></label>)}</div><div className="signature-label"><strong>ลายเซ็น</strong><button type="button" className="button button-secondary" onClick={clear} disabled={!hasInk} aria-label="ล้างลายเซ็นเพื่อเขียนใหม่"><RotateCcw size={16} />เขียนใหม่</button></div><canvas ref={canvas} className="signature-canvas" onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} aria-label="พื้นที่วาดลายเซ็น" /><p className="prototype-note"><Info size={15} />เป็นลายเซ็นจำลองสำหรับ prototype ไม่แก้ PDF หรือส่งเอกสารจริง</p><div className="dialog-footer"><button className="button button-secondary" onClick={onClose}>ยกเลิก</button><button className="button button-primary" disabled={!hasInk || !drew.current} onClick={() => onComplete(decisions)}>บันทึกการลงนามจำลอง</button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
}


function RescheduleEmailDialog({ conflict, onClose, onSave }: { conflict: CalendarConflict; onClose: () => void; onSave: (request: Omit<RescheduleRequest, 'at'>) => void }) {
  const [target, setTarget] = useState<'existing' | 'invitation'>(conflict.isExisting ? 'existing' : 'invitation')
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('ขอสอบถามความเป็นไปได้ในการเลื่อนนัดหมาย เนื่องจากมีเวลาในปฏิทินทับซ้อนกัน')
  const subject = `ขอเลื่อนนัดหมาย: ${target === 'existing' ? conflict.titleB : conflict.titleA}`
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose() }}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content reschedule-email-dialog"><Dialog.Title>ส่งอีเมลขอเลื่อนนัด (จำลอง)</Dialog.Title><Dialog.Description>ไม่มีการส่งอีเมลจริง และเวลานัดจะยังไม่เปลี่ยนจนกว่าจะมีการยืนยันใหม่</Dialog.Description><div className="email-conflict-summary"><strong>{conflict.titleA} ↔ {conflict.titleB}</strong><span>ทับซ้อน {conflictTime(conflict)}</span></div><fieldset className="email-targets"><legend>ต้องการขอเลื่อนรายการใด</legend><label><input type="radio" name="reschedule-target" checked={target === 'existing'} onChange={() => setTarget('existing')} />งานเดิมในปฏิทิน</label><label><input type="radio" name="reschedule-target" checked={target === 'invitation'} onChange={() => setTarget('invitation')} />คำเชิญใหม่</label></fieldset><label className="email-field">อีเมลผู้ประสานงาน<input type="email" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="กรอกอีเมลผู้ประสานงาน" required /></label><label className="email-field">หัวข้อ<input value={subject} readOnly /></label><label className="email-field">ข้อความ<textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} /></label><p className="prototype-note"><Info size={15} />บันทึกคำขอในเดโมเท่านั้น ไม่เชื่อม Gmail หรือส่งข้อความออก</p><div className="dialog-footer"><button className="button button-secondary" onClick={onClose}>ยกเลิก</button><button className="button button-primary" disabled={!recipient.trim() || !message.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim())} onClick={() => onSave({ conflictId: conflict.id, target, recipient: recipient.trim(), subject, message: message.trim() })}>ส่งอีเมลจำลอง</button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
}

function EmptyInbox({ onScan }: { onScan: () => void }) {
  return <section className="mascot-empty" aria-label="กล่องเอกสารว่าง"><SamienMascot variant="welcome" size="lg" /><h2>พร้อมช่วยจัดเอกสารแล้ว</h2><p>สแกนเอกสารตัวอย่างเพื่อนำเข้าทั้ง 9 ฉบับและจัดหมวดอัตโนมัติ</p><button className="button button-primary" onClick={onScan}><ScanLine size={18} />สแกนเอกสาร</button></section>
}

function AllDone({ count, compact = false, onArchive }: { count: number; compact?: boolean; onArchive?: () => void }) {
  return <section className={`mascot-empty mascot-complete ${compact ? 'mascot-complete--compact' : ''}`} aria-label="ไม่มีงานรอดำเนินการ"><SamienMascot variant="success" size="lg" /><h2>{compact ? 'ตอบรับคำเชิญครบแล้ว' : 'จัดการเอกสารครบแล้ว'}</h2><p>{compact ? `ตอบรับครบ ${count} นัดหมายแล้ว นัดที่ยอมรับยังแสดงในปฏิทิน` : `ดำเนินการครบ ${count} ฉบับแล้ว ดูเอกสารย้อนหลังได้ในจัดเก็บแล้ว`}</p>{!compact && onArchive && <button className="button button-secondary" onClick={onArchive}>เปิดจัดเก็บแล้ว</button>}</section>
}

function InvitationEmpty({ importedCount, acceptedCount, onScan }: { importedCount: number; acceptedCount: number; onScan: () => void }) {
  const neverScanned = importedCount === 0
  return <section className="invitation-empty" aria-label="ไม่มีคำเชิญใหม่">
    <SamienMascot variant={neverScanned ? 'welcome' : 'success'} size="md" />
    <h3>{neverScanned ? 'ยังไม่มีคำเชิญใหม่' : 'ไม่มีคำเชิญใหม่'}</h3>
    <p>{neverScanned ? 'สแกนเอกสารตัวอย่างเพื่อดูคำเชิญและนัดหมาย' : `ตอบรับแล้ว ${acceptedCount} นัดหมาย ดูกำหนดการได้ในปฏิทิน`}</p>
    {neverScanned && <button className="button button-primary" onClick={onScan}><ScanLine size={17} />สแกนเอกสาร</button>}
  </section>
}

function CompletionBanner({ action, count }: { action: 'signed' | 'accepted'; count: number }) {
  return <div className="completion-banner" role="status" aria-live="polite"><SamienMascot variant="success" size="sm" /><div><strong>{action === 'signed' ? `ลงนามแล้ว ${count} ฉบับ` : `ยอมรับแล้ว ${count} นัดหมาย`}</strong><span>บันทึกผลในเดโมเรียบร้อยแล้ว</span></div></div>
}

function ScanDialog({ step, onClose }: { step: ScanStep; onClose: () => void }) {
  const message = step === 'scanning' ? 'กำลังสแกนเอกสารจากชุดตัวอย่าง' : step === 'classifying' ? 'กำลังจัดหมวดเอกสารทั้ง 9 ฉบับ' : 'นำเข้าเอกสารจากชุดตัวอย่างแล้ว ตรวจรายการซ้ำด้วยรหัสเอกสาร'
  return <Dialog.Root open={step !== null} onOpenChange={open => { if (!open && step === 'done') onClose() }}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content scan-dialog"><Dialog.Title>สแกนเอกสาร</Dialog.Title>{step !== 'done' && <SamienMascot variant="scanning" size="md" className="scan-mascot" />}<div className="scan-progress"><div className={step === 'scanning' ? 'current' : 'complete'}><ScanLine size={19} />กำลังสแกน</div><div className={step === 'classifying' ? 'current' : step === 'done' ? 'complete' : ''}><FileText size={19} />กำลังจัดหมวด</div><div className={step === 'done' ? 'complete' : ''}><Check size={19} />เสร็จ</div></div><p>{message}</p>{step === 'done' && <button className="button button-primary" onClick={onClose}>กลับไปทำงาน</button>}</Dialog.Content></Dialog.Portal></Dialog.Root>
}

function App() {
  const [store, setStore] = useState<Store>(readStore)
  const [section, setSection] = useState<Section>('signature')
  const [selected, setSelected] = useState<string[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [archiveType, setArchiveType] = useState<'all' | DocumentFixture['category']>('all')
  const [fyiFilter, setFyiFilter] = useState<'all' | 'unread'>('all')
  const [signingIds, setSigningIds] = useState<string[] | null>(null)
  const [conflictAcceptIds, setConflictAcceptIds] = useState<string[] | null>(null)
  const [emailConflict, setEmailConflict] = useState<CalendarConflict | null>(null)
  const [scanStep, setScanStep] = useState<ScanStep>(null)
  const [successNotice, setSuccessNotice] = useState<SuccessNotice>(null)
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(store)), [store])
  useEffect(() => { setSelected(section === 'appointment' ? documents.filter(doc => doc.category === 'appointment' && store.records[doc.id]?.action === 'pending').map(doc => doc.id) : []); setActiveId(null); setSearch(''); setSuccessNotice(null) }, [section])
  useEffect(() => { if (!successNotice) return; const timeout = window.setTimeout(() => setSuccessNotice(null), 5000); return () => window.clearTimeout(timeout) }, [successNotice])
  const records = store.records
  const importedCount = documents.filter(doc => Boolean(records[doc.id])).length
  const allComplete = importedCount === documents.length && documents.every(doc => records[doc.id]?.action !== 'pending')
  const successCount = successNotice?.ids.filter(id => records[id]?.action === successNotice.action).length ?? 0
  const visible = useMemo(() => documents.filter(doc => {
    if (!records[doc.id]) return false
    if (section === 'archive' ? !done(records[doc.id].action) : doc.category !== section) return false
    if (section === 'signature' && records[doc.id].action !== 'pending') return false
    if (section === 'archive' && archiveType !== 'all' && doc.category !== archiveType) return false
    if (section === 'fyi' && fyiFilter === 'unread' && records[doc.id].action !== 'pending') return false
    const q = search.trim().toLocaleLowerCase('th')
    return !q || [doc.title, doc.sender, doc.documentNumber, doc.summary].some(v => v?.toLocaleLowerCase('th').includes(q))
  }), [records, section, search, archiveType, fyiFilter])
  const appointmentDocs = documents.filter(doc => doc.category === 'appointment' && records[doc.id])
  const activeDoc = documents.find(doc => doc.id === activeId && records[doc.id]) ?? null
  const setActions = (ids: string[], action: Action, decisions?: Record<string, string>) => {
    const changedIds = ids.filter(id => records[id]?.action === 'pending')
    if (changedIds.length === 0) return
    const at = new Date().toISOString()
    setStore(prev => ({ ...prev, records: { ...prev.records, ...Object.fromEntries(changedIds.map(id => [id, { action, at, decision: decisions?.[id] ?? prev.records[id]?.decision ?? null }])) } }))
    setSelected([])
    if (action === 'signed' || action === 'accepted') setSuccessNotice({ action, ids: changedIds })
  }
  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const openDoc = (id: string) => setActiveId(id)
  const accept = (ids: string[], override: boolean) => {
    const selectedDocs = appointmentDocs.filter(d => ids.includes(d.id) && records[d.id]?.action === 'pending')
    const risk = getCalendarConflicts(appointmentDocs).some(conflict => selectedDocs.some(doc => doc.id === conflict.invitationId) && (conflict.isExisting || (conflict.otherInvitationId && (ids.includes(conflict.otherInvitationId) || records[conflict.otherInvitationId]?.action === 'accepted'))) || Boolean(conflict.otherInvitationId && selectedDocs.some(doc => doc.id === conflict.otherInvitationId) && records[conflict.invitationId]?.action === 'accepted'))
    if (risk && !override) { setConflictAcceptIds(selectedDocs.map(d => d.id)); return }
    setActions(selectedDocs.map(d => d.id), 'accepted')
  }
  const conflictPairs = conflictAcceptIds ? getCalendarConflicts(appointmentDocs).filter(conflict => conflictAcceptIds.includes(conflict.invitationId) && (conflict.isExisting || (conflict.otherInvitationId && (conflictAcceptIds.includes(conflict.otherInvitationId) || records[conflict.otherInvitationId]?.action === 'accepted'))) || Boolean(conflict.otherInvitationId && conflictAcceptIds.includes(conflict.otherInvitationId) && records[conflict.invitationId]?.action === 'accepted')) : []
  const saveEmailRequest = (request: Omit<RescheduleRequest, 'at'>) => {
    setStore(prev => ({ ...prev, rescheduleRequests: [...prev.rescheduleRequests.filter(saved => saved.conflictId !== request.conflictId || saved.target !== request.target), { ...request, at: new Date().toISOString() }] }))
    setEmailConflict(null)
  }
  const scan = () => {
    setSuccessNotice(null)
    setScanStep('scanning')
    window.setTimeout(() => setScanStep('classifying'), 650)
    window.setTimeout(() => {
      setStore(prev => ({ ...prev, records: { ...Object.fromEntries(documents.map(doc => [doc.id, prev.records[doc.id] ?? defaultRecord()])) } }))
      if (section === 'appointment') setSelected(documents.filter(doc => doc.category === 'appointment' && (!records[doc.id] || records[doc.id].action === 'pending')).map(doc => doc.id))
      setScanStep('done')
    }, 1350)
  }
  const reset = (empty: boolean) => { setStore(empty ? emptyStore() : fullStore()); setSelected([]); setActiveId(null); setSuccessNotice(null); setSection('signature') }
  const titles: Record<Section, string> = { signature: 'รอลงนาม', appointment: 'นัดหมาย', fyi: 'แจ้งเพื่อทราบ', archive: 'จัดเก็บแล้ว' }
  const subtitle = section === 'signature' ? `${documents.filter(d => d.category === 'signature' && records[d.id]?.action === 'pending').length} ฉบับรอดำเนินการ` : section === 'appointment' ? `${appointmentDocs.filter(d => records[d.id]?.action === 'pending').length} คำเชิญรอตอบรับ` : section === 'fyi' ? `${documents.filter(d => d.category === 'fyi' && records[d.id]?.action === 'pending').length} ฉบับยังไม่อ่าน` : `${visible.length} ฉบับที่ดำเนินการแล้ว`
  return <AppShell section={section} setSection={setSection} records={records} onScan={scan}><main className="main-content"><div className="page-heading"><div><h1>{titles[section]}</h1><p>{subtitle}</p></div><div className="page-index">{section === 'signature' ? '01' : section === 'appointment' ? '02' : section === 'fyi' ? '03' : '04'} / พื้นที่ทำงาน</div></div>{successCount > 0 && successNotice && <CompletionBanner action={successNotice.action} count={successCount} />}{importedCount === 0 && section !== 'appointment' ? <EmptyInbox onScan={scan} /> : allComplete && (section === 'signature' || section === 'fyi') ? <AllDone count={importedCount} onArchive={() => setSection('archive')} /> : section === 'appointment' ? <AppointmentWorkspace docs={appointmentDocs} records={records} selected={selected} clear={() => setSelected([])} openDoc={openDoc} accept={accept} renderInvitation={doc => <DocumentRow key={doc.id} doc={doc} record={records[doc.id] ?? defaultRecord()} selected={selected.includes(doc.id)} active={false} onSelect={() => toggle(doc.id)} onOpen={() => openDoc(doc.id)} section="appointment" />} renderAllDone={() => <InvitationEmpty importedCount={importedCount} acceptedCount={appointmentDocs.filter(doc => records[doc.id]?.action === 'accepted').length} onScan={scan} />} requests={store.rescheduleRequests} onRequestEmail={setEmailConflict} /> : <div className="master-detail"><div className="list-column">{section === 'fyi' && <div className="filter-tabs"><button className={fyiFilter === 'unread' ? 'active' : ''} onClick={() => setFyiFilter('unread')}>ยังไม่อ่าน ({documents.filter(d => d.category === 'fyi' && records[d.id]?.action === 'pending').length})</button><button className={fyiFilter === 'all' ? 'active' : ''} onClick={() => { setFyiFilter('all'); setSelected(documents.filter(doc => doc.category === 'fyi' && records[doc.id]?.action === 'pending').map(doc => doc.id)) }}>ทั้งหมด</button></div>}{section === 'archive' && <div className="archive-filter"><label>ประเภท <select value={archiveType} onChange={e => setArchiveType(e.target.value as typeof archiveType)}><option value="all">ทั้งหมด</option><option value="signature">ลงนาม</option><option value="appointment">นัดหมาย</option><option value="fyi">แจ้งเพื่อทราบ</option></select></label></div>}{selected.length > 0 && section !== 'archive' && <BulkActionBar count={selected.length} label={section === 'signature' ? `ลงนาม ${selected.length} ฉบับ` : `ทำเครื่องหมายว่าอ่านแล้ว ${selected.length} ฉบับ`} onAction={() => section === 'signature' ? setSigningIds(selected) : setActions(selected, 'read')} onClear={() => setSelected([])} />}<DocumentList docs={visible} records={records} selected={selected} activeId={activeId} onSelect={section !== 'archive' ? toggle : undefined} onOpen={openDoc} section={section} search={search} setSearch={setSearch} /></div><div className="detail-column">{activeDoc ? <DetailPane doc={activeDoc} record={records[activeDoc.id]} onClose={() => setActiveId(null)} onRead={id => setActions([id], 'read')} onAccept={id => accept([id], false)} onSign={id => setSigningIds([id])} /> : <div className="detail-placeholder"><FileText size={34} /><strong>เลือกเอกสารเพื่อดูรายละเอียด</strong><span>อ่านสรุปและเปิด PDF ต้นฉบับได้ที่นี่</span></div>}</div></div>}<div className="demo-controls"><span>ตัวควบคุมเดโม</span><button onClick={() => reset(false)}>รีเซ็ตเป็นเอกสารครบ 9 ฉบับ</button><button onClick={() => reset(true)}>เริ่มเดโมจากกล่องว่าง</button></div></main>{activeDoc && section !== 'appointment' && <div className="mobile-detail-layer"><DetailPane doc={activeDoc} record={records[activeDoc.id]} onClose={() => setActiveId(null)} onRead={id => setActions([id], 'read')} onAccept={id => accept([id], false)} onSign={id => setSigningIds([id])} isMobile /></div>}{activeDoc && section === 'appointment' && <Dialog.Root open onOpenChange={open => { if (!open) setActiveId(null) }}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="appointment-detail-modal"><Dialog.Title className="sr-only">รายละเอียดนัดหมาย</Dialog.Title><DetailPane doc={activeDoc} record={records[activeDoc.id]} onClose={() => setActiveId(null)} onRead={id => setActions([id], 'read')} onAccept={id => accept([id], false)} onSign={id => setSigningIds([id])} /></Dialog.Content></Dialog.Portal></Dialog.Root>}{signingIds && <SignatureDialog docs={documents.filter(doc => signingIds.includes(doc.id))} onClose={() => setSigningIds(null)} onComplete={decisions => { setActions(signingIds, 'signed', decisions); setSigningIds(null) }} />}{conflictAcceptIds && <Dialog.Root open onOpenChange={open => { if (!open) setConflictAcceptIds(null) }}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content conflict-dialog"><Dialog.Title>นัดหมายมีเวลาทับซ้อน</Dialog.Title><Dialog.Description>รายการที่กำลังยอมรับชนกับคำเชิญที่เลือก งานเดิมในปฏิทิน หรือรายการที่ยอมรับแล้ว</Dialog.Description><div className="conflict-pairs">{conflictPairs.map(conflict => <p key={conflict.id}><strong>{conflict.titleA}</strong><span>ชนกับ</span><strong>{conflict.titleB}</strong><small>{conflictTime(conflict)}</small></p>)}</div><div className="dialog-footer"><button className="button button-secondary" onClick={() => setConflictAcceptIds(null)}>กลับไปตรวจรายการ</button><button className="button button-primary" onClick={() => { accept(conflictAcceptIds, true); setConflictAcceptIds(null) }}>ยืนยันยอมรับรายการที่เลือก</button></div></Dialog.Content></Dialog.Portal></Dialog.Root>}{emailConflict && <RescheduleEmailDialog conflict={emailConflict} onClose={() => setEmailConflict(null)} onSave={saveEmailRequest} />}{scanStep && <ScanDialog step={scanStep} onClose={() => setScanStep(null)} />}</AppShell>
}

export default App
