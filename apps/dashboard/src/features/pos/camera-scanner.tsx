import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/shared/ui/dialog';

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

function detectorClass(): BarcodeDetectorConstructor | null {
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector ?? null;
}

/** La caméra peut lire les codes-barres (Chrome sur Android, Safari récent) : sinon, douchette ou saisie. */
export function canScanWithCamera(): boolean {
  return typeof window !== 'undefined' && detectorClass() !== null && Boolean(navigator.mediaDevices?.getUserMedia);
}

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'];

/**
 * Lecture d'un code-barres ou d'un IMEI à la caméra (téléphone, tablette) : la caméra arrière filme,
 * le premier code lu est rendu, puis la caméra s'éteint.
 */
export function CameraScanner({ open, onOpenChange, onDetect }: { open: boolean; onOpenChange: (open: boolean) => void; onDetect: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const Detector = detectorClass();
    if (!Detector) return;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let stopped = false;
    setError(null);

    const stop = () => {
      stopped = true;
      if (timer !== undefined) window.clearInterval(timer);
      for (const track of stream?.getTracks() ?? []) track.stop();
    };

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (stopped || !video.current) return stop();
        video.current.srcObject = stream;
        await video.current.play();
        const detector = new Detector({ formats: FORMATS });
        timer = window.setInterval(async () => {
          if (stopped || !video.current || video.current.readyState < 2) return;
          try {
            const [code] = await detector.detect(video.current);
            if (code?.rawValue && !stopped) {
              stop();
              onDetect(code.rawValue.trim());
            }
          } catch {
            // image illisible : on retente au tour suivant
          }
        }, 250);
      } catch {
        setError('La caméra n’est pas accessible. Autorisez-la dans le navigateur, ou utilisez la douchette.');
      }
    })();

    return stop;
  }, [open, onDetect]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Scanner à la caméra" description="Placez le code-barres ou l’IMEI dans le cadre.">
      {error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-[0.875rem] font-[560] text-danger-ink">
          {error}
        </p>
      ) : (
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video ref={video} muted playsInline className="aspect-[4/3] w-full object-cover" />
          <span aria-hidden className="pointer-events-none absolute inset-x-[12%] top-1/2 h-[30%] -translate-y-1/2 rounded-lg border-2 border-white/80" />
        </div>
      )}
    </Dialog>
  );
}
