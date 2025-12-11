// TrackLive - Map Trajectory Renderer
// Handles drawing the trajectory and marker position on the map canvas

class MapTrajectoryRenderer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.mapElement = null;
        this.scale = 100000; // pixels per degree
        this.centerLat = 40.7128;
        this.centerLng = -74.0060;
        
        this.init();
    }

    init() {
        // Create canvas overlay
        this.mapElement = document.querySelector('div[class*="group/map-container"]');
        if (this.mapElement) {
            this.canvas = document.createElement('canvas');
            this.canvas.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                z-index: 5;
                cursor: crosshair;
            `;
            this.mapElement.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
            
            // Handle resize
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
            
            console.log('Map trajectory renderer initialized');
        }
    }

    resizeCanvas() {
        if (this.mapElement && this.canvas) {
            const width = this.mapElement.offsetWidth;
            const height = this.mapElement.offsetHeight;
            const dpr = window.devicePixelRatio || 1;

            // CSS pixel size
            this.canvas.style.width = width + 'px';
            this.canvas.style.height = height + 'px';

            // Actual canvas resolution for sharp rendering on HiDPI displays
            this.canvas.width = Math.round(width * dpr);
            this.canvas.height = Math.round(height * dpr);

            // Prevent the canvas from blocking pointer events for UI elements
            this.canvas.style.pointerEvents = 'none';

            // Scale drawing operations to account for devicePixelRatio
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    }

    draw(objects, currentObjectId) {
        if (!this.ctx) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const currentObject = objects[currentObjectId];
        if (currentObject) {
            // Update center to follow current object
            this.centerLat = currentObject.lat;
            this.centerLng = currentObject.lng;
        }

        // Draw all trajectories
        for (let objId in objects) {
            const obj = objects[objId];
            const isCurrentObject = objId === currentObjectId;
            
            // Draw trajectory
            this.drawTrajectory(obj, isCurrentObject);
            
            // Draw marker
            this.drawMarker(obj, isCurrentObject);
        }
    }

    drawTrajectory(obj, isCurrent) {
        if (obj.trajectory.length < 2) return;

        const color = isCurrent ? '#135bec' : '#999';
        const lineWidth = isCurrent ? 3 : 1;
        const alpha = isCurrent ? 0.8 : 0.3;

        this.ctx.strokeStyle = color;
        this.ctx.globalAlpha = alpha;
        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        const firstPoint = this.latLngToPixel(obj.trajectory[0][0], obj.trajectory[0][1]);
        this.ctx.moveTo(firstPoint.x, firstPoint.y);

        for (let i = 1; i < obj.trajectory.length; i++) {
            const point = this.latLngToPixel(obj.trajectory[i][0], obj.trajectory[i][1]);
            this.ctx.lineTo(point.x, point.y);
        }

        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;
    }

    drawMarker(obj, isCurrent) {
        const pos = this.latLngToPixel(obj.lat, obj.lng);
        const size = isCurrent ? 12 : 8;
        const color = obj.status === 'Moving' ? '#22c55e' : '#eab308';

        // Draw glow effect
        const gradient = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, size * 3);
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(1, color + '00');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, size * 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw marker circle
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw marker border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw direction arrow if moving
        if (obj.status === 'Moving' && obj.speed > 0) {
            this.drawDirectionArrow(pos, obj.heading, size);
        }
    }

    drawDirectionArrow(pos, heading, size) {
        const arrowSize = size * 2;
        const angle = (heading * Math.PI) / 180;

        this.ctx.save();
        this.ctx.translate(pos.x, pos.y);
        this.ctx.rotate(angle);

        // Draw arrow
        this.ctx.strokeStyle = '#135bec';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -arrowSize);
        this.ctx.lineTo(-arrowSize * 0.4, -arrowSize * 0.4);
        this.ctx.moveTo(0, -arrowSize);
        this.ctx.lineTo(arrowSize * 0.4, -arrowSize * 0.4);
        this.ctx.stroke();

        this.ctx.restore();
    }

    latLngToPixel(lat, lng) {
        const x = (lng - this.centerLng) * this.scale + this.canvas.width / 2;
        const y = (this.centerLat - lat) * this.scale + this.canvas.height / 2;
        return { x, y };
    }

    pixelToLatLng(x, y) {
        const lng = this.centerLng + (x - this.canvas.width / 2) / this.scale;
        const lat = this.centerLat - (y - this.canvas.height / 2) / this.scale;
        return { lat, lng };
    }
}

// Export for use in main app
window.MapTrajectoryRenderer = MapTrajectoryRenderer;
