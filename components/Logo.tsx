import React from 'react';
import { motion } from 'framer-motion';
import { LogoIcon } from './icons';

const Logo = () => {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="flex items-center cursor-pointer group"
    >
      <div className="relative">
        <div className="p-2 sm:p-2.5 bg-[#151515] text-[#FAF9F6] border border-[#1A1A1A] rounded-lg shadow-sm mr-3 flex items-center justify-center">
          <LogoIcon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex flex-col">
        <h1 className="text-xl font-display font-medium text-[#151515] tracking-tight leading-none">
          Amar<span className="font-mono text-[#6E6D6A] font-normal text-sm ml-0.5">GPT</span>
        </h1>
        <span className="text-[9px] font-mono uppercase tracking-[0.1em] text-neutral-400 mt-0.5">
          Study Space
        </span>
      </div>
    </motion.div>
  );
};

export default Logo;
