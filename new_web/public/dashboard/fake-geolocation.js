export class FakeGeolocation {
    constructor() {
        this.intervalId = null;
        this.id = 0;
        // Startposition: London (Leaflet default)
        this.lat = 51.505;
        this.lon = -0.09;
        this.speed = 10 / 3.6; // 10 km/h in m/s
        this.heading = 90; // East in degrees
        this.accuracy = 10; // meters
        this.altitude = 0; // meters
        this.altitudeAccuracy = 10; // meters
    }

    watchPosition(successCallback, errorCallback, options) {
        this.id++;
        this.intervalId = setInterval(() => {
            // Update position: move east at constant speed
            const deltaTime = 1; // seconds
            const deltaDist = this.speed * deltaTime; // meters
            const deltaLon = (deltaDist / 111320) / Math.cos(this.lat * Math.PI / 180) * Math.sin(this.heading * Math.PI / 180);
            this.lon += deltaLon;

            // Create fake position object
            const pos = {
                coords: {
                    latitude: this.lat,
                    longitude: this.lon,
                    accuracy: this.accuracy,
                    altitude: this.altitude,
                    altitudeAccuracy: this.altitudeAccuracy,
                    heading: this.heading,
                    speed: this.speed,
                },
                timestamp: Date.now(),
            };
            successCallback(pos);
        }, 1000); // every second
        return this.id;
    }

    clearWatch(id) {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}