// app.js - SafePath Complete Version
// All rights reserved

// ===== APPLICATION STATE =====
let currentUser = null;
let map = null;
let userMarker = null;
let watchId = null;
let geofences = [];
let safetyCircle = [];
let currentTrip = null;
let safetyTimer = null;
let timerEndTime = null;
let shadowTrackEnabled = false;
let shadowTrackInterval = null;
let batteryMonitorInterval = null;
let heatmapLayer = null;
let downloadedPOIs = [];
let currentCountry = 'US';
let signalStrength = true;
let locationWatchdog = null;
let batteryLevelPercent = 100;
let userHasInteractedWithMap = false;
let wellLitPathLayers = [];
let silentSOSMode = false;
let sosCountdownInterval = null;
let sosCountdownRemaining = 0;
let lastProcessedLocation = null;
let lastLocationProcessedAt = 0;
let isFlushingEvents = false;
let riskOverlayLayers = [];
let riskPoints = [];
let hotelBase = null;
let hotelMonitorInterval = null;
let lastNightCheckPromptAt = 0;
let deadmanMediaRecorder = null;
let deadmanAudioChunks = [];
let deadmanLastClipUrl = null;
let readinessRefreshInterval = null;
let criticalActionArm = {};

const EVENT_API_URL = 'http://localhost:3000/api/events';
const EVENT_LOGS_KEY = 'safepath_events';
const EVENT_QUEUE_KEY = 'safepath_pending_events';
const SOS_PREALERT_SECONDS = 10;
const NIGHT_CHECK_INTERVAL_MS = 60000;
const NIGHT_CHECK_SUPPRESS_MS = 15 * 60 * 1000;
const VAULT_KEY = 'safepath_doc_vault';
const SHARE_LINKS_KEY = 'safepath_emergency_share_links';
const AUDIT_TRAIL_KEY = 'safepath_audit_trail';
const CRITICAL_ARM_WINDOW_MS = 6000;
const HELLO_PHRASES = {
    US: { lang: 'en-US', text: 'Help me. I am in danger. Please call emergency services.' },
    GB: { lang: 'en-GB', text: 'Help me. I am in danger. Please call emergency services.' },
    FR: { lang: 'fr-FR', text: 'Aidez-moi. Je suis en danger. Appelez les secours.' },
    DE: { lang: 'de-DE', text: 'Hilfe. Ich bin in Gefahr. Bitte rufen Sie den Notdienst.' },
    ES: { lang: 'es-ES', text: 'Ayudeme. Estoy en peligro. Llame a emergencias.' },
    IT: { lang: 'it-IT', text: 'Aiutatemi. Sono in pericolo. Chiamate i soccorsi.' },
    JP: { lang: 'ja-JP', text: 'Tasuke te kudasai. Kiken desu. Kyukyu ni denwa shite kudasai.' },
    IN: { lang: 'hi-IN', text: 'Meri madad kijiye. Main khatre mein hoon. Kripya emergency ko bulaiye.' },
    default: { lang: 'en-US', text: 'Help me. I am in danger. Please call emergency services.' }
};

// Demo user
const DEMO_USER = {
    email: 'demo@safepath.com',
    name: 'Demo User'
};

// Emergency numbers by country
const emergencyNumbers = {
    'US': '911',
    'GB': '999',
    'AU': '000',
    'NZ': '111',
    'CA': '911',
    'IN': '112',
    'JP': '119',
    'FR': '112',
    'DE': '112',
    'IT': '112',
    'ES': '112',
    'default': '112'
};

// ===== MAP INITIALIZATION =====
function initMap(lat = 40.7128, lng = -74.0060) {
    if (map) {
        map.invalidateSize();
        return;
    }
    
    console.log('Initializing map...');
    
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }
    
    try {
        // Initialize map with explicit options
        map = L.map('map', {
            center: [lat, lng],
            zoom: 14,
            zoomControl: true,
            fadeAnimation: true,
            markerZoomAnimation: true,
            attributionControl: false
        });
        map.zoomControl.setPosition('topright');
        
        // Use CartoDB Voyager for desaturated map style
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            subdomains: 'abcd',
            maxZoom: 19,
            minZoom: 2
        }).addTo(map);
        
        // Add custom user marker with pulse effect
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div class="user-marker">📍</div>',
            iconSize: [30, 30],
            popupAnchor: [0, -15]
        });
        
        userMarker = L.marker([lat, lng], { 
            icon: customIcon,
            title: 'Your Location',
            riseOnHover: true
        }).addTo(map);
        
        userMarker.bindPopup('📍 You are here').openPopup();
        
        // Stop auto-follow once user manually interacts with the map
        map.on('dragstart zoomstart', () => {
            userHasInteractedWithMap = true;
        });
        
        // Force map to update its size
        setTimeout(() => {
            map.invalidateSize();
        }, 200);
        
        // Load saved data
        loadGeofencesFromStorage();
        loadSafetyCircleFromStorage();
        loadSmartSafetyState();
        setupRiskIntelligence();
        startHotelMonitor();
        updateLanguageBridgeUI();
        
        console.log('Map initialized successfully');
        
        // Start tracking after map loads
        startLocationTracking();
        flushPendingEvents();
        
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// ===== LOCATION TRACKING =====
function startLocationTracking() {
    if (!map) {
        console.log('Map not ready, delaying location tracking');
        setTimeout(startLocationTracking, 500);
        return;
    }
    
    console.log('Starting location tracking...');
    
    if ("geolocation" in navigator) {
        // Get initial position
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                updateUserLocation(latitude, longitude);
                detectCountryFromLocation(latitude, longitude);
            },
            error => {
                console.error("Error getting location:", error);
                // Use default location
                updateUserLocation(40.7128, -74.0060);
                detectCountryFromLocation(40.7128, -74.0060);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
        
        restartAdaptiveLocationWatch();
        
        // Start signal monitoring
        setupSignalMonitoring();
        
    } else {
        console.log("Geolocation not supported");
        updateUserLocation(40.7128, -74.0060);
    }
}

function updateUserLocation(lat, lng) {
    if (userMarker && map) {
        userMarker.setLatLng([lat, lng]);
        
        // Follow user until they manually move the map
        if (!userHasInteractedWithMap && map._loaded) {
            map.panTo([lat, lng], { animate: true, duration: 1 });
        }
    }
}

function updateSignalIndicator() {
    const markerElement = document.querySelector('.custom-marker');
    if (markerElement) {
        if (signalStrength) {
            markerElement.classList.remove('signal-lost');
        } else {
            markerElement.classList.add('signal-lost');
        }
    }
}

function updateCoordinateDisplay(lat, lng, accuracy) {
    const coordDisplay = document.getElementById('coordinate-display');
    if (coordDisplay) {
        coordDisplay.innerHTML = `
            <span>📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
            <span style="margin-left: 10px;">🎯 ±${Math.round(accuracy || 10)}m</span>
            <span style="margin-left: 10px;">🛰️ ${signalStrength ? 'Live' : 'Cached'}</span>
        `;
    }

    updateSafetyScore(lat, lng);
}

// ===== SMART SAFETY (PHASE 2) =====
function loadSmartSafetyState() {
    try {
        const savedHotel = localStorage.getItem('safepath_hotel_base');
        if (savedHotel) {
            hotelBase = JSON.parse(savedHotel);
            ensureHotelGeofence();
        }
    } catch (error) {
        hotelBase = null;
    }

    try {
        const savedRisk = JSON.parse(localStorage.getItem('safepath_risk_points') || '[]');
        if (Array.isArray(savedRisk)) {
            riskPoints = savedRisk;
        }
    } catch (error) {
        riskPoints = [];
    }
}

function setupRiskIntelligence() {
    if (!map) return;
    if (riskPoints.length === 0 && userMarker) {
        seedRiskPointsFromUserLocation();
    }
    renderRiskOverlay();
}

function seedRiskPointsFromUserLocation() {
    if (!userMarker) return;
    const base = userMarker.getLatLng();
    riskPoints = [
        { lat: base.lat + 0.004, lng: base.lng + 0.003, severity: 0.7, label: 'Crowd alert' },
        { lat: base.lat - 0.003, lng: base.lng + 0.005, severity: 0.5, label: 'Low light area' },
        { lat: base.lat + 0.001, lng: base.lng - 0.004, severity: 0.85, label: 'Recent incident report' }
    ];
    localStorage.setItem('safepath_risk_points', JSON.stringify(riskPoints));
}

function renderRiskOverlay() {
    if (!map) return;
    riskOverlayLayers.forEach(layer => {
        if (map.hasLayer(layer)) map.removeLayer(layer);
    });
    riskOverlayLayers = [];

    riskPoints.forEach(point => {
        const color = point.severity >= 0.75 ? '#e74c3c' : point.severity >= 0.45 ? '#f39c12' : '#2ecc71';
        const radius = 120 + Math.round(point.severity * 180);
        const layer = L.circle([point.lat, point.lng], {
            color,
            fillColor: color,
            fillOpacity: 0.13,
            opacity: 0.7,
            weight: 1,
            radius
        }).addTo(map);
        layer.bindPopup(`<strong>${point.label}</strong><br>Risk score: ${Math.round(point.severity * 100)}`);
        riskOverlayLayers.push(layer);
    });
}

