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

    // Tech names to display on floating nodes
    const techSkills = [
      'React', 'NodeJS', 'MySQL', 'Tailwind', 'JavaScript',
      'HTML', 'CSS', 'Express', 'Vite', 'Cloudinary', 'Netlify', 'Git'
    ];

    // Mouse configuration
    const mouse = {
      x: null,
      y: null,
      radius: 120, // attraction/interaction radius
    };

    // Click wave (shockwave) configuration
    let shockwaves = [];

    // Node class definition
    class Node {
      constructor(label) {
        this.label = label;
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.radius = Math.random() * 4 + 4; // Node dot size
        this.baseX = this.x;
        this.baseY = this.y;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.density = Math.random() * 15 + 10; // Mass/resistance
      }

      update(isDark) {
        // Standard continuous float
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off canvas edges
        if (this.x < 0 || this.x > width) this.vx = -this.vx;
        if (this.y < 0 || this.y > height) this.vy = -this.vy;

        // Mouse attraction (gravity toward cursor)
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const distance = Math.hypot(dx, dy);

          if (distance < mouse.radius) {
            // Pull nodes gently toward cursor
            const force = (mouse.radius - distance) / mouse.radius;
            const directionX = dx / distance;
            const directionY = dy / distance;
            
            // Move nodes toward cursor based on distance
            this.x += directionX * force * 1.8;
            this.y += directionY * force * 1.8;
          }
        }

        // Shockwave repulsion (push away from clicks)
        shockwaves.forEach((wave) => {
          const dx = this.x - wave.x;
          const dy = this.y - wave.y;
          const distance = Math.hypot(dx, dy);

          if (distance < wave.currentRadius) {
            // Push force diminishes at the wave edge
            const force = (wave.maxRadius - distance) / wave.maxRadius;
            if (force > 0) {
              const directionX = dx / distance;
              const directionY = dy / distance;
              const pushStrength = force * wave.forceStrength;
              
              this.x += directionX * pushStrength;
              this.y += directionY * pushStrength;
            }
          }
        });
      }

      draw(isDark) {
        // Choose colors depending on theme
        // Dark Mode: Sky Blue / Cyan Glow
        // Light Mode: Sunset Orange / Soft Gold
        const nodeColor = isDark ? '#0ea5e9' : '#ff7e5f';
        const textColor = isDark ? '#7dd3fc' : '#7c675c';

        // Draw node center point
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        // Draw glowing aura
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? 'rgba(6, 182, 212, 0.12)' : 'rgba(254, 180, 123, 0.15)';
        ctx.fill();

        // Draw tech text label
        ctx.font = '11px Outfit, Inter, sans-serif';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText(this.label, this.x, this.y - 12);
      }
    }

    // Initialize list of nodes
    const nodes = techSkills.map((tech) => new Node(tech));

    // Spawn additional decorative blank nodes to populate the grid
    const decorativeCount = Math.floor((width * height) / 20000);
    for (let i = 0; i < decorativeCount; i++) {
      nodes.push(new Node(''));
    }

    // Drawing connections between nearby nodes
    const drawConnections = (isDark) => {
      const maxDistance = 180;
      const lineColor = isDark ? 'rgba(14, 165, 233, 0.08)' : 'rgba(254, 180, 123, 0.15)';
      
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.hypot(dx, dy);

          if (distance < maxDistance) {
            // Draw connection line
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            
            // Adjust line opacity by distance
            const alpha = (1 - distance / maxDistance) * (isDark ? 0.18 : 0.28);
            ctx.strokeStyle = isDark 
              ? `rgba(6, 182, 212, ${alpha})` 
              : `rgba(255, 126, 95, ${alpha})`;
              
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    };

    // Draw shockwave expanding circles
    const drawShockwaves = (isDark) => {
      shockwaves.forEach((wave, index) => {
        wave.currentRadius += wave.speed;
        
        if (wave.currentRadius >= wave.maxRadius) {
          // Remove expired shockwaves
          shockwaves.splice(index, 1);
          return;
        }

        // Draw shockwave boundary ring
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.currentRadius, 0, Math.PI * 2);
        
        const opacity = (1 - wave.currentRadius / wave.maxRadius) * 0.35;
        ctx.strokeStyle = isDark 
          ? `rgba(6, 182, 212, ${opacity})` 
          : `rgba(255, 78, 80, ${opacity})`;
          
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    };

    // Mouse movement event handlers
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    const handleMouseClick = (e) => {
      // Create new shockwave at click coordinate
      shockwaves.push({
        x: e.clientX,
        y: e.clientY,
        currentRadius: 0,
        maxRadius: 220,
        speed: 5,
        forceStrength: 15, // how far items are pushed
      });
    };

    // Event listeners registration
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('click', handleMouseClick);

    // Resizing function
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Main animation loop
    const animate = () => {
      // Detect isDark state dynamically from document element
      const isDark = document.documentElement.classList.contains('dark');
      
      // Transparent clear to allow document background showing
      ctx.clearRect(0, 0, width, height);

      // Render line grid
      drawConnections(isDark);

      // Update and render nodes
      nodes.forEach((node) => {
        node.update(isDark);
        node.draw(isDark);
      });

      // Update and draw shockwaves
      drawShockwaves(isDark);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup listeners and animation frame on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('click', handleMouseClick);
      window.removeEventListener('resize', handleResize);
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
