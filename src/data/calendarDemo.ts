import type { DocumentFixture } from './documents'

// Separate from the nine PDF-backed incoming documents. This is a clearly marked
// existing calendar commitment used only to exercise the rescheduling flow.
export const existingCalendarEvent = {
  id: 'demo-existing-01',
  title: 'งานเดิมในปฏิทิน (ข้อมูลจำลอง)',
  start: '2026-10-06T13:30:00+07:00',
  end: '2026-10-06T14:30:00+07:00',
  location: 'ปฏิทินส่วนตัว (ข้อมูลจำลอง)',
} as const

// Fictional teaching timetable for the prototype calendar only. These are not
// incoming documents and must not participate in invitation conflict checks.
export type TeachingSession = {
  id: string
  courseCode: string
  courseName: string
  section: string
  teachingMode: string
  location: string
  weekday: number
  firstStart: string
  firstEnd: string
}

export const teachingSchedule: TeachingSession[] = [
  {
    id: 'demo-class-writing', courseCode: 'ENG2101', courseName: 'Academic Writing',
    section: 'กลุ่ม 1', teachingMode: 'บรรยายและฝึกเขียน', location: 'อาคารมหิตลาธิเบศร ห้อง 405 (จำลอง)',
    weekday: 1, firstStart: '2026-10-05T09:00:00+07:00', firstEnd: '2026-10-05T11:00:00+07:00',
  },
  {
    id: 'demo-class-eap', courseCode: 'ENG2202', courseName: 'English for Academic Purposes',
    section: 'กลุ่ม 2', teachingMode: 'บรรยายและอภิปราย', location: 'อาคารมหิตลาธิเบศร ห้อง 407 (จำลอง)',
    weekday: 2, firstStart: '2026-10-06T09:00:00+07:00', firstEnd: '2026-10-06T11:00:00+07:00',
  },
  {
    id: 'demo-class-speaking', courseCode: 'ENG2303', courseName: 'Presentation Skills',
    section: 'กลุ่ม 1', teachingMode: 'ฝึกนำเสนอ', location: 'อาคารมหิตลาธิเบศร ห้อง 405 (จำลอง)',
    weekday: 3, firstStart: '2026-10-07T13:00:00+07:00', firstEnd: '2026-10-07T15:00:00+07:00',
  },
  {
    id: 'demo-class-reading', courseCode: 'ENG2404', courseName: 'Critical Reading',
    section: 'กลุ่ม 1', teachingMode: 'สัมมนา', location: 'อาคารมหิตลาธิเบศร ห้อง 407 (จำลอง)',
    weekday: 4, firstStart: '2026-10-08T13:00:00+07:00', firstEnd: '2026-10-08T15:00:00+07:00',
  },
]

export type CalendarConflict = {
  id: string
  invitationId: string
  otherInvitationId: string | null
  titleA: string
  titleB: string
  overlapStart: string
  overlapEnd: string
  isExisting: boolean
}

function intersection(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const start = Math.max(Date.parse(aStart), Date.parse(bStart))
  const end = Math.min(Date.parse(aEnd), Date.parse(bEnd))
  return start < end ? { start: new Date(start).toISOString(), end: new Date(end).toISOString() } : null
}

export function getCalendarConflicts(docs: DocumentFixture[]): CalendarConflict[] {
  const conflicts: CalendarConflict[] = []
  docs.forEach((a, index) => {
    if (!a.appointment) return
    for (const b of docs.slice(index + 1)) {
      if (!b.appointment) continue
      const shared = intersection(a.appointment.start, a.appointment.end, b.appointment.start, b.appointment.end)
      if (shared) conflicts.push({
        id: `${a.id}:${b.id}`, invitationId: a.id, otherInvitationId: b.id,
        titleA: a.title, titleB: b.title,
        overlapStart: shared.start, overlapEnd: shared.end, isExisting: false,
      })
    }
    const shared = intersection(a.appointment.start, a.appointment.end, existingCalendarEvent.start, existingCalendarEvent.end)
    if (shared) conflicts.push({
      id: `${a.id}:${existingCalendarEvent.id}`, invitationId: a.id, otherInvitationId: null,
      titleA: a.title, titleB: existingCalendarEvent.title,
      overlapStart: shared.start, overlapEnd: shared.end, isExisting: true,
    })
  })
  return conflicts
}