function computeSafetyScore(lat, lng) {
    if (!riskPoints.length) return 90;
    let riskScore = 0;
    riskPoints.forEach(point => {
        const distance = calculateDistance(lat, lng, point.lat, point.lng);
        const influence = Math.max(0, 1 - (distance / 1200));
        riskScore += influence * point.severity * 35;
    });
    const clamped = Math.max(5, Math.min(95, Math.round(100 - riskScore)));
    return clamped;
}

function updateSafetyScore(lat, lng) {
    const score = computeSafetyScore(lat, lng);
    const badge = document.getElementById('safety-score-pill');
    if (badge) {
        const level = score >= 75 ? 'Low Risk' : score >= 45 ? 'Moderate' : 'High Risk';
        const color = score >= 75 ? 'var(--emerald)' : score >= 45 ? 'var(--amber)' : 'var(--red)';
        badge.textContent = `${score}/100 (${level})`;
        badge.style.color = color;
    }
}

function reportRiskAtCurrentLocation() {
    if (!userMarker) return;
    const pos = userMarker.getLatLng();
    const note = prompt('Report hazard type:', 'Suspicious activity');
    if (!note) return;
    riskPoints.push({
        lat: pos.lat,
        lng: pos.lng,
        severity: 0.8,
        label: note
    });
    localStorage.setItem('safepath_risk_points', JSON.stringify(riskPoints));
    renderRiskOverlay();
    updateSafetyScore(pos.lat, pos.lng);
    logSafetyEvent('RISK_REPORTED', { note, location: pos });
    showNotification('Hazard reported', 'Risk map updated for your area.');
}

function setHotelBaseToCurrentLocation() {
    if (!userMarker) return;
    const pos = userMarker.getLatLng();
    hotelBase = {
        lat: pos.lat,
        lng: pos.lng,
        radius: 350,
        savedAt: new Date().toISOString()
    };
    localStorage.setItem('safepath_hotel_base', JSON.stringify(hotelBase));
    ensureHotelGeofence();
    updateHotelStatusUI();
    logSafetyEvent('HOTEL_BASE_SET', { location: hotelBase });
    showNotification('Hotel base set', 'Night-time safety checks are now active.');
}

function ensureHotelGeofence() {
    if (!hotelBase) return;
    const existing = geofences.find(f => f.name === 'Hotel Safe Base');
    if (existing) {
        existing.center = { lat: hotelBase.lat, lng: hotelBase.lng };
        existing.radius = hotelBase.radius;
        if (existing.circleObject) {
            existing.circleObject.setLatLng([hotelBase.lat, hotelBase.lng]);
            existing.circleObject.setRadius(hotelBase.radius);
        }
        saveGeofencesToStorage();
        return;
    }
    createGeofence('Hotel Safe Base', { lat: hotelBase.lat, lng: hotelBase.lng }, hotelBase.radius, 'safe');
}

function updateHotelStatusUI() {
    const status = document.getElementById('hotel-status');
    if (!status) return;
    if (!hotelBase) {
        status.textContent = 'Not configured';
        return;
    }
    status.textContent = `Base active (${Math.round(hotelBase.radius)}m radius)`;
}

function startHotelMonitor() {
    if (hotelMonitorInterval) clearInterval(hotelMonitorInterval);
    hotelMonitorInterval = setInterval(() => {
        runNightSafetyCheck();
    }, NIGHT_CHECK_INTERVAL_MS);
    runNightSafetyCheck();
}

function runNightSafetyCheck() {
    if (!hotelBase || !userMarker) return;
    const hour = new Date().getHours();
    if (hour < 0 || hour > 5) return;

    const pos = userMarker.getLatLng();
    const distance = calculateDistance(pos.lat, pos.lng, hotelBase.lat, hotelBase.lng);
    const now = Date.now();
    if (distance > hotelBase.radius && (now - lastNightCheckPromptAt) > NIGHT_CHECK_SUPPRESS_MS) {
        lastNightCheckPromptAt = now;
        showNotification('Night check-in', 'You are outside your hotel zone late at night. Please check in.');
        logSafetyEvent('NIGHT_CHECKIN_PROMPT', { distance_from_hotel_m: Math.round(distance) });
    }
}

function getLocalizedHelpPhrase() {
    return HELLO_PHRASES[currentCountry] || HELLO_PHRASES.default;
}

function updateLanguageBridgeUI() {
    const phraseEl = document.getElementById('help-phrase-text');
    if (!phraseEl) return;
    const phrase = getLocalizedHelpPhrase();
    phraseEl.textContent = phrase.text;
}

