/**
 * FileIcon – crisp, readable file-type icon with brand color per extension.
 * Clear document shape + bright colored badge at the bottom with extension text.
 */

const FILE_TYPES = {
    // Documents
    pdf: { bg: '#E53935', badge: '#B71C1C', label: 'PDF' },
    doc: { bg: '#1565C0', badge: '#0D47A1', label: 'DOC' },
    docx: { bg: '#1565C0', badge: '#0D47A1', label: 'DOCX' },
    xls: { bg: '#2E7D32', badge: '#1B5E20', label: 'XLS' },
    xlsx: { bg: '#2E7D32', badge: '#1B5E20', label: 'XLSX' },
    ppt: { bg: '#E65100', badge: '#BF360C', label: 'PPT' },
    pptx: { bg: '#E65100', badge: '#BF360C', label: 'PPTX' },
    txt: { bg: '#546E7A', badge: '#37474F', label: 'TXT' },
    csv: { bg: '#00897B', badge: '#00695C', label: 'CSV' },
    // Archives
    zip: { bg: '#F9A825', badge: '#F57F17', label: 'ZIP' },
    rar: { bg: '#F9A825', badge: '#F57F17', label: 'RAR' },
    '7z': { bg: '#F9A825', badge: '#F57F17', label: '7Z' },
    tar: { bg: '#F9A825', badge: '#F57F17', label: 'TAR' },
    gz: { bg: '#F9A825', badge: '#F57F17', label: 'GZ' },
    // Audio
    mp3: { bg: '#8E24AA', badge: '#6A1B9A', label: 'MP3' },
    wav: { bg: '#8E24AA', badge: '#6A1B9A', label: 'WAV' },
    m4a: { bg: '#8E24AA', badge: '#6A1B9A', label: 'M4A' },
    ogg: { bg: '#8E24AA', badge: '#6A1B9A', label: 'OGG' },
    flac: { bg: '#8E24AA', badge: '#6A1B9A', label: 'FLAC' },
    // Video
    mp4: { bg: '#00838F', badge: '#006064', label: 'MP4' },
    mov: { bg: '#00838F', badge: '#006064', label: 'MOV' },
    avi: { bg: '#00838F', badge: '#006064', label: 'AVI' },
    mkv: { bg: '#00838F', badge: '#006064', label: 'MKV' },
    webm: { bg: '#00838F', badge: '#006064', label: 'WEBM' },
    // Images
    jpg: { bg: '#5E35B1', badge: '#4527A0', label: 'JPG' },
    jpeg: { bg: '#5E35B1', badge: '#4527A0', label: 'JPEG' },
    png: { bg: '#5E35B1', badge: '#4527A0', label: 'PNG' },
    gif: { bg: '#5E35B1', badge: '#4527A0', label: 'GIF' },
    webp: { bg: '#5E35B1', badge: '#4527A0', label: 'WEBP' },
    svg: { bg: '#5E35B1', badge: '#4527A0', label: 'SVG' },
    // Code
    json: { bg: '#FF6F00', badge: '#E65100', label: 'JSON' },
    html: { bg: '#D84315', badge: '#BF360C', label: 'HTML' },
    css: { bg: '#0277BD', badge: '#01579B', label: 'CSS' },
    js: { bg: '#F57F17', badge: '#E65100', label: 'JS' },
    ts: { bg: '#1565C0', badge: '#0D47A1', label: 'TS' },
    py: { bg: '#1565C0', badge: '#0D47A1', label: 'PY' },
    java: { bg: '#C62828', badge: '#B71C1C', label: 'JAVA' },
    go: { bg: '#00838F', badge: '#006064', label: 'GO' },
    // Text
    md: { bg: '#424242', badge: '#212121', label: 'MD' },
    xml: { bg: '#558B2F', badge: '#33691E', label: 'XML' },
    yaml: { bg: '#558B2F', badge: '#33691E', label: 'YAML' },
    yml: { bg: '#558B2F', badge: '#33691E', label: 'YML' },
}

const DEFAULT = { bg: '#607D8B', badge: '#455A64', label: 'FILE' }

export default function FileIcon({ fileName, size = 40 }) {
    const ext = fileName?.split('.').pop()?.toLowerCase() ?? ''
    const { bg, badge, label } = FILE_TYPES[ext] ?? DEFAULT

    // Badge height = 30% of icon, min 10px
    const badgeH = Math.max(Math.round(size * 0.38), 12)
    const bodyH = size - badgeH
    // Corner fold
    const foldSize = Math.round(size * 0.22)
    const bodyW = Math.round(size * 0.78)
    const bodyX = Math.round((size - bodyW) / 2)

    // Font size: shrinks for longer labels
    const maxLabelLen = 5
    const displayLabel = label.length > maxLabelLen ? label.slice(0, maxLabelLen) : label
    const baseFontSize = badgeH * 0.55
    const fontSize = displayLabel.length <= 5
        ? baseFontSize
        : baseFontSize * (5 / displayLabel.length)

    const cx = size / 2
    const textY = size - badgeH / 2 + 0.5

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            aria-label={`${label} file`}
            role="img"
        >
            {/* Document body — has folded corner */}
            <path
                d={`
          M${bodyX + 3},2
          H${bodyX + bodyW - foldSize}
          L${bodyX + bodyW},${2 + foldSize}
          V${bodyH}
          H${bodyX}
          V${2 + 3}
          Q${bodyX},2 ${bodyX + 3},2 Z
        `}
                fill={bg}
            />

            {/* Folded corner triangle */}
            <path
                d={`
          M${bodyX + bodyW - foldSize},2
          L${bodyX + bodyW},${2 + foldSize}
          H${bodyX + bodyW - foldSize} Z
        `}
                fill="rgba(0,0,0,0.25)"
            />

            {/* Optional doc lines (decorative) */}
            <line x1={bodyX + 5} y1={size * 0.38} x2={bodyX + bodyW - 5} y2={size * 0.38} stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1={bodyX + 5} y1={size * 0.50} x2={bodyX + bodyW - 5} y2={size * 0.50} stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1={bodyX + 5} y1={size * 0.62} x2={bodyX + bodyW - 7} y2={size * 0.62} stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round" />

            {/* Extension badge — bottom strip (rounded bottom corners) */}
            <path
                d={`
          M${bodyX},${bodyH}
          H${bodyX + bodyW}
          V${size - 3}
          Q${bodyX + bodyW},${size} ${bodyX + bodyW - 3},${size}
          H${bodyX + 3}
          Q${bodyX},${size} ${bodyX},${size - 3} Z
        `}
                fill={badge}
            />

            {/* Extension label */}
            <text
                x={cx}
                y={textY}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="'Segoe UI', 'Arial', sans-serif"
                fontWeight="800"
                fontSize={fontSize}
                fill="white"
                letterSpacing={displayLabel.length >= 4 ? '-0.3' : '0.3'}
            >
                {displayLabel}
            </text>
        </svg>
    )
}
