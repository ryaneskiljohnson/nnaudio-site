import React from "react";
import { motion } from "framer-motion";

interface StatLoadingSpinnerProps {
  size?: number;
}

const StatLoadingSpinner: React.FC<StatLoadingSpinnerProps> = ({ size = 16 }) => {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" as const }}
      style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        border: '2px solid rgba(108, 99, 255, 0.3)', 
        borderTop: '2px solid var(--primary)', 
        borderRadius: '50%',
        display: 'inline-block',
        verticalAlign: 'middle'
      }}
    />
  );
};

export default StatLoadingSpinner; 