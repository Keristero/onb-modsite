'use strict';

const CONFIG = {
    particles: {
        maxCount: 100000, // Maximum number of particles in the system
        speedFactor: 1, // Base speed multiplier for particle velocity
        colorMax: 255, // Maximum RGB color value for particles (brightness)
        colorMin: 200, // Minimum RGB color value for particles (brightness)
        opacityMin: 0.2, // Minimum particle opacity (0-1)
        opacityMax: 0.5, // Maximum particle opacity (0-1)
        spawnRate: 50, // Time between particle spawns (milliseconds)
        spawnBaseCount: 2, // Base number of particles to spawn per interval
        spawnRandomCount: 2 // Random additional particles to spawn (0 to this value)
    },
    
    physics: {
        deltaTime: 0.15, // Physics update timestep
        waveFrequency: 0.002, // Frequency of wave motion (affects horizontal oscillation)
        waveAmplitude: 12, // Amplitude of wave motion (horizontal oscillation distance)
        windStrength: 0.3, // Base strength of wind and cursor influence
        windMultiplier: 2 // Multiplier for global wind effect (applied on top of windStrength)
    },
    
    settling: {
        checkChancePerFrame: 0.5, // Chance to check a div per frame (proportional to div count)
        baseChance: 0.5, // Base chance to settle when in the settling zone
        selectedMultiplier: 1.5, // Multiplier for settling on selected elements
        verticalThreshold: 20, // Vertical space above element boundary where particles can settle (scaled pixels)
        fadeDuration: 30000 // Duration for settled particles to fade out (milliseconds)
    },
    
    wind: {
        currentDirection: 0, // Current wind direction value (-2 to 2)
        targetDirection: 0, // Target wind direction to smoothly transition to (-2 to 2)
        transitionSpeed: 0.001, // Speed of wind direction transitions
        changeDuration: 10000, // Time between wind direction changes (milliseconds)
        maxChangePerTransition: 0.5 // Maximum change in direction per transition
    },
    
    visual: {
        pixelScale: 4, // Canvas scaling factor (4x downscale for performance)
        backgroundColor: { r: 17, g: 17, b: 17 }, // Background color RGB values
        rainbowCycleLength: 2000, // Rainbow effect cycle length in pixels
        rainbowSaturation: 0.8, // Rainbow color saturation (0-1)
        rainbowLightness: 0.9 // Rainbow color lightness (0-1)
    },
    
    performance: {
        targetFrameTime: 4, // Target frame time in ms (16ms = 60fps)
        adjustmentSpeed: 1 // How quickly spawn multiplier adjusts (0-1)
    }
};

const currentMonth = new Date().getMonth();
if (currentMonth !== 11) {
    console.log('Snow effect disabled - not December');
} else {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSnowEffect);
    } else {
        initSnowEffect();
    }
}

