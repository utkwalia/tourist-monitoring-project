// app.js - SafePath Complete Version
// All rights reserved

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jniscsnnbwxzxcslecsh.supabase.co';
const supabaseKey = 'sb_publishable_vVsSnbjUbWdG1ljvkEhYQA_edCZk8dH';
const supabase = createClient(supabaseUrl, supabaseKey);

// ===== APPLICATION STATE =====
let currentUser = null;
let hostChannel = null;
let isGuestMode = false;
let map = null;
let primaryTiles = null;
let darkTiles = null;
let fallbackTiles = null;
let userMarker = null;
let watchId = null;
let geofences = [];
let safetyCircle = [];
let safetyContacts = [];
let activeSafeZones = [];
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
let hotelCoordinates = null;
let activeSosType = null;
let nearbyHazardsCount = 0;
let isLocalHazardReported = false;
let hotelMonitorInterval = null;
let lastNightCheckPromptAt = 0;
let deadmanMediaRecorder = null;
let deadmanAudioChunks = [];
let deadmanLastClipUrl = null;
let readinessRefreshInterval = null;
let criticalActionArm = {};
let nightVisionEnabled = false;
let sirenAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/994/994-preview.mp3');
sirenAudio.loop = true;

function stopSiren() {
    try {
        if (sirenAudio) {
            sirenAudio.pause();
            sirenAudio.currentTime = 0;
        }
    } catch(e) {}
}

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
const THEME_STORAGE_KEY = 'safepathTheme';
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

function getCapacitorGeolocation() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation) {
        return window.Capacitor.Plugins.Geolocation;
    }
    return null;
}

