import { useState, useEffect } from 'react'
import { formatDateLabel, getInitials, getColor, getLast7Days } from '../../utils/helpers'
import { fetchAvailableDates } from '../../api/messages'
import './Sidebar.css'

const RANGE_VALUES = [1, 2, 3, 5, 7, 14, 30, 60, 90]
const RANGE_UNITS = [
  { value: 'day', label: 'วัน' },
  { value: 'month', label: 'เดือน' },
  { value: 'year', label: 'ปี' },
]

export default function Sidebar({
  isOpen,
  onClose,
  refreshKey,
  selectedDate,
  selectedGroup,
  privateChats,
  realGroups,
  onSelectDate,
  onSelectGroup,
  onSummarizeDay,
  onRangeChange
}) {
  const [dates, setDates] = useState([])
  const [loadingDates, setLoadingDates] = useState(true)

  // Range filter state
  const [rangeValue, setRangeValue] = useState(7)
  const [rangeUnit, setRangeUnit] = useState('day')

  // Fetch dates whenever range or refreshKey changes
  useEffect(() => {
    const loadDates = async () => {
      setLoadingDates(true)
      try {
        const availableDates = await fetchAvailableDates(rangeValue, rangeUnit)

        if (availableDates.length > 0) {
          setDates(availableDates)
          // If current selectedDate is not in re-fetched list, select newest
          if (!availableDates.includes(selectedDate) && selectedDate !== 'all') {
            onSelectDate(availableDates[0])
          }
        } else {
          setDates([])
        }
      } catch (err) {
        console.error('Failed to load dates', err)
        setDates(getLast7Days())
      } finally {
        setLoadingDates(false)
      }
    }
    loadDates()
  }, [rangeValue, rangeUnit, refreshKey])

  // Notify parent when range changes
  useEffect(() => {
    onRangeChange?.({ rangeValue, rangeUnit })
  }, [rangeValue, rangeUnit])

  const [isControlsOpen, setIsControlsOpen] = useState(true)
  const [isPrivateOpen, setIsPrivateOpen] = useState(true)
  const [isGroupsOpen, setIsGroupsOpen] = useState(true)

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${isOpen ? 'active' : ''}`}>
        <div className={`sidebar-header${isControlsOpen ? '' : ' sidebar-header--collapsed'}`}>
          <div className="sidebar-brand" onClick={() => setIsControlsOpen(v => !v)}>
            <div>
              <div className="sidebar-brand-title">ตั้งค่าการสรุป AI</div>
              <div className="sidebar-brand-sub">เลือกช่วงเวลาและวันที่</div>
            </div>
            <span className="chevron">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"
                style={{ transform: isControlsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </span>
          </div>

          {isControlsOpen && <div className="controls-section">

            {/* ── Range filter row ── */}
            <div>
              <label className="input-label">
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                  <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" />
                </svg>
                ย้อนหลัง
              </label>
              <div className="range-filter-row">
                <select
                  className="range-select range-value"
                  value={rangeValue}
                  onChange={e => setRangeValue(Number(e.target.value))}
                >
                  {RANGE_VALUES.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <select
                  className="range-select range-unit"
                  value={rangeUnit}
                  onChange={e => setRangeUnit(e.target.value)}
                >
                  {RANGE_UNITS.map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── AI Summary date dropdown ── */}
            <div className="date-select-wrapper">
              <label htmlFor="date-select" className="input-label">
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                  <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z" />
                </svg>
                วันที่สรุป {loadingDates ? '…' : ''}
              </label>
              <select
                id="date-select"
                className="date-dropdown"
                value={selectedDate}
                onChange={(e) => onSelectDate(e.target.value)}
                disabled={loadingDates}
              >
                <option value="all">ทั้งหมด ({dates.length} วัน)</option>
                {dates.map(d => (
                  <option key={d} value={d}>
                    {formatDateLabel(d)} ({d.slice(5)})
                  </option>
                ))}
              </select>
              <div className="date-hint">เลือกวันเพื่อให้ AI สรุปแชทของวันนั้น</div>
            </div>

            <button className="btn-summarize-day" onClick={onSummarizeDay}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
              สรุป
            </button>
          </div>}
        </div>

        <div className="sidebar-content">

          {/* ── Content Header ── */}
          <div className="content-header">
            <div className="content-header-left">
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
              <span>แชทและกลุ่ม</span>
            </div>
            <span className="content-header-count">
              {privateChats.length + realGroups.length}
            </span>
          </div>

          {/* ── แชทส่วนตัว ── */}
          <div className={`section ${isPrivateOpen ? 'is-open' : ''}`}>
            <div className="section-header-clickable" onClick={() => setIsPrivateOpen(v => !v)}>
              <span className="section-title">
                แชทส่วนตัว
                {privateChats.length > 0 && <span className="section-count">{privateChats.length}</span>}
              </span>
              <span className="chevron">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"
                  style={{ transform: isPrivateOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </span>
            </div>

            {isPrivateOpen && (
              <div className="group-list">
                {privateChats.length === 0 ? (
                  <div className="empty-groups">ยังไม่มีแชทส่วนตัว</div>
                ) : (
                  privateChats.map(g => (
                    <button
                      key={g.groupId}
                      className={`group-btn ${selectedGroup === g.groupId ? 'active' : ''}`}
                      onClick={() => onSelectGroup(g.groupId)}
                    >
                      <div className="group-avatar" style={{ background: getColor(g.groupName) }}>
                        <svg viewBox="0 0 24 24" fill="white" width="14" height="14">
                          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                        </svg>
                      </div>
                      <span className="group-name">{g.groupName}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ── กลุ่ม ── */}
          <div className={`section ${isGroupsOpen ? 'is-open' : ''}`}>
            <div className="section-header-clickable" onClick={() => setIsGroupsOpen(v => !v)}>
              <span className="section-title">
                กลุ่ม
                {realGroups.length > 0 && <span className="section-count">{realGroups.length}</span>}
              </span>
              <span className="chevron">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"
                  style={{ transform: isGroupsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </span>
            </div>

            {isGroupsOpen && (
              <div className="group-list">
                {realGroups.length === 0 ? (
                  <div className="empty-groups">ยังไม่มีกลุ่ม</div>
                ) : (
                  realGroups.map(g => (
                    <button
                      key={g.groupId}
                      className={`group-btn ${selectedGroup === g.groupId ? 'active' : ''}`}
                      onClick={() => onSelectGroup(g.groupId)}
                    >
                      <div className="group-avatar" style={{ background: getColor(g.groupName) }}>
                        {getInitials(g.groupName)}
                      </div>
                      <span className="group-name">{g.groupName}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

        </div>

        <div className="sidebar-footer">
          <button className="btn-drive-sidebar" onClick={() => window.location.href = '/drive-files'}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z" />
            </svg>
            สารบัญไฟล์ Google Drive
          </button>
        </div>
      </aside>
    </>
  )
}