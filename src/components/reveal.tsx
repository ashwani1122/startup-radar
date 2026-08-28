"use client";

import type { HTMLMotionProps } from "motion/react";
import { motion, useReducedMotion } from "motion/react";

export function Reveal({ children, delay = 0, ...props }: HTMLMotionProps<"div"> & { delay?: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={reduceMotion ? undefined : { opacity: 1, y: 0 }} transition={{ duration: 0.48, delay, ease: [0.22, 1, 0.36, 1] }} {...props}>
      {children}
    </motion.div>
  );
}