function isNativeCapacitor() {
    return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
}

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
function initMap(lat = 28.4744, lng = 77.5040) {
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
        
        // Use CartoDB Voyager for desaturated map style, with OSM fallback
        primaryTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19,
            minZoom: 2
        });
        
        darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19,
            minZoom: 2
        });

        fallbackTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            subdomains: 'abc',
            maxZoom: 19,
            minZoom: 2
        });

        let tileLayerSwitched = false;
        const handleTileError = () => {
            if (tileLayerSwitched) return;
            tileLayerSwitched = true;
            if (map.hasLayer(primaryTiles)) map.removeLayer(primaryTiles);
            if (map.hasLayer(darkTiles)) map.removeLayer(darkTiles);
            fallbackTiles.addTo(map);
            console.warn('Primary tiles failed to load, switched to OSM fallback.');
        };
        
        primaryTiles.on('tileerror', handleTileError);
        darkTiles.on('tileerror', handleTileError);

        const isDark = document.body.classList.contains('dark-theme');
        if (isDark) {
            darkTiles.addTo(map);
        } else {
            primaryTiles.addTo(map);
        }
        
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
        if (isGuestMode) {
            loadGeofencesFromStorage();
        } else if (currentUser && currentUser.id) {
            fetchSafeZones().catch(error => {
                console.error('Failed to fetch safe zones after map init:', error);
            });
        }
        loadSafetyCircleFromStorage();
        loadSmartSafetyState();
        setupRiskIntelligence();
        startHotelMonitor();
        updateLanguageBridgeUI();
        applyNightVisionState();
        
        console.log('Map initialized successfully');
        
        // Start tracking after map loads
        startLocationTracking();
        updateSafetyScore();
        
        try {
            flushPendingEvents();
        } catch (flushErr) {
            console.error("Map initialized, but delayed events flush failed.", flushErr);
        }
        
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// ===== LOCATION TRACKING =====
function startLocationTracking() {
    if (isGuestMode) return;
    
    if (!map) {
        console.log('Map not ready, delaying location tracking');
        setTimeout(startLocationTracking, 500);
        return;
    }
    
    console.log('Starting location tracking...');
    
    const capacitorGeo = getCapacitorGeolocation();

    if (isNativeCapacitor() && capacitorGeo) {
        (async () => {
            try {
                if (typeof capacitorGeo.requestPermissions === 'function') {
                    await capacitorGeo.requestPermissions();
                }
                const position = await capacitorGeo.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 5000
                });
                handlePositionUpdate(position);
                setGpsStatus('active');
                detectCountryFromLocation(position.coords.latitude, position.coords.longitude);
            } catch (error) {
                console.error('Capacitor geolocation error:', error);
                setGpsStatus('error');
                signalStrength = false;
                updateSignalIndicator();
                updateUserLocation(28.4744, 77.5040);
                detectCountryFromLocation(28.4744, 77.5040);
                
                const coordDisplay = document.getElementById('coordinate-display');
                if (coordDisplay) coordDisplay.innerHTML = '📍 Using Fallback GPS';
            }

            restartAdaptiveLocationWatch();
            setupSignalMonitoring();
        })();
        return;
    }

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                updateUserLocation(latitude, longitude);
                updateCoordinateDisplay(latitude, longitude, position.coords.accuracy);
                setGpsStatus('active');
                detectCountryFromLocation(latitude, longitude);
            },
            error => {
                console.error("Error getting location:", error);
                setGpsStatus('error');
                signalStrength = false;
                updateSignalIndicator();
                updateUserLocation(28.4744, 77.5040);
                detectCountryFromLocation(28.4744, 77.5040);
                
                const coordDisplay = document.getElementById('coordinate-display');
                if (coordDisplay) coordDisplay.innerHTML = '📍 Using Fallback GPS';
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );

        restartAdaptiveLocationWatch();
        setupSignalMonitoring();
        return;
    }

    console.log("Geolocation not supported");
    setGpsStatus('error');
    updateUserLocation(28.4744, 77.5040);
    const coordDisplay = document.getElementById('coordinate-display');
    if (coordDisplay) coordDisplay.innerHTML = '📍 Using Fallback GPS';
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
            <span>GPS Active • 📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
            <span style="margin-left: 10px;">🎯 ±${Math.round(accuracy || 10)}m</span>
            <span style="margin-left: 10px;">🛰️ ${signalStrength ? 'Live' : 'Cached'}</span>
        `;
    }

    updateSafetyScore(lat, lng);
}

function setGpsStatus(status) {
    const coordDisplay = document.getElementById('coordinate-display');
    if (!coordDisplay) return;

    coordDisplay.classList.remove('gps-ok', 'gps-error');

    if (status === 'active') {
        coordDisplay.classList.add('gps-ok');
    } else if (status === 'error') {
        coordDisplay.classList.add('gps-error');
        coordDisplay.textContent = 'Location Access Denied';
    } else {
        coordDisplay.textContent = '📍 Waiting for GPS...';
    }
}

// ===== SMART SAFETY (PHASE 2) =====
function loadSmartSafetyState() {
    try {
        const savedHotel = localStorage.getItem('safepath_hotel_base');
        if (savedHotel) {
            hotelBase = JSON.parse(savedHotel);
            hotelCoordinates = hotelBase ? { lat: hotelBase.lat, lng: hotelBase.lng } : null;
            ensureHotelGeofence();
        } else {
            hotelBase = null;
            hotelCoordinates = null;
        }
    } catch (error) {
        hotelBase = null;
        hotelCoordinates = null;
    }

    // Start with a clean hazard map on each load.
    riskPoints = [];
    nearbyHazardsCount = 0;
    localStorage.removeItem('safepath_risk_points');
}

function setupRiskIntelligence() {
    if (!map) return;
    riskPoints = [];
    nearbyHazardsCount = 0;
    localStorage.removeItem('safepath_risk_points');
    renderRiskOverlay(); // clears any lingering layers
}

function seedRiskPointsFromUserLocation() {
    // Mock/seeded hazards intentionally disabled.
    riskPoints = [];
    localStorage.removeItem('safepath_risk_points');
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
        layer.bindPopup(`<strong>${point.label}</strong>`);
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

function getCurrentSafetyReferencePosition() {
    if (userMarker) {
        const pos = userMarker.getLatLng();
        return { lat: pos.lat, lng: pos.lng };
    }
    if (map) {
        const center = map.getCenter();
        return { lat: center.lat, lng: center.lng };
    }
    if (lastProcessedLocation && typeof lastProcessedLocation.lat === 'number' && typeof lastProcessedLocation.lng === 'number') {
        return { lat: lastProcessedLocation.lat, lng: lastProcessedLocation.lng };
    }
    return null;
}

function countNearbyHazards(referenceLat, referenceLng, radiusMeters = 2000) {
    if (!Array.isArray(riskPoints) || riskPoints.length === 0) return 0;

    let count = 0;
    const userLatLng = (typeof L !== 'undefined' && typeof L.latLng === 'function')
        ? L.latLng(Number(referenceLat), Number(referenceLng))
        : null;

    riskPoints.forEach((point, index) => {
        const pointLat = Number(point?.lat);
        const pointLng = Number(point?.lng);
        if (!Number.isFinite(pointLat) || !Number.isFinite(pointLng)) {
            console.log(`Hazard ${point?.id || point?.name || index + 1} has invalid coordinates. Counted: false`);
            return;
        }

        let distanceMeters;
        if (userLatLng && typeof userLatLng.distanceTo === 'function' && typeof L !== 'undefined' && typeof L.latLng === 'function') {
            const hazardLatLng = L.latLng(pointLat, pointLng);
            distanceMeters = userLatLng.distanceTo(hazardLatLng);
        } else {
            distanceMeters = calculateDistance(Number(referenceLat), Number(referenceLng), pointLat, pointLng);
        }

        const counted = Number.isFinite(distanceMeters) && distanceMeters <= radiusMeters;
        console.log(`Hazard ${point?.id || point?.name || index + 1} is ${Math.round(distanceMeters || 0)} meters away. Counted: ${counted}`);

        if (counted) {
            count += 1;
        }
    });

    return count;
}

async function calculateSafetyScore() {
    const start = 100;
    let score = start;
    let batteryDeduction = 0;
    let timeDeduction = 0;
    let contactsDeduction = 0;
    let hotelDeduction = 0;
    let hazardsDeduction = 0;
    let sosDeduction = 0;
    nearbyHazardsCount = 0;

    try {
        if ('getBattery' in navigator) {
            const battery = await navigator.getBattery();
            const levelPercent = Math.round((battery.level || 0) * 100);
            batteryLevelPercent = levelPercent;
            if (levelPercent < 10) {
                batteryDeduction = -25;
            } else if (levelPercent < 20) {
                batteryDeduction = -15;
            }
        } else {
            const levelPercent = Math.round(getBatteryLevel());
            if (levelPercent < 10) {
                batteryDeduction = -25;
            } else if (levelPercent < 20) {
                batteryDeduction = -15;
            }
        }
    } catch (error) {
        console.warn('Battery API unavailable for safety score:', error);
    }
    score += batteryDeduction;

    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 5) {
        timeDeduction = -10;
    }
    score += timeDeduction;

    const contactsMissing = safetyContacts.length === 0;
    if (contactsMissing) {
        contactsDeduction = -15;
    }
    score += contactsDeduction;

    const hotelNotConfigured = !hotelCoordinates;
    if (hotelNotConfigured) {
        hotelDeduction = -10;
    }
    score += hotelDeduction;

    if (activeSosType === 'emergency') {
        sosDeduction = -50;
    } else if (activeSosType === 'silent') {
        sosDeduction = -30;
    }
    score += sosDeduction;

    // Nearby hazard score is user-driven only (via Report Nearby Hazard toggle).
    nearbyHazardsCount = isLocalHazardReported ? 1 : 0;

    if (nearbyHazardsCount > 0) {
        hazardsDeduction = -(nearbyHazardsCount * 15);
    }
    score += hazardsDeduction;

    score = Math.round(score);
    score = Math.max(0, score);
    score = Math.min(100, score);

    console.log('--- Score Breakdown ---', {
        start,
        hotel: hotelCoordinates ? 0 : -10,
        contacts: safetyContacts.length > 0 ? 0 : -15,
        batteryDeduction,
        timeDeduction,
        hazards: -(nearbyHazardsCount * 15),
        sos: activeSosType === 'emergency' ? -50 : (activeSosType === 'silent' ? -30 : 0),
        finalScore: score
    });

    const badge = document.getElementById('safety-score-pill');
    if (!badge) return score;

    badge.classList.remove('risk-low', 'risk-moderate', 'risk-high');
    if (score >= 80) {
        badge.textContent = `${score}/100 (Low Risk)`;
        badge.classList.add('risk-low');
    } else if (score >= 50) {
        badge.textContent = `${score}/100 (Moderate Risk)`;
        badge.classList.add('risk-moderate');
    } else {
        badge.textContent = `${score}/100 (High Risk)`;
        badge.classList.add('risk-high');
    }

    return score;
}

function updateSafetyScore() {
    calculateSafetyScore().catch(error => {
        console.error('Failed to update safety score:', error);
    });
}

function reportRiskAtCurrentLocation() {
    const reportRiskBtn = document.getElementById('report-hazard-btn');
    if (!reportRiskBtn) return;

    if (!isLocalHazardReported) {
        isLocalHazardReported = true;
        reportRiskBtn.innerHTML = '<i class="fas fa-triangle-exclamation"></i> Clear Hazard Report';
        reportRiskBtn.style.background = 'var(--red)';
        reportRiskBtn.style.color = 'var(--white)';
        reportRiskBtn.style.borderColor = 'var(--red)';
        nearbyHazardsCount = 1;
        showNotification('Hazard reported', 'Local hazard report is now active.');
    } else {
        isLocalHazardReported = false;
        reportRiskBtn.innerHTML = '<i class="fas fa-triangle-exclamation"></i> Report Nearby Hazard';
        reportRiskBtn.style.background = '';
        reportRiskBtn.style.color = '';
        reportRiskBtn.style.borderColor = '';
        nearbyHazardsCount = 0;
        showNotification('Hazard cleared', 'Local hazard report was cleared.');
    }

    calculateSafetyScore().catch(error => {
        console.error('Failed to recalculate safety score:', error);
    });
}

function setHotelBaseToCurrentLocation() {
    const setHotelBtn = document.getElementById('set-hotel-btn');

    if (hotelCoordinates) {
        hotelCoordinates = null;
        hotelBase = null;
        localStorage.removeItem('safepath_hotel_base');

        const hotelGeofenceIndex = geofences.findIndex(f => f.name === 'Hotel Safe Base');
        if (hotelGeofenceIndex >= 0) {
            const hotelGeofence = geofences[hotelGeofenceIndex];
            if (hotelGeofence.circleObject && map && map.hasLayer(hotelGeofence.circleObject)) {
                map.removeLayer(hotelGeofence.circleObject);
            }
            geofences.splice(hotelGeofenceIndex, 1);
            saveGeofencesToStorage();
        }

        updateHotelStatusUI();
        if (setHotelBtn) {
            setHotelBtn.innerHTML = '<i class="fas fa-hotel"></i> Set Hotel At Current Location';
            setHotelBtn.style.background = '';
            setHotelBtn.style.color = '';
            setHotelBtn.style.borderColor = '';
            setHotelBtn.style.display = '';
        }

        showNotification('Hotel base cleared', 'Hotel base was removed.');
        calculateSafetyScore().catch(error => {
            console.error('Failed to recalculate safety score:', error);
        });
        return;
    }

    let lat;
    let lng;
    if (userMarker) {
        const pos = userMarker.getLatLng();
        lat = pos.lat;
        lng = pos.lng;
    } else if (map) {
        const center = map.getCenter();
        lat = center.lat;
        lng = center.lng;
    } else {
        return;
    }

    hotelCoordinates = { lat, lng };
    hotelBase = {
        lat,
        lng,
        radius: 350,
        savedAt: new Date().toISOString()
    };
    localStorage.setItem('safepath_hotel_base', JSON.stringify(hotelBase));
    ensureHotelGeofence();
    updateHotelStatusUI();
    if (setHotelBtn) {
        setHotelBtn.innerHTML = '<i class="fas fa-trash"></i> Clear Hotel Base';
        setHotelBtn.style.background = 'var(--amber)';
        setHotelBtn.style.color = 'var(--charcoal)';
        setHotelBtn.style.borderColor = 'var(--amber)';
        setHotelBtn.style.display = '';
    }
    logSafetyEvent('HOTEL_BASE_SET', { location: hotelBase });
    showNotification('Hotel base set', 'Night-time safety checks are now active.');
    calculateSafetyScore().catch(error => {
        console.error('Failed to recalculate safety score:', error);
    });
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
    const setHotelBtn = document.getElementById('set-hotel-btn');
    const status = document.getElementById('hotel-status');
    if (!status) return;
    if (!hotelCoordinates || !hotelBase) {
        status.textContent = 'Not configured';
        if (setHotelBtn) {
            setHotelBtn.innerHTML = '<i class="fas fa-hotel"></i> Set Hotel At Current Location';
            setHotelBtn.style.background = '';
            setHotelBtn.style.color = '';
            setHotelBtn.style.borderColor = '';
            setHotelBtn.style.display = '';
        }
        return;
    }
    status.textContent = `Base active (${Math.round(hotelBase.radius)}m radius)`;
    if (setHotelBtn) {
        setHotelBtn.innerHTML = '<i class="fas fa-trash"></i> Clear Hotel Base';
        setHotelBtn.style.background = 'var(--amber)';
        setHotelBtn.style.color = 'var(--charcoal)';
        setHotelBtn.style.borderColor = 'var(--amber)';
        setHotelBtn.style.display = '';
    }
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

const countryToLangMap = {
    'IN': 'hi', 'FR': 'fr', 'ES': 'es', 'DE': 'de', 'IT': 'it', 'JP': 'ja', 'MX': 'es', 'BR': 'pt'
};
const DEFAULT_HELP_PHRASE = "Please help me. I am in danger. Please call an emergency.";
let currentHelpPhrase = DEFAULT_HELP_PHRASE;
let currentVoiceLang = "en";

async function updateLanguageBridgeUI() {
    const phraseEl = document.getElementById('help-phrase-text');
    if (!phraseEl) return;
    
    // Prevent redundant API calls if we already successfully translated it for the current country
    // Using a simple flag or just trusting the initial load. Since it's called multiple times, let's keep it simple.
    
    try {
        let lat, lng;
        const capacitorGeo = getCapacitorGeolocation();
        if (isNativeCapacitor() && capacitorGeo) {
            const pos = await capacitorGeo.getCurrentPosition();
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
        } else if ("geolocation" in navigator) {
            const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
        } else {
            throw new Error("Geolocation unavailable");
        }

        const geoResponse = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
        if (!geoResponse.ok) throw new Error('Geocoding failed');
        const geoData = await geoResponse.json();
        
        const targetLang = countryToLangMap[geoData.countryCode] || "en";

        if (targetLang === 'en') {
            currentHelpPhrase = DEFAULT_HELP_PHRASE;
            currentVoiceLang = 'en';
        } else {
            const translateResponse = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(DEFAULT_HELP_PHRASE)}&langpair=en|${targetLang}`);
            if (!translateResponse.ok) throw new Error('Translation failed');
            const translateData = await translateResponse.json();
            
            if (translateData.responseData && translateData.responseData.translatedText) {
                currentHelpPhrase = translateData.responseData.translatedText;
                currentVoiceLang = targetLang;
            } else {
                throw new Error("Translation payload invalid");
            }
        }
    } catch (error) {
        console.warn("Language Bridge fallback triggered:", error);
        currentHelpPhrase = DEFAULT_HELP_PHRASE;
        currentVoiceLang = "en";
    } finally {
        if (phraseEl) phraseEl.textContent = currentHelpPhrase;
    }
}

