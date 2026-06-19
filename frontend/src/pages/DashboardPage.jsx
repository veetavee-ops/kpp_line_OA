import { useState, useEffect, useRef } from 'react';
import { fetchDashboardStats, searchMessages } from '../api/messages';
import { getInitials, getColor } from '../utils/helpers';
import './DashboardPage.css';

function relativeTime(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'เมื่อกี้';
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} วันที่แล้ว`;
  return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

function highlightText(text, q) {
  if (!q || !text) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + q.length + 60);
  const snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  const rel = idx - start;
  return (
    <>
      {snippet.slice(0, rel + (start > 0 ? 1 : 0))}
      <mark className="dash-highlight">{snippet.slice(rel + (start > 0 ? 1 : 0), rel + (start > 0 ? 1 : 0) + q.length)}</mark>
      {snippet.slice(rel + (start > 0 ? 1 : 0) + q.length)}
    </>
  );
}

export default function DashboardPage({ onSelectGroup }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const data = await searchMessages(query.trim());
      setResults(data);
      setSearching(false);
    }, 350);
  }, [query]);

  const showSearch = query.trim().length >= 2;

  return (
    <div className="dash-page">
      <div className="dash-inner">
        <h2 className="dash-title">ภาพรวมทุกกลุ่ม</h2>

        {/* ── Search bar ── */}
        <div className="dash-search-wrap">
          <svg className="dash-search-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            className="dash-search-input"
            placeholder="ค้นหาข้อความทุกกลุ่ม..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="dash-search-clear" onClick={() => setQuery('')}>×</button>
          )}
        </div>

        {/* ── Search results ── */}
        {showSearch ? (
          <div className="dash-results">
            {searching ? (
              <div className="dash-results-status">กำลังค้นหา...</div>
            ) : results.length === 0 ? (
              <div className="dash-results-status">ไม่พบข้อความ "{query}"</div>
            ) : (
              <>
                <div className="dash-results-count">พบ {results.length} ข้อความ</div>
                {results.map((r, i) => (
                  <div key={r.messageId || i} className="dash-result-row" onClick={() => onSelectGroup(r.groupId)}>
                    {r.pictureUrl ? (
                      <img className="dash-avatar dash-avatar--img" src={r.pictureUrl} alt={r.groupName} />
                    ) : (
                      <div className="dash-avatar" style={{ background: getColor(r.groupName) }}>
                        {getInitials(r.groupName)}
                      </div>
                    )}
                    <div className="dash-result-body">
                      <div className="dash-result-meta">
                        <span className="dash-result-group">{r.groupName}</span>
                        <span className="dash-result-sender">{r.displayName}</span>
                        <span className="dash-result-time">{relativeTime(r.timestamp)}</span>
                      </div>
                      <div className="dash-result-text">
                        {r.text
                          ? highlightText(r.text, query.trim())
                          : r.metadata?.fileName
                            ? <span className="dash-result-file">📎 {highlightText(r.metadata.fileName, query.trim())}</span>
                            : <span style={{ color: 'var(--text-tertiary)' }}>[ไฟล์/รูป]</span>
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          <>
            {/* ── Summary cards ── */}
            {loading ? (
              <div className="dash-loading"><div className="spinner" /><p>กำลังโหลด...</p></div>
            ) : error ? (
              <div className="dash-error">เกิดข้อผิดพลาด: {error}</div>
            ) : (
              <>
                <div className="dash-cards">
                  <div className="dash-card">
                    <div className="dash-card-value">{stats.totalGroups}</div>
                    <div className="dash-card-label">กลุ่มทั้งหมด</div>
                  </div>
                  <div className="dash-card dash-card--green">
                    <div className="dash-card-value">{stats.todayMessages}</div>
                    <div className="dash-card-label">ข้อความวันนี้</div>
                  </div>
                  <div className="dash-card">
                    <div className="dash-card-value">{stats.weekMessages}</div>
                    <div className="dash-card-label">ข้อความ 7 วัน</div>
                  </div>
                </div>

                <div className="dash-section-title">กิจกรรมล่าสุด</div>
                {stats.groups.length === 0 ? (
                  <div className="dash-empty">ยังไม่มีกลุ่ม</div>
                ) : (
                  <div className="dash-group-list">
                    {stats.groups.map((g) => (
                      <div key={g.groupId} className="dash-group-row">
                        {g.pictureUrl ? (
                          <img className="dash-avatar dash-avatar--img" src={g.pictureUrl} alt={g.groupName} />
                        ) : (
                          <div className="dash-avatar" style={{ background: getColor(g.groupName) }}>
                            {getInitials(g.groupName)}
                          </div>
                        )}
                        <div className="dash-group-info">
                          <div className="dash-group-name">{g.groupName}</div>
                          <div className="dash-group-time">{relativeTime(g.lastMessageTime)}</div>
                        </div>
                        <div className="dash-counts">
                          <div className="dash-count-item">
                            <span className="dash-count-num dash-count-num--today">{g.todayCount}</span>
                            <span className="dash-count-lbl">วันนี้</span>
                          </div>
                          <div className="dash-count-item">
                            <span className="dash-count-num">{g.weekCount}</span>
                            <span className="dash-count-lbl">7 วัน</span>
                          </div>
                        </div>
                        <button className="dash-btn-open" onClick={() => onSelectGroup(g.groupId)}>
                          ดูแชท
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
