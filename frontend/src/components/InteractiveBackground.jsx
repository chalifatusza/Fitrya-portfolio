import React, { useEffect, useRef } from 'react';

const InteractiveBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Configuration
    const padRadius = 4.5;
    let pads = [];
    let traces = [];
    let pulses = [];
    let scheduledPulses = [];
    let shockwaves = [];

    // Mouse configuration
    const mouse = {
      x: null,
      y: null,
      active: false,
      lockRange: 130
    };

    // Helper to calculate Euclidean distance
    const getDistance = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

    // Helper to generate orthogonal PCB routing paths with 45-degree chamfers between two pads
    const getPCBPath = (x1, y1, x2, y2) => {
      const path = [{ x: x1, y: y1 }];

      const dx = x2 - x1;
      const dy = y2 - y1;

      // Direct line if differences are too small
      if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
        path.push({ x: x2, y: y2 });
        return path;
      }

      // Determine routing corner structure (horizontal first or vertical first)
      const preferHorizontal = Math.abs(dx) > Math.abs(dy);
      const cornerX = preferHorizontal ? x2 : x1;
      const cornerY = preferHorizontal ? y1 : y2;

      // Apply 45-degree chamfer to the corner
      const chamfer = 12;
      const dx1 = Math.sign(cornerX - x1);
      const dy1 = Math.sign(cornerY - y1);
      const dx2 = Math.sign(x2 - cornerX);
      const dy2 = Math.sign(y2 - cornerY);

      const d1 = Math.abs(preferHorizontal ? dx : dy);
      const d2 = Math.abs(preferHorizontal ? dy : dx);

      if (d1 > chamfer * 2 && d2 > chamfer * 2) {
        const turn1 = {
          x: cornerX - (preferHorizontal ? dx1 * chamfer : 0),
          y: cornerY - (preferHorizontal ? 0 : dy1 * chamfer)
        };
        const turn2 = {
          x: cornerX + (preferHorizontal ? 0 : dx2 * chamfer),
          y: cornerY + (preferHorizontal ? dy2 * chamfer : 0)
        };
        path.push(turn1);
        path.push(turn2);
      } else {
        path.push({ x: cornerX, y: cornerY });
      }

      path.push({ x: x2, y: y2 });
      return path;
    };

    // Setup board elements responsively
    const setupBoard = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      const isMobile = width < 768;

      pads = [];
      traces = [];
      pulses = [];
      scheduledPulses = [];
      shockwaves = [];

      // 1. Generate via pads snapped to a grid
      const padCount = isMobile ? 18 : 45;
      const step = 50;
      const border = 60;

      // Place nodes
      let attempts = 0;
      while (pads.length < padCount && attempts < 250) {
        attempts++;
        const gridX = Math.floor((Math.random() * (width - border * 2) + border) / step) * step;
        const gridY = Math.floor((Math.random() * (height - border * 2) + border) / step) * step;

        // Verify min distance between pads to prevent overlapping clusters
        let tooClose = false;
        for (let i = 0; i < pads.length; i++) {
          if (getDistance(gridX, gridY, pads[i].x, pads[i].y) < 75) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose) {
          // Dynamic telemetry specs for tech diagnostic probe feel
          const baseVoltage = [1.8, 3.3, 5.0][Math.floor(Math.random() * 3)];
          const frequency = (Math.random() * 10 + 2).toFixed(1); // 2.0 to 12.0 MHz

          pads.push({
            id: pads.length,
            x: gridX,
            y: gridY,
            radius: Math.random() * 1 + 3.2, // size variations
            glowLevel: 0,
            voltage: baseVoltage,
            frequency: parseFloat(frequency),
            name: `N-${pads.length.toString().padStart(2, '0')}`
          });
        }
      }

      // 2. Connect pads to construct PCB traces
      // For each pad, connect to its nearest 1 or 2 neighbors
      const traceKeys = new Set();

      pads.forEach((pad) => {
        // Calculate distances to all other pads
        const targets = pads
          .filter((p) => p.id !== pad.id)
          .map((p) => ({ pad: p, dist: getDistance(pad.x, pad.y, p.x, p.y) }))
          .sort((a, b) => a.dist - b.dist);

        const connectionsCount = Math.min(targets.length, isMobile ? 1 : 2);
        for (let i = 0; i < connectionsCount; i++) {
          const target = targets[i].pad;

          // Prevent long criss-crossing connections
          if (getDistance(pad.x, pad.y, target.x, target.y) > (isMobile ? 220 : 380)) continue;

          // Unique trace identifier (order-independent)
          const traceKey = [pad.id, target.id].sort((a, b) => a - b).join('-');
          if (traceKeys.has(traceKey)) continue;

          traceKeys.add(traceKey);

          const path = getPCBPath(pad.x, pad.y, target.x, target.y);

          let len = 0;
          for (let j = 0; j < path.length - 1; j++) {
            len += getDistance(path[j].x, path[j].y, path[j + 1].x, path[j + 1].y);
          }

          traces.push({
            id: traces.length,
            path,
            length: len,
            glowLevel: 0,
            padAId: pad.id,
            padBId: target.id
          });
        }
      });
    };

    // Calculate pulse coordinates based on distance along path segments
    const getPointAtDistance = (path, dist) => {
      let accumulated = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];
        const segLen = getDistance(p1.x, p1.y, p2.x, p2.y);
        if (dist <= accumulated + segLen) {
          const t = segLen > 0 ? (dist - accumulated) / segLen : 0;
          return {
            x: p1.x + (p2.x - p1.x) * t,
            y: p1.y + (p2.y - p1.y) * t
          };
        }
        accumulated += segLen;
      }
      return path[path.length - 1];
    };

    // Initialize layout
    setupBoard();

    // Event handlers
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
      mouse.active = false;
    };

    const handleMouseClick = (e) => {
      const cx = e.clientX;
      const cy = e.clientY;
      const maxDim = Math.max(width, height);

      // Trigger grid sweep scan wave
      shockwaves.push({
        x: cx,
        y: cy,
        radius: 0,
        maxRadius: maxDim * 0.9,
        speed: 8
      });

      // Chain reaction: schedule pulses from pads as sweep crosses them
      pads.forEach((pad) => {
        const dist = getDistance(cx, cy, pad.x, pad.y);
        if (dist < maxDim * 0.9) {
          const delay = Math.floor(dist / 8);
          scheduledPulses.push({
            padId: pad.id,
            delay,
            speed: Math.random() * 2 + 4.5
          });
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('click', handleMouseClick);
    window.addEventListener('resize', setupBoard);

    let frameCount = 0;

    // Animation runner
    const animate = () => {
      frameCount++;
      const isDark = document.documentElement.classList.contains('dark');

      ctx.clearRect(0, 0, width, height);

      // Color Theme Definitions
      const gridColor = isDark ? 'rgba(6, 182, 212, 0.012)' : 'rgba(251, 146, 60, 0.015)';
      const traceBaseColor = isDark ? 'rgba(6, 182, 212, 0.06)' : 'rgba(251, 146, 60, 0.1)';
      const traceGlowColor = isDark ? 'rgba(34, 211, 238, ' : 'rgba(249, 115, 22, ';
      const padColor = isDark ? '#0ea5e9' : '#f97316';
      const padGlowColor = isDark ? 'rgba(34, 211, 238, ' : 'rgba(251, 146, 60, ';
      const hudColor = isDark ? 'rgba(34, 211, 238, ' : 'rgba(234, 88, 12, ';

      // 1. Draw subtle board grid lines
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Ambient pulse generation
      if (frameCount % 60 === 0 && traces.length > 0) {
        const trace = traces[Math.floor(Math.random() * traces.length)];
        const reverse = Math.random() > 0.5;
        pulses.push({
          traceIndex: trace.id,
          distance: 0,
          speed: Math.random() * 1.2 + 2,
          reverse
        });
      }

      // 3. Process Scheduled triggers
      scheduledPulses = scheduledPulses.filter((sp) => {
        sp.delay--;
        if (sp.delay <= 0) {
          // Find traces connected to this pad and spawn pulses traveling outward
          const connectedTraces = traces.filter((t) => t.padAId === sp.padId || t.padBId === sp.padId);
          connectedTraces.forEach((trace) => {
            const reverse = trace.padBId === sp.padId; // if starting pad is B, we reverse travel direction
            pulses.push({
              traceIndex: trace.id,
              distance: 0,
              speed: sp.speed,
              reverse
            });
            trace.glowLevel = 1.0;
          });

          const triggeredPad = pads.find((p) => p.id === sp.padId);
          if (triggeredPad) triggeredPad.glowLevel = 1.0;

          return false;
        }
        return true;
      });

      // 4. Update and Draw Click Shockwaves
      shockwaves = shockwaves.filter((wave) => {
        wave.radius += wave.speed;

        ctx.strokeStyle = `${traceGlowColor}${Math.max(0, 1 - wave.radius / wave.maxRadius) * 0.35})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.stroke();

        return wave.radius < wave.maxRadius;
      });

      // 5. Update and Draw Trace Lines
      traces.forEach((trace) => {
        if (trace.glowLevel > 0) {
          trace.glowLevel -= 0.015;
        }

        // Draw baseline static traces
        ctx.beginPath();
        ctx.moveTo(trace.path[0].x, trace.path[0].y);
        for (let i = 1; i < trace.path.length; i++) {
          ctx.lineTo(trace.path[i].x, trace.path[i].y);
        }
        ctx.strokeStyle = traceBaseColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Draw active glowing traces
        if (trace.glowLevel > 0.01) {
          ctx.beginPath();
          ctx.moveTo(trace.path[0].x, trace.path[0].y);
          for (let i = 1; i < trace.path.length; i++) {
            ctx.lineTo(trace.path[i].x, trace.path[i].y);
          }
          ctx.strokeStyle = `${traceGlowColor}${trace.glowLevel * 0.35})`;
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
      });

      // 6. Update and Draw Active Pulses
      pulses = pulses.filter((pulse) => {
        const trace = traces.find((t) => t.id === pulse.traceIndex);
        if (!trace) return false;

        pulse.distance += pulse.speed;

        // Path representation, reversing array order if traveling reverse direction
        const currentPath = pulse.reverse ? [...trace.path].reverse() : trace.path;

        // Render pulse tail
        const tailCount = 6;
        for (let j = 0; j < tailCount; j++) {
          const backDist = Math.max(0, pulse.distance - j * 7);
          const pos = getPointAtDistance(currentPath, backDist);
          const opacity = (1 - j / tailCount) * 0.6;
          const r = (1 - j / 12) * 2.5;

          ctx.beginPath();
          ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? `rgba(6, 182, 212, ${opacity})` : `rgba(249, 115, 22, ${opacity})`;
          ctx.fill();
        }

        // Render pulse head
        const headPos = getPointAtDistance(currentPath, pulse.distance);
        ctx.beginPath();
        ctx.arc(headPos.x, headPos.y, 3.0, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#ffffff' : '#ea580c';
        ctx.shadowColor = isDark ? '#22d3ee' : '#fb923c';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0; // Disable blur immediately to preserve FPS

        if (pulse.distance >= trace.length) {
          // Activate end pad
          const targetPadId = pulse.reverse ? trace.padAId : trace.padBId;
          const endPad = pads.find((p) => p.id === targetPadId);
          if (endPad) endPad.glowLevel = 1.0;
          
          trace.glowLevel = 0.8;
          return false;
        }
        return true;
      });

      // 7. Find nearest pad to mouse for HUD Diagnostic lock
      let closestPad = null;
      let minMouseDist = mouse.lockRange;

      if (mouse.active && mouse.x !== null && mouse.y !== null) {
        pads.forEach((pad) => {
          const d = getDistance(mouse.x, mouse.y, pad.x, pad.y);
          if (d < minMouseDist) {
            minMouseDist = d;
            closestPad = pad;
          }
        });
      }

      // 8. Update and Draw Solder Pads (Vias)
      pads.forEach((pad) => {
        if (pad.glowLevel > 0) {
          pad.glowLevel -= 0.018;
        }

        const isMouseTarget = closestPad && closestPad.id === pad.id;
        const totalGlow = Math.max(pad.glowLevel, isMouseTarget ? 0.75 : 0);

        // Draw outer solder ring
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, pad.radius + 3.0, 0, Math.PI * 2);
        ctx.strokeStyle = `${padGlowColor}${0.1 + totalGlow * 0.35})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw pad inner core
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, pad.radius, 0, Math.PI * 2);
        ctx.fillStyle = padColor;
        ctx.fill();

        // Draw central drill hole
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, pad.radius * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#000000' : '#ffffff';
        ctx.fill();

        // Glow halo
        if (totalGlow > 0.05) {
          ctx.beginPath();
          ctx.arc(pad.x, pad.y, pad.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `${padGlowColor}${totalGlow * 0.12})`;
          ctx.fill();
        }
      });

      // 9. Draw Diagnostic Probe HUD Readout
      if (closestPad && mouse.x !== null && mouse.y !== null) {
        const pad = closestPad;

        // Dotted connection probe line
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(mouse.x, mouse.y);
        ctx.lineTo(pad.x, pad.y);
        ctx.strokeStyle = `${hudColor}0.25)`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.setLineDash([]);

        // Dotted lock ring
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, pad.radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = `${hudColor}0.55)`;
        ctx.stroke();
        ctx.setLineDash([]);

        // Target tick indicators
        ctx.strokeStyle = `${hudColor}0.75)`;
        ctx.lineWidth = 1;
        const tickR = pad.radius + 9;
        const tickLen = 3.0;

        ctx.beginPath();
        ctx.moveTo(pad.x, pad.y - tickR);
        ctx.lineTo(pad.x, pad.y - tickR + tickLen);
        ctx.moveTo(pad.x, pad.y + tickR);
        ctx.lineTo(pad.x, pad.y + tickR - tickLen);
        ctx.moveTo(pad.x - tickR, pad.y);
        ctx.lineTo(pad.x - tickR + tickLen, pad.y);
        ctx.moveTo(pad.x + tickR, pad.y);
        ctx.lineTo(pad.x + tickR - tickLen, pad.y);
        ctx.stroke();

        // Telemetry details text
        const textX = mouse.x + 16;
        const textY = mouse.y + 14;
        ctx.font = '8.5px monospace';
        ctx.fillStyle = `${hudColor}0.75)`;
        ctx.textAlign = 'left';

        // Voltages and status update dynamically based on pad active states
        const volt = pad.glowLevel > 0.1 ? (pad.voltage * 1.05).toFixed(2) : pad.voltage.toFixed(1);
        const status = pad.glowLevel > 0.4 ? 'ACTIVE' : pad.glowLevel > 0.05 ? 'PULSING' : 'STANDBY';
        const freq = status === 'STANDBY' ? '0.00' : (pad.frequency * (pad.glowLevel * 0.4 + 0.8)).toFixed(2);

        ctx.fillText(`PROBE TARGET: ${pad.name}`, textX, textY);
        ctx.fillText(`VOLTAGE: ${volt}V [${status}]`, textX, textY + 11);
        ctx.fillText(`FREQ: ${freq} MHz`, textX, textY + 22);
        ctx.fillText(`COORD X:${Math.round(pad.x)} Y:${Math.round(pad.y)}`, textX, textY + 33);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('click', handleMouseClick);
      window.removeEventListener('resize', setupBoard);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: 'normal' }}
    />
  );
};

export default InteractiveBackground;