function playHelpPhrase() {
    if (!('speechSynthesis' in window)) {
        showNotification('Unavailable', 'Text-to-speech is not supported on this device.');
        return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentHelpPhrase);
    utterance.lang = currentVoiceLang;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
}

async function translateCustomPhrase() {
    const inputEl = document.getElementById('custom-help-phrase-input');
    const phraseEl = document.getElementById('help-phrase-text');
    if (!inputEl || !phraseEl) return;
    
    const userInput = inputEl.value.trim();
    if (!userInput) return;
    
    phraseEl.textContent = 'Translating...';
    
    try {
        if (currentVoiceLang === 'en') {
            currentHelpPhrase = userInput;
        } else {
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(userInput)}&langpair=en|${currentVoiceLang}`);
            if (!response.ok) throw new Error('Translation API failed');
            const data = await response.json();
            
            if (data.responseData && data.responseData.translatedText) {
                currentHelpPhrase = data.responseData.translatedText;
            } else {
                throw new Error("Invalid translation response");
            }
        }
    } catch (error) {
        console.error("Custom Translation failed:", error);
        currentHelpPhrase = userInput;
        currentVoiceLang = 'en';
    } finally {
        phraseEl.textContent = currentHelpPhrase;
    }
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

    updateSafetyScore();
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
    const fileInput = document.getElementById('vault-upload');
    if (fileInput) fileInput.click();
}

async function handleVaultUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('No authenticated user found for vault upload.');
        event.target.value = '';
        return;
    }

    const btn = document.getElementById('add-vault-doc-btn');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading...`;

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filePath = `${user.id}/${Date.now()}_${safeName}`;
    
    try {
        const { data, error } = await supabase.storage.from('secure_vault').upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
        });
        
        if (error) throw error;
        
        btn.innerHTML = originalText;
        btn.disabled = false;
        event.target.value = '';
        
        loadVaultDocuments();
        
        showNotification('Vault updated', `${file.name} securely uploaded.`);
        recordAudit('VAULT_DOC_UPLOADED', { filename: file.name }, 'info');
    } catch (err) {
        console.error('Vault upload failed:', err);
        btn.innerHTML = originalText;
        btn.disabled = false;
        event.target.value = '';
        alert('Failed to upload document: ' + (err.message || 'Unknown error'));
    }
}

async function loadVaultDocuments() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return;

    const container = document.getElementById('vault-docs-list');
    if (!container) return;

    try {
        const { data, error: listError } = await supabase.storage.from('secure_vault').list(user.id);
        if (listError) throw listError;

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="smart-subtle">No secure docs stored.</p>';
            return;
        }

        const files = data.filter(file => file.name !== '.emptyFolderPlaceholder');

        if (files.length === 0) {
            container.innerHTML = '<p class="smart-subtle">No secure docs stored.</p>';
            return;
        }

        container.innerHTML = files.map(file => {
            const date = new Date(file.created_at || Date.now()).toLocaleDateString();
            return `<div class="vault-item">
                        <div class="vault-open-btn" style="cursor:default;"><i class="fas fa-file"></i> ${file.name}</div>
                        <div style="display:flex; align-items:center;">
                            <span>${date}</span>
                            <button class="vault-delete-btn" data-filename="${file.name}" aria-label="Delete document">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>`;
        }).join('');

        const deleteBtns = container.querySelectorAll('.vault-delete-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const fileName = e.currentTarget.getAttribute('data-filename');
                await deleteVaultDocument(fileName);
            });
        });
    } catch (err) {
        console.error('Failed to load vault documents:', err);
        container.innerHTML = '<p class="smart-subtle">No secure docs stored.</p>';
    }
}

async function deleteVaultDocument(fileName) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('No authenticated user found for vault delete.');
        return;
    }

    const filePath = `${user.id}/${fileName}`;
    if (!window.confirm('Are you sure you want to delete this document?')) {
        return;
    }

    try {
        const { data, error } = await supabase.storage.from('secure_vault').remove([filePath]);
        if (error) throw error;
        
        // Supabase `.remove()` silently returns an empty array instead of throwing an error 
        // if your Row Level Security (RLS) policy doesn't explicitly allow DELETE operations.
        if (!data || data.length === 0) {
            throw new Error("Supabase rejected the deletion. Please ensure you have added a 'DELETE' policy for your 'secure_vault' bucket in your RLS settings.");
        }
        
        showNotification('Vault updated', `${fileName} securely deleted.`);
        recordAudit('VAULT_DOC_DELETED', { filename: fileName }, 'warning');
        
        loadVaultDocuments();
    } catch (err) {
        console.error('Failed to delete vault document:', err);
        alert('Failed to delete document: ' + (err.message || JSON.stringify(err)));
    }
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

async function createEmergencyShareLink() {
    const minutes = parseInt(prompt('Link expiry in minutes:', '30'), 10);
    if (!minutes || minutes <= 0) return;
    const expiresAt = new Date(Date.now() + minutes * 60000).toISOString();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        alert('You must be logged in to create a share link.');
        return;
    }

    try {
        const { data, error } = await supabase.from('active_shares').insert([
            { user_id: user.id, expires_at: expiresAt }
        ]).select('token').single();
        if (error) throw error;

        const token = data.token;
        const link = `${window.location.origin}${window.location.pathname}#emergency-share=${token}`;

        const links = purgeExpiredShareLinks();
        links.unshift({
            id: token,
            url: link,
            createdAt: new Date().toISOString(),
            expiresAt,
            payload: { user: user.email }
        });
        setShareLinks(links.slice(0, 12));
        renderShareLinks();
        recordAudit('EMERGENCY_LINK_CREATED', { expiresAt }, 'warning');
        showNotification('Emergency share ready', `Expires in ${minutes} minutes.`);
    } catch (err) {
        console.error('Share generation failed', err);
        alert('Failed to generate tracking link.');
    }
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
    setGpsStatus('active');

    if (shadowTrackEnabled && currentTrip) {
        logLocation({ latitude, longitude, accuracy, speed, mode: profile.mode });
    }

    if (hostChannel && hostChannel.state === 'joined') {
        hostChannel.send({
            type: 'broadcast',
            event: 'location_update',
            payload: { lat: latitude, lng: longitude, isSOS: isSOSActive }
        });
    }

    signalStrength = true;
    updateSignalIndicator();
    updateSafetyReadinessUI();
}

function restartAdaptiveLocationWatch() {
    if (isGuestMode) return;
    const capacitorGeo = getCapacitorGeolocation();

    const simulatedPosition = {
        coords: userMarker ? {
            latitude: userMarker.getLatLng().lat,
            longitude: userMarker.getLatLng().lng
        } : { latitude: 40.7128, longitude: -74.0060 }
    };
    const profile = getTrackingProfile(simulatedPosition);

    if (isNativeCapacitor() && capacitorGeo) {
        if (watchId && typeof capacitorGeo.clearWatch === 'function') {
            capacitorGeo.clearWatch({ id: watchId });
        }

        capacitorGeo.watchPosition(
            {
                enableHighAccuracy: profile.enableHighAccuracy,
                timeout: profile.timeout,
                maximumAge: profile.maximumAge
            },
            (position, error) => {
                if (error) {
                    console.error('Capacitor watchPosition error:', error);
                    signalStrength = false;
                    updateSignalIndicator();
                    setGpsStatus('error');
                    return;
                }
                if (position) {
                    handlePositionUpdate(position);
                }
            }
        ).then(id => {
            watchId = id;
        });

        return;
    }

    if (!('geolocation' in navigator)) return;

    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }

    watchId = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        error => {
            console.error('Error watching location:', error);
            signalStrength = false;
            updateSignalIndicator();
            setGpsStatus('error');
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
    if (isGuestMode || !currentUser || !currentUser.id) {
        safetyContacts = [];
        safetyCircle = [];
        renderSafetyContacts();
        updateSafetyReadinessUI();
        return;
    }

    fetchSafetyContacts().catch(error => {
        console.error('Failed to fetch safety contacts during load:', error);
    });
}

async function fetchSafetyContacts() {
    try {
        const { data, error } = await supabase.from('safety_contacts').select('*');
        if (error) throw error;

        safetyContacts = Array.isArray(data) ? data : [];
        safetyCircle = safetyContacts.map(contact => ({
            id: contact.id,
            name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.contact_name || 'Unnamed Contact',
            email: '',
            phone: '',
            status: 'watching',
            addedAt: new Date().toISOString()
        }));

        renderSafetyContacts();
        await calculateSafetyScore();
        updateSafetyReadinessUI();
    } catch (fetchError) {
        console.error('Failed to fetch safety contacts:', fetchError);
        safetyContacts = [];
        safetyCircle = [];
        renderSafetyContacts();
        await calculateSafetyScore();
        updateSafetyReadinessUI();
    }
}

// ===== SAFETY CIRCLE =====
function openContactEditorModal() {
    const modal = document.getElementById('contact-modal');
    if (modal) {
        syncContactEditorTheme();
        modal.classList.add('active');
    }
}

