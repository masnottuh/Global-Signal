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
        initSignalChart();
        initCipherEffect();
        initContactForm();
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

    function initSignalChart() {
        if (!signalChart || typeof Chart === 'undefined') return;

        // Signal type button handlers
        signalTypeButtons.forEach(function(btn) {
            btn.addEventListener('click', function() {
                const signalType = this.dataset.signal;
                
                // Update active button
                signalTypeButtons.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                this.classList.add('active');
                this.setAttribute('aria-pressed', 'true');

                // Update chart
                currentSignalType = signalType;
                updateChart(signalType);
            });
        });

        // Refresh button handler
        if (chartRefresh) {
            chartRefresh.addEventListener('click', function() {
                updateChart(currentSignalType);
            });
        }

        // Initial chart render
        updateChart('ema');
    }

    function generateSignalData(type, length = 50) {
        const data = [];
        let value = 100;

        for (let i = 0; i < length; i++) {
            value += (Math.random() - 0.5) * 5;
            value = Math.max(50, Math.min(150, value));
            data.push({
                x: i,
                y: value
            });
        }

        // Calculate signal based on type
        let signalData = [];
        
        switch (type) {
            case 'ema':
                signalData = calculateEMA(data.map(d => d.y), 20);
                break;
            case 'volatility':
                signalData = calculateVolatility(data.map(d => d.y), 20);
                break;
            case 'momentum':
                signalData = calculateMomentum(data.map(d => d.y), 14);
                break;
            case 'rsi':
                signalData = calculateRSI(data.map(d => d.y), 14);
                break;
        }

        return {
            price: data.map(d => d.y),
            signal: signalData,
            labels: data.map((_, i) => i + 1)
        };
    }

    function calculateEMA(prices, period) {
        const alpha = 2 / (period + 1);
        const ema = [prices[0]];

        for (let i = 1; i < prices.length; i++) {
            ema.push(alpha * prices[i] + (1 - alpha) * ema[i - 1]);
        }

        return ema;
    }

    function calculateVolatility(prices, period) {
        const volatility = [];
        
        for (let i = 0; i < prices.length; i++) {
            if (i < period) {
                volatility.push(null);
            } else {
                const slice = prices.slice(i - period, i);
                const mean = slice.reduce((a, b) => a + b) / period;
                const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
                volatility.push(Math.sqrt(variance) * Math.sqrt(252) / mean * 100);
            }
        }

        return volatility;
    }

    function calculateMomentum(prices, period) {
        const momentum = [];

        for (let i = 0; i < prices.length; i++) {
            if (i < period) {
                momentum.push(null);
            } else {
                momentum.push(((prices[i] - prices[i - period]) / prices[i - period]) * 100);
            }
        }

        return momentum;
    }

    function calculateRSI(prices, period) {
        const rsi = [];
        const gains = [];
        const losses = [];

        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }

        for (let i = 0; i < prices.length; i++) {
            if (i < period) {
                rsi.push(null);
            } else {
                const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b) / period;
                const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b) / period;
                const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
                rsi.push(100 - (100 / (1 + rs)));
            }
        }

        return rsi;
    }

    function updateChart(type) {
        const data = generateSignalData(type);
        const chartConfig = getChartConfig(type, data);

        // Update chart title and formula
        updateChartInfo(type);

        // Destroy existing chart
        if (chartInstance) {
            chartInstance.destroy();
        }

        // Create new chart
        chartInstance = new Chart(signalChart, chartConfig);
    }

    function getChartConfig(type, data) {
        const signalColors = {
            ema: CONFIG.colors.neonGreen,
            volatility: CONFIG.colors.copper,
            momentum: CONFIG.colors.champagne,
            rsi: CONFIG.colors.lavender
        };

        const signalColor = signalColors[type];
        const showPrice = type === 'ema';

        const datasets = [];

        if (showPrice) {
            datasets.push({
                label: 'Price',
                data: data.price,
                borderColor: CONFIG.colors.textMuted,
                backgroundColor: 'transparent',
                borderWidth: 1,
                pointRadius: 0,
                tension: 0.4
            });
        }

        datasets.push({
            label: type.toUpperCase(),
            data: data.signal,
            borderColor: signalColor,
            backgroundColor: signalColor.replace(')', ', 0.1)').replace('rgb', 'rgba'),
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4,
            fill: type !== 'ema'
        });

        return {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: CONFIG.colors.champagne,
                            font: {
                                family: "'JetBrains Mono', monospace",
                                size: 11
                            },
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'line'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(10, 15, 14, 0.95)',
                        titleColor: CONFIG.colors.champagne,
                        bodyColor: CONFIG.colors.neonGreenDim,
                        borderColor: CONFIG.colors.neonGreenDim,
                        borderWidth: 1,
                        padding: 12,
                        titleFont: {
                            family: "'JetBrains Mono', monospace",
                            size: 12
                        },
                        bodyFont: {
                            family: "'JetBrains Mono', monospace",
                            size: 11
                        },
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                if (value === null) return '';
                                return `${context.dataset.label}: ${value.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            color: 'rgba(234, 237, 176, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: CONFIG.colors.textMuted,
                            font: {
                                family: "'JetBrains Mono', monospace",
                                size: 10
                            },
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        display: true,
                        grid: {
                            color: 'rgba(234, 237, 176, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: CONFIG.colors.textMuted,
                            font: {
                                family: "'JetBrains Mono', monospace",
                                size: 10
                            }
                        }
                    }
                },
                animation: {
                    duration: 800,
                    easing: 'easeOutQuart'
                }
            }
        };
    }

    function updateChartInfo(type) {
        const info = {
            ema: {
                title: 'Exponential Moving Average (EMA)',
                formula: '<code>EMA<sub>t</sub> = α × Price<sub>t</sub> + (1 - α) × EMA<sub>t-1</sub></code><span class="formula-note">where α = 2 / (period + 1)</span>'
            },
            volatility: {
                title: 'Historical Volatility',
                formula: '<code>σ = √(Σ(r<sub>i</sub> - μ)² / n) × √252</code><span class="formula-note">annualized standard deviation of log returns</span>'
            },
            momentum: {
                title: 'Momentum (Rate of Change)',
                formula: '<code>ROC = ((Price<sub>t</sub> - Price<sub>t-n</sub>) / Price<sub>t-n</sub>) × 100</code><span class="formula-note">percentage change over n periods</span>'
            },
            rsi: {
                title: 'Relative Strength Index (RSI)',
                formula: '<code>RSI = 100 - (100 / (1 + RS))</code><span class="formula-note">where RS = Average Gain / Average Loss</span>'
            }
        };

        if (chartTitle) {
            chartTitle.textContent = info[type].title;
        }

        if (chartFormula) {
            chartFormula.innerHTML = info[type].formula;
        }
    }

    // ==================== CONTACT FORM ====================

    function initContactForm() {
        if (!contactForm) return;

        const submitBtn = document.getElementById('submitBtn');
        const formMessage = document.getElementById('formMessage');

        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Clear previous errors
            clearFormErrors();

            // Validate form
            if (!validateForm()) {
                return;
            }

            // Show loading state
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;

            // Get form data
            const formData = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                message: document.getElementById('message').value.trim()
            };

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok) {
                    showFormMessage('success', 'Message sent successfully! We\'ll be in touch.');
                    contactForm.reset();
                } else {
                    showFormMessage('error', result.message || 'Something went wrong. Please try again.');
                }
            } catch (error) {
                showFormMessage('error', 'Network error. Please check your connection and try again.');
            } finally {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        });

        function validateForm() {
            let isValid = true;

            // Name validation
            const name = document.getElementById('name');
            if (!name.value.trim()) {
                showError('name', 'Name is required');
                isValid = false;
            } else if (name.value.trim().length < 2) {
                showError('name', 'Name must be at least 2 characters');
                isValid = false;
            }

            // Email validation
            const email = document.getElementById('email');
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email.value.trim()) {
                showError('email', 'Email is required');
                isValid = false;
            } else if (!emailRegex.test(email.value.trim())) {
                showError('email', 'Please enter a valid email address');
                isValid = false;
            }

            // Message validation
            const message = document.getElementById('message');
            if (!message.value.trim()) {
                showError('message', 'Message is required');
                isValid = false;
            } else if (message.value.trim().length < 10) {
                showError('message', 'Message must be at least 10 characters');
                isValid = false;
            }

            return isValid;
        }

        function showError(fieldId, message) {
            const field = document.getElementById(fieldId);
            const errorEl = document.getElementById(fieldId + 'Error');
            
            field.parentElement.classList.add('error');
            errorEl.textContent = message;
        }

        function clearFormErrors() {
            document.querySelectorAll('.form-group').forEach(function(group) {
                group.classList.remove('error');
            });
            document.querySelectorAll('.error-message').forEach(function(error) {
                error.textContent = '';
            });
            if (formMessage) {
                formMessage.className = 'form-message';
                formMessage.textContent = '';
            }
        }

        function showFormMessage(type, message) {
            if (formMessage) {
                formMessage.className = 'form-message ' + type;
                formMessage.textContent = message;
            }
        }
    }

    // ==================== UTILITIES ====================

    function updateCurrentYear() {
        if (currentYearSpan) {
            currentYearSpan.textContent = new Date().getFullYear();
        }
    }

})();
