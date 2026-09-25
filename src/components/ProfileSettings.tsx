import * as Dialog from '@radix-ui/react-dialog'
import { CalendarDays, Mail, Settings2, X } from 'lucide-react'
import './ProfileSettings.css'

type ProfileSettingsProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const connections = [
  {
    name: 'Gmail',
    description: 'รับเอกสารและคำเชิญนัดหมายจากอีเมล',
    icon: Mail,
  },
  {
    name: 'Google Calendar',
    description: 'แสดงนัดหมายและตรวจเวลาที่ทับซ้อน',
    icon: CalendarDays,
  },
] as const

export function ProfileSettings({ open, onOpenChange }: ProfileSettingsProps) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="profile-settings-overlay" />
      <Dialog.Content className="profile-settings-dialog">
        <div className="profile-settings-heading">
          <div className="profile-settings-heading-icon" aria-hidden="true"><Settings2 size={20} /></div>
          <div>
            <Dialog.Title>ตั้งค่าโปรไฟล์</Dialog.Title>
            <Dialog.Description>ข้อมูลผู้ใช้และบริการที่ Samien รองรับ</Dialog.Description>
          </div>
          <Dialog.Close className="profile-settings-close" aria-label="ปิดหน้าตั้งค่าโปรไฟล์"><X size={20} /></Dialog.Close>
        </div>

        <section className="profile-settings-person" aria-labelledby="profile-settings-person-title">
          <div className="profile-settings-avatar" aria-hidden="true">ส</div>
          <div>
            <h3 id="profile-settings-person-title">อาจารย์ ดร.สอนดี ใจดี</h3>
            <p>ผู้สอนภาษาอังกฤษ · คณะอักษรศาสตร์<br />จุฬาลงกรณ์มหาวิทยาลัย</p>
          </div>
        </section>

        <section className="profile-settings-connections" aria-labelledby="profile-settings-connections-title">
          <div className="profile-settings-section-title">
            <h3 id="profile-settings-connections-title">บริการที่รองรับ</h3>
            <span>2 บริการ</span>
          </div>
          <div className="profile-settings-service-list">
            {connections.map(({ name, description, icon: Icon }) => <div className="profile-settings-service" key={name}>
              <div className="profile-settings-service-icon" aria-hidden="true"><Icon size={22} strokeWidth={1.8} /></div>
              <div className="profile-settings-service-copy">
                <strong>{name}</strong>
                <span>{description}</span>
              </div>
              <span className="profile-settings-connection-status">ยังไม่เชื่อมต่อ</span>
            </div>)}
          </div>
          <p className="profile-settings-demo-note">การเชื่อมต่อบัญชีเป็นแนวทางสำหรับผลิตภัณฑ์จริง ขณะนี้ Samien ใช้ข้อมูลเอกสารตัวอย่างและปฏิทินจำลองภายในแอป</p>
        </section>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
