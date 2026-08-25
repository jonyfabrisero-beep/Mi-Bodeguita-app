import { Html5Qrcode } from 'html5-qrcode';
import { useEffect } from 'react';

interface ScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function Scanner({ onScan, onClose }: ScannerProps) {
  const containerId = 'qr-reader';

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(containerId);
    let isMounted = true;

    // Start scanning immediately with the rear camera
    html5QrCode.start(
      { facingMode: "environment" },
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 } 
      },
      (decodedText) => {
        if (!isMounted) return;
        isMounted = false;
        html5QrCode.stop()
          .then(() => onScan(decodedText))
          .catch(() => onScan(decodedText));
      },
      () => {
        // Ignore frequent frame scan errors
      }
    ).catch(err => {
      console.error("Camera start error", err);
    });

    return () => {
      isMounted = false;
      try {
        html5QrCode.stop().catch(() => {});
      } catch (e) {
        // Ignore stop errors if not scanning
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[70] bg-[#FFF9F0] flex flex-col">
      <div className="flex justify-between items-center p-4 bg-[#2D3047] text-white">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-[#FF6B35]">Escanear</h2>
        <button 
          onClick={onClose} 
          className="px-4 py-2 bg-[#FF6B35] text-white rounded-xl border-2 border-transparent font-black uppercase active:scale-95 transition-all"
        >
          Cerrar
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center bg-[#2D3047]/10 relative overflow-hidden p-6">
        <div 
          id={containerId} 
          className="w-full max-w-sm rounded-[2rem] overflow-hidden border-8 border-[#2D3047] shadow-[8px_8px_0px_0px_#2D3047] bg-black" 
        />
        <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
          <p className="inline-block bg-[#2D3047] text-white px-4 py-2 rounded-xl font-black uppercase text-sm shadow-[4px_4px_0px_0px_#FF6B35]">
            Apunta al Código
          </p>
        </div>
      </div>
    </div>
  );
}
