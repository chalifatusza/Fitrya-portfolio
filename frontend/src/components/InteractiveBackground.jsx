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

    // Tech names to display on PCB pads
    const techSkills = [
      'Flutter', 'NodeJS', 'MySQL', 'Tailwind', 'JavaScript',
      'HTML', 'CSS', 'Aiven MySQL', 'Supabase', 'Vercel', 'Git'
    ];

    // Configuration
    const pinLen = 7;
    const pinW = 3;

    // Component arrays
    let chips = [];
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

    // Helper to generate orthogonal PCB routing paths with 45-degree chamfers
    const getOrthogonalPath = (x1, y1, x2, y2, side) => {
      const path = [{ x: x1, y: y1 }];

      // Pin breakout extension (draw trace straight out from pin tip first)
      let breakX = x1;
      let breakY = y1;
      const breakoutDist = 12;

      if (side === 'left') breakX -= breakoutDist;
      else if (side === 'right') breakX += breakoutDist;
      else if (side === 'top') breakY -= breakoutDist;
      else if (side === 'bottom') breakY += breakoutDist;

      path.push({ x: breakX, y: breakY });

      // Determine routing corners
      const preferHorizontal = (side === 'left' || side === 'right');
      const cornerX = preferHorizontal ? x2 : breakX;
      const cornerY = preferHorizontal ? breakY : y2;

      // Apply 45-degree chamfer to the corner to mimic real PCB tracks
      const chamfer = 12;
      const dx1 = Math.sign(cornerX - breakX);
      const dy1 = Math.sign(cornerY - breakY);
      const dx2 = Math.sign(x2 - cornerX);
      const dy2 = Math.sign(y2 - cornerY);

      const d1 = Math.abs(preferHorizontal ? (cornerX - breakX) : (cornerY - breakY));
      const d2 = Math.abs(preferHorizontal ? (y2 - cornerY) : (x2 - cornerX));

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

    // Helper to generate pins for IC chip packages
    const generatePins = (cx, cy, w, h, style) => {
      const pins = [];
      const edgePadding = 12;

      const addPinsOnSide = (side, count) => {
        for (let i = 0; i < count; i++) {
          const t = count > 1 ? i / (count - 1) : 0.5;
          let px, py;

          if (side === 'left') {
            px = cx - w / 2 - pinLen;
            py = cy - h / 2 + edgePadding + t * (h - edgePadding * 2);
          } else if (side === 'right') {
            px = cx + w / 2 + pinLen;
            py = cy - h / 2 + edgePadding + t * (h - edgePadding * 2);
          } else if (side === 'top') {
            px = cx - w / 2 + edgePadding + t * (w - edgePadding * 2);
            py = cy - h / 2 - pinLen;
          } else if (side === 'bottom') {
            px = cx - w / 2 + edgePadding + t * (w - edgePadding * 2);
            py = cy + h / 2 + pinLen;
          }

          pins.push({ x: px, y: py, side });
        }
      };

      if (style === 'QFP') {
        // Quad Flat Package (Pins on all 4 sides)
        addPinsOnSide('left', 6);
        addPinsOnSide('right', 6);
        addPinsOnSide('top', 6);
        addPinsOnSide('bottom', 6);
      } else {
        // DIP (Pins on left and right sides)
        addPinsOnSide('left', 6);
        addPinsOnSide('right', 6);
      }

      return pins;
    };

    // Main layout config based on screen size
    const setupBoard = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      const isMobile = width < 768;

      chips = [];
      pads = [];
      traces = [];
      pulses = [];
      scheduledPulses = [];
      shockwaves = [];

      // 1. Position IC Chips
      if (isMobile) {
        chips.push({
          id: 1,
          name: 'MCU-CORE',
          cx: width * 0.5,
          cy: height * 0.45,
          w: 80,
          h: 80,
          style: 'DIP',
          pins: []
        });
      } else {
        chips.push({
          id: 1,
          name: 'TECH-CORE',
          cx: width * 0.25,
          cy: height * 0.35,
          w: 120,
          h: 120,
          style: 'QFP',
          pins: []
        });
        chips.push({
          id: 2,
          name: 'DATA-MCU',
          cx: width * 0.75,
          cy: height * 0.65,
          w: 100,
          h: 130,
          style: 'DIP',
          pins: []
        });
        chips.push({
          id: 3,
          name: 'CLK-IO',
          cx: width * 0.8,
          cy: height * 0.22,
          w: 80,
          h: 80,
          style: 'DIP',
          pins: []
        });
      }

      // 2. Generate chip pins
      chips.forEach((chip) => {
        chip.pins = generatePins(chip.cx, chip.cy, chip.w, chip.h, chip.style);
      });

      // 3. Position Skill Pads (Vias)
      const desktopCoords = {
        'Flutter': { x: 0.1, y: 0.6 },
        'NodeJS': { x: 0.4, y: 0.8 },
        'MySQL': { x: 0.9, y: 0.45 },
        'Tailwind': { x: 0.48, y: 0.55 },
        'JavaScript': { x: 0.4, y: 0.15 },
        'HTML': { x: 0.58, y: 0.85 },
        'CSS': { x: 0.72, y: 0.85 },
        'Aiven MySQL': { x: 0.92, y: 0.62 },
        'Supabase': { x: 0.68, y: 0.18 },
        'Vercel': { x: 0.88, y: 0.8 },
        'Git': { x: 0.12, y: 0.18 }
      };

      const mobileCoords = {
        'Flutter': { x: 0.25, y: 0.22 },
        'NodeJS': { x: 0.25, y: 0.7 },
        'MySQL': { x: 0.75, y: 0.58 },
        'Tailwind': { x: 0.75, y: 0.3 },
        'JavaScript': { x: 0.5, y: 0.13 },
        'HTML': { x: 0.25, y: 0.85 },
        'CSS': { x: 0.5, y: 0.85 },
        'Aiven MySQL': { x: 0.75, y: 0.85 },
        'Supabase': { x: 0.75, y: 0.18 },
        'Vercel': { x: 0.75, y: 0.72 },
        'Git': { x: 0.25, y: 0.32 }
      };

      const coords = isMobile ? mobileCoords : desktopCoords;

      techSkills.forEach((skill, index) => {
        const c = coords[skill] || { x: 0.5, y: 0.5 };
        pads.push({
          id: index,
          x: c.x * width,
          y: c.y * height,
          label: skill,
          radius: 6,
          glowLevel: 0,
          isSkill: true
        });
      });

      // 4. Generate decorative via pads (populate empty board grid)
      const viaCount = isMobile ? 8 : 22;
      for (let i = 0; i < viaCount; i++) {
        const step = 40;
        const gridX = Math.floor((Math.random() * (width - 100) + 50) / step) * step;
        const gridY = Math.floor((Math.random() * (height - 100) + 50) / step) * step;

        // Ensure vias do not overlap chip bodies
        let overlaps = false;
        chips.forEach((chip) => {
          const buffer = 35;
          if (
            gridX > chip.cx - chip.w / 2 - buffer &&
            gridX < chip.cx + chip.w / 2 + buffer &&
            gridY > chip.cy - chip.h / 2 - buffer &&
            gridY < chip.cy + chip.h / 2 + buffer
          ) {
            overlaps = true;
          }
        });

        if (!overlaps) {
          pads.push({
            id: pads.length,
            x: gridX,
            y: gridY,
            label: '',
            radius: Math.random() * 1.5 + 1.5,
            glowLevel: 0,
            isSkill: false
          });
        }
      }

      // 5. Connect pads to chip pins
      const usedPins = new Set();

      pads.forEach((pad) => {
        let bestPin = null;
        let minDist = Infinity;
        let bestChip = null;

        chips.forEach((chip) => {
          chip.pins.forEach((pin, pinIdx) => {
            const pinKey = `${chip.id}-${pinIdx}`;
            if (usedPins.has(pinKey)) return;

            const dist = getDistance(pin.x, pin.y, pad.x, pad.y);
            if (dist < minDist) {
              minDist = dist;
              bestPin = pin;
              bestChip = chip;
            }
          });
        });

        if (bestPin) {
          const pinIdx = bestChip.pins.indexOf(bestPin);
          const pinKey = `${bestChip.id}-${pinIdx}`;
          usedPins.add(pinKey);

          const path = getOrthogonalPath(bestPin.x, bestPin.y, pad.x, pad.y, bestPin.side);

          let len = 0;
          for (let i = 0; i < path.length - 1; i++) {
            len += getDistance(path[i].x, path[i].y, path[i + 1].x, path[i + 1].y);
          }

          traces.push({
            path,
            length: len,
            glowLevel: 0,
            targetPadId: pad.id
          });
        }
      });

      // 6. Connect leftover pins to decorative vias to make routing look dense
      const unusedPinsList = [];
      chips.forEach((chip) => {
        chip.pins.forEach((pin, pinIdx) => {
          const pinKey = `${chip.id}-${pinIdx}`;
          if (!usedPins.has(pinKey)) {
            unusedPinsList.push({ pin, side: pin.side });
          }
        });
      });

      const decorativeVias = pads.filter((p) => !p.isSkill);
      const decConnections = Math.min(unusedPinsList.length, decorativeVias.length, isMobile ? 3 : 10);

      for (let i = 0; i < decConnections; i++) {
        const pinObj = unusedPinsList[i];
        const via = decorativeVias[i];
        const path = getOrthogonalPath(pinObj.pin.x, pinObj.pin.y, via.x, via.y, pinObj.side);

        let len = 0;
        for (let j = 0; j < path.length - 1; j++) {
          len += getDistance(path[j].x, path[j].y, path[j + 1].x, path[j + 1].y);
        }

        traces.push({
          path,
          length: len,
          glowLevel: 0,
          targetPadId: via.id
        });
      }
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

    // Initialize the board layout
    setupBoard();

    // Spawn automatic ambient pulses
    let frameCount = 0;

    // Mouse movement event handlers
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

      // Add circular sweep scan wave
      shockwaves.push({
        x: cx,
        y: cy,
        radius: 0,
        maxRadius: maxDim * 0.85,
        speed: 8
      });

      // Chain reaction: Schedule pulses when shockwave crosses trace starting pins
      traces.forEach((trace, index) => {
        const startPoint = trace.path[0];
        const dist = getDistance(cx, cy, startPoint.x, startPoint.y);
        if (dist < maxDim * 0.85) {
          const delay = Math.floor(dist / 8); // Synchronized with shockwave propagation
          scheduledPulses.push({
            traceIndex: index,
            delay,
            speed: Math.random() * 2 + 4.5 // Click triggered pulses are faster
          });
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('click', handleMouseClick);
    window.addEventListener('resize', setupBoard);

    // Main animation loop
    const animate = () => {
      frameCount++;
      const isDark = document.documentElement.classList.contains('dark');

      // Clear canvas with transparent clear to let CSS bg show
      ctx.clearRect(0, 0, width, height);

      // Color Theme definitions
      const gridColor = isDark ? 'rgba(6, 182, 212, 0.015)' : 'rgba(251, 146, 60, 0.02)';
      const traceBaseColor = isDark ? 'rgba(6, 182, 212, 0.07)' : 'rgba(251, 146, 60, 0.12)';
      const traceGlowColor = isDark ? 'rgba(34, 211, 238, ' : 'rgba(249, 115, 22, ';
      const chipBg = isDark ? '#0f172a' : '#f8fafc';
      const chipBorder = isDark ? '#1e293b' : '#cbd5e1';
      const chipTextColor = isDark ? 'rgba(14, 165, 233, 0.35)' : 'rgba(71, 85, 105, 0.4)';
      const pinColor = isDark ? '#64748b' : '#d97706';
      const padColor = isDark ? '#0ea5e9' : '#f97316';
      const padGlowColor = isDark ? 'rgba(34, 211, 238, ' : 'rgba(251, 146, 60, ';
      const textColor = isDark ? '#94a3b8' : '#64748b';
      const textActiveColor = isDark ? '#38bdf8' : '#ea580c';
      const hudColor = isDark ? 'rgba(34, 211, 238, ' : 'rgba(234, 88, 12, ';

      // 1. Draw subtle board background grid lines
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      const gridSize = 50;
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

      // 2. Spawn ambient pulses randomly
      if (frameCount % 75 === 0 && traces.length > 0) {
        const traceIndex = Math.floor(Math.random() * traces.length);
        pulses.push({
          traceIndex,
          distance: 0,
          speed: Math.random() * 1.5 + 2
        });
      }

      // 3. Process Scheduled pulses (cascade reactions)
      scheduledPulses = scheduledPulses.filter((sp) => {
        sp.delay--;
        if (sp.delay <= 0) {
          pulses.push({
            traceIndex: sp.traceIndex,
            distance: 0,
            speed: sp.speed
          });
          if (traces[sp.traceIndex]) {
            traces[sp.traceIndex].glowLevel = 1.0;
          }
          return false;
        }
        return true;
      });

      // 4. Update and Draw shockwaves (click wave scans)
      shockwaves = shockwaves.filter((wave) => {
        wave.radius += wave.speed;

        ctx.strokeStyle = `${traceGlowColor}${Math.max(0, 1 - wave.radius / wave.maxRadius) * 0.35})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Activate pads and traces crossed by wave
        pads.forEach((pad) => {
          const d = getDistance(wave.x, wave.y, pad.x, pad.y);
          if (Math.abs(d - wave.radius) < wave.speed) {
            pad.glowLevel = 1.0;
          }
        });

        return wave.radius < wave.maxRadius;
      });

      // 5. Update and Draw Trace Lines
      traces.forEach((trace) => {
        // Decay activation glow
        if (trace.glowLevel > 0) {
          trace.glowLevel -= 0.012;
        }

        // Draw static base trace
        ctx.beginPath();
        ctx.moveTo(trace.path[0].x, trace.path[0].y);
        for (let i = 1; i < trace.path.length; i++) {
          ctx.lineTo(trace.path[i].x, trace.path[i].y);
        }
        ctx.strokeStyle = traceBaseColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Draw active glowing trace path overlay
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

      // 6. Draw IC Chip packages
      chips.forEach((chip) => {
        const x = chip.cx - chip.w / 2;
        const y = chip.cy - chip.h / 2;

        // Draw Pins
        ctx.fillStyle = pinColor;
        chip.pins.forEach((pin) => {
          ctx.beginPath();
          if (pin.side === 'left') {
            ctx.rect(pin.x, pin.y - pinW / 2, pinLen, pinW);
          } else if (pin.side === 'right') {
            ctx.rect(pin.x - pinLen, pin.y - pinW / 2, pinLen, pinW);
          } else if (pin.side === 'top') {
            ctx.rect(pin.x - pinW / 2, pin.y, pinW, pinLen);
          } else if (pin.side === 'bottom') {
            ctx.rect(pin.x - pinW / 2, pin.y - pinLen, pinW, pinLen);
          }
          ctx.fill();
        });

        // Draw Chip Body
        ctx.beginPath();
        ctx.roundRect(x, y, chip.w, chip.h, 6);
        ctx.fillStyle = chipBg;
        ctx.strokeStyle = chipBorder;
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();

        // Subtle Chip Branding / Monospace Labels
        ctx.font = '7.5px monospace';
        ctx.fillStyle = chipTextColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(chip.name, chip.cx, chip.cy - 10);
        ctx.fillText('2606-A1', chip.cx, chip.cy + 2);
        ctx.fillText('FITRYA', chip.cx, chip.cy + 12);
      });

      // 7. Update and Draw Active Pulses
      pulses = pulses.filter((pulse) => {
        const trace = traces[pulse.traceIndex];
        if (!trace) return false;

        pulse.distance += pulse.speed;

        // Render pulse trailing tail circles
        const tailSegments = 6;
        for (let j = 0; j < tailSegments; j++) {
          const backDist = Math.max(0, pulse.distance - j * 7);
          const pos = getPointAtDistance(trace.path, backDist);
          const opacity = (1 - j / tailSegments) * 0.65;
          const r = (1 - j / 12) * 2.8;

          ctx.beginPath();
          ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? `rgba(6, 182, 212, ${opacity})` : `rgba(249, 115, 22, ${opacity})`;
          ctx.fill();
        }

        // Draw pulse head
        const headPos = getPointAtDistance(trace.path, pulse.distance);
        ctx.beginPath();
        ctx.arc(headPos.x, headPos.y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#ffffff' : '#ea580c';
        ctx.shadowColor = isDark ? '#22d3ee' : '#fb923c';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow blur immediately to preserve frame rate

        // On complete
        if (pulse.distance >= trace.length) {
          // Glow the destination pad
          const targetPad = pads.find((p) => p.id === trace.targetPadId);
          if (targetPad) {
            targetPad.glowLevel = 1.0;
          }
          // Highlight trace glow slightly
          trace.glowLevel = 0.8;
          return false;
        }
        return true;
      });

      // 8. Find closest pad for Mouse HUD Probe Lock
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

      // 9. Draw Pads (Solder joints) and Labels
      pads.forEach((pad) => {
        // Decay pad glow
        if (pad.glowLevel > 0) {
          pad.glowLevel -= 0.015;
        }

        const isMouseTarget = closestPad && closestPad.id === pad.id;
        const totalGlow = Math.max(pad.glowLevel, isMouseTarget ? 0.8 : 0);

        // Draw Solder Pad outer ring
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, pad.radius + 3.5, 0, Math.PI * 2);
        ctx.strokeStyle = `${padGlowColor}${0.1 + totalGlow * 0.3})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw Solder Pad inner core
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, pad.radius, 0, Math.PI * 2);
        ctx.fillStyle = padColor;
        ctx.fill();

        // Draw inner contact point hole
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, pad.radius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#000000' : '#ffffff';
        ctx.fill();

        // Draw glow aura if active
        if (totalGlow > 0.05) {
          ctx.beginPath();
          ctx.arc(pad.x, pad.y, pad.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `${padGlowColor}${totalGlow * 0.12})`;
          ctx.fill();
        }

        // Draw Skill Label text (if it is a skill pad)
        if (pad.isSkill) {
          ctx.font = '10.5px Outfit, Inter, sans-serif';
          ctx.fillStyle = isMouseTarget ? textActiveColor : textColor;
          ctx.textAlign = 'center';
          ctx.fillText(pad.label, pad.x, pad.y - (pad.radius + 8));
        }
      });

      // 10. Draw Virtual Diagnostic Probe HUD Overlay
      if (closestPad && mouse.x !== null && mouse.y !== null) {
        // Draw dotted connection line
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(mouse.x, mouse.y);
        ctx.lineTo(closestPad.x, closestPad.y);
        ctx.strokeStyle = `${hudColor}0.3)`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw HUD Target Lock circle
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.arc(closestPad.x, closestPad.y, closestPad.radius + 7, 0, Math.PI * 2);
        ctx.strokeStyle = `${hudColor}0.5)`;
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw target tick marks
        ctx.strokeStyle = `${hudColor}0.7)`;
        ctx.lineWidth = 1;
        const tickR = closestPad.radius + 11;
        const tickLen = 3.5;
        
        ctx.beginPath();
        // Top tick
        ctx.moveTo(closestPad.x, closestPad.y - tickR);
        ctx.lineTo(closestPad.x, closestPad.y - tickR + tickLen);
        // Bottom tick
        ctx.moveTo(closestPad.x, closestPad.y + tickR);
        ctx.lineTo(closestPad.x, closestPad.y + tickR - tickLen);
        // Left tick
        ctx.moveTo(closestPad.x - tickR, closestPad.y);
        ctx.lineTo(closestPad.x - tickR + tickLen, closestPad.y);
        // Right tick
        ctx.moveTo(closestPad.x + tickR, closestPad.y);
        ctx.lineTo(closestPad.x + tickR - tickLen, closestPad.y);
        ctx.stroke();

        // Draw coordinates & lock status box next to cursor
        const textX = mouse.x + 16;
        const textY = mouse.y + 14;
        ctx.font = '8.5px monospace';
        ctx.fillStyle = `${hudColor}0.7)`;
        ctx.textAlign = 'left';
        ctx.fillText(`PROBE LOCK: ${closestPad.label || 'VIA_' + closestPad.id}`, textX, textY);
        ctx.fillText(`COORD X:${Math.round(closestPad.x)} Y:${Math.round(closestPad.y)}`, textX, textY + 11);
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
