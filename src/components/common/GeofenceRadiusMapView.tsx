import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { StorageService } from '../../services/storageService.ts';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  MapPin,
  Navigation,
  Compass,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Building,
  Layers,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface GeofenceRadiusMapViewProps {
  locationName?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  staffName?: string;
  staffType?: 'teacher' | 'employee';
  showTestLocation?: boolean;
  compact?: boolean;
  className?: string;
}

export const GeofenceRadiusMapView: React.FC<GeofenceRadiusMapViewProps> = ({
  locationName,
  latitude,
  longitude,
  radiusMeters,
  staffName,
  staffType = 'teacher',
  showTestLocation = true,
  compact = false,
  className = ''
}) => {
  const { isKhmer } = useLanguage();
  const settings = StorageService.getSettings();
  const locations = StorageService.getLocations();

  // Resolve target location coordinates and permitted radius
  const activeLocation = locations.find(loc => loc.isActive) || locations[0];
  const centerLat = latitude ?? activeLocation?.latitude ?? settings.defaultLocationLatitude ?? 11.5564;
  const centerLng = longitude ?? activeLocation?.longitude ?? settings.defaultLocationLongitude ?? 104.9282;
  const allowedRadius = radiusMeters ?? activeLocation?.radiusMeters ?? settings.geofenceRadiusMeters ?? 500;
  const locTitle = locationName || activeLocation?.name || (isKhmer ? 'បរិវេណសាលា (Main Campus)' : 'Main Campus');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const [mapTileStyle, setMapTileStyle] = useState<'streets' | 'satellite'>('streets');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isInside, setIsInside] = useState<boolean | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean previous instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });
    mapInstanceRef.current = map;

    // Tile Layer: Standard OpenStreetMap
    const tileUrl =
      mapTileStyle === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    // Custom Campus Center Icon
    const campusIcon = L.divIcon({
      className: 'custom-campus-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
          <div style="background: #4f46e5; color: white; padding: 4px 8px; border-radius: 9999px; font-weight: 800; font-size: 11px; white-space: nowrap; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4); display: flex; align-items: center; gap: 4px; border: 2px solid white;">
            <span>🏫</span>
            <span>${locTitle}</span>
          </div>
          <div style="width: 14px; height: 14px; background: #4f46e5; transform: rotate(45deg); margin-top: -7px; border: 2px solid white; border-top: none; border-left: none;"></div>
          <div style="width: 8px; height: 8px; border-radius: 9999px; background: #312e81; margin-top: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
        </div>
      `,
      iconSize: [0, 0]
    });

    L.marker([centerLat, centerLng], { icon: campusIcon })
      .addTo(map)
      .bindPopup(
        `<div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <strong>🏫 ${locTitle}</strong><br/>
          <span style="color: #64748b;">${centerLat.toFixed(5)}, ${centerLng.toFixed(5)}</span><br/>
          <span style="color: #4f46e5; font-weight: 700;">Permitted Radius: ${allowedRadius}m</span>
        </div>`
      );

    // Permitted Radius Circle with pulsing styling
    const circle = L.circle([centerLat, centerLng], {
      radius: allowedRadius,
      color: '#4f46e5',
      fillColor: '#6366f1',
      fillOpacity: 0.16,
      weight: 2,
      dashArray: '6, 6'
    }).addTo(map);
    circleRef.current = circle;

    // Fit view to include the full radius circle
    map.fitBounds(circle.getBounds(), { padding: [20, 20] });

    // Handle container resize
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [centerLat, centerLng, allowedRadius, locTitle, mapTileStyle]);

  // Handle Live User GPS Location Test
  const handleTestLocation = () => {
    setGeoError(null);
    setIsLocating(true);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoError(isKhmer ? 'ឧបករណ៍ ឬកម្មវិធីរុករកមិនគាំទ្រ GPS ទេ' : 'Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setUserLocation({ lat: uLat, lng: uLng });

        // Calculate distance to campus center
        const dist = AttendanceEngine.calculateDistance(uLat, uLng, centerLat, centerLng);
        setDistance(dist);
        const inside = dist <= allowedRadius;
        setIsInside(inside);
        setIsLocating(false);

        // Update map markers
        const map = mapInstanceRef.current;
        if (!map) return;

        // Remove old marker/line
        if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
        if (polylineRef.current) map.removeLayer(polylineRef.current);

        const userPinColor = inside ? '#10b981' : '#f43f5e';
        const userIcon = L.divIcon({
          className: 'custom-user-pin',
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
              <div style="background: ${userPinColor}; color: white; padding: 4px 8px; border-radius: 9999px; font-weight: 800; font-size: 11px; white-space: nowrap; box-shadow: 0 4px 12px ${inside ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}; display: flex; align-items: center; gap: 4px; border: 2px solid white;">
                <span>${inside ? '📍' : '⚠️'}</span>
                <span>${staffName ? staffName.split(' ')[0] : 'You'} (${dist}m)</span>
              </div>
              <div style="width: 12px; height: 12px; background: ${userPinColor}; transform: rotate(45deg); margin-top: -6px; border: 2px solid white; border-top: none; border-left: none;"></div>
            </div>
          `,
          iconSize: [0, 0]
        });

        const uMarker = L.marker([uLat, uLng], { icon: userIcon })
          .addTo(map)
          .bindPopup(
            `<div style="font-family: inherit; font-size: 12px;">
              <strong>${staffName || 'Current Location'}</strong><br/>
              Distance to campus: <b>${dist}m</b><br/>
              <span style="color: ${userPinColor}; font-weight: 700;">
                ${inside ? '✅ Inside Authorized Geofence' : '❌ Outside Permitted Radius'}
              </span>
            </div>`
          )
          .openPopup();
        userMarkerRef.current = uMarker;

        // Connecting dotted line
        const polyline = L.polyline(
          [
            [centerLat, centerLng],
            [uLat, uLng]
          ],
          {
            color: userPinColor,
            weight: 2,
            dashArray: '4, 4',
            opacity: 0.8
          }
        ).addTo(map);
        polylineRef.current = polyline;

        // Fit both campus center & user in view
        const bounds = L.latLngBounds([
          [centerLat, centerLng],
          [uLat, uLng]
        ]);
        if (circleRef.current) {
          bounds.extend(circleRef.current.getBounds());
        }
        map.fitBounds(bounds, { padding: [30, 30] });
      },
      err => {
        setIsLocating(false);
        let msg = isKhmer ? 'មិនអាចទាញយកទីតាំង GPS របស់អ្នកបានទេ' : 'Unable to retrieve GPS coordinates.';
        if (err.code === 1) {
          msg = isKhmer
            ? 'ការស្នើសុំទីតាំងត្រូវបានបដិសេធ។ សូមបើកសិទ្ធិ Location លើឧបករណ៍របស់អ្នក។'
            : 'Location permission was denied. Please allow location access.';
        } else if (err.code === 2) {
          msg = isKhmer
            ? 'សញ្ញា GPS មិនដំណើរការ សូមបើក Location លើទូរស័ព្ទរបស់អ្នក។'
            : 'GPS position unavailable. Please enable device location.';
        } else if (err.code === 3) {
          msg = isKhmer ? 'ការស្នើសុំ GPS ហួសពេលកំណត់។' : 'GPS request timed out.';
        }
        setGeoError(msg);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleZoom = (delta: number) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() + delta);
  };

  const handleCenterCampus = () => {
    if (!mapInstanceRef.current || !circleRef.current) return;
    mapInstanceRef.current.fitBounds(circleRef.current.getBounds(), { padding: [25, 25] });
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Top Header Information Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs text-slate-900">{locTitle}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                {isKhmer ? `កាំអនុញ្ញាត ${allowedRadius}ម` : `Radius: ${allowedRadius}m`}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              {centerLat.toFixed(5)}° N, {centerLng.toFixed(5)}° E
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMapTileStyle(s => (s === 'streets' ? 'satellite' : 'streets'))}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
            title={mapTileStyle === 'streets' ? 'Switch to Satellite View' : 'Switch to Street Map'}
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">{mapTileStyle === 'streets' ? 'Satellite' : 'Map'}</span>
          </button>

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${centerLat},${centerLng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-indigo-600 flex items-center gap-1 transition-colors"
            title="Open coordinates in external Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isKhmer ? 'បើកផែនទី' : 'Maps'}</span>
          </a>
        </div>
      </div>

      {/* Map View Box Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
        {/* Leaflet Map Target Element */}
        <div
          ref={mapContainerRef}
          className={`w-full ${compact ? 'h-48' : 'h-64 sm:h-72'} z-0`}
          style={{ minHeight: compact ? '190px' : '250px' }}
        />

        {/* Floating Zoom & Center Buttons */}
        <div className="absolute right-2.5 top-2.5 z-[400] flex flex-col gap-1 shadow-md rounded-xl overflow-hidden bg-white/95 backdrop-blur-xs border border-slate-200">
          <button
            type="button"
            onClick={() => handleZoom(1)}
            className="w-7 h-7 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(-1)}
            className="w-7 h-7 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border-t border-slate-100"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCenterCampus}
            className="w-7 h-7 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer border-t border-slate-100"
            title="Center on Campus Boundary"
          >
            <Building className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Legend Overlay at bottom-left */}
        <div className="absolute left-2.5 bottom-2.5 z-[400] bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm text-[10px] space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <span className="w-2.5 h-2.5 rounded-full border border-indigo-600 bg-indigo-500/30" />
            <span>{isKhmer ? 'កាំអនុញ្ញាតស្កេន' : 'Permitted Geofence'}: {allowedRadius}m</span>
          </div>
          {distance !== null && (
            <div className={`flex items-center gap-1.5 font-extrabold ${isInside ? 'text-emerald-700' : 'text-rose-700'}`}>
              <span className={`w-2 h-2 rounded-full ${isInside ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span>
                {isInside ? (isKhmer ? 'ក្នុងបរិវេណ' : 'Inside Zone') : (isKhmer ? 'ក្រៅបរិវេណ' : 'Outside')}: {distance}m
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Geofence Validation Live Feedback & GPS Test */}
      {showTestLocation && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleTestLocation}
              disabled={isLocating}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span>
                {isLocating
                  ? isKhmer
                    ? 'កំពុងចាប់សញ្ញា GPS...'
                    : 'Locating GPS...'
                  : isKhmer
                  ? 'ពិនិត្យទីតាំងខ្ញុំជាក់ស្តែង (Test GPS)'
                  : 'Test My Real GPS Position'}
              </span>
            </button>
          </div>

          {/* Validation Status Banner */}
          {distance !== null && isInside !== null && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in duration-200 ${
                isInside
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}
            >
              {isInside ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <strong className="font-black">
                    {isInside
                      ? isKhmer
                        ? '✅ ផ្ទៀងផ្ទាត់ជោគជ័យ៖ ស្ថិតក្នុងបរិវេណសាលា'
                        : '✅ Geofence Validated: Inside Campus Boundary'
                      : isKhmer
                      ? '⚠️ ក្រៅបរិវេណសាលា៖ ស្កេនវត្តមាននឹងត្រូវរារាំង'
                      : '⚠️ Geofence Restriction: Outside Campus Boundary'}
                  </strong>
                  <span className="font-mono font-bold text-[11px] shrink-0">
                    {distance}m / max {allowedRadius}m
                  </span>
                </div>
                <p className="text-[11px] mt-0.5 opacity-90">
                  {isInside
                    ? isKhmer
                      ? `លោកអ្នកនៅចម្ងាយត្រឹមតែ ${distance}ម ពីចំណុចកណ្តាលនៃបរិវេណសាលា (${locTitle})។ ប្រព័ន្ធនឹងអនុញ្ញាតឱ្យស្កេនវត្តមានចូល-ចេញបានត្រឹមត្រូវ។`
                      : `You are currently ${distance}m from ${locTitle}. Attendance check-in & check-out will be authorized.`
                    : isKhmer
                    ? `លោកអ្នកនៅចម្ងាយ ${distance.toLocaleString()}ម (លើសកាំអនុញ្ញាត ${allowedRadius}ម)។ សូមចូលមកក្នុងបរិវេណសាលាដើម្បីស្កេនវត្តមាន។`
                    : `You are ${distance.toLocaleString()}m away from ${locTitle} (exceeds authorized radius by ${(distance - allowedRadius).toLocaleString()}m). Move inside campus boundaries to check in.`}
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {geoError && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{geoError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