function playHelpPhrase() {
    const phrase = getLocalizedHelpPhrase();
    if (!('speechSynthesis' in window)) {
        alert('Speech synthesis is not supported in this browser.');
        return;
    }
    const utterance = new SpeechSynthesisUtterance(phrase.text);
    utterance.lang = phrase.lang;
    utterance.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

// ===== UX HARDENING (PHASE 4) =====
function isActionArmed(actionKey) {
    const armedAt = criticalActionArm[actionKey];
    return armedAt && (Date.now() - armedAt) < CRITICAL_ARM_WINDOW_MS;
}

function armCriticalAction(actionKey, label) {
    criticalActionArm[actionKey] = Date.now();
    const sendNowBtn = document.getElementById('send-sos-now-btn');
    if (actionKey === 'sos_send_now' && sendNowBtn) {
        sendNowBtn.textContent = 'Tap Again to Send';
        sendNowBtn.classList.add('critical-armed');
        setTimeout(() => {
            if (!isActionArmed(actionKey)) {
                sendNowBtn.textContent = 'Send Now';
                sendNowBtn.classList.remove('critical-armed');
            }
        }, CRITICAL_ARM_WINDOW_MS + 100);
    }
    showNotification('Confirm action', `Tap again within 6s to ${label}.`);
    simulateHaptic('double');
}

function runCriticalAction(actionKey, label, fn) {
    if (!isActionArmed(actionKey)) {
        armCriticalAction(actionKey, label);
        return false;
    }
    delete criticalActionArm[actionKey];
    const sendNowBtn = document.getElementById('send-sos-now-btn');
    if (actionKey === 'sos_send_now' && sendNowBtn) {
        sendNowBtn.textContent = 'Send Now';
        sendNowBtn.classList.remove('critical-armed');
    }
    fn();
    return true;
}

function getSafetyReadinessState() {
    const batteryOk = getBatteryLevel() >= 20;
    const gpsOk = !!('geolocation' in navigator) && signalStrength;
    const networkOk = navigator.onLine;
    const contactsOk = safetyCircle.length >= 1;
    const queueSize = readPendingEvents().length;

    return {
        batteryOk,
        gpsOk,
        networkOk,
        contactsOk,
        queueSize,
        batteryLevel: Math.round(getBatteryLevel())
    };
}

function updateSafetyReadinessUI() {
    const state = getSafetyReadinessState();
    const updates = [
        { id: 'ready-battery', ok: state.batteryOk, text: `${state.batteryLevel}%` },
        { id: 'ready-gps', ok: state.gpsOk, text: state.gpsOk ? 'Live' : 'Weak' },
        { id: 'ready-network', ok: state.networkOk, text: state.networkOk ? 'Online' : 'Offline' },
        { id: 'ready-contacts', ok: state.contactsOk, text: `${safetyCircle.length} contacts` },
        { id: 'ready-queue', ok: state.queueSize === 0, text: state.queueSize === 0 ? 'Synced' : `${state.queueSize} pending` }
    ];

    updates.forEach(item => {
        const el = document.getElementById(item.id);
        if (!el) return;
        el.textContent = `${item.ok ? '✅' : '⚠️'} ${item.text}`;
        el.classList.toggle('readiness-warn', !item.ok);
    });

    const score = updates.reduce((acc, item) => acc + (item.ok ? 1 : 0), 0);
    const overall = document.getElementById('readiness-overall');
    if (overall) {
        if (score >= 5) {
            overall.textContent = 'Ready';
            overall.style.color = 'var(--emerald)';
        } else if (score >= 3) {
            overall.textContent = 'Needs attention';
            overall.style.color = 'var(--amber)';
        } else {
            overall.textContent = 'Not ready';
            overall.style.color = 'var(--red)';
        }
    }
}

function applyOnboardingPreset() {
    const select = document.getElementById('onboarding-preset');
    if (!select) return;
    const preset = select.value;
    if (!preset) return;

    const timerInput = document.getElementById('timer-minutes');
    const shadowToggle = document.getElementById('shadow-track-toggle');
    const silentToggle = document.getElementById('silent-sos-toggle');

    if (preset === 'city') {
        if (timerInput) timerInput.value = '30';
        if (shadowToggle && shadowToggle.checked) {
            shadowToggle.checked = false;
            toggleShadowTrack({ target: shadowToggle });
        }
        if (silentToggle && silentToggle.checked) {
            silentToggle.checked = false;
            toggleSilentSOS({ target: silentToggle });
        }
    } else if (preset === 'solo') {
        if (timerInput) timerInput.value = '20';
        if (shadowToggle && !shadowToggle.checked) {
            shadowToggle.checked = true;
            toggleShadowTrack({ target: shadowToggle });
        }
        if (silentToggle && !silentToggle.checked) {
            silentToggle.checked = true;
            toggleSilentSOS({ target: silentToggle });
        }
    } else if (preset === 'hike') {
        if (timerInput) timerInput.value = '15';
        if (shadowToggle && !shadowToggle.checked) {
            shadowToggle.checked = true;
            toggleShadowTrack({ target: shadowToggle });
        }
        if (silentToggle && !silentToggle.checked) {
            silentToggle.checked = true;
            toggleSilentSOS({ target: silentToggle });
        }
        if (userMarker) {
            const p = userMarker.getLatLng();
            createGeofence('Hike Base', { lat: p.lat, lng: p.lng }, 800, 'safe');
        }
    }

    localStorage.setItem('safepath_onboarding_preset', preset);
    updateSafetyReadinessUI();
    recordAudit('PRESET_APPLIED', { preset }, 'info');
    showNotification('Preset applied', `${preset} profile has been configured.`);
}

// ===== TRUST, SHARING, AUDIT (PHASE 3) =====
function recordAudit(action, details = {}, severity = 'info') {
    const entry = {
        id: generateUUID(),
        action,
        severity,
        timestamp: new Date().toISOString(),
        details
    };
    let audit = [];
    try {
        audit = JSON.parse(localStorage.getItem(AUDIT_TRAIL_KEY) || '[]');
    } catch (error) {
        audit = [];
    }
    audit.unshift(entry);
    localStorage.setItem(AUDIT_TRAIL_KEY, JSON.stringify(audit.slice(0, 100)));
    renderAuditTrail();
}

function getAuditTrail() {
    try {
        const audit = JSON.parse(localStorage.getItem(AUDIT_TRAIL_KEY) || '[]');
        return Array.isArray(audit) ? audit : [];
    } catch (error) {
        return [];
    }
}

function renderAuditTrail() {
    const container = document.getElementById('audit-trail-list');
    if (!container) return;
    const audit = getAuditTrail().slice(0, 8);
    if (audit.length === 0) {
        container.innerHTML = '<p class="smart-subtle">No audit events yet.</p>';
        return;
    }
    container.innerHTML = audit.map(item => {
        const time = new Date(item.timestamp).toLocaleTimeString();
        return `<div class="audit-item"><strong>${item.action}</strong><span>${time}</span></div>`;
    }).join('');
}

function getVaultEntries() {
    try {
        const vault = JSON.parse(localStorage.getItem(VAULT_KEY) || '[]');
        return Array.isArray(vault) ? vault : [];
    } catch (error) {
        return [];
    }
}

function setVaultEntries(entries) {
    localStorage.setItem(VAULT_KEY, JSON.stringify(entries));
}

async function deriveVaultKey(passphrase, saltBytes) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBytes,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

function bytesToBase64(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function base64ToBytes(text) {
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

async function addVaultDocument() {
    if (!window.crypto || !window.crypto.subtle) {
        alert('Secure vault requires WebCrypto support.');
        return;
    }
    const title = prompt('Document title:', 'Passport Number');
    if (!title) return;
    const content = prompt('Paste document text to encrypt:');
    if (!content) return;
    const passphrase = prompt('Set vault passphrase (needed to decrypt later):');
    if (!passphrase) return;

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveVaultKey(passphrase, salt);
    const encoded = new TextEncoder().encode(content);
    const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

    const entries = getVaultEntries();
    entries.unshift({
        id: generateUUID(),
        title,
        createdAt: new Date().toISOString(),
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
        cipher: bytesToBase64(cipherBuffer)
    });
    setVaultEntries(entries.slice(0, 30));
    renderVaultList();
    recordAudit('VAULT_DOC_ADDED', { title }, 'info');
    showNotification('Vault updated', `${title} stored with encryption.`);
}

function renderVaultList() {
    const container = document.getElementById('vault-docs-list');
    if (!container) return;
    const entries = getVaultEntries();
    if (entries.length === 0) {
        container.innerHTML = '<p class="smart-subtle">No secure docs stored.</p>';
        return;
    }
    container.innerHTML = entries.slice(0, 6).map(item => {
        const date = new Date(item.createdAt).toLocaleDateString();
        return `<div class="vault-item"><button class="vault-open-btn" data-doc-id="${item.id}">${item.title}</button><span>${date}</span></div>`;
    }).join('');
}

async function openVaultDocument(docId) {
    const entries = getVaultEntries();
    const doc = entries.find(item => item.id === docId);
    if (!doc) return;
    const passphrase = prompt(`Enter passphrase for "${doc.title}":`);
    if (!passphrase) return;
    try {
        const key = await deriveVaultKey(passphrase, base64ToBytes(doc.salt));
        const plainBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: base64ToBytes(doc.iv) },
            key,
            base64ToBytes(doc.cipher)
        );
        const text = new TextDecoder().decode(plainBuffer);
        recordAudit('VAULT_DOC_VIEWED', { title: doc.title }, 'info');
        alert(`${doc.title}\n\n${text}`);
    } catch (error) {
        recordAudit('VAULT_DECRYPT_FAILED', { title: doc.title }, 'warning');
        alert('Unable to decrypt. Check passphrase.');
    }
}

function getShareLinks() {
    try {
        const links = JSON.parse(localStorage.getItem(SHARE_LINKS_KEY) || '[]');
        return Array.isArray(links) ? links : [];
    } catch (error) {
        return [];
    }
}

function setShareLinks(links) {
    localStorage.setItem(SHARE_LINKS_KEY, JSON.stringify(links));
}

function purgeExpiredShareLinks() {
    const now = Date.now();
    const active = getShareLinks().filter(item => new Date(item.expiresAt).getTime() > now);
    setShareLinks(active);
    return active;
}

function createEmergencyShareLink() {
    const minutes = parseInt(prompt('Link expiry in minutes:', '30'), 10);
    if (!minutes || minutes <= 0) return;
    const expiresAt = new Date(Date.now() + minutes * 60000).toISOString();
    const location = userMarker ? userMarker.getLatLng() : { lat: 40.7128, lng: -74.0060 };
    const token = generateUUID();
    const link = `${window.location.origin}${window.location.pathname}#emergency-share=${token}`;

    const links = purgeExpiredShareLinks();
    links.unshift({
        id: token,
        url: link,
        createdAt: new Date().toISOString(),
        expiresAt,
        payload: {
            user: currentUser ? currentUser.email : 'demo-user',
            location
        }
    });
    setShareLinks(links.slice(0, 12));
    renderShareLinks();
    recordAudit('EMERGENCY_LINK_CREATED', { expiresAt }, 'warning');
    showNotification('Emergency share ready', `Expires in ${minutes} minutes.`);
}

function renderShareLinks() {
    const container = document.getElementById('share-links-list');
    const qr = document.getElementById('share-qr-image');
    if (!container) return;
    const links = purgeExpiredShareLinks();
    if (links.length === 0) {
        container.innerHTML = '<p class="smart-subtle">No active share links.</p>';
        if (qr) qr.src = '';
        return;
    }
    container.innerHTML = links.slice(0, 4).map(item => {
        const expiry = new Date(item.expiresAt).toLocaleTimeString();
        return `<div class="share-item"><button class="share-copy-btn" data-share-id="${item.id}">Copy Link</button><span>Expires ${expiry}</span></div>`;
    }).join('');
    if (qr) {
        const primary = links[0].url;
        qr.src = `https://quickchart.io/qr?text=${encodeURIComponent(primary)}&size=140`;
    }
}

async function copyShareLink(shareId) {
    const linkObj = getShareLinks().find(item => item.id === shareId);
    if (!linkObj) return;
    try {
        await navigator.clipboard.writeText(linkObj.url);
        recordAudit('EMERGENCY_LINK_COPIED', { id: shareId }, 'info');
        showNotification('Copied', 'Share link copied to clipboard.');
    } catch (error) {
        prompt('Copy this emergency link:', linkObj.url);
    }
}

function getTrackingProfile(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const nearRestricted = isNearRestrictedGeofence(lat, lng, 200);

    if (shadowTrackEnabled || nearRestricted) {
        return {
            mode: 'high-risk',
            enableHighAccuracy: true,
            timeout: 4000,
            maximumAge: 0,
            minDistanceMeters: 5,
            minIntervalMs: 3000
        };
    }

    return {
        mode: 'normal',
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 45000,
        minDistanceMeters: 30,
        minIntervalMs: 15000
    };
}

function shouldProcessLocation(position, profile) {
    const now = Date.now();
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    if (!lastProcessedLocation) return true;
    if (now - lastLocationProcessedAt >= profile.minIntervalMs) return true;

    const distance = calculateDistance(
        lastProcessedLocation.lat,
        lastProcessedLocation.lng,
        lat,
        lng
    );
    return distance >= profile.minDistanceMeters;
}

function isNearRestrictedGeofence(lat, lng, bufferMeters = 200) {
    return geofences.some(geofence => {
        if (geofence.type !== 'restricted') return false;
        const distance = calculateDistance(lat, lng, geofence.center.lat, geofence.center.lng);
        return distance <= geofence.radius + bufferMeters;
    });
}

function handlePositionUpdate(position) {
    const { latitude, longitude, accuracy, speed } = position.coords;
    const profile = getTrackingProfile(position);

    if (!shouldProcessLocation(position, profile)) {
        signalStrength = true;
        updateSignalIndicator();
        return;
    }

    lastProcessedLocation = { lat: latitude, lng: longitude };
    lastLocationProcessedAt = Date.now();

    updateUserLocation(latitude, longitude);
    checkGeofenceBreaches(latitude, longitude);
    updateCoordinateDisplay(latitude, longitude, accuracy);

    if (shadowTrackEnabled && currentTrip) {
        logLocation({ latitude, longitude, accuracy, speed, mode: profile.mode });
    }

    signalStrength = true;
    updateSignalIndicator();
    updateSafetyReadinessUI();
}

function restartAdaptiveLocationWatch() {
    if (!('geolocation' in navigator)) return;

    const simulatedPosition = {
        coords: userMarker ? {
            latitude: userMarker.getLatLng().lat,
            longitude: userMarker.getLatLng().lng
        } : { latitude: 40.7128, longitude: -74.0060 }
    };
    const profile = getTrackingProfile(simulatedPosition);

    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }

    watchId = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        error => {
            console.error('Error watching location:', error);
            signalStrength = false;
            updateSignalIndicator();
        },
        {
            enableHighAccuracy: profile.enableHighAccuracy,
            timeout: profile.timeout,
            maximumAge: profile.maximumAge
        }
    );
}

