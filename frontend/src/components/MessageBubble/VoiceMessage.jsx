import { useState, useEffect, useRef, useCallback } from 'react'

const BAR_COUNT = 40
const SPEEDS = [1, 1.5, 2]

// Fallback: pseudo-random waveform (used if audio decode fails)
function seedWave(url) {
    const bars = []
    let seed = 0
    for (let i = 0; i < url.length; i++) seed = (seed * 31 + url.charCodeAt(i)) & 0xffffffff
    for (let i = 0; i < BAR_COUNT; i++) {
        seed = (seed * 1664525 + 1013904223) & 0xffffffff
        const h = 0.15 + (((seed >>> 0) / 0xffffffff) * 0.85)
        bars.push(Math.round(h * 100) / 100)
    }
    return bars
}

// Analyze real audio via AudioContext → array of BAR_COUNT normalized amplitude values
async function analyzeAudio(url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const arrayBuffer = await res.arrayBuffer()
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) throw new Error('AudioContext not supported')
    const ctx = new AudioCtx()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    await ctx.close()

    // Use first channel; sum absolute values in block windows
    const data = audioBuffer.getChannelData(0)
    const blockSize = Math.floor(data.length / BAR_COUNT)
    const bars = []
    for (let i = 0; i < BAR_COUNT; i++) {
        const start = i * blockSize
        let sum = 0
        for (let j = 0; j < blockSize; j++) sum += Math.abs(data[start + j])
        bars.push(sum / blockSize)
    }
    // Normalize to 0–1
    const max = Math.max(...bars, 0.001)
    return bars.map(b => Math.max(0.05, b / max))
}

function fmtTime(sec) {
    if (!isFinite(sec)) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VoiceMessage({ url, duration }) {
    const audioRef = useRef(null)
    const [playing, setPlaying] = useState(false)
    const [progress, setProgress] = useState(0)   // 0–1
    const [currentTime, setCurrentTime] = useState(0)
    const [totalTime, setTotalTime] = useState(duration ? duration / 1000 : 0)
    const [bars, setBars] = useState(() => Array(BAR_COUNT).fill(0.3))
    const [speed, setSpeed] = useState(1)

    // ── Analyze audio waveform on mount ──────────────────────────────────────
    useEffect(() => {
        if (!url) return
        analyzeAudio(url)
            .then(setBars)
            .catch(() => setBars(seedWave(url)))
    }, [url])

    // ── Apply playback speed whenever it changes ──────────────────────────────
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = speed
        }
    }, [speed])

    // ── Smooth 60fps progress via rAF ─────────────────────────────────────────
    const rafRef = useRef(null)

    const startRaf = useCallback(() => {
        const tick = () => {
            if (!audioRef.current) return
            const a = audioRef.current
            setCurrentTime(a.currentTime)
            if (a.duration && isFinite(a.duration))
                setProgress(a.currentTime / a.duration)
            rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
    }, [])

    const stopRaf = useCallback(() => {
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    }, [])

    // ── Audio events ──────────────────────────────────────────────────────────
    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return
        const onMeta = () => { if (isFinite(audio.duration)) setTotalTime(audio.duration) }
        const onEnded = () => {
            stopRaf()
            setPlaying(false)
            setProgress(0)
            setCurrentTime(0)
            setSpeed(1) // reset speed when done
        }

        audio.addEventListener('loadedmetadata', onMeta)
        audio.addEventListener('ended', onEnded)
        return () => {
            audio.removeEventListener('loadedmetadata', onMeta)
            audio.removeEventListener('ended', onEnded)
            stopRaf()
        }
    }, [url, stopRaf])

    const togglePlay = useCallback(() => {
        const audio = audioRef.current
        if (!audio) return
        if (playing) {
            audio.pause()
            stopRaf()
            setPlaying(false)
        } else {
            audio.playbackRate = speed
            audio.play()
                .then(() => { setPlaying(true); startRaf() })
                .catch(() => { })
        }
    }, [playing, speed, startRaf, stopRaf])

    const seek = useCallback((e) => {
        const audio = audioRef.current
        if (!audio || !audio.duration) return
        const rect = e.currentTarget.getBoundingClientRect()
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        audio.currentTime = ratio * audio.duration
    }, [])

    const cycleSpeed = useCallback(() => {
        setSpeed(prev => {
            const idx = SPEEDS.indexOf(prev)
            return SPEEDS[(idx + 1) % SPEEDS.length]
        })
    }, [])

    const displayTime = playing ? fmtTime(currentTime) : fmtTime(totalTime)

    // ── No URL: show unavailable state ────────────────────────────────────────
    if (!url) {
        return (
            <div className="msg-voice msg-voice--unavailable">
                <div className="msg-voice-unavailable-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M12 3a9 9 0 100 18A9 9 0 0012 3zm-1 13V8l6 4-6 4z" opacity=".3" />
                        <path d="M3.27 3L2 4.27l4.22 4.22C5.47 9.26 5 10.58 5 12c0 3.86 2.69 7.09 6.3 7.82L12 21l.7-1.18C16.31 19.09 19 15.86 19 12c0-1.42-.47-2.74-1.22-3.81L21 4.73 19.73 3.5 3.27 3z" />
                    </svg>
                </div>
                <div className="msg-voice-unavailable-text">ไม่พบไฟล์เสียง</div>
            </div>
        )
    }

    return (
        <div className="msg-voice">
            {url && <audio ref={audioRef} src={url} preload="metadata" />}

            {/* Play / Pause button */}
            <button
                className={`msg-voice-btn${playing ? ' is-playing' : ''}`}
                onClick={togglePlay}
                aria-label={playing ? 'หยุด' : 'เล่น'}
            >
                {playing ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                        <rect x="6" y="5" width="4" height="14" rx="1" />
                        <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                )}
            </button>

            {/* Waveform + time row */}
            <div className="msg-voice-middle">
                {/* Waveform bars */}
                <div
                    className="msg-voice-waveform"
                    onClick={seek}
                    role="progressbar"
                    aria-valuenow={Math.round(progress * 100)}
                >
                    {bars.map((h, i) => {
                        const filled = i / BAR_COUNT < progress
                        const isCurrent = Math.abs(i / BAR_COUNT - progress) < 1.5 / BAR_COUNT
                        return (
                            <div
                                key={i}
                                className={`msg-voice-bar${filled ? ' played' : ''}${isCurrent ? ' current' : ''}`}
                                style={{ '--h': h }}
                            />
                        )
                    })}
                </div>

                {/* Time + Speed row */}
                <div className="msg-voice-controls">
                    <span className="msg-voice-time">{displayTime}</span>
                    <button
                        className={`msg-voice-speed${speed !== 1 ? ' active' : ''}`}
                        onClick={cycleSpeed}
                        title="เปลี่ยนความเร็ว"
                    >
                        {speed}x
                    </button>
                </div>
            </div>
        </div>
    )
}