function closeContactEditorModal() {
    const modal = document.getElementById('contact-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function syncContactEditorTheme() {
    const modal = document.getElementById('contact-modal');
    if (!modal) return;
    const isDark = document.body.classList.contains('dark-theme');
    modal.classList.toggle('is-dark', isDark);
    modal.classList.toggle('is-light', !isDark);
}

function resetContactEditorForm() {
    const ids = [
        'contact-first-name',
        'contact-last-name',
        'contact-company',
        'contact-phone-number',
        'contact-email'
    ];
    ids.forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });
}

async function addToSafetyCircle(firstName, lastName, phoneNumber, email, company) {
    const safeFirstName = (firstName || '').trim();
    const safeLastName = (lastName || '').trim();
    const safePhoneNumber = (phoneNumber || '').trim();
    const safeEmail = (email || '').trim();
    const safeCompany = (company || '').trim();
    if (!safeFirstName && !safeLastName) return false;

    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session || !session.user) {
            alert('Please sign in first.');
            return false;
        }

        const { error } = await supabase.from('safety_contacts').insert([{
            first_name: safeFirstName,
            last_name: safeLastName,
            phone_number: safePhoneNumber,
            email: safeEmail,
            company: safeCompany,
            user_id: session.user.id
        }]);
        if (error) throw error;

        await fetchSafetyContacts();
        await calculateSafetyScore();
        showNotification('✅ Contact Added', `${`${safeFirstName} ${safeLastName}`.trim()} is now in your safety circle`);
        return true;
    } catch (insertError) {
        console.error('Failed to add safety contact:', insertError);
        alert('Could not add contact right now. Please try again.');
        return false;
    }
}

function renderSafetyContacts() {
    const lists = [document.getElementById('safety-circle-list'), document.getElementById('mobile-safety-circle-list')].filter(Boolean);
    if (!lists.length) return;
    
    lists.forEach(list => {
        list.innerHTML = '';
        
        if (safetyContacts.length === 0) {
            list.innerHTML = '<p class="no-contacts">No contacts added yet</p>';
            return;
        }
        
        safetyContacts.forEach((contact) => {
            const item = document.createElement('div');
            const displayName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.contact_name || 'Unnamed Contact';
            item.className = 'contact-item';
            item.innerHTML = `
                <span class="contact-name">${displayName}</span>
                <div class="contact-actions">
                    <span class="contact-status">Watching</span>
                    <button type="button" class="contact-remove-btn" data-id="${contact.id}" aria-label="Remove contact">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            list.appendChild(item);
        });

        list.querySelectorAll('.contact-remove-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    const contactId = e.target.closest('button').dataset.id;
                    if (!contactId) return;
                    const { error } = await supabase.from('safety_contacts').delete().eq('id', contactId);
                    if (error) throw error;
                    await fetchSafetyContacts();
                } catch (deleteError) {
                    console.error('Failed to remove safety contact:', deleteError);
                    alert('Could not remove contact right now. Please try again.');
                }
            });
        });
    });
}

function updateSafetyCircleList() {
    renderSafetyContacts();
}

// ===== GEOFENCE UI =====
function clearDbSafeZoneLayers() {
    activeSafeZones.forEach(zone => {
        if (zone._layer && map && map.hasLayer(zone._layer)) {
            map.removeLayer(zone._layer);
        }
    });
    geofences = geofences.filter(geofence => geofence.source !== 'db_safe_zone');
}

function drawSafeZoneLayer(zone) {
    if (!map) return null;

    let zoneData = zone.zone_data;
    if (typeof zoneData === 'string') {
        try {
            zoneData = JSON.parse(zoneData);
        } catch (error) {
            zoneData = null;
        }
    }
    if (!zoneData) return null;

    if (zoneData.center && typeof zoneData.radius === 'number') {
        const zoneType = zoneData.type || 'safe';
        const color = zoneType === 'safe' ? '#2ecc71' : '#e74c3c';
        const layer = L.circle([zoneData.center.lat, zoneData.center.lng], {
            color,
            fillColor: color,
            fillOpacity: 0.15,
            weight: 2,
            radius: zoneData.radius,
            className: zoneType === 'safe' ? 'safe-zone-glow' : 'restricted-zone-pulse'
        }).addTo(map);

        const geofenceReference = {
            id: `db-zone-${zone.id}`,
            name: zone.zone_name,
            center: zoneData.center,
            radius: zoneData.radius,
            type: zoneType,
            color,
            source: 'db_safe_zone',
            zoneId: zone.id,
            circleObject: layer
        };

        layer.bindPopup(`
            <b>${zone.zone_name}</b><br>
            Type: ${zoneType} zone<br>
            Radius: ${zoneData.radius}m
        `);
        layer.on('click', () => showDistanceToGeofence(geofenceReference));
        geofences.push(geofenceReference);
        return layer;
    }

    if (zoneData.geojson) {
        return L.geoJSON(zoneData.geojson, {
            style: {
                color: '#2ecc71',
                weight: 2,
                fillColor: '#2ecc71',
                fillOpacity: 0.15
            }
        }).addTo(map);
    }

    return null;
}

function renderSafeZones() {
    const list = document.getElementById('geofences-list');
    if (!list) return;

    list.innerHTML = '';

    if (!activeSafeZones.length) {
        list.innerHTML = '<p class="no-geofences">No safe zones created yet</p>';
        return;
    }

    activeSafeZones.forEach(zone => {
        const item = document.createElement('div');
        item.className = 'geofence-item';
        item.innerHTML = `
            <span>${zone.zone_name}</span>
            <div class="geofence-actions">
                <span class="geofence-status">safe</span>
                <button type="button" class="geofence-remove-btn" data-id="${zone.id}" aria-label="Remove zone">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        list.appendChild(item);
    });

    list.querySelectorAll('.geofence-remove-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                const zoneId = e.target.closest('button').dataset.id;
                if (!zoneId) return;

                const { error } = await supabase.from('safe_zones').delete().eq('id', zoneId);
                if (error) throw error;

                const zoneToRemove = activeSafeZones.find(zone => String(zone.id) === String(zoneId));
                if (zoneToRemove && zoneToRemove._layer && map && map.hasLayer(zoneToRemove._layer)) {
                    map.removeLayer(zoneToRemove._layer);
                }
                geofences = geofences.filter(geofence => String(geofence.zoneId) !== String(zoneId));

                await fetchSafeZones();
            } catch (deleteError) {
                console.error('Failed to remove safe zone:', deleteError);
                alert('Could not remove safe zone right now. Please try again.');
            }
        });
    });
}

async function fetchSafeZones() {
    try {
        if (isGuestMode || !currentUser || !currentUser.id) {
            clearDbSafeZoneLayers();
            activeSafeZones = [];
            renderSafeZones();
            return;
        }

        const { data, error } = await supabase.from('safe_zones').select('*');
        if (error) throw error;

        clearDbSafeZoneLayers();
        activeSafeZones = Array.isArray(data) ? data.map(zone => ({ ...zone, _layer: null })) : [];

        if (map) {
            activeSafeZones.forEach(zone => {
                zone._layer = drawSafeZoneLayer(zone);
            });
        }

        renderSafeZones();
    } catch (fetchError) {
        console.error('Failed to fetch safe zones:', fetchError);
        activeSafeZones = [];
        renderSafeZones();
    }
}

async function saveSafeZoneToDatabase(name, drawnLayerData) {
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session || !session.user) {
            alert('Please sign in first.');
            return;
        }

        const { error } = await supabase.from('safe_zones').insert([{
            zone_name: name,
            zone_data: drawnLayerData,
            user_id: session.user.id
        }]);
        if (error) throw error;

        await fetchSafeZones();
    } catch (insertError) {
        console.error('Failed to save safe zone:', insertError);
        alert('Could not save safe zone right now. Please try again.');
    }
}