function initSnowEffect() {
    console.log('Initializing December snow effect');
    
    let canvasWidth = 0;
    let canvasHeight = 0;
    let documentHeight = 0;
    
    let animationFrame = null;
    let settleElements = [];
    
    let particleSpawnTimer = 0;
    let windChangeTimer = 0;
    
    let spawnRateMultiplier = 1.0;
    let lastLogTime = 0;
    let frameTimeAccumulator = 0;
    let frameCount = 0;
    
    let modsObserver = null;
    let serversObserver = null;
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: false, alpha: true });
    
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1000';
    canvas.style.imageRendering = 'pixelated';
    
    document.body.appendChild(canvas);
    
    let imageData = null;
    let imageDataWidth = 0;
    let pixelData = null;
    
    const border = { left: 0, top: 1, right: canvasWidth, bottom: canvasHeight };
    
    const particlePropertiesCount = 10;
    let particleArrayLength = 0;
    let particleArray = null;
    let particleSpeedFactorSquared = CONFIG.particles.speedFactor * CONFIG.particles.speedFactor;
    
    let sinTableLength = 0;
    let sinTable = null;
    
    function onResize() {
        restart();
    }
    
    function querySettleElements() {
        settleElements = Array.from(document.querySelectorAll('.mod, .server'))
            .filter(el => {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return style.display !== 'none' && rect.width > 0 && rect.height > 0;
            })
            .map(el => {
                const rect = el.getBoundingClientRect();
                return {
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX,
                    right: rect.right + window.scrollX,
                    bottom: rect.bottom + window.scrollY,
                    centerX: (rect.left + rect.right) / 2 + window.scrollX,
                    centerY: (rect.top + rect.bottom) / 2 + window.scrollY,
                    isSelected: el.classList.contains('selected')
                };
            });
    }
    
    function setupContentObservers() {
        const observerConfig = { 
            childList: true, 
            subtree: true, 
            attributes: true, 
            attributeFilter: ['style', 'class']
        };
        
        const onMutation = () => querySettleElements();
        
        const modsContainer = document.querySelector('#mods');
        if (modsContainer && !modsObserver) {
            modsObserver = new MutationObserver(onMutation);
            modsObserver.observe(modsContainer, observerConfig);
        }
        
        const serversContainer = document.querySelector('#servers');
        if (serversContainer && !serversObserver) {
            serversObserver = new MutationObserver(onMutation);
            serversObserver.observe(serversContainer, observerConfig);
        }
    }
    
    function restart() {
        canvasWidth = window.innerWidth / CONFIG.visual.pixelScale;
        canvasHeight = window.innerHeight / CONFIG.visual.pixelScale;
        documentHeight = document.body.scrollHeight / CONFIG.visual.pixelScale;
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
        imageDataWidth = imageData.width;
        pixelData = imageData.data;
        
        border.right = canvasWidth;
        border.bottom = canvasHeight;
        
        querySettleElements();
        setupContentObservers();
        initializeParticles();
        initializeSinTable();
        
        if (animationFrame !== null) {
            cancelAnimationFrame(animationFrame);
        }
        
        render();
    }
    
    function initializeParticles() {
        particleArrayLength = CONFIG.particles.maxCount * particlePropertiesCount;
        particleArray = new Float32Array(particleArrayLength);
        
        for (let i = 0, l = particleArrayLength; i < l; i += particlePropertiesCount) {
            particleArray[i + 1] = -9999;
        }
    }
    
    function spawnParticle() {
        for (let i = 0, l = particleArrayLength; i < l; i += particlePropertiesCount) {
            const y = particleArray[i + 1];
            const settled = particleArray[i + 8];
            const fadeTimer = particleArray[i + 9];
            
            if (y < -1000 || (settled === 1 && fadeTimer > 10000)) {
                const rgb = Math.floor(Math.random() * (CONFIG.particles.colorMax - CONFIG.particles.colorMin)) + CONFIG.particles.colorMin;
                const speed = (rgb / 255) * CONFIG.particles.speedFactor;
                const startTime = Math.random();
                
                const x = Math.round(Math.random() * canvasWidth);
                const newY = -particleSpeedFactorSquared;
                const vy = speed;
                const r = rgb;
                const g = rgb;
                const b = rgb;
                const opacity = CONFIG.particles.opacityMin + Math.random() * (CONFIG.particles.opacityMax - CONFIG.particles.opacityMin);
                const newSettled = 0;
                const newFadeTimer = 0;
                
                particleArray[i    ] = x;
                particleArray[i + 1] = newY;
                particleArray[i + 2] = vy;
                particleArray[i + 3] = r;
                particleArray[i + 4] = g;
                particleArray[i + 5] = b;
                particleArray[i + 6] = startTime;
                particleArray[i + 7] = opacity;
                particleArray[i + 8] = newSettled;
                particleArray[i + 9] = newFadeTimer;
                break;
            }
        }
    }
    
    function initializeSinTable() {
        sinTableLength = Math.ceil((2 * Math.PI) / CONFIG.physics.waveFrequency);
        sinTable = new Float32Array(sinTableLength);
        
        for (let i = 0; i < sinTableLength; i++) {
            const time = i * CONFIG.physics.waveFrequency;
            sinTable[i] = Math.sin(time) * CONFIG.physics.waveAmplitude;
        }
    }
    
    function clearImageData() {
        for (let i = 0; i < pixelData.length; i += 4) {
            pixelData[i    ] = 0;
            pixelData[i + 1] = 0;
            pixelData[i + 2] = 0;
            pixelData[i + 3] = 0;
        }
    }
    
    function updateWindDirection() {
        windChangeTimer += 16;
        
        if (windChangeTimer >= CONFIG.wind.changeDuration) {
            const change = (Math.random() * CONFIG.wind.maxChangePerTransition * 2) - CONFIG.wind.maxChangePerTransition;
            CONFIG.wind.targetDirection = Math.max(-2, Math.min(2, CONFIG.wind.currentDirection + change));
            windChangeTimer = 0;
        }
        
        const windDiff = CONFIG.wind.targetDirection - CONFIG.wind.currentDirection;
        CONFIG.wind.currentDirection += windDiff * CONFIG.wind.transitionSpeed * 16;
    }
    
    function spawnParticles() {
        particleSpawnTimer += 16;
        
        if (particleSpawnTimer >= CONFIG.particles.spawnRate) {
            const baseCount = Math.round(CONFIG.particles.spawnBaseCount * spawnRateMultiplier);
            const particlesToSpawn = baseCount + 
                Math.floor(Math.random() * (CONFIG.particles.spawnRandomCount + 1));
            
            for (let j = 0; j < particlesToSpawn; j++) {
                spawnParticle();
            }
            particleSpawnTimer = 0;
        }
    }
    
    function checkParticleSettling(x, y, settled) {
        if (settleElements.length === 0 || settled === 1) {
            return null;
        }
        
        const checkChance = Math.min(1.0, settleElements.length / 200);
        
        if (Math.random() < checkChance) {
            const divIndex = Math.floor(Math.random() * settleElements.length);
            const el = settleElements[divIndex];
            
            const elTop = el.top / CONFIG.visual.pixelScale;
            const elLeft = el.left / CONFIG.visual.pixelScale;
            const elRight = el.right / CONFIG.visual.pixelScale;
            
            const settleZoneTop = elTop - CONFIG.settling.verticalThreshold;
            if (y >= settleZoneTop && y <= elTop && x >= elLeft && x <= elRight) {
                const chance = el.isSelected 
                    ? CONFIG.settling.baseChance * CONFIG.settling.selectedMultiplier 
                    : CONFIG.settling.baseChance;
                
                if (Math.random() < chance) {
                    return { y: elTop, settled: 1 };
                }
            }
        }
        
        return null;
    }
    
    function hslToRgb(h, s, l) {
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        
        let r, g, b;
        if (h < 60) {
            r = c; g = x; b = 0;
        } else if (h < 120) {
            r = x; g = c; b = 0;
        } else if (h < 180) {
            r = 0; g = c; b = x;
        } else if (h < 240) {
            r = 0; g = x; b = c;
        } else if (h < 300) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }
        
        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)
        ];
    }
    function draw() {
        const left = border.left;
        const right = border.right;
        const top = border.top;
        const bottom = border.bottom;
        
        spawnParticles();
        updateWindDirection();
        
        const globalWind = CONFIG.wind.currentDirection;
        
        const scrollY = window.scrollY / CONFIG.visual.pixelScale;
        const viewportTop = scrollY;
        const viewportBottom = scrollY + canvasHeight;
        for (let i = 0, l = particleArrayLength; i < l; i += particlePropertiesCount) {
            let x = particleArray[i    ];
            let y = particleArray[i + 1];
            
            const vy = particleArray[i + 2];
            const r = particleArray[i + 3];
            const g = particleArray[i + 4];
            const b = particleArray[i + 5];
            const startTime = particleArray[i + 6];
            let opacity = particleArray[i + 7];
            let settled = particleArray[i + 8];
            let fadeTimer = particleArray[i + 9];
            
            if (settled === 1) {
                fadeTimer += 16;
                opacity = Math.max(0, 1 - (fadeTimer / CONFIG.settling.fadeDuration));
                
                if (opacity <= 0) {
                    y = -9999;
                    opacity = 0;
                }
                
                particleArray[i + 7] = opacity;
                particleArray[i + 8] = settled;
                particleArray[i + 9] = fadeTimer;
            } else {
                const t = y / documentHeight;
                
                let vx = 0;
                const time = startTime + t;
                const sinIndex = ((time * sinTableLength) | 0) % sinTableLength;
                vx += sinTable[sinIndex] * t;
                
                vx += globalWind * CONFIG.physics.windStrength * CONFIG.physics.windMultiplier;
                
                x += vx * CONFIG.physics.deltaTime;
                y += vy * CONFIG.physics.deltaTime;
                
                if (x > right) {
                    x = left;
                }
                
                if (x < left) {
                    x = right;
                }
                
                const settleResult = checkParticleSettling(x, y, settled);
                if (settleResult) {
                    settled = settleResult.settled;
                    y = settleResult.y;
                    opacity = 1.0;
                    fadeTimer = 0;
                }
                
                if (y > documentHeight) {
                    y = -9999;
                }
                
                particleArray[i    ] = x;
                particleArray[i + 1] = y;
                particleArray[i + 7] = opacity;
                particleArray[i + 8] = settled;
                particleArray[i + 9] = fadeTimer;
            }
            
            if (y < -1000) continue;
            
            if (y >= viewportTop && y <= viewportBottom) {
                const renderY = y - viewportTop;
                const pixelIndex = (Math.round(x) + Math.round(renderY) * imageDataWidth) * 4;
                
                if (pixelIndex >= 0 && pixelData.length - 3) {
                    const hue = ((y * CONFIG.visual.pixelScale) % CONFIG.visual.rainbowCycleLength) 
                        / CONFIG.visual.rainbowCycleLength * 360;
                    
                    const [rainbowR, rainbowG, rainbowB] = hslToRgb(
                        hue, 
                        CONFIG.visual.rainbowSaturation, 
                        CONFIG.visual.rainbowLightness
                    );
                    
                    const alpha = Math.round(opacity * 255);
                    pixelData[pixelIndex    ] = rainbowR;
                    pixelData[pixelIndex + 1] = rainbowG;
                    pixelData[pixelIndex + 2] = rainbowB;
                    pixelData[pixelIndex + 3] = alpha;
                }
            }
        }
        
        context.putImageData(imageData, 0, 0);
    }
    
    function render() {
        const startTime = performance.now();
        
        clearImageData();
        draw();
        
        const endTime = performance.now();
        const frameTime = endTime - startTime;
        
        frameTimeAccumulator += frameTime;
        frameCount++;
        
        if (startTime - lastLogTime >= 1000) {
            const avgFrameTime = frameTimeAccumulator / frameCount;
            console.log(`Snow Effect - Avg Frame Time: ${avgFrameTime.toFixed(2)}ms / Budget: ${CONFIG.performance.targetFrameTime}ms | Spawn Multiplier: ${spawnRateMultiplier.toFixed(3)}`);
            lastLogTime = startTime;
            frameTimeAccumulator = 0;
            frameCount = 0;
        }
        
        const performanceRatio = CONFIG.performance.targetFrameTime / Math.max(frameTime, 1);
        const targetMultiplier = Math.min(1.0, Math.max(0.1, performanceRatio));
        
        spawnRateMultiplier += (targetMultiplier - spawnRateMultiplier) * CONFIG.performance.adjustmentSpeed;
        
        animationFrame = requestAnimationFrame(render);
    }
    
    window.addEventListener('resize', onResize, false);
    restart();
}