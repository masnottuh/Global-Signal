/**
 * Global Signal - Enhanced Frontend JavaScript
 * 
 * Cypherpunk aesthetic with subdued, elegant interactions
 * 
 * Features:
 * - Cryptographic-inspired background animation
 * - Smooth scroll reveal animations
 * - Interactive signal charts
 * - Terminal-style text effects
 * - Form validation with feedback
 */

(function() {
    'use strict';

    // ==================== DOM ELEMENTS ====================
    
    const sideNav = document.getElementById('sideNav');
    const sideNavDots = document.querySelectorAll('.side-nav-dot');
    const signalCanvas = document.getElementById('signalCanvas');
    const signalChart = document.getElementById('signalChart');
    const signalTypeButtons = document.querySelectorAll('.signal-type-btn');
    const chartTitle = document.getElementById('chartTitle');
    const chartFormula = document.getElementById('chartFormula');
    const chartRefresh = document.getElementById('chartRefresh');
    const contactForm = document.getElementById('contactForm');
    const currentYearSpan = document.getElementById('currentYear');
    const cipherText = document.getElementById('cipherText');

    // ==================== CONFIGURATION ====================
    
    const CONFIG = {
        colors: {
            neonGreen: '#CCFF00',
            neonGreenDim: 'rgba(204, 255, 0, 0.7)',
            champagne: '#EAEDB0',
            copper: '#FD7735',
            lavender: '#B2A1FD',
            void: '#0a0f0e',
            textMuted: '#6b6e52'
        },
        animation: {
            waveCount: 7,
            particleCount: 50
        }
    };

    // ==================== INITIALIZATION ====================

    document.addEventListener('DOMContentLoaded', function() {
        initSideNavigation();
        initScrollEffects();
        initScrollReveal();
        initSignalCanvas();
        initCipherEffect();
        updateCurrentYear();
    });

    // ==================== SIDE NAVIGATION ====================

    function initSideNavigation() {
        // Smooth scroll on dot click
        sideNavDots.forEach(function(dot) {
            dot.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    targetSection.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Update active dot on scroll
        updateActiveDot();
    }

    function updateActiveDot() {
        const sections = document.querySelectorAll('section[id]');
        
        window.addEventListener('scroll', function() {
            let current = '';
            const scrollPos = window.scrollY + window.innerHeight / 3;

            sections.forEach(function(section) {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                
                if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                    current = section.getAttribute('id');
                }
            });

            sideNavDots.forEach(function(dot) {
                dot.classList.remove('active');
                if (dot.getAttribute('data-section') === current) {
                    dot.classList.add('active');
                }
            });
        });
    }

    // ==================== SCROLL EFFECTS ====================

    function initScrollEffects() {
        // Any additional scroll effects can go here
    }

    // ==================== SCROLL REVEAL ====================

    function initScrollReveal() {
        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -50px 0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // Observe elements for animation
        const animateElements = document.querySelectorAll(
            '.feature-card, .signal-card, .pricing-card, .benefit'
        );
        
        animateElements.forEach(function(el) {
            observer.observe(el);
        });
    }

    // ==================== CIPHER TEXT EFFECT ====================

    function initCipherEffect() {
        if (!cipherText) return;

        const originalText = cipherText.textContent;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';
        let iterations = 0;

        function scramble() {
            cipherText.textContent = originalText
                .split('')
                .map((char, index) => {
                    if (char === ' ' || char === '/') return char;
                    if (index < iterations) return originalText[index];
                    return chars[Math.floor(Math.random() * chars.length)];
                })
                .join('');

            if (iterations < originalText.length) {
                iterations += 1;
                setTimeout(scramble, 30);
            }
        }

        // Start effect after a short delay
        setTimeout(scramble, 1000);
    }

    // ==================== SIGNAL CANVAS ANIMATION ====================

    function initSignalCanvas() {
        if (!signalCanvas) return;

        const ctx = signalCanvas.getContext('2d');
        let animationId;
        let waves = [];
        let particles = [];

        function resize() {
            signalCanvas.width = signalCanvas.offsetWidth;
            signalCanvas.height = signalCanvas.offsetHeight;
            createWaves();
            createParticles();
        }

        function createWaves() {
            waves = [];
            const numWaves = CONFIG.animation.waveCount;

            for (let i = 0; i < numWaves; i++) {
                waves.push({
                    amplitude: 15 + Math.random() * 35,
                    frequency: 0.003 + Math.random() * 0.008,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.015 + Math.random() * 0.025,
                    y: signalCanvas.height * (0.2 + (i / numWaves) * 0.6),
                    opacity: 0.06 + Math.random() * 0.12
                });
            }
        }

        function createParticles() {
            particles = [];
            const numParticles = CONFIG.animation.particleCount;

            for (let i = 0; i < numParticles; i++) {
                particles.push({
                    x: Math.random() * signalCanvas.width,
                    y: Math.random() * signalCanvas.height,
                    size: 1 + Math.random() * 2,
                    speedX: (Math.random() - 0.5) * 0.3,
                    speedY: (Math.random() - 0.5) * 0.3,
                    opacity: 0.1 + Math.random() * 0.3,
                    pulse: Math.random() * Math.PI * 2
                });
            }
        }

        function drawWave(wave, time) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(204, 255, 0, ${wave.opacity})`;
            ctx.lineWidth = 1;

            for (let x = 0; x < signalCanvas.width; x++) {
                const y = wave.y + 
                    Math.sin(x * wave.frequency + wave.phase + time * wave.speed) * wave.amplitude +
                    Math.sin(x * wave.frequency * 2 + time * wave.speed * 0.5) * (wave.amplitude * 0.3);
                
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.stroke();
        }

        function drawParticle(particle, time) {
            const pulseOpacity = particle.opacity * (0.5 + 0.5 * Math.sin(time * 0.002 + particle.pulse));
            
            ctx.beginPath();
            ctx.fillStyle = `rgba(204, 255, 0, ${pulseOpacity})`;
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }

        function updateParticles() {
            particles.forEach(function(particle) {
                particle.x += particle.speedX;
                particle.y += particle.speedY;

                // Wrap around edges
                if (particle.x < 0) particle.x = signalCanvas.width;
                if (particle.x > signalCanvas.width) particle.x = 0;
                if (particle.y < 0) particle.y = signalCanvas.height;
                if (particle.y > signalCanvas.height) particle.y = 0;
            });
        }

        function animate() {
            const time = Date.now();
            
            ctx.clearRect(0, 0, signalCanvas.width, signalCanvas.height);

            // Draw waves
            waves.forEach(function(wave) {
                drawWave(wave, time);
            });

            // Draw particles
            particles.forEach(function(particle) {
                drawParticle(particle, time);
            });

            updateParticles();

            animationId = requestAnimationFrame(animate);
        }

        // Initialize
        resize();
        animate();

        // Handle resize with debounce
        let resizeTimeout;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(resize, 250);
        });

        // Cleanup on page unload
        window.addEventListener('beforeunload', function() {
            cancelAnimationFrame(animationId);
        });
    }

    // ==================== SIGNAL CHART ====================

    let chartInstance = null;
    let currentSignalType = 'ema';

    function updateCurrentYear() {
        if (currentYearSpan) {
            currentYearSpan.textContent = new Date().getFullYear();
        }
    }

})();