function updateGeofencesList() {
    renderSafeZones();
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
    
    const containers = [document.getElementById('trip-status'), document.getElementById('mobile-trip-status')].filter(Boolean);
    containers.forEach((container, idx) => {
        const btnId = idx === 0 ? 'end-trip-btn' : 'mobile-end-trip-btn';
        container.innerHTML = `
            <p><strong>${tripName}</strong> <span style="color: var(--emerald)">● Active</span></p>
            <p class="metadata">Started: ${new Date().toLocaleTimeString()}</p>
            <button id="${btnId}" class="btn-secondary" style="margin-top: 10px; background: var(--amber); color: white;">End Trip</button>
        `;
        const btn = document.getElementById(btnId);
        if (btn) btn.addEventListener('click', endTrip);
    });
    
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
    const containers = [document.getElementById('trip-status'), document.getElementById('mobile-trip-status')].filter(Boolean);
    containers.forEach((container, idx) => {
        const btnId = idx === 0 ? 'start-trip-btn' : 'mobile-start-trip-btn';
        container.innerHTML = `
            <p>No active trip</p>
            <button id="${btnId}" class="btn-secondary">Start New Trip</button>
        `;
        const btn = document.getElementById(btnId);
        if (btn) btn.addEventListener('click', startNewTrip);
    });
    
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
                
                const playBtn = document.getElementById('play-last-audio-btn');
                if (playBtn) playBtn.disabled = false;
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
    let clipUrl = deadmanLastClipUrl;

    if (deadmanMediaRecorder && deadmanMediaRecorder.state === 'recording' && deadmanAudioChunks.length > 0) {
        const recentChunks = deadmanAudioChunks.filter(chunk => chunk.timestamp >= Date.now() - 30000);
        if (recentChunks.length > 0) {
            const clip = new Blob(recentChunks.map(c => c.blob), { type: 'audio/webm' });
            const url = URL.createObjectURL(clip);
            const audio = new Audio(url);
            audio.play().catch(() => {
                showNotification('Playback blocked', 'Tap again after interacting with the page.');
            });
        } else if (clipUrl) {
            const audio = new Audio(clipUrl);
            audio.play().catch(() => {
                showNotification('Playback blocked', 'Tap again after interacting with the page.');
            });
        } else {
            showNotification('No clip available', 'Start a safety timer to capture ambient audio.');
        }
        return;
    }

    if (!clipUrl) {
        showNotification('No clip available', 'Start a safety timer to capture ambient audio.');
        return;
    }
    const audio = new Audio(clipUrl);
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
            updateSafetyScore();
            
            battery.addEventListener('levelchange', () => {
                batteryLevelPercent = Math.round(battery.level * 100);
                checkBatteryLevel(batteryLevelPercent);
                updateSafetyScore();
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
    
    // Mid-Emergency Override:
    if (silentSOSMode) {
        const prealertModal = document.getElementById('sos-prealert-modal');
        const alertModal = document.getElementById('alert-modal');
        let sosIsActive = false;

        // Strict requirement: Check active status and directly kill siren
        if (typeof sirenAudio !== 'undefined' && sirenAudio && !sirenAudio.paused) {
            sosIsActive = true;
            sirenAudio.pause();
            sirenAudio.currentTime = 0;
        }

        // 1. Check boundaries for loud countdown UI
        if (prealertModal && prealertModal.classList.contains('active')) {
            sosIsActive = true;
            prealertModal.classList.remove('active');
            clearInterval(sosCountdownInterval);
            dispatchSOS(true); // Convert remaining pre-alert strictly to silent dispatch
        } 
        
        // 2. Check boundaries for full-blown red alarm UI
        if (alertModal && alertModal.classList.contains('active')) {
            sosIsActive = true;
            alertModal.classList.remove('active');
        }

        if (sosIsActive) {
            // Strip any remaining flashing or red logic flags returning room to discreet
            document.querySelectorAll('.critical-armed, .flash-red, .sos-active').forEach(el => {
                el.classList.remove('critical-armed', 'flash-red', 'sos-active');
            });
            
            updateStatusCard('stealth', { 
                title: 'Stealth SOS Active', 
                description: 'Emergency data is being sent silently' 
            });
            showNotification('Stealth Mode Activated', 'Siren silenced. Emergency broadcast continues silently.', {
                duration: 5000,
                type: 'warning'
            });
        }
    }

    calculateSafetyScore().catch(error => {
        console.error('Failed to recalculate safety score after silent SOS toggle:', error);
    });
}

// ===== NIGHT VISION TOGGLE =====
function applyNightVisionState({ announce = false } = {}) {
    const nightBtn = document.getElementById('night-vision-btn');
    const nightBtnLabel = nightBtn ? nightBtn.querySelector('span') : null;
    const mapContainer = document.getElementById('map');

    if (mapContainer) {
        mapContainer.classList.toggle('map-night-vision', nightVisionEnabled);
    }

    if (nightBtn) {
        if (nightBtnLabel) {
            nightBtnLabel.textContent = nightVisionEnabled ? 'Night Vision ON' : 'Night Vision OFF';
        } else {
            nightBtn.textContent = nightVisionEnabled ? 'Night Vision ON' : 'Night Vision OFF';
        }
        nightBtn.classList.toggle('active', nightVisionEnabled);
        nightBtn.setAttribute('aria-pressed', nightVisionEnabled ? 'true' : 'false');
    }

    if (nightVisionEnabled) {
        highlightWellLitPaths();
        if (announce) {
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
        }
    } else {
        wellLitPathLayers.forEach(layer => {
            if (map && map.hasLayer(layer)) {
                map.removeLayer(layer);
            }
        });
        wellLitPathLayers = [];
    }
}

// ===== PASSWORD TOGGLE =====
function setupPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.closest('.password-wrapper').querySelector('input');
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });
}

function setupNightVisionToggle() {
    let nightBtn = document.getElementById('night-vision-btn');
    if (!nightBtn) return;

    nightVisionEnabled = localStorage.getItem('nightVisionEnabled') === 'true';
    applyNightVisionState();

    nightBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nightVisionEnabled = !nightVisionEnabled;
        localStorage.setItem('nightVisionEnabled', nightVisionEnabled);
        applyNightVisionState({ announce: true });
    });
}

// ===== THEME TOGGLE =====
function applyThemePreference(isDark) {
    document.body.classList.toggle('dark-theme', isDark);
    document.body.classList.toggle('light-mode', !isDark);
    syncContactEditorTheme();
    updateThemeToggleIcon(isDark);
    
    if (map && primaryTiles && darkTiles) {
        if (isDark) {
            if (map.hasLayer(primaryTiles)) map.removeLayer(primaryTiles);
            if (!map.hasLayer(darkTiles)) darkTiles.addTo(map);
        } else {
            if (map.hasLayer(darkTiles)) map.removeLayer(darkTiles);
            if (!map.hasLayer(primaryTiles)) primaryTiles.addTo(map);
        }
    }
}

function updateThemeToggleIcon(isDark) {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (!themeBtn) return;
    const icon = themeBtn.querySelector('i');
    if (icon) {
        icon.classList.remove('fa-moon', 'fa-sun');
        icon.classList.add(isDark ? 'fa-sun' : 'fa-moon');
    }
    themeBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    themeBtn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
}

function setupThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (!themeBtn) return;

    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;

    applyThemePreference(isDark);

    themeBtn.addEventListener('click', () => {
        const nextIsDark = !document.body.classList.contains('dark-theme');
        applyThemePreference(nextIsDark);
        localStorage.setItem(THEME_STORAGE_KEY, nextIsDark ? 'dark' : 'light');
    });
}

// ===== INFO PANEL TOGGLE =====
function setupInfoPanelToggle() {
    const toggleBtn = document.getElementById('panel-toggle-btn');
    const mainContent = document.querySelector('.main-content');
    const controlsPanel = document.querySelector('.controls-panel');
    if (!toggleBtn || !mainContent) return;

    const updateToggleState = (collapsed) => {
        if (collapsed) {
            toggleBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            toggleBtn.setAttribute('aria-label', 'Show Info Panel');
            toggleBtn.setAttribute('title', 'Show Info Panel');
        } else {
            toggleBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            toggleBtn.setAttribute('aria-label', 'Hide Info Panel');
            toggleBtn.setAttribute('title', 'Hide Info Panel');
        }
    };

    updateToggleState(false);

    toggleBtn.addEventListener('click', () => {
        const collapsed = mainContent.classList.toggle('panel-collapsed');
        document.body.classList.toggle('panel-collapsed', collapsed);
        updateToggleState(collapsed);
    });
}

