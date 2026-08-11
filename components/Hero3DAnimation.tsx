import React from 'react';
import { motion } from 'framer-motion';

const Shape: React.FC<{
  className: string;
  initial: any;
  animate: any;
  transition: any;
}> = ({ className, ...props }) => {
  return (
    <motion.div
      className={`absolute rounded-full mix-blend-multiply filter blur-xl opacity-50 ${className}`}
      {...props}
    />
  );
};

const Hero3DAnimation: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div className="relative w-full h-full">
        <Shape
          className="w-72 h-72 bg-primary-300"
          initial={{ y: -100, x: -200 }}
          animate={{
            y: [-100, 100, -100],
            x: [-200, 0, -200],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
        />
        <Shape
          className="w-64 h-64 bg-fuchsia-300"
          initial={{ y: 200, x: 200 }}
          animate={{
            y: [200, -50, 200],
            x: [200, 50, 200],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
            delay: 5,
          }}
        />
         <Shape
          className="w-56 h-56 bg-teal-200"
          initial={{ y: -50, x: 300 }}
          animate={{
            y: [-50, 150, -50],
            x: [300, 100, 300],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
            delay: 2,
          }}
        />
      </div>
    </div>
  );
};

export default Hero3DAnimation;