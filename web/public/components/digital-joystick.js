import { LitElement, css, html } from 'lit';

class DigitalJoystick extends LitElement {
    static get properties() {
        return {
            precise: { type: Boolean, reflect: true },
            stickX: { type: Boolean, reflect: true, attribute: 'stick-x' },
            stickY: { type: Boolean, reflect: true, attribute: 'stick-y' }
        };
    }

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
        this.stickPositionX = 0;
        this.stickPositionY = 0;
        this.isDragging = false;
        this.containerRect = null;
        this.stickSize = 50;
        this.maxDistance = 0;
        this.activePointerId = null;
        this.initialPointerX = 0;
        this.initialPointerY = 0;
        this.initialStickX = 0;
        this.initialStickY = 0;
        
        this.precise = false;
        this.stickX = false;
        this.stickY = false;

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
        if (!this.isDragging) {
            this.isDragging = true;
            this.activePointerId = e.pointerId;
            const container = this.shadowRoot.querySelector('.container');
            container.setPointerCapture(e.pointerId);

            // Update container position
            this.containerRect = container.getBoundingClientRect();
            const pointerX = e.clientX - this.containerRect.left;
            const pointerY = e.clientY - this.containerRect.top;
            const containerCenterX = this.containerRect.width / 2;
            const containerCenterY = this.containerRect.height / 2;

            if (this.precise) {
                // Record initial positions for precise mode
                this.initialPointerX = pointerX;
                this.initialPointerY = pointerY;
                this.initialStickX = this.stickPositionX;
                this.initialStickY = this.stickPositionY;
            } else {
                // Standard behavior: move stick to touch point
                this.updateStickPosition(e, true);
            }
        }
    }

    handlePointerMove(e) {
        if (this.isDragging && e.pointerId === this.activePointerId) {
            this.updateStickPosition(e, false);
        }
    }

    handlePointerUp(e) {
        if (this.isDragging && e.pointerId === this.activePointerId) {
            this.isDragging = false;
            this.activePointerId = null;
            this.resetStick();
        }
    }

    updateStickPosition(e, isInitialMove) {
        // Update container position
        const container = this.shadowRoot.querySelector('.container');
        this.containerRect = container.getBoundingClientRect();
        const pointerX = e.clientX - this.containerRect.left;
        const pointerY = e.clientY - this.containerRect.top;
        const containerCenterX = this.containerRect.width / 2;
        const containerCenterY = this.containerRect.height / 2;

        if (this.precise && this.isDragging) {
            // Precise mode: maintain initial offset
            const deltaX = pointerX - this.initialPointerX;
            const deltaY = pointerY - this.initialPointerY;
            
            let newX = this.initialStickX + deltaX;
            let newY = this.initialStickY + deltaY;
            
            // Apply circular constraint
            const distance = Math.sqrt(newX * newX + newY * newY);
            if (distance > this.maxDistance) {
                const angle = Math.atan2(newY, newX);
                newX = Math.cos(angle) * this.maxDistance;
                newY = Math.sin(angle) * this.maxDistance;
            }
            
            this.stickPositionX = newX;
            this.stickPositionY = newY;
        } else {
            // Standard behavior
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
            
            this.stickPositionX = relX;
            this.stickPositionY = relY;
        }
        
        // Update visual position
        this.updateStickVisual();
        
        // Normalize coordinates (-1 to 1)
        const normX = this.stickPositionX / this.maxDistance;
        const normY = -this.stickPositionY / this.maxDistance;  // Invert Y
        
        // Emit custom event
        this.dispatchEvent(new CustomEvent('stick-move', {
            detail: { x: normX, y: normY }
        }));
    }

    updateStickVisual() {
        const stick = this.shadowRoot.querySelector('.stick');
        if (stick) {
            stick.style.transform = `translate(-50%, -50%) translate(${this.stickPositionX}px, ${this.stickPositionY}px)`;
        }
    }

    resetStick() {
        // Only reset axes that aren't sticky
        if (!this.stickX) this.stickPositionX = 0;
        if (!this.stickY) this.stickPositionY = 0;
        
        this.updateStickVisual();
        
        // Emit event with current position (may not be 0,0 if sticky)
        const normX = this.stickPositionX / this.maxDistance;
        const normY = -this.stickPositionY / this.maxDistance;
        this.dispatchEvent(new CustomEvent('stick-move', {
            detail: { x: normX, y: normY }
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
