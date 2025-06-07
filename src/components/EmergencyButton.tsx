import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneCall } from 'lucide-react';
import { toast } from 'sonner';

interface EmergencyButtonProps {
  onCall: () => void;
}

const HOLD_DURATION = 2000; // 2 seconds

const EmergencyButton: React.FC<EmergencyButtonProps> = ({ onCall }) => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseDown = () => {
    setIsHolding(true);
    setProgress(0);

    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        const nextProgress = prev + (100 / (HOLD_DURATION / 100));
        if (nextProgress >= 100) {
          clearInterval(progressIntervalRef.current!);
          return 100;
        }
        return nextProgress;
      });
    }, 100);

    timerRef.current = setTimeout(() => {
      if (isHolding) { 
        onCall();
        toast.success('Đã kích hoạt cuộc gọi khẩn cấp!');
        resetHold();
      }
    }, HOLD_DURATION);
  };

  const handleMouseUpOrLeave = () => {
    if (isHolding) {
      resetHold();
    }
  };
  
  const resetHold = () => {
    setIsHolding(false);
    setProgress(0);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      <motion.button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onTouchStart={(e) => { e.preventDefault(); handleMouseDown(); }}
        onTouchEnd={(e) => { e.preventDefault(); handleMouseUpOrLeave(); }}
        className="relative z-10 flex flex-col items-center justify-center w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-red-500 text-white shadow-xl focus:outline-none cursor-pointer"
        whileTap={{ scale: 0.95 }}
        aria-label="Emergency Call Button"
      >
        <PhoneCall size={36} className="mb-1" />
        <span className="text-sm font-semibold tracking-wider">EMERGENCY</span>
      </motion.button>

      <AnimatePresence>
        {!isHolding && (
          <motion.div
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.3, 0.6] }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-32 h-32 sm:w-36 sm:h-36 bg-red-400 rounded-full pointer-events-none"
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {isHolding && (
          <motion.svg
            className="absolute w-40 h-40 sm:w-44 sm:h-44 pointer-events-none"
            viewBox="0 0 100 100"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              strokeWidth="6"
              stroke="rgba(255, 255, 255, 0.5)"
              fill="transparent"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              strokeWidth="6"
              stroke="#FFFFFF"
              fill="transparent"
              strokeDasharray="283"
              strokeDashoffset={283 - (progress / 100) * 283}
              transform="rotate(-90 50 50)"
              transition={{ duration: 0.1, ease: "linear" }}
            />
          </motion.svg>
        )}
      </AnimatePresence>

      {isHolding && (
        <motion.p 
          className="mt-3 text-sm text-gray-600 dark:text-gray-400"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          Giữ để gọi... ({Math.round(progress)}%)
        </motion.p>
      )}
       {!isHolding && (
         <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
           Nhấn giữ nút để gọi khẩn cấp
         </p>
       )}
    </div>
  );
};

export default EmergencyButton;