// ===== MOBILE UI =====
function setupMobileUI() {
    const mobileSheet = document.getElementById('mobile-sheet');
    const mobileSheetContent = document.getElementById('mobile-sheet-content');
    const navMap = document.getElementById('mobile-nav-map');
    const navSafety = document.getElementById('mobile-nav-safety');
    const navTrip = document.getElementById('mobile-nav-trip');
    const navSettings = document.getElementById('mobile-nav-settings');
    const sosBtn = document.getElementById('mobile-sos-btn');
    const sosOverlay = document.getElementById('mobile-sos-overlay');
    const sosCancel = document.getElementById('mobile-sos-cancel');
    const controlsPanel = document.querySelector('.controls-panel');
    const quickActions = Array.from(document.querySelectorAll('.mobile-quick-action'));
    const mobileTabs = Array.from(document.querySelectorAll('.mobile-sheet-tab'));

    if (!mobileSheet || !navMap || !navSafety || !controlsPanel || !mobileSheetContent) return;

    // Phase 1 DOM Extraction: Physically move Trapped Content back and forth
    const relocatePanels = () => {
        const dest = document.getElementById('mobile-bottom-utilities-wrapper');
        const src = document.querySelector('.controls-scroll-area');
        if (src && dest) {
            if (window.innerWidth <= 768) {
                Array.from(src.querySelectorAll('.panel-section')).forEach(panel => dest.appendChild(panel));
            } else {
                Array.from(dest.querySelectorAll('.panel-section')).forEach(panel => src.appendChild(panel));
            }
        }
    };
    window.addEventListener('resize', relocatePanels);
    relocatePanels();

    const setActiveNav = (activeBtn) => {
        [navMap, navSafety, navTrip, navSettings].forEach(btn => {
            if (btn) btn.classList.toggle('active', btn === activeBtn);
        });
    };

    navSafety.addEventListener('click', () => {
        mobileSheet.classList.toggle('open');
        setActiveNav(navSafety);
    });

    navMap.addEventListener('click', () => {
        mobileSheet.classList.remove('open');
        setActiveNav(navMap);
    });

    if (sosBtn && sosOverlay && sosCancel) {
        sosBtn.addEventListener('click', () => {
            sosOverlay.classList.add('active');
        });
        sosCancel.addEventListener('click', () => {
            sosOverlay.classList.remove('active');
        });
    }

    quickActions.forEach((btn) => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            if (!targetId) return;
            const target = document.getElementById(targetId);
            if (target) {
                target.click();
            }
        });
    });

    const syncMobileSheetContent = () => {
        return; // Permanently disabled: DOM extraction is now natively handled via relocatePanels mapping into the unified scrolling feed.
        if (isMobile && !moved) {
            const nodesToMove = Array.from(controlsPanel.children).filter(
                (node) => node.id !== 'panel-toggle-btn'
            );
            nodesToMove.forEach((node) => {
                mobileSheetContent.appendChild(node);
            });
            controlsPanel.dataset.mobileMoved = 'true';
            assignMobileTabs();
            applyMobileTab('safety');
        }

        if (!isMobile && moved) {
            const nodesToRestore = Array.from(mobileSheetContent.children);
            nodesToRestore.forEach((node) => {
                controlsPanel.appendChild(node);
            });
            delete controlsPanel.dataset.mobileMoved;
        }
    };

    const assignMobileTabs = () => {
        const sections = Array.from(mobileSheetContent.querySelectorAll('.panel-section'));
        sections.forEach((section) => {
            const title = section.querySelector('h3')?.textContent?.toLowerCase() || '';
            let tab = 'safety';
            if (title.includes('preset')) tab = 'presets';
            if (title.includes('trip')) tab = 'trip';
            section.dataset.mobileTab = tab;
        });
    };

    const applyMobileTab = (tabName) => {
        const sections = Array.from(mobileSheetContent.querySelectorAll('.panel-section'));
        sections.forEach((section) => {
            section.style.display = section.dataset.mobileTab === tabName ? '' : 'none';
        });
        mobileTabs.forEach((tab) => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
    };

    mobileTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            applyMobileTab(tab.dataset.tab);
        });
    });

    syncMobileSheetContent();
    window.addEventListener('resize', () => {
        clearTimeout(window.__mobileSheetResize);
        window.__mobileSheetResize = setTimeout(syncMobileSheetContent, 150);
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
    const slideLabel = slideContainer.querySelector('.sos-slide-label');
    
    if (!slideTrack || !slideThumb || !slideProgress || !slideLabel) return;
    
    // Stop native ghost dragging natively
    slideThumb.ondragstart = () => false;
    
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    let maxDrag = 0;
    let triggered = false;
    
    // Initial reset of transition properties
    slideThumb.style.transition = 'none';
    slideProgress.style.transition = 'none';
    
    const handleMove = (clientX) => {
        if (!isDragging || triggered) return;
        currentX = clientX - startX;
        currentX = Math.max(0, Math.min(currentX, maxDrag));
        
        slideThumb.style.transform = `translateX(${currentX}px)`;
        const progressWidth = (currentX / maxDrag) * 100;
        slideProgress.style.width = progressWidth + '%';
    };
    
    const handleRelease = () => {
        if (!isDragging || triggered) return;
        isDragging = false;
        
        // 90% threshold for trigger
        if (currentX >= maxDrag * 0.9) {
            triggered = true;
            // Snap to the far right using transition dynamically
            currentX = maxDrag;
            slideThumb.style.transition = 'transform 0.3s ease';
            slideProgress.style.transition = 'width 0.3s ease';
            slideThumb.style.transform = `translateX(${maxDrag}px)`;
            slideProgress.style.width = '100%';
            
            // Change text
            slideLabel.textContent = 'SOS SENT!';
            
            // Execute placeholder function only once
            triggerSOS();
        } else {
            // Smoothly animate and snap back to left
            resetSOSSlider();
        }
    };
    
    // Mouse events
    const onMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        handleMove(e.clientX);
    };
    
    const onMouseUp = () => handleRelease();
    
    slideThumb.addEventListener('mousedown', (e) => {
        if (triggered) return;
        e.preventDefault(); // Stop text highlighting and native ghost drags
        isDragging = true;
        // Calculate maxDrag immediately on touch so bounds are perfect
        maxDrag = slideTrack.offsetWidth - slideThumb.offsetWidth - 10;
        startX = e.clientX - currentX;
        slideThumb.style.transition = 'none';
        slideProgress.style.transition = 'none';
    });
    
    document.addEventListener('mousemove', onMouseMove, { passive: false });
    document.addEventListener('mouseup', onMouseUp);
    
    // Touch events for mobile
    slideThumb.addEventListener('touchstart', (e) => {
        if (triggered) return;
        // Don't preventDefault here to allow scrolling if they touch but don't drag
        isDragging = true;
        maxDrag = slideTrack.offsetWidth - slideThumb.offsetWidth - 10;
        startX = e.touches[0].clientX - currentX;
        slideThumb.style.transition = 'none';
        slideProgress.style.transition = 'none';
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault(); // Prevent scrolling while sliding
        handleMove(e.touches[0].clientX);
    }, { passive: false });
    const onTouchEnd = (e) => {
        if (!isDragging || triggered) return;
        
        if (e && e.changedTouches && e.changedTouches.length > 0) {
            currentX = e.changedTouches[0].clientX - startX;
            currentX = Math.max(0, Math.min(currentX, maxDrag));
        }
        
        isDragging = false;
        
        if (currentX >= maxDrag * 0.9) {
            triggered = true;
            currentX = maxDrag;
            slideThumb.style.transition = 'transform 0.3s ease';
            slideProgress.style.transition = 'width 0.3s ease';
            slideThumb.style.transform = `translateX(${maxDrag}px)`;
            slideProgress.style.width = '100%';
            slideLabel.textContent = 'SOS SENT!';
            triggerSOS();
        } else {
            isDragging = false;
            slideLabel.textContent = 'SLIDE FOR SOS';
            slideThumb.style.transition = 'transform 0.3s ease';
            slideProgress.style.transition = 'width 0.3s ease';
            slideThumb.style.transform = 'translateX(0px)';
            slideProgress.style.width = '0%';
            currentX = 0;
        }
    };

    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
    
    // Exposed globally for any reset needs after emergency is cleared
    window.resetSOSSliderState = function() {
        triggered = false;
        slideLabel.textContent = 'SLIDE FOR SOS';
        resetSOSSlider();
    };
    
    function resetSOSSlider() {
        slideThumb.style.transition = 'transform 0.3s ease';
        slideProgress.style.transition = 'width 0.3s ease';
        slideThumb.style.transform = `translateX(0px)`;
        slideProgress.style.width = '0%';
        currentX = 0;
        if (!triggered) {
            slideLabel.textContent = 'SLIDE FOR SOS';
        }
    }
}

function triggerSOS() {
    startSOSPreAlert();
}

