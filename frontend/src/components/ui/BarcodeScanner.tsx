import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { X, Camera, RefreshCw } from 'lucide-react';

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const detectedRef = useRef(false);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader.listVideoInputDevices()
      .then(devices => {
        if (devices.length === 0) {
          setError('No camera found on this device.');
          return;
        }
        setCameras(devices);
        // prefer back camera on mobile
        const back = devices.find(d => /back|rear|environment/i.test(d.label));
        setSelectedCamera(back?.deviceId || devices[0].deviceId);
      })
      .catch(() => setError('Camera permission denied. Please allow camera access.'));

    return () => {
      readerRef.current?.reset();
    };
  }, []);

  useEffect(() => {
    if (!selectedCamera || !videoRef.current) return;

    detectedRef.current = false;
    setScanning(true);
    setError('');

    readerRef.current?.reset();

    readerRef.current
      ?.decodeFromVideoDevice(selectedCamera, videoRef.current, (result, err) => {
        if (result && !detectedRef.current) {
          detectedRef.current = true;
          readerRef.current?.reset();
          onDetected(result.getText());
        }
        if (err && !(err instanceof NotFoundException)) {
          // ignore NotFoundException — it fires continuously when no barcode in frame
        }
      })
      .catch(e => {
        setError('Could not start camera: ' + (e?.message || 'Unknown error'));
        setScanning(false);
      });

    return () => {
      readerRef.current?.reset();
    };
  }, [selectedCamera]);

  const switchCamera = () => {
    const idx = cameras.findIndex(c => c.deviceId === selectedCamera);
    const next = cameras[(idx + 1) % cameras.length];
    setSelectedCamera(next.deviceId);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-teal-600" />
            <h3 className="font-semibold text-gray-800">Scan Drug Barcode</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Camera view */}
        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          {/* Scan frame overlay */}
          {scanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-52 h-32">
                {/* Corner brackets */}
                <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-teal-400 rounded-tl-sm" />
                <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-teal-400 rounded-tr-sm" />
                <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-teal-400 rounded-bl-sm" />
                <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-teal-400 rounded-br-sm" />
                {/* Scan line */}
                <div className="absolute left-1 right-1 top-1/2 h-0.5 bg-teal-400/70 animate-pulse" />
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-6">
              <p className="text-white text-sm text-center">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-gray-400 text-center">
            Point the camera at a drug barcode or QR code
          </p>

          {cameras.length > 1 && (
            <button
              onClick={switchCamera}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} /> Switch Camera
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
