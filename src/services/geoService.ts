import { StorageService } from './storageService.ts';
import { AttendanceEngine } from './attendanceEngine.ts';

export interface GeoLocationResult {
  latitude?: number;
  longitude?: number;
  inside: boolean;
  distance: number;
  error?: string;
}

export const GeoService = {
  // Get current device coordinates with timeout
  async getCurrentPosition(options?: { highAccuracy?: boolean; timeout?: number; maximumAge?: number }): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser or device. (ឧបករណ៍ ឬកម្មវិធីរុករករបស់អ្នកមិនគាំទ្រ GPS ទេ)'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        pos => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        err => {
          let msg = 'Unable to retrieve your location.';
          if (err.code === 1) {
            msg = 'Location permission was denied. Please allow location access in your device/browser settings to verify campus attendance. (សូមអនុញ្ញាតបើកសិទ្ធិទីតាំង GPS ដើម្បីផ្ទៀងផ្ទាត់វត្តមានក្នុងសាលា)';
          } else if (err.code === 2) {
            msg = 'GPS position unavailable. Please ensure your device location is turned on. (មិនអាចចាប់សញ្ញា GPS បានទេ សូមបើក Location លើទូរស័ព្ទរបស់អ្នក)';
          } else if (err.code === 3) {
            msg = 'GPS location request timed out. Please try again. (ការស្នើសុំទីតាំង GPS ហួសពេលកំណត់ សូមព្យាយាមម្តងទៀត)';
          }
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: options?.highAccuracy ?? true,
          timeout: options?.timeout ?? 10000,
          maximumAge: options?.maximumAge ?? 0
        }
      );
    });
  },

  // Check if current device is within campus geofence
  async verifyCurrentLocation(): Promise<GeoLocationResult> {
    const settings = StorageService.getSettings();
    try {
      const coords = await this.getCurrentPosition();
      const check = AttendanceEngine.verifyLocation(coords.latitude, coords.longitude, settings);
      return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        inside: check.inside,
        distance: check.distance
      };
    } catch (err: any) {
      return {
        inside: false,
        distance: -1,
        error: err?.message || 'Failed to get location'
      };
    }
  }
};