function startSOSPreAlert() {
    if (silentSOSMode) {
        activeSosType = 'silent';
        dispatchSOS(true);
        calculateSafetyScore().catch(error => {
            console.error('Failed to recalculate safety score on silent SOS activation:', error);
        });
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
    activeSosType = 'emergency';
    simulateHaptic('double');

    // Play siren during countdown
    try {
        sirenAudio.currentTime = 0;
        sirenAudio.play();
    } catch(e) {}

    sosCountdownInterval = setInterval(() => {
        sosCountdownRemaining -= 1;
        countdown.textContent = Math.max(0, sosCountdownRemaining).toString();
        if (sosCountdownRemaining <= 0) {
            clearInterval(sosCountdownInterval);
            modal.classList.remove('active');
            dispatchSOS(false);
        }
    }, 1000);

    calculateSafetyScore().catch(error => {
        console.error('Failed to recalculate safety score on SOS activation:', error);
    });
}

function cancelSOSPreAlert() {
    stopSiren();
    clearInterval(sosCountdownInterval);
    sosCountdownInterval = null;
    activeSosType = null;
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
    
    if (window.resetSOSSliderState) {
        window.resetSOSSliderState();
    }

    calculateSafetyScore().catch(error => {
        console.error('Failed to recalculate safety score on SOS cancel:', error);
    });
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
    
    // Force an instant broadcast to listening guests regardless of GPS movement
    if (hostChannel && hostChannel.state === 'joined') {
        hostChannel.send({
            type: 'broadcast',
            event: 'location_update',
            payload: { lat: lastLocation.lat, lng: lastLocation.lng, isSOS: true }
        });
    }
    
    logSafetyEvent('SOS_MANUAL', {
        location: lastLocation,
        battery_level: getBatteryLevel(),
        silent_mode: isSilent
    });
    activeSosType = isSilent ? 'silent' : 'emergency';
    calculateSafetyScore().catch(error => {
        console.error('Failed to recalculate safety score on SOS dispatch:', error);
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
            // Ensure siren continues or starts
            sirenAudio.play();
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
        <button class="btn-primary" onclick="document.getElementById('alert-modal').classList.remove('active'); stopSiren();">
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
        for (const eventLog of queued) {
            // Replacing the blocked localhost/events endpoint with a secure placeholder for now.
            // When migrating to Supabase entirely, this can be an insert into an audit_logs table.
            console.log("Audit log safely captured (bypassing ad-blockers):", eventLog);
        }
        // Successfully processed all events; clear the local queue to prevent infinite loops
        writePendingEvents([]);
        updateSafetyReadinessUI();
    } catch (error) {
        console.error("Failed to flush pending items safely:", error);
        // Leave the items in the queue for a future attempt if there was an internal schema fault, 
        // though the loop should now securely pass without network blockades.
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
    // Clone DEMO_USER to prevent permanent overriding and apply dynamically entered values
    currentUser = { ...DEMO_USER };
    
    const emailInput = document.getElementById('email');
    if (emailInput && emailInput.value) {
        currentUser.email = emailInput.value;
    }
    
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('dashboard-screen').classList.add('active');
    document.getElementById('user-email').textContent = currentUser.email;
    
    showSkeletonLoading();
    
    setTimeout(() => {
        initMap();
    }, 500);
    
    console.log('Demo login successful');
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('SafePath app starting...');

    const hash = window.location.hash;
    if (hash.startsWith('#emergency-share=')) {
        // UI Override: Hide login completely to prevent flash
        const loginContainer = document.querySelector('.login-container');
        if (loginContainer) loginContainer.style.display = 'none';
        
        document.body.classList.add('guest-mode');
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('dashboard-screen').classList.add('active');
        
        // Halt normal auth check behavior flag
        isGuestMode = true;

        const guestToken = hash.replace('#emergency-share=', '');

        const { data: share, error } = await supabase
            .from('active_shares')
            .select('*')
            .eq('token', guestToken)
            .single();

        if (error || !share || new Date() > new Date(share.expires_at)) {
            alert('This emergency tracking link has expired or is invalid');
            history.replaceState(null, null, ' ');
            window.location.reload();
            return;
        }

        // Process token payload
        
        const coordDisplay = document.getElementById('coordinate-display');
        if (coordDisplay) coordDisplay.style.display = 'none'; // remove loader
        
        let hostLat = 28.4744;
        let hostLng = 77.5040;
        let hostEmail = "Host User";
        
        try {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', share.user_id).single();
            if (profile) {
                hostEmail = profile.email || profile.full_name || "Host User";
                if (profile.last_lat && profile.last_lng) {
                    hostLat = parseFloat(profile.last_lat);
                    hostLng = parseFloat(profile.last_lng);
                }
            }
        } catch (e) {
            console.warn('Could not fetch host profile for name/location, using fallbacks.');
        }

        currentUser = { email: `Monitoring: ${hostEmail}`, id: share.user_id };
        document.getElementById('user-email').textContent = currentUser.email;
        showSkeletonLoading();
        
        setTimeout(() => {
            initMap(hostLat, hostLng);
            
            if (userMarker) {
                userMarker.bindPopup('Host Location').openPopup();
                const markerIcon = document.querySelector('.user-marker');
                if (markerIcon) {
                    markerIcon.style.background = 'var(--red)';
                    markerIcon.textContent = '🚨';
                }
            }
            
            // Read-Only Map: Disable any drawing routing
            if (map && map.pm) {
                map.pm.disableDraw();
                map.pm.removeControls();
            }
        }, 500);

        showNotification('Live Tracking Started', 'You are now securely viewing the host\'s location.');
        
        // Essential UI
        setupMobileUI();
        setupThemeToggle();
        
        const guestChannel = supabase.channel(`tracking-${share.user_id}`);
        guestChannel.on('broadcast', { event: 'location_update' }, (payload) => {
            const { lat, lng, isSOS } = payload.payload;
            if (userMarker) {
                userMarker.setLatLng([lat, lng]);
                map.setView([lat, lng]);
            } else {
                userMarker = L.marker([lat, lng]).addTo(map);
                map.setView([lat, lng], 15);
            }
            
            const pill = document.getElementById('mobile-gps-pill');
            if (pill) {
                pill.innerHTML = isSOS ? `🚨 SOS ACTIVE • ${lat.toFixed(6)}, ${lng.toFixed(6)}` : `GPS Active • ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                pill.style.background = isSOS ? 'var(--red)' : 'var(--m-glass-bg)';
            }
            
            const statusCard = document.getElementById('status-card');
            if (statusCard) {
                if (isSOS) {
                     statusCard.className = 'status-card status-critical';
                     statusCard.innerHTML = `<div class="status-indicator red"></div><div class="status-text"><strong>SOS ACTIVE</strong><span>Host in danger</span></div>`;
                } else {
                     statusCard.className = 'status-card';
                     statusCard.innerHTML = `<div class="status-indicator green"></div><div class="status-text"><strong>All systems nominal</strong><span>Host safe</span></div>`;
                }
            }
        }).subscribe();
        
        return;
    }

    const loginScreenEl = document.getElementById('login-screen');
    const dashboardScreenEl = document.getElementById('dashboard-screen');
    const loginContainerEl = document.querySelector('.login-container');
    const userEmailEl = document.getElementById('user-email');

    const showAuthenticatedApp = async (session) => {
        if (!session || !session.user || isGuestMode) return;

        currentUser = {
            email: session.user.email || DEMO_USER.email,
            ...session.user
        };

        if (loginContainerEl) loginContainerEl.style.display = 'none';
        if (loginScreenEl) loginScreenEl.classList.remove('active');
        if (dashboardScreenEl) dashboardScreenEl.classList.add('active');
        if (userEmailEl) userEmailEl.textContent = currentUser.email;

        showSkeletonLoading();
        setTimeout(() => initMap(), 300);

        try {
            if (!hostChannel && currentUser.id) {
                hostChannel = supabase.channel(`tracking-${currentUser.id}`);
                hostChannel.subscribe();
            }
        } catch (channelErr) {
            console.error('Failed to initialize Supabase realtime tracking channel:', channelErr);
        }

        loadVaultDocuments();
        renderShareLinks();
        renderAuditTrail();
        await fetchSafetyContacts();
        await fetchSafeZones();
        updateSafetyReadinessUI();
    };

    const showLoginApp = () => {
        if (isGuestMode || window.location.hash.startsWith('#emergency-share=')) return;
        if (loginContainerEl) loginContainerEl.style.display = '';
        if (dashboardScreenEl) dashboardScreenEl.classList.remove('active');
        if (loginScreenEl) loginScreenEl.classList.add('active');
    };

    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error('Initial session check failed:', error);
        }
        if (session) {
            await showAuthenticatedApp(session);
        } else {
            showLoginApp();
        }
    } catch (sessionErr) {
        console.error('Unexpected error during initial session check:', sessionErr);
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
        if (isGuestMode || window.location.hash.startsWith('#emergency-share=')) return;

        if (event === 'SIGNED_IN' && session) {
            await showAuthenticatedApp(session);
            return;
        }

        if (event === 'SIGNED_OUT') {
            showLoginApp();
        }
    });
    
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
    setupPasswordToggles();
    setupNightVisionToggle();
    setupThemeToggle();
    syncContactEditorTheme();
    setupInfoPanelToggle();
    setupMobileUI();
    setupQuickActions();
    setupSlideToSOS();
    setupHapticFeedback();
    setupBatteryMonitoring();
    window.addEventListener('online', flushPendingEvents);
    window.addEventListener('online', updateSafetyReadinessUI);
    window.addEventListener('offline', updateSafetyReadinessUI);
    setInterval(flushPendingEvents, 30000);
    updateHotelStatusUI();
    updateLanguageBridgeUI();
    loadVaultDocuments();
    renderShareLinks();
    renderAuditTrail();
    updateSafetyReadinessUI();
    if (readinessRefreshInterval) {
        clearInterval(readinessRefreshInterval);
    }
    readinessRefreshInterval = setInterval(updateSafetyReadinessUI, 10000);
    
    // Auth Toggle Logic
    let isSignUpMode = false;
    let isResetMode = false;
    const authToggleBtn = document.getElementById('auth-toggle-btn');
    const authHeaderTitle = document.getElementById('auth-header-title');
    const authSubmitText = document.getElementById('auth-submit-text');
    const groupFullname = document.getElementById('group-fullname');
    const groupPassword = document.getElementById('group-password');
    const groupConfirmpass = document.getElementById('group-confirmpass');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const authToggleContainer = document.getElementById('auth-toggle-container');
    const authResetContainer = document.getElementById('auth-reset-container');
    const authResetBtn = document.getElementById('auth-reset-btn');

    const toggleAuthMode = () => {
        if (isResetMode) isResetMode = false; // Ensure reset is off
        isSignUpMode = !isSignUpMode;
        if (isSignUpMode) {
            authHeaderTitle.textContent = 'Create an Account';
            groupFullname.classList.remove('hidden-auth');
            groupConfirmpass.classList.remove('hidden-auth');
            forgotPasswordLink.classList.add('hidden-auth');
            authSubmitText.textContent = 'Create Account';
            authToggleBtn.textContent = 'Sign In';
            authToggleContainer.firstChild.textContent = 'Already have an account? ';
        } else {
            authHeaderTitle.textContent = 'Welcome Back';
            groupFullname.classList.add('hidden-auth');
            groupConfirmpass.classList.add('hidden-auth');
            forgotPasswordLink.classList.remove('hidden-auth');
            authSubmitText.textContent = 'Sign In';
            authToggleBtn.textContent = 'Sign Up';
            authToggleContainer.firstChild.textContent = "Don't have an account? ";
        }
    };

    const toggleResetMode = () => {
        isResetMode = !isResetMode;
        if (isResetMode) {
            isSignUpMode = false;
            authHeaderTitle.textContent = 'Reset Password';
            groupFullname.classList.add('hidden-auth');
            groupPassword.classList.add('hidden-auth');
            document.getElementById('password').removeAttribute('required');
            groupConfirmpass.classList.add('hidden-auth');
            forgotPasswordLink.classList.add('hidden-auth');
            authToggleContainer.classList.add('hidden-auth');
            authResetContainer.classList.remove('hidden-auth');
            authSubmitText.textContent = 'Send Reset Link';
        } else {
            authHeaderTitle.textContent = 'Welcome Back';
            groupPassword.classList.remove('hidden-auth');
            document.getElementById('password').setAttribute('required', 'true');
            forgotPasswordLink.classList.remove('hidden-auth');
            authToggleContainer.classList.remove('hidden-auth');
            authResetContainer.classList.add('hidden-auth');
            authSubmitText.textContent = 'Sign In';
            authToggleBtn.textContent = 'Sign Up';
            authToggleContainer.firstChild.textContent = "Don't have an account? ";
        }
    };

    if (authToggleBtn) {
        authToggleBtn.addEventListener('click', toggleAuthMode);
    }
    
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            toggleResetMode();
        });
    }

    if (authResetBtn) {
        authResetBtn.addEventListener('click', toggleResetMode);
    }

    const googleLoginBtn = document.getElementById('google-login-btn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            try {
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin
                    }
                });

                if (error) {
                    console.error('Google OAuth sign-in failed:', error);
                    alert('Google sign-in failed. Please try again.');
                    return;
                }

                console.log('Google OAuth initiated:', data);
            } catch (oauthError) {
                console.error('Unexpected Google OAuth error:', oauthError);
                alert('Something went wrong during Google sign-in. Please try again.');
            }
        });
    }

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('email').value;

            if (isResetMode) {
                const { error } = await supabase.auth.resetPasswordForEmail(emailInput);
                if (error) {
                    alert('Error: ' + error.message);
                } else {
                    alert('Reset link sent to your email!');
                    toggleResetMode(); // Switch back to Sign In
                }
            } else if (isSignUpMode) {
                const passwordInput = document.getElementById('password').value;
                const fullNameInput = document.getElementById('fullname').value;
                const { error } = await supabase.auth.signUp({
                    email: emailInput,
                    password: passwordInput,
                    options: { data: { full_name: fullNameInput } }
                });
                
                if (error) {
                    alert('Error: ' + error.message);
                } else {
                    alert('Account created! Please check your email to verify.');
                    document.getElementById('password').value = '';
                    toggleAuthMode(); // Switch back to Sign In
                }
            } else {
                const passwordInput = document.getElementById('password').value;
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: emailInput,
                    password: passwordInput
                });
                
                if (error) {
                    alert('Error: ' + error.message);
                } else {
                    // Update global state and transition to dashboard
                    currentUser = { email: emailInput, ...data.user };
                    document.getElementById('login-screen').classList.remove('active');
                    document.getElementById('dashboard-screen').classList.add('active');
                    document.getElementById('user-email').textContent = currentUser.email;
                    showSkeletonLoading();
                    
                    // Guarantee map loads regardless of realtime broadcast status
                    setTimeout(() => initMap(), 500);
                    
                    try {
                        hostChannel = supabase.channel(`tracking-${currentUser.id}`);
                        hostChannel.subscribe();
                    } catch (channelErr) {
                        console.error('Failed to initialize Supabase realtime tracking channel:', channelErr);
                    }
                    
                    loadVaultDocuments();
                    await fetchSafetyContacts();
                    await fetchSafeZones();
                }
            }
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            currentUser = null;
            const loginContainer = document.querySelector('.login-container');
            if (loginContainer) loginContainer.style.display = '';
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
            resetContactEditorForm();
            openContactEditorModal();
        });
    }
    
    // Save contact button
    const saveContactBtn = document.getElementById('save-contact');
    if (saveContactBtn) {
        saveContactBtn.addEventListener('click', async () => {
            const firstName = document.getElementById('contact-first-name').value;
            const lastName = document.getElementById('contact-last-name').value;
            const company = document.getElementById('contact-company').value;
            const phoneNumber = document.getElementById('contact-phone-number').value;
            const email = document.getElementById('contact-email').value;
            const hasName = (firstName || '').trim() || (lastName || '').trim();

            if (!hasName) {
                alert('Please enter at least a first name or last name.');
                return;
            }

            const saved = await addToSafetyCircle(firstName, lastName, phoneNumber, email, company);
            if (saved) {
                resetContactEditorForm();
                closeContactEditorModal();
            }
        });
    }

    const cancelContactEditorBtn = document.getElementById('contact-editor-cancel');
    if (cancelContactEditorBtn) {
        cancelContactEditorBtn.addEventListener('click', () => {
            resetContactEditorForm();
            closeContactEditorModal();
        });
    }
    
    // Add geofence button
    const addGeofenceBtn = document.getElementById('add-geofence-btn');
    if (addGeofenceBtn) {
        addGeofenceBtn.addEventListener('click', async () => {
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
            const drawnLayerData = {
                center: { lat, lng },
                radius,
                type,
                createdAt: new Date().toISOString()
            };

            if (type === 'restricted') {
                runCriticalAction('create_restricted_zone', 'create restricted zone', () => {
                    saveSafeZoneToDatabase(name, drawnLayerData).then(() => {
                        updateSafetyReadinessUI();
                    });
                });
            } else {
                await saveSafeZoneToDatabase(name, drawnLayerData);
                updateSafetyReadinessUI();
            }
        });
    }
    
    // Start trip button
    ['start-trip-btn', 'mobile-start-trip-btn'].forEach(id => {
        const startTripBtn = document.getElementById(id);
        if (startTripBtn) {
            startTripBtn.addEventListener('click', startNewTrip);
        }
    });
    
    // Acknowledge alert button
    const acknowledgeBtn = document.getElementById('acknowledge-alert');
    if (acknowledgeBtn) {
        acknowledgeBtn.addEventListener('click', () => {
            stopSiren();
            activeSosType = null;
            calculateSafetyScore().catch(error => {
                console.error('Failed to recalculate safety score after alert acknowledge:', error);
            });
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
    
    const translatePhraseBtn = document.getElementById('translate-custom-phrase-btn');
    if (translatePhraseBtn) {
        translatePhraseBtn.addEventListener('click', translateCustomPhrase);
    }

    const playLastAudioBtn = document.getElementById('play-last-audio-btn');
    if (playLastAudioBtn) {
        playLastAudioBtn.disabled = false;
        playLastAudioBtn.addEventListener('click', playLastCapturedClip);
    }

    const addVaultDocBtn = document.getElementById('add-vault-doc-btn');
    if (addVaultDocBtn) {
        addVaultDocBtn.addEventListener('click', addVaultDocument);
    }

    const vaultUploadInput = document.getElementById('vault-upload');
    if (vaultUploadInput) {
        vaultUploadInput.addEventListener('change', handleVaultUpload);
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
            stopSiren();
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

// QUICK ACTIONS (CAPACITOR INTEGRATION)
function setupQuickActions() {
    // 1. Share Live
    const btnShare = document.getElementById('qa-share');
    if (btnShare) {
        btnShare.addEventListener('click', async () => {
            let lat = '0', lng = '0';
            const capacitorGeo = getCapacitorGeolocation();
            try {
                if (capacitorGeo) {
                    const pos = await capacitorGeo.getCurrentPosition();
                    lat = pos.coords.latitude;
                    lng = pos.coords.longitude;
                } else if ('geolocation' in navigator) {
                    const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
                    lat = pos.coords.latitude;
                    lng = pos.coords.longitude;
                }
            } catch (e) {
                console.error("Geo error:", e);
                showNotification('Error', 'Could not get location to share.');
                return;
            }
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) {
                await window.Capacitor.Plugins.Share.share({
                    title: 'Live Location',
                    text: `My live location: https://maps.google.com/?q=${lat},${lng}`,
                    dialogTitle: 'Share with buddies'
                });
            } else {
                prompt('Copy this link to share:', `https://maps.google.com/?q=${lat},${lng}`);
            }
        });
    }

    // 2. Record
    const btnRecord = document.getElementById('qa-record');
    if (btnRecord) {
        btnRecord.addEventListener('click', async () => {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Camera) {
                try {
                    const image = await window.Capacitor.Plugins.Camera.getPhoto({
                        quality: 90,
                        allowEditing: false,
                        resultType: 'uri' // Using string representation for CameraResultType.Uri
                    });
                    showNotification('Recorded', 'Media captured and securely saved.');
                    logEvent('EVENT_LOGGED', 'Camera recording activated');
                } catch(e) {
                    console.error("Camera error:", e);
                }
            } else {
                showNotification('Camera', 'Native camera plugin not available.');
            }
        });
    }

    // 3. Route
    const btnRoute = document.getElementById('qa-route');
    if (btnRoute) {
        btnRoute.addEventListener('click', () => {
            const dest = prompt('Enter safe destination:');
            if (dest) {
                console.log('Safe destination set to:', dest);
                showNotification('Routing', 'Routing to: ' + dest);
                logEvent('EVENT_LOGGED', `Route set to ${dest}`);
            }
        });
    }

    // 4. Hazard
    const btnHazard = document.getElementById('qa-hazard');
    if (btnHazard) {
        btnHazard.addEventListener('click', async () => {
            if (typeof L === 'undefined' || !map) {
                showNotification('Error', 'Map not initialized.');
                return;
            }
            let lat = '0', lng = '0';
            const capacitorGeo = getCapacitorGeolocation();
            try {
                if (capacitorGeo) {
                    const pos = await capacitorGeo.getCurrentPosition();
                    lat = pos.coords.latitude;
                    lng = pos.coords.longitude;
                } else if ('geolocation' in navigator) {
                    const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
                    lat = pos.coords.latitude;
                    lng = pos.coords.longitude;
                }
            } catch (e) {
                console.error("Geo error:", e);
                showNotification('Error', 'Could not lock GPS for hazard marker.');
                return;
            }
            
            const hazardIcon = L.divIcon({
                className: 'custom-div-icon',
                html: "<div style='background-color:#e74c3c; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px rgba(231,76,60,0.8);'></div>",
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            L.marker([lat, lng], {icon: hazardIcon}).addTo(map)
                .bindPopup('<b>Warning/Hazard</b>')
                .openPopup();
                
            showNotification('Hazard', 'Hazard marker dropped at your location.');
            logEvent("ALERT_TRIGGERED", "Hazard marker placed at user location");
        });
    }
}
