"use client";

import { animate, useMotionValue, useMotionValueEvent } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/** Cuenta desde el valor anterior hasta `value` cada vez que cambia (filtros, refetch). */
export function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  const first = useRef(true);

  useMotionValueEvent(motionValue, "change", (v) => setDisplay(Math.round(v)));

  useEffect(() => {
    const from = first.current ? 0 : motionValue.get();
    first.current = false;
    const controls = animate(from, value, {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => motionValue.set(v),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display.toLocaleString("es-CL")}</>;
}
