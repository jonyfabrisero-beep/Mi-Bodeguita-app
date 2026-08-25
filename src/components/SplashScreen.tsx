import { motion } from 'motion/react';
import { Store } from 'lucide-react';
import { useEffect } from 'react';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2500); // 2.5 seconds
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <motion.div 
      className="fixed inset-0 bg-[#FFF9F0] flex flex-col items-center justify-center z-50 text-[#2D3047]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0.5, duration: 1 }}
        className="flex flex-col items-center"
      >
        <div className="w-24 h-24 bg-[#FF6B35] border-4 border-[#2D3047] rounded-[1.5rem] flex items-center justify-center shadow-[4px_4px_0px_0px_#2D3047] mb-6">
          <Store className="w-12 h-12 text-white" strokeWidth={3} />
        </div>
        <h1 className="text-4xl font-black tracking-tighter uppercase text-[#FF6B35]">Mi Bodeguita</h1>
        <p className="mt-2 text-[#2D3047]/60 font-bold uppercase tracking-widest text-sm">Tu negocio, en tu bolsillo</p>
      </motion.div>

      <motion.div 
        className="absolute bottom-10 flex space-x-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <div className="w-3 h-3 bg-[#FF6B35] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-3 h-3 bg-[#1AC0C6] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-3 h-3 bg-[#2D3047] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </motion.div>
    </motion.div>
  );
}
