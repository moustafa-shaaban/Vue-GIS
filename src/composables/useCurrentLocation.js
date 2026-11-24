import { ref } from "vue";

function messageFor(error) {
  switch (error.code) {
    case 1: // PERMISSION_DENIED
      return "Location permission denied. Allow location access in your browser or app settings.";
    case 2: // POSITION_UNAVAILABLE
      return "Your location is unavailable right now. Check that GPS/location services are on.";
    case 3: // TIMEOUT
      return "Getting your location timed out. Try again, ideally with a clearer view of the sky.";
    default:
      return "Could not get your location.";
  }
}

/**
 * Promise-based wrapper around navigator.geolocation.
 *
 * const { locating, getCurrentLocation } = useCurrentLocation()
 * const { lat, lng, accuracy } = await getCurrentLocation()
 *
 * Rejects with an Error whose message is safe to show to the user.
 */
export function useCurrentLocation() {
  const locating = ref(false);

  function getCurrentLocation(options = {}) {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        reject(new Error("Location is not supported on this device."));
        return;
      }

      locating.value = true;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          locating.value = false;
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy, // metres
          });
        },
        (error) => {
          locating.value = false;
          reject(new Error(messageFor(error)));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000, // accept a fix up to 30s old
          ...options,
        },
      );
    });
  }

  return { locating, getCurrentLocation };
}
