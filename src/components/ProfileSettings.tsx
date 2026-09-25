import * as Dialog from '@radix-ui/react-dialog'
import { CalendarDays, Mail, RotateCcw, Settings2, X } from 'lucide-react'
import './ProfileSettings.css'

type ProfileSettingsProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  gmailConnected: boolean
  onConnectGmail: () => void
  onResetDemo: () => void
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

export function ProfileSettings({ open, onOpenChange, gmailConnected, onConnectGmail, onResetDemo }: ProfileSettingsProps) {
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
              {name === 'Gmail' && !gmailConnected ? <button type="button" className="profile-settings-connect-button" onClick={onConnectGmail}>เชื่อมต่อ</button> : <span className="profile-settings-connection-status connected">เชื่อมต่อแล้ว · เดโม</span>}
            </div>)}
          </div>
          <p className="profile-settings-demo-note">สถานะการเชื่อมต่อเป็นการจำลองในแอป ไม่ได้เข้าถึง Gmail หรือ Google Calendar จริง และไม่มีการส่งอีเมล</p>
        </section>

        <section className="profile-settings-reset" aria-labelledby="profile-settings-reset-title">
          <h3 id="profile-settings-reset-title">เริ่มเดโมใหม่</h3>
          <p>ล้างเอกสารที่สแกน สถานะการดำเนินการ และการเชื่อมต่อ Gmail จำลอง แล้วกลับไปเริ่มจากกล่องว่าง</p>
          <button type="button" className="profile-settings-reset-button" onClick={() => { onResetDemo(); onOpenChange(false) }}><RotateCcw size={16} />รีเซ็ตเดโม</button>
        </section>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
