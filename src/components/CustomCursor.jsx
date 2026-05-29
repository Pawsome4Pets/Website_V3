import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

// Premium dual-cursor: small mustard dot snaps to the pointer, a coral-tinted
// ring trails behind with spring physics and expands on interactive elements.
// Auto-disables on touch / coarse-pointer devices.
export default function CustomCursor() {
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Inner dot — tight, fast spring
  const dotX = useSpring(mouseX, { damping: 30, stiffness: 800, mass: 0.2 });
  const dotY = useSpring(mouseY, { damping: 30, stiffness: 800, mass: 0.2 });

  // Outer ring — slower, gives the "magnetic trail" feel
  const ringX = useSpring(mouseX, { damping: 25, stiffness: 180, mass: 0.5 });
  const ringY = useSpring(mouseY, { damping: 25, stiffness: 180, mass: 0.5 });

  const [hovering, setHovering] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Only enable on fine-pointer (mouse) devices
    if (typeof window === 'undefined') return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    setEnabled(fine);
    if (!fine) return;

    // Hide native cursor while the custom one is active
    document.documentElement.classList.add('no-native-cursor');

    const onMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    const onOver = (e) => {
      const interactive = e.target.closest('a, button, [data-cursor-hover], input, textarea, select, summary');
      setHovering(!!interactive);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseover', onOver);
    return () => {
      document.documentElement.classList.remove('no-native-cursor');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
    };
  }, [mouseX, mouseY]);

  if (!enabled) return null;

  return (
    <>
      {/* Inner dot */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[100] h-2.5 w-2.5 rounded-full bg-coral shadow-[0_0_12px_rgba(219,98,56,0.45)]"
        style={{ x: dotX, y: dotY, translateX: '-50%', translateY: '-50%' }}
        animate={{ scale: hovering ? 0 : 1 }}
        transition={{ duration: 0.2 }}
      />
      {/* Outer ring */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[100] flex h-9 w-9 items-center justify-center rounded-full border-2"
        style={{
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%',
          borderColor: hovering ? '#DB6238' : '#C5B131',
          backgroundColor: hovering ? 'rgba(219,98,56,0.12)' : 'transparent',
        }}
        animate={{ scale: hovering ? 1.9 : 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 250 }}
      >
        {hovering && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="h-2 w-2 rounded-full bg-coral"
          />
        )}
      </motion.div>
    </>
  );
}
