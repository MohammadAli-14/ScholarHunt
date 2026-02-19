import { useState, useEffect, useRef } from 'react'

const AnimatedCounter = ({ value, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const counterRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (counterRef.current) {
      observer.observe(counterRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return

    const targetValue = parseInt(value.replace(/[^0-9]/g, ''))
    const hasK = value.includes('K')
    const hasPercent = value.includes('%')
    const hasPlus = value.includes('+')
    
    let start = 0
    const increment = targetValue / (duration / 16)
    
    const timer = setInterval(() => {
      start += increment
      if (start >= targetValue) {
        start = targetValue
        clearInterval(timer)
      }
      
      let displayValue = Math.floor(start)
      if (hasK) {
        displayValue = displayValue > 0 ? (displayValue / 1000).toFixed(0) + 'K' : displayValue
      }
      if (hasPercent) {
        displayValue = displayValue + '%'
      }
      if (hasPlus && !hasK && !hasPercent) {
        displayValue = displayValue + '+'
      }
      
      setCount(displayValue)
    }, 16)

    return () => clearInterval(timer)
  }, [isVisible, value, duration])

  return (
    <span ref={counterRef}>
      {count}
    </span>
  )
}

export default AnimatedCounter
