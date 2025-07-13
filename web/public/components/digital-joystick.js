import { LitElement, css, html } from 'lit';

class DigitalJoystick extends LitElement {
    static get styles() {
        return css`
            .container {
                position: relative;
                width: 150px;
                height: 150px;
                border-radius: 50%;
                background-color: #f0f0f0;
                overflow: hidden;
                touch-action: none;
                cursor: pointer;
            }

            .stick {
                position: absolute;
                width: 50px;
                height: 50px;
                background-color: black;
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                touch-action: none;
                pointer-events: none;
            }
        `;
    }

    constructor() {
        super();
        this.stickX = 0;
        this.stickY = 0;
        this.isDragging = false;
        this.containerRect = null;
        this.stickSize = 50;
        this.maxDistance = 0;
        this.activePointerId = null; // Track active pointer ID

        // Bind event handlers
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
    }

    firstUpdated() {
        const container = this.shadowRoot.querySelector('.container');
        this.containerRect = container.getBoundingClientRect();
        this.maxDistance = (this.containerRect.width - this.stickSize) / 2;
    }

    handlePointerDown(e) {
        // Only respond to the primary touch if not already dragging
        if (!this.isDragging) {
            this.isDragging = true;
            this.activePointerId = e.pointerId;
            const container = this.shadowRoot.querySelector('.container');
            container.setPointerCapture(e.pointerId);
            this.updateStickPosition(e);
        }
    }

    handlePointerMove(e) {
        // Only process movement for the active pointer
        if (this.isDragging && e.pointerId === this.activePointerId) {
            this.updateStickPosition(e);
        }
    }

    handlePointerUp(e) {
        // Only end drag for the active pointer
        if (this.isDragging && e.pointerId === this.activePointerId) {
            this.isDragging = false;
            this.activePointerId = null;
            this.resetStick();
        }
    }

    updateStickPosition(e) {
        // Recalculate container position in case of layout changes
        const container = this.shadowRoot.querySelector('.container');
        this.containerRect = container.getBoundingClientRect();

        const containerCenterX = this.containerRect.width / 2;
        const containerCenterY = this.containerRect.height / 2;

        const pointerX = e.clientX - this.containerRect.left;
        const pointerY = e.clientY - this.containerRect.top;

        // Calculate relative position from center
        let relX = pointerX - containerCenterX;
        let relY = pointerY - containerCenterY;

        // Apply circular constraint
        const distance = Math.min(
            Math.sqrt(relX * relX + relY * relY),
            this.maxDistance
        );

        if (distance > 0) {
            const angle = Math.atan2(relY, relX);
            relX = Math.cos(angle) * distance;
            relY = Math.sin(angle) * distance;
        }

        // Update stick position
        this.stickX = relX;
        this.stickY = relY;
        this.updateStickVisual();

        // Normalize coordinates (-1 to 1)
        const normX = this.stickX / this.maxDistance;
        const normY = -this.stickY / this.maxDistance;  // Invert Y for natural direction

        // Emit custom event
        this.dispatchEvent(new CustomEvent('stick-move', {
            detail: { x: normX, y: normY }
        }));
    }

    updateStickVisual() {
        const stick = this.shadowRoot.querySelector('.stick');
        if (stick) {
            stick.style.transform = `translate(-50%, -50%) translate(${this.stickX}px, ${this.stickY}px)`;
        }
    }

    resetStick() {
        this.stickX = 0;
        this.stickY = 0;
        this.updateStickVisual();

        // Emit reset event
        this.dispatchEvent(new CustomEvent('stick-move', {
            detail: { x: 0, y: 0 }
        }));
    }

    render() {
        return html`
            <div class="container"
                @pointerdown="${this.handlePointerDown}"
                @pointermove="${this.handlePointerMove}"
                @pointerup="${this.handlePointerUp}"
                @pointercancel="${this.handlePointerUp}"
                @pointerleave="${this.handlePointerUp}">
                <div class="stick"></div>
            </div>
        `;
    }
}

customElements.define('digital-joystick', DigitalJoystick);