// ===== GEOFENCE MANAGEMENT =====
function createGeofence(name, center, radius, type = 'safe') {
    if (!map) return;
    
    const geofence = {
        id: Date.now().toString(),
        name,
        center,
        radius,
        type,
        color: type === 'safe' ? '#2ecc71' : '#e74c3c',
        createdAt: new Date().toISOString()
    };
    
    // Add circle to map with styling
    const circle = L.circle([center.lat, center.lng], {
        color: geofence.color,
        fillColor: geofence.color,
        fillOpacity: 0.15,
        weight: 2,
        radius: radius,
        className: type === 'safe' ? 'safe-zone-glow' : 'restricted-zone-pulse'
    }).addTo(map);
    
    circle.bindPopup(`
        <b>${name}</b><br>
        Type: ${type} zone<br>
        Radius: ${radius}m<br>
        <small>Created: ${new Date().toLocaleTimeString()}</small>
    `);
    
    geofences.push({ ...geofence, circle, circleObject: circle });
    saveGeofencesToStorage();
    updateGeofencesList();
    
    // Show confirmation
    showNotification(`${type === 'safe' ? '✅' : '⚠️'} ${name} created`, 
        `${type === 'safe' ? 'Safe zone' : 'Restricted area'} added at your location`);
    
    simulateHaptic('light');
}

function checkGeofenceBreaches(lat, lng) {
    geofences.forEach(geofence => {
        const distance = calculateDistance(
            lat, lng,
            geofence.center.lat, geofence.center.lng
        );
        
        const isInside = distance <= geofence.radius;
        
        if (geofence.type === 'restricted' && isInside && !geofence.alerted) {
            triggerAlert(
                '⚠️ Restricted Area Alert',
                `You have entered a restricted zone: ${geofence.name}`
            );
            geofence.alerted = true;
            
            // Log event
            logSafetyEvent('ENTER_RESTRICTED_ZONE', {
                zone_name: geofence.name,
                location: { lat, lng }
            });
            
        } else if (geofence.type === 'safe' && !isInside && geofence.previouslyInside && !geofence.leftAlerted) {
            triggerAlert(
                '📍 Left Safe Zone',
                `You have left your safe zone: ${geofence.name}`
            );
            geofence.leftAlerted = true;
            
            // Log event
            logSafetyEvent('EXIT_SAFE_ZONE', {
                zone_name: geofence.name,
                location: { lat, lng }
            });
            
        } else if (isInside) {
            geofence.leftAlerted = false;
            geofence.alerted = false;
        }
        
        geofence.previouslyInside = isInside;
    });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

// ===== STORAGE FUNCTIONS =====
function loadGeofencesFromStorage() {
    const saved = localStorage.getItem('safepath_geofences');
    if (saved) {
        try {
            const fences = JSON.parse(saved);
            fences.forEach(f => {
                if (map) {
                    createGeofence(f.name, f.center, f.radius, f.type);
                }
            });
        } catch (e) {
            console.log('No saved geofences');
        }
    }
}

function saveGeofencesToStorage() {
    const fencesToSave = geofences.map(f => ({
        name: f.name,
        center: f.center,
        radius: f.radius,
        type: f.type,
        createdAt: f.createdAt
    }));
    localStorage.setItem('safepath_geofences', JSON.stringify(fencesToSave));
}

function loadSafetyCircleFromStorage() {
    const saved = localStorage.getItem('safepath_safetycircle');
    if (saved) {
        try {
            safetyCircle = JSON.parse(saved);
            updateSafetyCircleList();
            updateSafetyReadinessUI();
        } catch (e) {
            console.log('No saved contacts');
            addToSafetyCircle('Emergency Contact', 'emergency@example.com', '555-0123');
            addToSafetyCircle('Travel Buddy', 'buddy@example.com', '555-0124');
        }
    } else {
        addToSafetyCircle('Emergency Contact', 'emergency@example.com', '555-0123');
        addToSafetyCircle('Travel Buddy', 'buddy@example.com', '555-0124');
    }
}

// ===== SAFETY CIRCLE =====
function addToSafetyCircle(name, email, phone) {
    const contact = {
        id: Date.now().toString() + Math.random(),
        name,
        email,
        phone,
        status: 'watching',
        addedAt: new Date().toISOString()
    };
    
    safetyCircle.push(contact);
    localStorage.setItem('safepath_safetycircle', JSON.stringify(safetyCircle));
    updateSafetyCircleList();
    updateSafetyReadinessUI();
    
    showNotification('✅ Contact Added', `${name} is now in your safety circle`);
}

function updateSafetyCircleList() {
    const list = document.getElementById('safety-circle-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (safetyCircle.length === 0) {
        list.innerHTML = '<p class="no-contacts">No contacts added yet</p>';
        return;
    }
    
    safetyCircle.forEach(contact => {
        const item = document.createElement('div');
        item.className = 'contact-item';
        item.innerHTML = `
            <span class="contact-name">${contact.name}</span>
            <span class="contact-status" style="background: ${contact.status === 'alerted' ? 'var(--amber)' : 'var(--emerald)'}">
                ${contact.status === 'alerted' ? 'Alerted' : 'Watching'}
            </span>
        `;
        list.appendChild(item);
    });
}

// ===== GEOFENCE UI =====
function updateGeofencesList() {
    const list = document.getElementById('geofences-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (geofences.length === 0) {
        list.innerHTML = '<p class="no-geofences">No safe zones created yet</p>';
        return;
    }
    
    geofences.forEach(geofence => {
        const item = document.createElement('div');
        item.className = 'geofence-item';
        item.innerHTML = `
            <span>${geofence.name}</span>
            <span style="color: ${geofence.color}">${geofence.type}</span>
        `;
        item.addEventListener('click', () => showDistanceToGeofence(geofence));
        list.appendChild(item);
    });
}

// ===== TRIP MANAGEMENT =====
function startNewTrip() {
    const tripName = prompt('Enter trip name:', 'My Adventure');
    if (!tripName) return;
    
    currentTrip = {
        id: Date.now().toString(),
        name: tripName,
        startTime: new Date().toISOString(),
        shadowTrack: false
    };
    
    const tripStatus = document.getElementById('trip-status');
    tripStatus.innerHTML = `
        <p><strong>${tripName}</strong> <span style="color: var(--emerald)">● Active</span></p>
        <p class="metadata">Started: ${new Date().toLocaleTimeString()}</p>
        <button id="end-trip-btn" class="btn-secondary" style="margin-top: 10px; background: var(--amber); color: white;">End Trip</button>
    `;
    
    document.getElementById('end-trip-btn').addEventListener('click', endTrip);
    
    // Create default safe zone at current location
    if (userMarker) {
        const { lat, lng } = userMarker.getLatLng();
        createGeofence(`${tripName} - Base`, { lat, lng }, 500, 'safe');
    }
    
    showNotification('🎒 Trip Started', `Have a safe journey, ${tripName}!`);
    logSafetyEvent('TRIP_STARTED', { trip_name: tripName });
}

function endTrip() {
    if (currentTrip) {
        logSafetyEvent('TRIP_ENDED', { 
            trip_name: currentTrip.name,
            duration: new Date() - new Date(currentTrip.startTime)
        });
    }
    
    currentTrip = null;
    document.getElementById('trip-status').innerHTML = `
        <p>No active trip</p>
        <button id="start-trip-btn" class="btn-secondary">Start New Trip</button>
    `;
    document.getElementById('start-trip-btn').addEventListener('click', startNewTrip);
    
    showNotification('👋 Trip Ended', 'Your journey has been logged');
}

// ===== SAFETY TIMER (DEAD MAN'S SWITCH) =====
function startSafetyTimer() {
    const minutes = parseInt(document.getElementById('timer-minutes').value) || 20;
    const duration = minutes * 60 * 1000;
    
    timerEndTime = Date.now() + duration;
    
    if (safetyTimer) {
        clearInterval(safetyTimer);
    }
    
    document.getElementById('start-timer-btn').style.display = 'none';
    document.getElementById('check-in-btn').style.display = 'block';
    document.getElementById('timer-minutes').disabled = true;
    
    safetyTimer = setInterval(updateTimerDisplay, 1000);
    startDeadmanAmbientCapture();
    
    logSafetyEvent('TIMER_STARTED', { duration: minutes });
    showNotification('⏱️ Safety Timer Started', `You have ${minutes} minutes to check in`);
    simulateHaptic('light');
}

function updateTimerDisplay() {
    const now = Date.now();
    const remaining = timerEndTime - now;
    
    if (remaining <= 0) {
        timerExpired();
        return;
    }
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    document.getElementById('timer-display').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Change color when less than 20% time remaining
    const totalDuration = timerEndTime - (timerEndTime - (parseInt(document.getElementById('timer-minutes').value) * 60 * 1000));
    if (remaining < totalDuration * 0.2) {
        document.getElementById('timer-display').style.color = 'var(--red)';
    }
}

function timerExpired() {
    clearInterval(safetyTimer);
    safetyTimer = null;
    
    let lastLocation = { lat: 40.7128, lng: -74.0060 };
    if (userMarker) {
        lastLocation = userMarker.getLatLng();
    }
    
    const eventData = {
        trigger_type: 'TIMER_EXPIRED',
        last_coord: lastLocation,
        battery_level: getBatteryLevel(),
        timestamp: new Date().toISOString(),
        audio_clip: deadmanLastClipUrl || null
    };
    
    logSafetyEvent('TIMER_EXPIRED', eventData);
    
    triggerAlert(
        '⏰ Check-in Failed',
        'Your safety timer expired without check-in. Your safety circle has been notified.'
    );
    
    notifySafetyCircle('Safety Timer Expired', 
        `User did not check in. Last known location: https://maps.google.com/?q=${lastLocation.lat},${lastLocation.lng}`);
    stopDeadmanAmbientCapture();
    
    resetTimerUI();
}

function checkInSafe() {
    clearInterval(safetyTimer);
    safetyTimer = null;
    stopDeadmanAmbientCapture();
    
    logSafetyEvent('CHECK_IN_SAFE', {
        timestamp: new Date().toISOString(),
        location: userMarker ? userMarker.getLatLng() : null
    });
    
    showNotification('✓ Check-in Successful', 'Your safety circle has been updated');
    simulateHaptic('double');
    resetTimerUI();
}

function resetTimerUI() {
    document.getElementById('start-timer-btn').style.display = 'block';
    document.getElementById('check-in-btn').style.display = 'none';
    document.getElementById('timer-minutes').disabled = false;
    document.getElementById('timer-display').textContent = '--:--';
    document.getElementById('timer-display').style.color = 'var(--navy)';
}

// ===== DEADMAN AUDIO CAPTURE =====
async function startDeadmanAmbientCapture() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    stopDeadmanAmbientCapture();

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        deadmanAudioChunks = [];
        try {
            deadmanMediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        } catch (error) {
            deadmanMediaRecorder = new MediaRecorder(stream);
        }
        deadmanMediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                deadmanAudioChunks.push({
                    timestamp: Date.now(),
                    blob: event.data
                });
                const cutoff = Date.now() - 30000;
                deadmanAudioChunks = deadmanAudioChunks.filter(chunk => chunk.timestamp >= cutoff);
            }
        };
        deadmanMediaRecorder.onstop = () => {
            if (deadmanAudioChunks.length > 0) {
                const clip = new Blob(deadmanAudioChunks.map(c => c.blob), { type: 'audio/webm' });
                if (deadmanLastClipUrl) {
                    URL.revokeObjectURL(deadmanLastClipUrl);
                }
                deadmanLastClipUrl = URL.createObjectURL(clip);
                const playBtn = document.getElementById('play-last-audio-btn');
                if (playBtn) playBtn.disabled = false;
            }
            stream.getTracks().forEach(track => track.stop());
        };
        deadmanMediaRecorder.start(5000);
    } catch (error) {
        console.log('Ambient capture unavailable:', error);
    }
}

