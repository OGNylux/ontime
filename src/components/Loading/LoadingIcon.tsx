import svgPaths from "./Logo";
import { motion } from "motion/react";
import { AnimatedNeedle } from "./RotatingNeedle";

export default function LoadingIcon() {
  return (
    <div className="css-vf8mzy size-full" data-name="OnTime Logo">
      <motion.div 
        className="css-trglf0 inset-[-5.21%_-27.49%_-20.65%_-17.23%]"
        animate={{
          x: [0, 0, 0, 0, -2, 2, -2, 2, -1, 1, 0, -2, 2, -2, 2, -1, 1, 0],
          y: [0, 0, 0, 0, -2, 2, -1, 1, -2, 2, 0, -2, 2, -1, 1, -2, 2, 0],
          rotate: [0, 0, 0, 0, -1, 1, -1, 1, -0.5, 0.5, 0, -1, 1, -1, 1, -0.5, 0.5, 0]
        }}
        transition={{
          x: { duration: 3.5, times: [0, 0.571, 0.643, 0.714, 0.729, 0.743, 0.757, 0.771, 0.786, 0.8, 0.814, 0.829, 0.843, 0.857, 0.871, 0.886, 0.9, 1], repeat: Infinity, ease: "linear" },
          y: { duration: 3.5, times: [0, 0.571, 0.643, 0.714, 0.729, 0.743, 0.757, 0.771, 0.786, 0.8, 0.814, 0.829, 0.843, 0.857, 0.871, 0.886, 0.9, 1], repeat: Infinity, ease: "linear" },
          rotate: { duration: 3.5, times: [0, 0.571, 0.643, 0.714, 0.729, 0.743, 0.757, 0.771, 0.786, 0.8, 0.814, 0.829, 0.843, 0.857, 0.871, 0.886, 0.9, 1], repeat: Infinity, ease: "linear" }
        }}
      >
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 412.496 417.923">
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C27AFF" />
              <stop offset="100%" stopColor="#74D4FF" />
            </linearGradient>
            <mask id="logoMask">
              <g id="OnTime Logo Mask">
                <g id="Vector">
                  <path clipRule="evenodd" d={svgPaths.p3cfe7480} fill="white" fillRule="evenodd" />
                  <path d={svgPaths.p16c57600} fill="white" />
                  <path d={svgPaths.pc44ef80} fill="white" />
                  <path d={svgPaths.p249d8000} fill="white" />
                  <path d={svgPaths.p30808880} fill="white" />
                  <path d={svgPaths.p11c4faf0} fill="white" />
                  <path d={svgPaths.p2f94d180} fill="white" />
                  <path d={svgPaths.p2549b800} fill="white" />
                  <path d={svgPaths.p1608c4a0} fill="white" />
                  <path d={svgPaths.p3acb9600} fill="white" />
                  <path d={svgPaths.p17d2300} fill="white" />
                  <path d={svgPaths.p214f9500} fill="white" />
                  <path d={svgPaths.p250fa80} fill="white" />
                  <path clipRule="evenodd" d={svgPaths.p2b7b7fc0} fill="white" fillRule="evenodd" />
                  <path clipRule="evenodd" d={svgPaths.pa882500} fill="white" fillRule="evenodd" />
                </g>
                <AnimatedNeedle d={svgPaths.p22726600} centerX={191.5} centerY={210} />
                <path d={svgPaths.p25780d00} stroke="white" strokeLinecap="round" strokeWidth="9" />
                <path d={svgPaths.p2de9ed60} stroke="white" strokeLinecap="round" strokeWidth="9" />
                <path d={svgPaths.p3fd54f80} stroke="white" strokeLinecap="round" strokeWidth="9" />
                <path d={svgPaths.p1d35900} stroke="white" strokeLinecap="round" strokeWidth="9" />
              </g>
            </mask>
          </defs>
          <rect width="412.496" height="417.923" fill="url(#logoGradient)" mask="url(#logoMask)" />
        </svg>
      </motion.div>
    </div>
  );
}