import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { useEffect, useRef } from 'react';

interface ScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function Scanner({ onScan, onClose }: ScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerId = 'qr-reader';

  useEffect(() => {
    // Need a timeout to ensure DOM element is ready
    const timer = setTimeout(() => {
      scannerRef.current = new Html5QrcodeScanner(
        containerId,
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true
        },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          if (scannerRef.current) {
            scannerRef.current.clear();
          }
          onScan(decodedText);
        },
        (error) => {
          // Ignore frequent scan errors
        }
      );
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error("Failed to clear scanner", e));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex justify-between items-center p-4 bg-gray-900 text-white">
        <h2 className="text-lg font-bold">Escanear Código</h2>
        <button onClick={onClose} className="px-4 py-2 bg-red-500 rounded text-sm font-semibold">Cerrar</button>
      </div>
      <div className="flex-1 flex items-center justify-center bg-black overflow-hidden relative">
        <div id={containerId} className="w-full max-w-sm" />
      </div>
    </div>
  );
}