function stopDeadmanAmbientCapture() {
    if (deadmanMediaRecorder && deadmanMediaRecorder.state !== 'inactive') {
        deadmanMediaRecorder.stop();
    }
    deadmanMediaRecorder = null;
}

function playLastCapturedClip() {
    if (!deadmanLastClipUrl) {
        showNotification('No clip available', 'Start a safety timer to capture ambient audio.');
        return;
    }
    const audio = new Audio(deadmanLastClipUrl);
    audio.play().catch(() => {
        showNotification('Playback blocked', 'Tap again after interacting with the page.');
    });
}

// ===== BATTERY MONITORING =====
function setupBatteryMonitoring() {
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            batteryLevelPercent = Math.round(battery.level * 100);
            checkBatteryLevel(batteryLevelPercent);
            
            battery.addEventListener('levelchange', () => {
                batteryLevelPercent = Math.round(battery.level * 100);
                checkBatteryLevel(batteryLevelPercent);
            });
        });
    }
}

function checkBatteryLevel(level) {
    const batteryWarning = document.getElementById('battery-warning');
    
    if (level <= 5) {
        const lastLocation = userMarker ? userMarker.getLatLng() : { lat: 40.7128, lng: -74.0060 };
        
        logSafetyEvent('LOW_BATTERY_CRITICAL', {
            battery_level: level,
            last_coord: lastLocation
        });
        
        notifySafetyCircle('⚠️ Critical Battery Warning', 
            `User's battery is critically low (${level}%). Last known location: https://maps.google.com/?q=${lastLocation.lat},${lastLocation.lng}`);
        
        if (!batteryWarning) {
            showBatteryWarning(level, 'critical');
        }
    } else if (level <= 15) {
        logSafetyEvent('LOW_BATTERY_WARNING', { battery_level: level });
        
        if (!batteryWarning) {
            showBatteryWarning(level, 'low');
        }
    }
}

function showBatteryWarning(level, type) {
    const statusCard = document.getElementById('status-card');
    const warning = document.createElement('div');
    warning.id = 'battery-warning';
    warning.className = 'battery-warning';
    warning.innerHTML = `
        <span>🔋</span>
        <span>Battery ${type}: ${Math.round(level)}% remaining</span>
    `;
    statusCard.parentNode.insertBefore(warning, statusCard.nextSibling);
    
    setTimeout(() => {
        if (warning.parentNode) {
            warning.remove();
        }
    }, 10000);
}

function getBatteryLevel() {
    return batteryLevelPercent;
}

// ===== COUNTRY DETECTION =====
function detectCountryFromLocation(lat, lng) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(response => response.json())
        .then(data => {
            if (data.address && data.address.country_code) {
                currentCountry = data.address.country_code.toUpperCase();
                updateEmergencyInfo();
                updateLanguageBridgeUI();
            }
        })
        .catch(error => {
            console.log('Error detecting country:', error);
            updateEmergencyInfo();
            updateLanguageBridgeUI();
        });
}

function updateEmergencyInfo() {
    const number = emergencyNumbers[currentCountry] || emergencyNumbers.default;
    const emergencyInfo = document.getElementById('emergency-info');
    
    if (emergencyInfo) {
        emergencyInfo.innerHTML = `
            <div class="emergency-info-card glass-panel">
                <p class="weight-medium">Local Emergency Number:</p>
                <div class="emergency-number mono-text">${number}</div>
                <p class="metadata">Detected country: ${currentCountry}</p>
            </div>
        `;
    }
}

function callLocalEmergency() {
    const number = emergencyNumbers[currentCountry] || emergencyNumbers.default;
    runCriticalAction('emergency_call', `call emergency ${number}`, () => {
        logSafetyEvent('EMERGENCY_CALL', {
            country: currentCountry,
            number: number,
            location: userMarker ? userMarker.getLatLng() : null
        });
        if (confirm(`Call ${number}? (Demo - this would initiate an emergency call)`)) {
            window.location.href = `tel:${number}`;
        }
    });
}

// ===== SHADOW TRACK MODE =====
function toggleShadowTrack(event) {
    shadowTrackEnabled = event.target.checked;
    
    if (shadowTrackEnabled) {
        enableShadowTrack();
    } else {
        disableShadowTrack();
    }
    
    document.getElementById('shadow-track-status').textContent = 
        shadowTrackEnabled ? 'High-frequency' : 'Adaptive';
    
    localStorage.setItem('shadowTrackEnabled', shadowTrackEnabled);
    restartAdaptiveLocationWatch();
}

function enableShadowTrack() {
    if (currentTrip) {
        currentTrip.shadowTrack = true;
    }
    
    restartAdaptiveLocationWatch();
    
    notifySafetyCircle('Shadow Track Enabled', 
        'User has enabled high-risk tracking mode');
    
    showNotification('👁️ Shadow Track Enabled', 'Your location is being tracked more frequently');
    updateStatusCard('warning', { 
        title: 'Shadow Track Active', 
        description: 'High-frequency location tracking enabled' 
    });
}

function disableShadowTrack() {
    if (currentTrip) {
        currentTrip.shadowTrack = false;
    }
    
    restartAdaptiveLocationWatch();
    
    updateStatusCard('nominal', { 
        title: 'All systems nominal', 
        description: 'Your safety circle is watching' 
    });
}

function toggleSilentSOS(event) {
    silentSOSMode = event.target.checked;
    localStorage.setItem('silentSOSMode', silentSOSMode);
    const statusText = document.getElementById('silent-sos-status');
    if (statusText) {
        statusText.textContent = silentSOSMode ? 'Stealth ON' : 'Stealth OFF';
    }
    document.body.classList.toggle('silent-sos-mode', silentSOSMode);
}

