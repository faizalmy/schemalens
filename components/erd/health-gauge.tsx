'use client'

import { useState, useEffect } from 'react'

interface HealthGaugeProps {
  score: number
  size?: number
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'hsl(142, 76%, 42%)'
  if (score >= 75) return 'hsl(85, 65%, 50%)'
  if (score >= 60) return 'hsl(38, 92%, 50%)'
  if (score >= 40) return 'hsl(25, 95%, 53%)'
  return 'hsl(0, 84%, 60%)'
}

export function HealthGauge({ score, size = 120 }: HealthGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const strokeWidth = Math.max(6, Math.round(size * 0.08))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedScore / 100) * circumference
  const center = size / 2
  const color = getScoreColor(score)

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100)
    return () => clearTimeout(timer)
  }, [score])

  // Scale font size relative to gauge size
  const scoreFontSize = Math.max(8, Math.round(size * 0.2))

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      <div className="absolute flex items-center justify-center">
        <span
          className="font-bold leading-none"
          style={{ color, fontSize: scoreFontSize }}
        >
          {Math.round(animatedScore)}
        </span>
      </div>
    </div>
  )
}
