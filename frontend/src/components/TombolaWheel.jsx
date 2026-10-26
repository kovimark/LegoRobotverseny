import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

const SLICE_COLORS = [
  '#fa7921', // Brickathlon Narancs
  '#5bc0eb', // Brickathlon Kék
  '#fde74c', // Brickathlon Sárga
  '#9bc53d', // Brickathlon Zöld
  '#e55934', // Brickathlon Piros
];

/**
 * Brickathlon Szerencsekerék (Wheel of Fortune)
 * 
 * - KIZÁRÓLAG a ténylegesen elérhető tombolajegyekből gazdálkodik (nincsenek mű kódok vagy kötelező kitöltések).
 * - Ha 2 jegy van hátra, pontosan 2 szelet van.
 * - Ha 0 jegy van hátra, nem jelenik meg szelet, jelezve hogy a kosár üres.
 */
const TombolaWheel = forwardRef(function TombolaWheel(
  {
    candidateTickets = [],
    onSpinComplete = () => {},
    size = 400
  },
  ref
) {
  const canvasRef = useRef(null);
  const rotationRef = useRef(0);
  const animFrameRef = useRef(null);
  const [pointerTick, setPointerTick] = useState(0);

  // KIZÁRÓLAG az elérhető jegyek kódjai!
  const slices = React.useMemo(() => {
    if (!candidateTickets || candidateTickets.length === 0) return [];
    return candidateTickets.map((t) => (typeof t === 'string' ? t : t.code || '')).filter(Boolean);
  }, [candidateTickets]);

  const numSlices = slices.length;
  const sliceAngle = numSlices > 0 ? (2 * Math.PI) / numSlices : 0;

  // Kerék kirajzolása a megadott forgatási szögben
  const drawWheel = (rotationAngle) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = size;
    const height = size;

    if (canvas.width !== width * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const outerRadius = width / 2 - 16;
    const rimWidth = 14;
    const wheelRadius = outerRadius - rimWidth;

    // 1. Árnyék a kerék mögé
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx + 3, cy + 4, outerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fill();
    ctx.restore();

    // 2. Külső fém/arany perem
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fde74c';
    ctx.stroke();

    // 3. Perem szegecsek / csapok
    const pinCount = numSlices > 0 ? Math.max(12, Math.min(36, numSlices * 2)) : 16;
    for (let p = 0; p < pinCount; p++) {
      const pinAngle = rotationAngle + (p * (2 * Math.PI) / pinCount);
      const px = cx + (outerRadius - rimWidth / 2) * Math.cos(pinAngle);
      const py = cy + (outerRadius - rimWidth / 2) * Math.sin(pinAngle);

      ctx.beginPath();
      ctx.arc(px, py, 3.2, 0, 2 * Math.PI);
      ctx.fillStyle = '#fde74c';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#000000';
      ctx.stroke();
    }

    // 4. Szeletek kirajzolása (ha van elérhető szelvény)
    if (numSlices === 0) {
      // Üres állapot: Nincs elérhető jegy
      ctx.beginPath();
      ctx.arc(cx, cy, wheelRadius, 0, 2 * Math.PI);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#334155';
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Nincs sorsolható jegy', cx, cy - 12);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('(minden szelvény kihúzva)', cx, cy + 12);
    } else if (numSlices === 1) {
      // Egyetlen jegy van hátra: 1 teli kör
      ctx.beginPath();
      ctx.arc(cx, cy, wheelRadius, 0, 2 * Math.PI);
      ctx.fillStyle = SLICE_COLORS[0];
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(16, Math.floor(size / 16))}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(slices[0], cx, cy - 40);
    } else {
      // Több szelet (pontosan numSlices darab!)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotationAngle);

      // Dinamikus betűméret a szeletek számától függően
      let fontSize = Math.max(11, Math.min(18, Math.floor((size * 1.8) / numSlices)));
      if (numSlices <= 8) fontSize = 17;
      if (numSlices > 30) fontSize = 10;

      for (let i = 0; i < numSlices; i++) {
        const startAngle = i * sliceAngle;
        const endAngle = (i + 1) * sliceAngle;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, wheelRadius, startAngle, endAngle);
        ctx.closePath();

        const fillColor = SLICE_COLORS[i % SLICE_COLORS.length];
        ctx.fillStyle = fillColor;
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';
        ctx.stroke();

        // Szöveg elhelyezése a sugár mentén
        ctx.save();
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const isYellow = fillColor === '#fde74c';
        ctx.fillStyle = isYellow ? '#000000' : '#ffffff';
        ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`;
        ctx.shadowColor = isYellow ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 3;

        ctx.fillText(slices[i], wheelRadius - 14, 0);
        ctx.restore();
      }

      ctx.restore();
    }

    // 5. Belső központi agy
    const hubRadius = Math.max(26, size * 0.085);

    ctx.beginPath();
    ctx.arc(cx, cy, hubRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#fde74c';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, hubRadius * 0.65, 0, 2 * Math.PI);
    ctx.fillStyle = '#fa7921';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fde74c';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(13, Math.floor(hubRadius * 0.65))}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('B', cx, cy + 1);

    ctx.restore();
  };

  useEffect(() => {
    drawWheel(rotationRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slices, size]);

  useImperativeHandle(ref, () => ({
    spinToWinner: (winnerCode) => {
      return new Promise((resolve) => {
        if (numSlices === 0) {
          resolve(winnerCode);
          return;
        }

        let winnerIndex = slices.findIndex(
          (c) => String(c).trim().toUpperCase() === String(winnerCode).trim().toUpperCase()
        );

        if (winnerIndex === -1) {
          winnerIndex = 0;
        }

        const centerAngle = (winnerIndex + 0.5) * sliceAngle;
        const pointerAngle = (3 * Math.PI) / 2; // 12 óra fenti pozíció

        let targetAngle = pointerAngle - centerAngle;
        while (targetAngle < 0) targetAngle += 2 * Math.PI;
        targetAngle = targetAngle % (2 * Math.PI);

        const startRotation = rotationRef.current;
        const currentMod = ((startRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const diff = ((targetAngle - currentMod + 2 * Math.PI) % (2 * Math.PI));

        // 6 teljes fordulat + a cél pozíció elérése
        const totalSpinAngle = 6 * (2 * Math.PI) + diff;
        const finalRotation = startRotation + totalSpinAngle;

        const duration = 4600; // 4.6 mp
        const startTime = performance.now();

        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
        }

        const animate = (currentTime) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(1, elapsed / duration);

          // Easing: Quintic ease-out a finom lassuláshoz
          const easeProgress = 1 - Math.pow(1 - progress, 4.5);
          const currentAngle = startRotation + totalSpinAngle * easeProgress;

          rotationRef.current = currentAngle;
          drawWheel(currentAngle);

          if (progress < 0.95) {
            setPointerTick((prev) => (prev + 1) % 4);
          } else {
            setPointerTick(0);
          }

          if (progress < 1) {
            animFrameRef.current = requestAnimationFrame(animate);
          } else {
            rotationRef.current = finalRotation;
            drawWheel(finalRotation);
            setPointerTick(0);
            onSpinComplete(winnerCode);
            resolve(winnerCode);
          }
        };

        animFrameRef.current = requestAnimationFrame(animate);
      });
    }
  }));

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="d-flex flex-column align-items-center justify-content-center position-relative my-2">
      {/* 12 óránál lévő mutató felül */}
      {numSlices > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            left: '50%',
            transform: `translateX(-50%) rotate(${pointerTick % 2 === 1 ? -4 : 0}deg)`,
            transformOrigin: 'top center',
            zIndex: 10,
            transition: 'transform 0.05s ease',
            filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.6))'
          }}
        >
          <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="17" cy="8" r="6" fill="#fde74c" stroke="#000000" strokeWidth="2.5" />
            <path
              d="M8 8 L26 8 L17 40 Z"
              fill="#e55934"
              stroke="#000000"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path d="M12 11 L22 11 L17 33 Z" fill="#fa7921" />
          </svg>
        </div>
      )}

      {/* A szerencsekerék vászon */}
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          maxWidth: '100%',
          height: 'auto'
        }}
      />
    </div>
  );
});

export default TombolaWheel;