// ===== NIGHT VISION TOGGLE =====
function setupNightVisionToggle() {
    let nightBtn = document.getElementById('night-vision-btn');
    if (!nightBtn) return;
    const nightBtnLabel = nightBtn.querySelector('span');
    
    let nightVisionEnabled = false;
    
    nightBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nightVisionEnabled = !nightVisionEnabled;
        
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            if (nightVisionEnabled) {
                mapContainer.classList.add('map-night-vision');
                if (nightBtnLabel) {
                    nightBtnLabel.textContent = 'Night Vision ON';
                } else {
                    nightBtn.textContent = 'Night Vision ON';
                }
                nightBtn.classList.add('active');
                
                highlightWellLitPaths();
                
                updateStatusCard('info', { 
                    title: 'Night Vision Active', 
                    description: 'Well-lit paths are highlighted in yellow' 
                });
                
                simulateHaptic('double');
                
                setTimeout(() => {
                    updateStatusCard('nominal', { 
                        title: 'All systems nominal', 
                        description: 'Your safety circle is watching' 
                    });
                }, 3000);
            } else {
                mapContainer.classList.remove('map-night-vision');
                if (nightBtnLabel) {
                    nightBtnLabel.textContent = 'Night Vision OFF';
                } else {
                    nightBtn.textContent = 'Night Vision OFF';
                }
                nightBtn.classList.remove('active');
                
                wellLitPathLayers.forEach(layer => {
                    if (map && map.hasLayer(layer)) {
                        map.removeLayer(layer);
                    }
                });
                wellLitPathLayers = [];
            }
        }
    });
}

function highlightWellLitPaths() {
    if (!map || !userMarker) return;
    
    const { lat, lng } = userMarker.getLatLng();
    
    // Sample well-lit paths (in production, you'd get these from OSM)
    const paths = [
        { lat1: lat + 0.001, lng1: lng - 0.001, lat2: lat + 0.002, lng2: lng - 0.002 },
        { lat1: lat - 0.001, lng1: lng + 0.001, lat2: lat - 0.002, lng2: lng + 0.002 },
        { lat1: lat, lng1: lng, lat2: lat + 0.0015, lng2: lng + 0.0015 }
    ];
    
    paths.forEach(path => {
        const line = L.polyline([
            [path.lat1, path.lng1],
            [path.lat2, path.lng2]
        ], {
            color: '#f1c40f',
            weight: 4,
            opacity: 0.6,
            dashArray: '10, 10',
            className: 'well-lit-path'
        }).addTo(map);
        wellLitPathLayers.push(line);
    });
}

// ===== SIGNAL MONITORING =====
function setupSignalMonitoring() {
    if (locationWatchdog) {
        clearInterval(locationWatchdog);
    }
    
    locationWatchdog = setInterval(() => {
        if (userMarker && userMarker.getElement()) {
            if (Math.random() < 0.05) { // 5% chance for demo
                signalStrength = false;
                userMarker.getElement().classList.add('signal-lost');
                
                if (!document.querySelector('.signal-warning')) {
                    const warning = document.createElement('div');
                    warning.className = 'signal-warning glass-panel';
                    warning.innerHTML = '📡 Signal lost - using last known location';
                    warning.style.cssText = `
                        position: fixed;
                        top: 150px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: var(--amber);
                        color: white;
                        padding: 10px 20px;
                        border-radius: 40px;
                        z-index: 2000;
                        font-weight: 500;
                    `;
                    document.body.appendChild(warning);
                    
                    setTimeout(() => warning.remove(), 3000);
                }
            } else {
                signalStrength = true;
                userMarker.getElement().classList.remove('signal-lost');
            }
        }
    }, 15000);
}

// ===== HAPTIC FEEDBACK =====
function setupHapticFeedback() {
    const hapticElement = document.createElement('div');
    hapticElement.className = 'haptic-feedback';
    document.body.appendChild(hapticElement);
    
    document.querySelectorAll('button, .sos-slide-track, .geofence-item, .contact-item').forEach(element => {
        element.addEventListener('click', () => simulateHaptic('light'));
        element.addEventListener('touchstart', () => simulateHaptic('light'));
    });
}

function simulateHaptic(intensity = 'light') {
    const haptic = document.querySelector('.haptic-feedback');
    if (!haptic) return;
    
    haptic.classList.add('active');
    
    if ('vibrate' in navigator) {
        if (intensity === 'heavy') {
            navigator.vibrate([200, 100, 200]);
        } else if (intensity === 'double') {
            navigator.vibrate([50, 50, 50]);
        } else {
            navigator.vibrate(30);
        }
    }
    
    setTimeout(() => {
        haptic.classList.remove('active');
    }, 300);
}

// ===== SLIDE TO SOS =====
function setupSlideToSOS() {
    const slideContainer = document.querySelector('.sos-slide-container');
    if (!slideContainer) return;
    
    const slideTrack = slideContainer.querySelector('.sos-slide-track');
    const slideThumb = slideContainer.querySelector('.sos-slide-thumb');
    const slideProgress = slideContainer.querySelector('.sos-slide-progress');
    
    if (!slideTrack || !slideThumb || !slideProgress) return;
    
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    const maxSlide = slideTrack.offsetWidth - slideThumb.offsetWidth - 10;
    
    const onMouseMove = (e) => {
        if (!isDragging) return;
        
        e.preventDefault();
        currentX = e.clientX - startX;
        currentX = Math.max(0, Math.min(currentX, maxSlide));
        
        slideThumb.style.left = currentX + 5 + 'px';
        const progressWidth = (currentX / maxSlide) * 100;
        slideProgress.style.width = progressWidth + '%';
        
        if (currentX >= maxSlide) {
            triggerSOS();
            resetSOSSlider();
        }
    };
    
    const onMouseUp = () => {
        if (isDragging) {
            isDragging = false;
            resetSOSSlider();
        }
    };
    
    slideThumb.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - currentX;
        slideThumb.style.transition = 'none';
        slideProgress.style.transition = 'none';
    });
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // Touch events
    slideThumb.addEventListener('touchstart', (e) => {
        isDragging = true;
        startX = e.touches[0].clientX - currentX;
        slideThumb.style.transition = 'none';
        slideProgress.style.transition = 'none';
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        currentX = e.touches[0].clientX - startX;
        currentX = Math.max(0, Math.min(currentX, maxSlide));
        
        slideThumb.style.left = currentX + 5 + 'px';
        const progressWidth = (currentX / maxSlide) * 100;
        slideProgress.style.width = progressWidth + '%';
        
        if (currentX >= maxSlide) {
            triggerSOS();
            resetSOSSlider();
        }
    });
    
    document.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            resetSOSSlider();
        }
    });
    
    function resetSOSSlider() {
        slideThumb.style.transition = 'left 0.3s ease';
        slideProgress.style.transition = 'width 0.3s ease';
        slideThumb.style.left = '5px';
        slideProgress.style.width = '0%';
        currentX = 0;
    }
}

function triggerSOS() {
    startSOSPreAlert();
}

function startSOSPreAlert() {
    if (silentSOSMode) {
        dispatchSOS(true);
        return;
    }

    const modal = document.getElementById('sos-prealert-modal');
    const countdown = document.getElementById('sos-countdown');
    const sendNowBtn = document.getElementById('send-sos-now-btn');
    if (!modal || !countdown) {
        dispatchSOS(false);
        return;
    }

    clearInterval(sosCountdownInterval);
    sosCountdownRemaining = SOS_PREALERT_SECONDS;
    countdown.textContent = sosCountdownRemaining.toString();
    if (sendNowBtn) {
        sendNowBtn.textContent = 'Send Now';
        sendNowBtn.classList.remove('critical-armed');
    }
    delete criticalActionArm.sos_send_now;
    modal.classList.add('active');
    simulateHaptic('double');

    sosCountdownInterval = setInterval(() => {
        sosCountdownRemaining -= 1;
        countdown.textContent = Math.max(0, sosCountdownRemaining).toString();
        if (sosCountdownRemaining <= 0) {
            clearInterval(sosCountdownInterval);
            modal.classList.remove('active');
            dispatchSOS(false);
        }
    }, 1000);
}

function cancelSOSPreAlert() {
    clearInterval(sosCountdownInterval);
    sosCountdownInterval = null;
    const modal = document.getElementById('sos-prealert-modal');
    const sendNowBtn = document.getElementById('send-sos-now-btn');
    if (modal) {
        modal.classList.remove('active');
    }
    if (sendNowBtn) {
        sendNowBtn.textContent = 'Send Now';
        sendNowBtn.classList.remove('critical-armed');
    }
    delete criticalActionArm.sos_send_now;
    showNotification('SOS canceled', 'Emergency alert was not sent.');
}

