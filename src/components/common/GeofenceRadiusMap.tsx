import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Layers,
  CheckCircle2,
  Crosshair
} from 'lucide-react';
import { GeoService } from '../../services/geoService.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';

interface GeofenceRadiusMapProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  locationName?: string;
  locationAddress?: string;
  allowRadiusChange?: boolean;
  onRadiusChange?: (radius: number) => void;
  compact?: boolean;
  className?: string;
}

export const GeofenceRadiusMap: React.FC<GeofenceRadiusMapProps> = ({
  latitude,
  longitude,
  radiusMeters = 500,
  locationName = 'Main Campus',
  locationAddress,
  allowRadiusChange = false,
  onRadiusChange,
  compact = false,
  className = ''
}) => {
  const { isKhmer } = useLanguage();
  const { showToast } = useNotification();

  const [currentRadius, setCurrentRadius] = useState<number>(radiusMeters);
  const [zoomLevel, setZoomLevel] = useState<number>(16);
  const [mapLayer, setMapLayer] = useState<'standard' | 'humanitarian'>('standard');
  const [deviceCoords, setDeviceCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [deviceDistance, setDeviceDistance] = useState<number | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  useEffect(() => {
    setCurrentRadius(radiusMeters);
  }, [radiusMeters]);

  // Safe coordinates fallback
  const validLat = Number.isFinite(latitude) && latitude !== 0 ? latitude : 11.5564;
  const validLng = Number.isFinite(longitude) && longitude !== 0 ? longitude : 104.9282;

  // Detect GPS on initial render
  useEffect(() => {
    let isMounted = true;
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          if (!isMounted) return;
          const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setDeviceCoords(coords);
          setGpsAccuracy(Math.round(pos.coords.accuracy));
          const dist = GeoService.calculateDistance(validLat, validLng, coords.latitude, coords.longitude);
          setDeviceDistance(Math.round(dist));
        },
        () => {
          // Geolocation might be disabled or denied, silent fallback
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
    return () => {
      isMounted = false;
    };
  }, [validLat, validLng]);

  // Handle manual GPS test / refresh
  const handleRefreshGps = async () => {
    setIsGpsLoading(true);
    try {
      const pos = await GeoService.getCurrentPosition({ highAccuracy: true, timeout: 8000, maximumAge: 0 });
      setDeviceCoords(pos);
      const dist = GeoService.calculateDistance(validLat, validLng, pos.latitude, pos.longitude);
      const roundedDist = Math.round(dist);
      setDeviceDistance(roundedDist);

      const isInside = roundedDist <= currentRadius;
      if (isInside) {
        showToast(
          isKhmer
            ? `📍 ទីតាំងបច្ចុប្បន្នស្ថិតក្នុងកាំអនុញ្ញាត (ចម្ងាយ ${roundedDist}ម / អនុញ្ញាត ${currentRadius}ម)`
            : `📍 Current GPS is within permitted radius (${roundedDist}m / max ${currentRadius}m)`,
          'success'
        );
      } else {
        showToast(
          isKhmer
            ? `⚠️ ទីតាំងបច្ចុប្បន្ននៅក្រៅកាំអនុញ្ញាត (ចម្ងាយ ${roundedDist}ម / អនុញ្ញាត ${currentRadius}ម)`
            : `⚠️ Current GPS is outside permitted radius (${roundedDist}m / max ${currentRadius}m)`,
          'warning'
        );
      }
    } catch (err: any) {
      showToast(err.message || (isKhmer ? 'មិនអាចទាញយក GPS បានទេ' : 'Unable to acquire GPS position'), 'error');
    } finally {
      setIsGpsLoading(false);
    }
  };

  const isInsideGeofence = deviceDistance !== null && deviceDistance <= currentRadius;

  // Compute bounding box for OpenStreetMap embed iframe
  // Calculate latitude and longitude delta according to zoom level
  const bbox = useMemo(() => {
    // Approx degree span based on zoom level:
    // zoom 17 -> ~0.005 deg
    // zoom 16 -> ~0.01 deg
    // zoom 15 -> ~0.02 deg
    // zoom 14 -> ~0.04 deg
    const delta = Math.pow(2, 16 - zoomLevel) * 0.006;
    const minLng = (validLng - delta).toFixed(5);
    const minLat = (validLat - delta * 0.75).toFixed(5);
    const maxLng = (validLng + delta).toFixed(5);
    const maxLat = (validLat + delta * 0.75).toFixed(5);
    return `${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}`;
  }, [validLat, validLng, zoomLevel]);

  // OpenStreetMap embed URL
  const osmEmbedUrl = useMemo(() => {
    const layer = mapLayer === 'humanitarian' ? 'hot' : 'mapnik';
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=${layer}&marker=${validLat}%2C${validLng}`;
  }, [bbox, mapLayer, validLat, validLng]);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${validLat},${validLng}`;

  const RADIUS_OPTIONS = [50, 100, 200, 300, 500, 1000];

  return (
    <div className={`bg-slate-50 border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs ${className}`}>
      {/* Header Bar */}
      <div className="bg-white px-3.5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
            <Compass className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-slate-800 truncate flex items-center gap-1.5">
              <span>{locationName}</span>
              <span className="text-[10px] font-mono font-normal text-slate-500">
                ({validLat.toFixed(4)}, {validLng.toFixed(4)})
              </span>
            </h4>
            {locationAddress && (
              <p className="text-[10px] text-slate-500 truncate">{locationAddress}</p>
            )}
          </div>
        </div>

        {/* Live GPS Status Pill */}
        <div className="flex items-center gap-1.5">
          {deviceDistance !== null ? (
            <div
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                isInsideGeofence
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-rose-50 text-rose-700 border-rose-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isInsideGeofence ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span>
                {isInsideGeofence
                  ? (isKhmer ? `ក្នុងកាំ (${deviceDistance}ម / ${currentRadius}ម)` : `Inside (${deviceDistance}m / ${currentRadius}m)`)
                  : (isKhmer ? `ក្រៅកាំ (${deviceDistance}ម / ${currentRadius}ម)` : `Outside (${deviceDistance}m / ${currentRadius}m)`)}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
              <Crosshair className="w-3 h-3 text-slate-400" />
              <span>{isKhmer ? 'កាំអនុញ្ញាត' : 'Radius'}: {currentRadius}m</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleRefreshGps}
            disabled={isGpsLoading}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
            title={isKhmer ? 'ផ្ទៀងផ្ទាត់ GPS ឧបករណ៍' : 'Test Device GPS'}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isGpsLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Map Display Container */}
      <div className={`relative w-full ${compact ? 'h-48' : 'h-60'} bg-slate-100 overflow-hidden`}>
        {/* OpenStreetMap Embedded Map */}
        <iframe
          title="Campus Geofence Map"
          src={osmEmbedUrl}
          className="w-full h-full border-0 pointer-events-auto"
          loading="lazy"
        />

        {/* Semi-transparent Geofence Visual Ring Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Outer Pulsing Geofence Perimeter */}
          <div
            className="rounded-full border-2 border-emerald-500 bg-emerald-500/15 shadow-inner transition-all duration-300 flex items-center justify-center animate-pulse"
            style={{
              width: `${Math.min(220, Math.max(90, Math.round(currentRadius * 0.28)))}px`,
              height: `${Math.min(220, Math.max(90, Math.round(currentRadius * 0.28)))}px`
            }}
          >
            {/* Inner Target Center */}
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
              <MapPin className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Map Floating Overlays & Controls */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.min(18, prev + 1))}
            className="w-7 h-7 rounded-lg bg-white/90 backdrop-blur-xs text-slate-700 hover:bg-white shadow-md flex items-center justify-center hover:text-indigo-600 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.max(13, prev - 1))}
            className="w-7 h-7 rounded-lg bg-white/90 backdrop-blur-xs text-slate-700 hover:bg-white shadow-md flex items-center justify-center hover:text-indigo-600 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setMapLayer(prev => (prev === 'standard' ? 'humanitarian' : 'standard'))}
            className="w-7 h-7 rounded-lg bg-white/90 backdrop-blur-xs text-slate-700 hover:bg-white shadow-md flex items-center justify-center hover:text-indigo-600 transition-colors cursor-pointer"
            title="Toggle Map Style"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom Corner Overlay Badges */}
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 pointer-events-auto">
          <div className="bg-slate-900/85 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-md">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>{isKhmer ? `កាំផ្ទៀងផ្ទាត់: ${currentRadius} ម៉ែត្រ` : `Geofence: ${currentRadius}m`}</span>
          </div>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/90 backdrop-blur-xs hover:bg-white text-slate-700 hover:text-indigo-600 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-md transition-colors"
            title="Open in Google Maps"
          >
            <span>Google Maps</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* Footer Controls: Radius Selector & GPS Details */}
      <div className="bg-white px-3.5 py-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Radius pills if customizable */}
        {allowRadiusChange ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-600">
              {isKhmer ? 'កែប្រែកាំ:' : 'Radius:'}
            </span>
            <div className="flex items-center gap-1">
              {RADIUS_OPTIONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setCurrentRadius(r);
                    if (onRadiusChange) onRadiusChange(r);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    currentRadius === r
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r}m
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {isKhmer
                ? `បុគ្គលិកត្រូវស្ថិតក្នុងកាំ ${currentRadius}ម ដើម្បីស្កេនវត្តមានបានជោគជ័យ`
                : `Staff must be within ${currentRadius}m perimeter for check-in to be valid`}
            </span>
          </div>
        )}

        {/* Live GPS Device Distance */}
        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
          {deviceDistance !== null && (
            <span>
              {isKhmer ? 'ចម្ងាយបច្ចុប្បន្ន:' : 'Your Distance:'}{' '}
              <strong className={isInsideGeofence ? 'text-emerald-700' : 'text-rose-600'}>
                {deviceDistance}m
              </strong>
            </span>
          )}
          {gpsAccuracy !== null && (
            <span className="text-slate-400">
              (±{gpsAccuracy}m)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
