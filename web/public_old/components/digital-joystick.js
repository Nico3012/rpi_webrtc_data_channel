import { LitElement, css, html } from 'lit';

class DigitalJoystick extends LitElement {
    static get properties() {
        return {
            precise: { type: Boolean, reflect: true },
            stickX: { type: Boolean, reflect: true, attribute: 'stick-x' },
            stickY: { type: Boolean, reflect: true, attribute: 'stick-y' },
            // allow custom stick size ratio (0 < ratio < 1)
            stickRatio: { type: Number },
            // default normalized positions (-1 to 1), default to 0 if not set
            defaultX: { type: Number, reflect: true, attribute: 'default-x' },
            defaultY: { type: Number, reflect: true, attribute: 'default-y' },
        };
    }

    static get styles() {
        return css`
            :host {
                display: block;
                width: 150px;
                height: 150px;
            }
            .wrapper {
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .container {
                position: relative;
                background-color: #f0f0f0;
                border-radius: 50%;
                overflow: hidden;
                touch-action: none;
                cursor: pointer;
            }
            .stick {
                position: absolute;
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
        // stick position in px relative to center
        this.stickPositionX = 0;
        this.stickPositionY = 0;
        this.isDragging = false;
        this.maxDistance = 0;
        this.currentStickSize = 0;
        this.precise = false;
        this.stickX = false;
        this.stickY = false;
        this.stickRatio = 0.3; // default stick occupies 30% of container
        // default normalized positions
        this.defaultX = 0;
        this.defaultY = 0;
        this._lastDispatchedNormX = 0;
        this._lastDispatchedNormY = 0;

        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.handleResize = this.handleResize.bind(this);
    }

    firstUpdated() {
        this.wrapper = this.shadowRoot.querySelector('.wrapper');
        this.container = this.shadowRoot.querySelector('.container');
        this.stick = this.shadowRoot.querySelector('.stick');
        // initial sizing and default position
        this.updateContainerAndStickSize();
        window.addEventListener('resize', this.handleResize);

        // add touch event handler
        this.container.addEventListener('touchstart', this.preventTouchEvent, { passive: false });
        this.container.addEventListener('touchmove', this.preventTouchEvent, { passive: false });
        this.container.addEventListener('touchend', this.preventTouchEvent, { passive: false });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('resize', this.handleResize);

        // remove touch event handler
        this.container.removeEventListener('touchstart', this.preventTouchEvent);
        this.container.removeEventListener('touchmove', this.preventTouchEvent);
        this.container.removeEventListener('touchend', this.preventTouchEvent);
    }

    handleResize() {
        this.updateContainerAndStickSize();
    }

    updateContainerAndStickSize() {
        // compute wrapper dimensions
        const wrapperRect = this.wrapper.getBoundingClientRect();
        const size = Math.min(wrapperRect.width, wrapperRect.height);
        // compute stick size first
        this.currentStickSize = size * this.stickRatio;
        // then apply to container
        this.container.style.width = `${size}px`;
        this.container.style.height = `${size}px`;
        // compute maxDistance based on current stick size
        this.maxDistance = (size - this.currentStickSize) / 2;
        // apply stick dimensions
        this.stick.style.width = `${this.currentStickSize}px`;
        this.stick.style.height = `${this.currentStickSize}px`;
        // update containerRect for pointer math
        this.containerRect = this.container.getBoundingClientRect();

        // apply default normalized positions
        this.stickPositionX = this.defaultX * this.maxDistance;
        // invert defaultY so positive defaultY moves stick up visually
        this.stickPositionY = -this.defaultY * this.maxDistance;

        // reposition stick at default offset
        this.updateStickVisual();
    }

    preventTouchEvent(e) {
        e.preventDefault();
    }

    handlePointerDown(e) {
        e.preventDefault();

        if (!this.isDragging) {
            this.isDragging = true;
            this.activePointerId = e.pointerId;
            this.container.setPointerCapture(e.pointerId);
            this.containerRect = this.container.getBoundingClientRect();
            const pointerX = e.clientX - this.containerRect.left;
            const pointerY = e.clientY - this.containerRect.top;
            if (this.precise) {
                this.initialPointerX = pointerX;
                this.initialPointerY = pointerY;
                this.initialStickX = this.stickPositionX;
                this.initialStickY = this.stickPositionY;
            } else {
                this.updateStickPosition(e);
            }
        }
    }

    handlePointerMove(e) {
        e.preventDefault();

        if (this.isDragging && e.pointerId === this.activePointerId) {
            this.updateStickPosition(e);
        }
    }

    handlePointerUp(e) {
        e.preventDefault();

        if (this.isDragging && e.pointerId === this.activePointerId) {
            this.isDragging = false;
            this.activePointerId = null;
            this.resetStick();
        }
    }

    updateStickPosition(e) {
        this.containerRect = this.container.getBoundingClientRect();
        const pointerX = e.clientX - this.containerRect.left;
        const pointerY = e.clientY - this.containerRect.top;
        const center = this.containerRect.width / 2;
        let relX = pointerX - center;
        let relY = pointerY - center;

        if (this.precise) {
            const deltaX = pointerX - this.initialPointerX;
            const deltaY = pointerY - this.initialPointerY;
            relX = this.initialStickX + deltaX;
            relY = this.initialStickY + deltaY;
        }
        const dist = Math.sqrt(relX * relX + relY * relY);
        const limitedDist = Math.min(dist, this.maxDistance);
        if (dist > 0) {
            const angle = Math.atan2(relY, relX);
            relX = Math.cos(angle) * limitedDist;
            relY = Math.sin(angle) * limitedDist;
        }
        this.stickPositionX = relX;
        this.stickPositionY = relY;
        this.updateStickVisual();
        const normX = relX / this.maxDistance;
        const normY = -relY / this.maxDistance;
        if (normX !== this._lastDispatchedNormX || normY !== this._lastDispatchedNormY) {
            this.dispatchEvent(new CustomEvent('stick-move', { detail: { x: normX, y: normY } }));
            this._lastDispatchedNormX = normX;
            this._lastDispatchedNormY = normY;
        }
    }

    updateStickVisual() {
        this.stick.style.transform = `translate(-50%, -50%) translate(${this.stickPositionX}px, ${this.stickPositionY}px)`;
    }

    resetStick() {
        if (!this.stickX) this.stickPositionX = this.defaultX * this.maxDistance;
        if (!this.stickY) this.stickPositionY = -this.defaultY * this.maxDistance;
        this.updateStickVisual();
        const normX = this.stickPositionX / this.maxDistance;
        const normY = -this.stickPositionY / this.maxDistance;
        if (normX !== this._lastDispatchedNormX || normY !== this._lastDispatchedNormY) {
            this.dispatchEvent(new CustomEvent('stick-move', { detail: { x: normX, y: normY } }));
            this._lastDispatchedNormX = normX;
            this._lastDispatchedNormY = normY;
        }
    }

    render() {
        return html`
            <div class="wrapper">
                <div class="container"
                    @pointerdown="${this.handlePointerDown}"
                    @pointermove="${this.handlePointerMove}"
                    @pointerup="${this.handlePointerUp}"
                    @pointercancel="${this.handlePointerUp}"
                    @pointerleave="${this.handlePointerUp}">
                    <div class="stick"></div>
                </div>
            </div>
        `;
    }
}

customElements.define('digital-joystick', DigitalJoystick);