function confirmSOSNow() {
    runCriticalAction('sos_send_now', 'send SOS now', () => {
        clearInterval(sosCountdownInterval);
        sosCountdownInterval = null;
        const modal = document.getElementById('sos-prealert-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        dispatchSOS(false);
    });
}

function dispatchSOS(isSilent) {
    let lastLocation = { lat: 40.7128, lng: -74.0060 };
    if (userMarker) {
        lastLocation = userMarker.getLatLng();
    }
    
    logSafetyEvent('SOS_MANUAL', {
        location: lastLocation,
        battery_level: getBatteryLevel(),
        silent_mode: isSilent
    });

    notifySafetyCircle('🚨 SOS ALERT', 
        `EMERGENCY! Last known location: https://maps.google.com/?q=${lastLocation.lat},${lastLocation.lng}`);

    if (isSilent) {
        updateStatusCard('warning', {
            title: 'Silent SOS sent',
            description: 'Emergency contacts notified discreetly'
        });
        return;
    }

    triggerAlert(
        '🚨 SOS EMERGENCY',
        'Emergency assistance requested! Your safety circle has been notified.'
    );
    simulateHaptic('heavy');
}

// ===== ALERT SYSTEM =====
function triggerAlert(title, message) {
    updateStatusCard('urgent', { title, description: message });
    recordAudit('ALERT_TRIGGERED', { title, message }, 'critical');
    
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-message').textContent = message;
    document.getElementById('alert-modal').classList.add('active');
    
    safetyCircle.forEach(contact => {
        contact.status = 'alerted';
    });
    updateSafetyCircleList();
    
    if (!silentSOSMode) {
        try {
            const audio = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
            audio.volume = 0.7;
            audio.play();
        } catch (e) {
            console.log('Audio play failed');
        }
    }
    
    showAlertChecklist();
}

function showAlertChecklist() {
    const number = emergencyNumbers[currentCountry] || emergencyNumbers.default;
    
    const checklist = document.createElement('div');
    checklist.className = 'alert-checklist';
    checklist.innerHTML = `
        <h4>Emergency Checklist</h4>
        <div class="checklist-item">
            <input type="checkbox" class="checklist-checkbox" id="step1">
            <label for="step1">Stay where you are</label>
        </div>
        <div class="checklist-item">
            <input type="checkbox" class="checklist-checkbox" id="step2">
            <label for="step2">Call local emergency: ${number}</label>
        </div>
        <div class="checklist-item">
            <input type="checkbox" class="checklist-checkbox" id="step3">
            <label for="step3">Share your location with responders</label>
        </div>
        <div class="checklist-item">
            <input type="checkbox" class="checklist-checkbox" id="step4">
            <label for="step4">Keep your phone charged</label>
        </div>
        <button class="btn-primary" onclick="document.getElementById('alert-modal').classList.remove('active')">
            ✓ I've Completed These Steps
        </button>
    `;
    
    const alertContent = document.querySelector('.alert-content');
    const oldChecklist = document.querySelector('.alert-checklist');
    if (oldChecklist) oldChecklist.remove();
    alertContent.appendChild(checklist);
}

function updateStatusCard(status, message) {
    const statusCard = document.getElementById('status-card');
    if (!statusCard) return;
    
    const indicator = statusCard.querySelector('.status-indicator');
    const strongText = statusCard.querySelector('strong');
    const spanText = statusCard.querySelector('span');
    
    statusCard.classList.remove('urgent', 'warning', 'info');
    
    switch(status) {
        case 'urgent':
            statusCard.classList.add('urgent');
            indicator.className = 'status-indicator red';
            break;
        case 'warning':
            statusCard.classList.add('warning');
            indicator.className = 'status-indicator amber';
            break;
        case 'info':
            indicator.className = 'status-indicator soft-blue';
            break;
        default:
            indicator.className = 'status-indicator green';
    }
    
    strongText.textContent = message.title;
    spanText.textContent = message.description;
}

// ===== NOTIFICATIONS =====
function showNotification(title, message) {
    recordAudit('NOTIFICATION', { title }, 'info');
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: message });
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <strong>${title}</strong><br>
        <span>${message}</span>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 400px;
        background: var(--white);
        color: var(--charcoal);
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 2000;
        border-left: 4px solid var(--teal);
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function notifySafetyCircle(title, message) {
    recordAudit('SAFETY_CIRCLE_NOTIFIED', { title, contacts: safetyCircle.length }, 'warning');
    safetyCircle.forEach(contact => {
        console.log(`Alerting ${contact.name}: ${title} - ${message}`);
        
        const contactItems = document.querySelectorAll('.contact-item');
        contactItems.forEach(item => {
            if (item.querySelector('.contact-name').textContent === contact.name) {
                const status = item.querySelector('.contact-status');
                status.textContent = 'Alerted';
                status.style.background = 'var(--amber)';
            }
        });
    });
}

// ===== DISTANCE SCRUBBING =====
function showDistanceToGeofence(geofence) {
    if (!userMarker || !map) return;
    
    const userPos = userMarker.getLatLng();
    const geofencePos = geofence.center;
    
    const distance = calculateDistance(
        userPos.lat, userPos.lng,
        geofencePos.lat, geofencePos.lng
    );
    
    const walkingTimeSeconds = distance / 1.4;
    const walkingTimeMinutes = Math.round(walkingTimeSeconds / 60);
    
    const line = L.polyline([
        [userPos.lat, userPos.lng],
        [geofencePos.lat, geofencePos.lng]
    ], {
        color: '#2ecc71',
        weight: 3,
        opacity: 0.8,
        dashArray: '8, 8',
        className: 'distance-line'
    }).addTo(map);
    
    const geofenceList = document.getElementById('geofences-list');
    const distanceInfo = document.createElement('div');
    distanceInfo.className = 'distance-info';
    distanceInfo.innerHTML = `
        <h4>📍 Distance to ${geofence.name}</h4>
        <div class="distance-row">
            <span class="distance-label">Distance:</span>
            <span class="distance-value mono-text">${distance < 1000 ? Math.round(distance) + 'm' : (distance/1000).toFixed(2) + 'km'}</span>
        </div>
        <div class="distance-row">
            <span class="distance-label">Walking time:</span>
            <span class="distance-value walking-time">${walkingTimeMinutes} min</span>
        </div>
        <div class="distance-row">
            <span class="distance-label">Bearing:</span>
            <span class="distance-value mono-text">${calculateBearing(userPos, geofencePos)}°</span>
        </div>
        <button class="btn-secondary clear-distance">Clear</button>
    `;
    
    geofenceList.prepend(distanceInfo);
    
    distanceInfo.querySelector('.clear-distance').addEventListener('click', () => {
        distanceInfo.remove();
        map.removeLayer(line);
    });
    
    const bounds = L.latLngBounds([userPos, [geofencePos.lat, geofencePos.lng]]);
    map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1 });
    
    setTimeout(() => {
        if (distanceInfo.parentNode) {
            distanceInfo.remove();
            map.removeLayer(line);
        }
    }, 10000);
}

function calculateBearing(point1, point2) {
    const lat1 = point1.lat * Math.PI/180;
    const lat2 = point2.lat * Math.PI/180;
    const dLon = (point2.lng - point1.lng) * Math.PI/180;
    
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    
    const bearing = Math.atan2(y, x) * 180/Math.PI;
    return Math.round((bearing + 360) % 360);
}

// ===== SKELETON LOADING =====
function showSkeletonLoading() {
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.classList.add('map-loading');
    }
    
    const panels = document.querySelectorAll('.panel-section');
    panels.forEach(panel => {
        panel.classList.add('loading');
    });
    
    setTimeout(() => {
        if (mapContainer) {
            mapContainer.classList.remove('map-loading');
        }
        
        panels.forEach(panel => {
            panel.classList.remove('loading');
        });
    }, 1500);
}

// ===== EVENT LOGGING =====
function logSafetyEvent(eventType, eventData) {
    let location = { lat: 40.7128, lng: -74.0060 };
    if (userMarker) {
        location = userMarker.getLatLng();
    }
    
    const eventLog = {
        event_id: generateUUID(),
        trigger_type: eventType,
        battery_level: getBatteryLevel(),
        last_coord: location,
        timestamp: new Date().toISOString(),
        user_id: currentUser ? currentUser.email : 'demo-user',
        additional_data: eventData
    };
    
    let logs = JSON.parse(localStorage.getItem(EVENT_LOGS_KEY) || '[]');
    logs.push(eventLog);
    localStorage.setItem(EVENT_LOGS_KEY, JSON.stringify(logs));
    enqueuePendingEvent(eventLog);
    recordAudit('EVENT_LOGGED', { eventType }, 'info');
    
    console.log('Safety Event Logged:', eventLog);
}

function readPendingEvents() {
    try {
        const queued = JSON.parse(localStorage.getItem(EVENT_QUEUE_KEY) || '[]');
        return Array.isArray(queued) ? queued : [];
    } catch (error) {
        return [];
    }
}

function writePendingEvents(events) {
    localStorage.setItem(EVENT_QUEUE_KEY, JSON.stringify(events));
}

function enqueuePendingEvent(eventLog) {
    const queued = readPendingEvents();
    queued.push(eventLog);
    writePendingEvents(queued);
    flushPendingEvents();
}

async function flushPendingEvents() {
    if (isFlushingEvents) return;
    if (!navigator.onLine) return;

    const queued = readPendingEvents();
    if (queued.length === 0) return;

    isFlushingEvents = true;
    try {
        const remaining = [];
        for (const eventLog of queued) {
            try {
                const response = await fetch(EVENT_API_URL + '/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(eventLog)
                });
                if (!response.ok) {
                    remaining.push(eventLog);
                }
            } catch (error) {
                remaining.push(eventLog);
            }
        }
        writePendingEvents(remaining);
        updateSafetyReadinessUI();
    } finally {
        isFlushingEvents = false;
    }
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function logLocation(locationData) {
    console.log('Location logged:', locationData);
}

// ===== DEMO LOGIN =====
function demoLogin() {
    currentUser = DEMO_USER;
    
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('dashboard-screen').classList.add('active');
    document.getElementById('user-email').textContent = DEMO_USER.email;
    
    showSkeletonLoading();
    
    setTimeout(() => {
        initMap();
    }, 500);
    
    console.log('Demo login successful');
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('SafePath app starting...');
    
    silentSOSMode = localStorage.getItem('silentSOSMode') === 'true';

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // Create coordinate display
    if (!document.getElementById('coordinate-display')) {
        const coordDisplay = document.createElement('div');
        coordDisplay.id = 'coordinate-display';
        coordDisplay.className = 'coordinate-display';
        coordDisplay.innerHTML = '📍 Waiting for GPS...';
        document.body.appendChild(coordDisplay);
    }
    
    // Setup UI elements
    setupNightVisionToggle();
    setupSlideToSOS();
    setupHapticFeedback();
    setupBatteryMonitoring();
    window.addEventListener('online', flushPendingEvents);
    window.addEventListener('online', updateSafetyReadinessUI);
    window.addEventListener('offline', updateSafetyReadinessUI);
    setInterval(flushPendingEvents, 30000);
    updateHotelStatusUI();
    updateLanguageBridgeUI();
    renderVaultList();
    renderShareLinks();
    renderAuditTrail();
    updateSafetyReadinessUI();
    if (readinessRefreshInterval) {
        clearInterval(readinessRefreshInterval);
    }
    readinessRefreshInterval = setInterval(updateSafetyReadinessUI, 10000);
    
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            demoLogin();
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            currentUser = null;
            document.getElementById('login-screen').classList.add('active');
            document.getElementById('dashboard-screen').classList.remove('active');
            
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
            }
            if (hotelMonitorInterval) {
                clearInterval(hotelMonitorInterval);
                hotelMonitorInterval = null;
            }
            if (readinessRefreshInterval) {
                clearInterval(readinessRefreshInterval);
                readinessRefreshInterval = null;
            }
            stopDeadmanAmbientCapture();
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            
            if (map) {
                map.remove();
                map = null;
                userMarker = null;
            }
        });
    }
    
    // Add contact button
    const addContactBtn = document.getElementById('add-contact-btn');
    if (addContactBtn) {
        addContactBtn.addEventListener('click', () => {
            document.getElementById('contact-modal').classList.add('active');
        });
    }
    
    // Save contact button
    const saveContactBtn = document.getElementById('save-contact');
    if (saveContactBtn) {
        saveContactBtn.addEventListener('click', () => {
            const name = document.getElementById('contact-name').value;
            const email = document.getElementById('contact-email').value;
            const phone = document.getElementById('contact-phone').value;
            
            if (name && email) {
                addToSafetyCircle(name, email, phone);
                document.getElementById('contact-modal').classList.remove('active');
                
                document.getElementById('contact-name').value = '';
                document.getElementById('contact-email').value = '';
                document.getElementById('contact-phone').value = '';
            } else {
                alert('Please enter at least name and email');
            }
        });
    }
    
    // Add geofence button
    const addGeofenceBtn = document.getElementById('add-geofence-btn');
    if (addGeofenceBtn) {
        addGeofenceBtn.addEventListener('click', () => {
            if (!userMarker) {
                alert('Please wait for location to load');
                return;
            }
            
            const name = prompt('Enter zone name:', 'My Safe Zone');
            if (!name) return;
            
            const type = prompt('Enter zone type (safe/restricted):', 'safe');
            if (type !== 'safe' && type !== 'restricted') {
                alert('Type must be "safe" or "restricted"');
                return;
            }
            
            const radius = parseInt(prompt('Enter radius in meters:', '100'));
            if (isNaN(radius) || radius <= 0) {
                alert('Please enter a valid radius');
                return;
            }
            
            const { lat, lng } = userMarker.getLatLng();
            if (type === 'restricted') {
                runCriticalAction('create_restricted_zone', 'create restricted zone', () => {
                    createGeofence(name, { lat, lng }, radius, type);
                    updateSafetyReadinessUI();
                });
            } else {
                createGeofence(name, { lat, lng }, radius, type);
                updateSafetyReadinessUI();
            }
        });
    }
    
    // Start trip button
    const startTripBtn = document.getElementById('start-trip-btn');
    if (startTripBtn) {
        startTripBtn.addEventListener('click', startNewTrip);
    }
    
    // Acknowledge alert button
    const acknowledgeBtn = document.getElementById('acknowledge-alert');
    if (acknowledgeBtn) {
        acknowledgeBtn.addEventListener('click', () => {
            document.getElementById('alert-modal').classList.remove('active');
            
            updateStatusCard('nominal', { 
                title: 'All systems nominal', 
                description: 'Your safety circle is watching' 
            });
            
            safetyCircle.forEach(contact => {
                contact.status = 'watching';
            });
            updateSafetyCircleList();
        });
    }
    
    // Local emergency call button
    const emergencyCallBtn = document.getElementById('local-emergency-call');
    if (emergencyCallBtn) {
        emergencyCallBtn.addEventListener('click', callLocalEmergency);
    }

    const setHotelBtn = document.getElementById('set-hotel-btn');
    if (setHotelBtn) {
        setHotelBtn.addEventListener('click', setHotelBaseToCurrentLocation);
    }

    const reportRiskBtn = document.getElementById('report-hazard-btn');
    if (reportRiskBtn) {
        reportRiskBtn.addEventListener('click', reportRiskAtCurrentLocation);
    }

    const playPhraseBtn = document.getElementById('play-help-phrase-btn');
    if (playPhraseBtn) {
        playPhraseBtn.addEventListener('click', playHelpPhrase);
    }

    const playLastAudioBtn = document.getElementById('play-last-audio-btn');
    if (playLastAudioBtn) {
        playLastAudioBtn.disabled = !deadmanLastClipUrl;
        playLastAudioBtn.addEventListener('click', playLastCapturedClip);
    }

    const addVaultDocBtn = document.getElementById('add-vault-doc-btn');
    if (addVaultDocBtn) {
        addVaultDocBtn.addEventListener('click', addVaultDocument);
    }

    const createShareBtn = document.getElementById('create-share-link-btn');
    if (createShareBtn) {
        createShareBtn.addEventListener('click', createEmergencyShareLink);
    }

    const readinessRefreshBtn = document.getElementById('refresh-readiness-btn');
    if (readinessRefreshBtn) {
        readinessRefreshBtn.addEventListener('click', updateSafetyReadinessUI);
    }

    const presetSelect = document.getElementById('onboarding-preset');
    if (presetSelect) {
        const savedPreset = localStorage.getItem('safepath_onboarding_preset') || '';
        presetSelect.value = savedPreset;
    }

    const applyPresetBtn = document.getElementById('apply-preset-btn');
    if (applyPresetBtn) {
        applyPresetBtn.addEventListener('click', applyOnboardingPreset);
    }
    
    // Shadow track toggle
    const shadowToggle = document.getElementById('shadow-track-toggle');
    if (shadowToggle) {
        shadowToggle.checked = localStorage.getItem('shadowTrackEnabled') === 'true';
        shadowTrackEnabled = shadowToggle.checked;
        const shadowStatus = document.getElementById('shadow-track-status');
        if (shadowStatus) {
            shadowStatus.textContent = shadowTrackEnabled ? 'High-frequency' : 'Adaptive';
        }
        shadowToggle.addEventListener('change', toggleShadowTrack);
    }

    const silentSOSToggle = document.getElementById('silent-sos-toggle');
    if (silentSOSToggle) {
        silentSOSToggle.checked = silentSOSMode;
        toggleSilentSOS({ target: silentSOSToggle });
        silentSOSToggle.addEventListener('change', toggleSilentSOS);
    }
    
    // Timer button
    const startTimerBtn = document.getElementById('start-timer-btn');
    if (startTimerBtn) {
        startTimerBtn.addEventListener('click', startSafetyTimer);
    }
    
    // Check-in button
    const checkInBtn = document.getElementById('check-in-btn');
    if (checkInBtn) {
        checkInBtn.addEventListener('click', checkInSafe);
    }

    const cancelSOSBtn = document.getElementById('cancel-sos-btn');
    if (cancelSOSBtn) {
        cancelSOSBtn.addEventListener('click', cancelSOSPreAlert);
    }

    const sendSOSNowBtn = document.getElementById('send-sos-now-btn');
    if (sendSOSNowBtn) {
        sendSOSNowBtn.addEventListener('click', confirmSOSNow);
    }
    
    // Close modal buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            document.getElementById('contact-modal').classList.remove('active');
            document.getElementById('alert-modal').classList.remove('active');
        });
    });
    
    // Click outside modal to close
    window.addEventListener('click', (e) => {
        const vaultBtn = e.target.closest('.vault-open-btn');
        if (vaultBtn) {
            openVaultDocument(vaultBtn.dataset.docId);
            return;
        }
        const shareBtn = e.target.closest('.share-copy-btn');
        if (shareBtn) {
            copyShareLink(shareBtn.dataset.shareId);
            return;
        }
        if (e.target.classList.contains('modal')) {
            if (e.target.id === 'sos-prealert-modal') {
                cancelSOSPreAlert();
                return;
            }
            e.target.classList.remove('active');
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (map) {
            map.invalidateSize();
        }
    });
});

// Export for debugging
window.SafePath = {
    getState: () => ({
        currentUser,
        map,
        geofences,
        safetyCircle,
        currentTrip,
        hotelBase,
        riskPoints,
        shadowTrackEnabled,
        silentSOSMode,
        signalStrength,
        currentCountry,
        readiness: getSafetyReadinessState()
    }),
    getEvents: () => JSON.parse(localStorage.getItem(EVENT_LOGS_KEY) || '[]'),
    getPendingEvents: () => JSON.parse(localStorage.getItem(EVENT_QUEUE_KEY) || '[]'),
    getAuditTrail: () => JSON.parse(localStorage.getItem(AUDIT_TRAIL_KEY) || '[]'),
    getVaultIndex: () => JSON.parse(localStorage.getItem(VAULT_KEY) || '[]').map(d => ({
        id: d.id,
        title: d.title,
        createdAt: d.createdAt
    })),
    exportEvents: () => {
        const events = JSON.parse(localStorage.getItem(EVENT_LOGS_KEY) || '[]');
        console.log('Events:', events);
        alert('Check console for events');
    }
};
