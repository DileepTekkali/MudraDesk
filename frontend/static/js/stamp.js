// Stamp Generator JavaScript

function initStampGenerator() {
    const autoGenerateToggle = document.getElementById('autoGenerateStamp');
    const stampOptions = document.getElementById('stampOptions');
    const stampUploadSection = document.getElementById('stampUploadSection');

    const stampNameInput = document.getElementById('stamp_business_name');
    const stampPlaceInput = document.getElementById('stamp_place');
    const stampTypeInputs = document.querySelectorAll('input[name="stamp_type"]');
    const stampDataInput = document.getElementById('stampData');
    const canvas = document.getElementById('stampCanvas');

    if (!autoGenerateToggle || !canvas) return;

    const ctx = canvas.getContext('2d');

    autoGenerateToggle.addEventListener('change', function () {
        if (this.checked) {
            stampOptions.style.display = 'block';
            stampUploadSection.style.display = 'none';
            generateStamp();
        } else {
            stampOptions.style.display = 'none';
            stampUploadSection.style.display = 'block';
            stampDataInput.value = '';
        }
    });

    [stampNameInput, stampPlaceInput].forEach(input => {
        if (input) {
            input.addEventListener('input', debounce(generateStamp, 200));
            input.addEventListener('change', generateStamp);
        }
    });

    stampTypeInputs.forEach(input => {
        input.addEventListener('change', generateStamp);
    });

    const mainBusinessName = document.getElementById('business_name');
    const mainBusinessAddress = document.getElementById('business_address');

    if (mainBusinessName) {
        mainBusinessName.addEventListener('input', function () {
            if (autoGenerateToggle.checked && stampNameInput) {
                stampNameInput.value = this.value;
                generateStamp();
            }
        });
    }

    if (mainBusinessAddress) {
        mainBusinessAddress.addEventListener('input', function () {
            if (autoGenerateToggle.checked && stampPlaceInput) {
                const val = this.value;
                const city = val.includes(',') ? val.split(',').pop().trim() : val;
                stampPlaceInput.value = city;
                generateStamp();
            }
        });
    }

    if (autoGenerateToggle.checked) generateStamp();

    // ─── Main entry ──────────────────────────────────────────────────────────
    function generateStamp() {
        if (!autoGenerateToggle.checked) return;

        const name = (stampNameInput?.value || 'SEAL').toUpperCase();
        const place = (stampPlaceInput?.value || '').toUpperCase();

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const stampColor = '#1e3a8a';

        ctx.strokeStyle = stampColor;
        ctx.fillStyle = stampColor;

        drawCircleStamp(ctx, centerX, centerY, name, place, stampColor);

        stampDataInput.value = canvas.toDataURL('image/png');
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Total arc angle (radians) that `text` occupies at `fontSize` on a
     * circle of radius `r`. Each character is measured individually and a
     * small letter-spacing factor (4 %) is added so glyphs never touch.
     */
    function textArcAngle(text, fontSize, r) {
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        let totalWidth = 0;
        for (const ch of text) totalWidth += ctx.measureText(ch).width;
        return (totalWidth * 1.04) / r;
    }

    /**
     * Arc angle for a single star glyph plus one space of padding on each
     * side, so stars are always visually separated from text.
     */
    function starArcAngle(fontSize, r) {
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        const spaceW = ctx.measureText(' ').width;
        const starW = ctx.measureText('★').width;
        return (starW + spaceW * 2) / r;
    }

    /**
     * Draw text along an arc.
     *
     * @param {string}  text
     * @param {number}  cx, cy      – center
     * @param {number}  r           – radius
     * @param {number}  midAngle    – midpoint angle of the text block (radians)
     * @param {string}  color
     * @param {number}  fontSize
     * @param {boolean} isBottom    – if TRUE, use heads-in (readable) orientation
     */
    function drawArcText(text, cx, cy, r, midAngle, color, fontSize, isBottom) {
        ctx.save();
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const totalAngle = textArcAngle(text, fontSize, r);
        let currentAngle;

        if (!isBottom) {
            // TOP: Start at the left edge and move clockwise (LR direction)
            currentAngle = midAngle - totalAngle / 2;
        } else {
            // BOTTOM: Start at the left edge and move clockwise to read L->R
            // Wait, for bottom, we want to go from the 9 o'clock side (larger angle) to 3 o'clock side (smaller angle).
            // Let's stick to the simplest: if it's the bottom, we start "left" and move "right".
            // Visually "left" on the bottom curve is midAngle + totalAngle/2.
            currentAngle = midAngle + totalAngle / 2;
        }

        for (const ch of text) {
            const cw = ctx.measureText(ch).width * 1.04;
            const halfAngle = cw / 2 / r;

            // charAngle is the center of the current character
            const charAngle = isBottom ? (currentAngle - halfAngle) : (currentAngle + halfAngle);

            ctx.save();
            ctx.translate(
                cx + Math.cos(charAngle) * r,
                cy + Math.sin(charAngle) * r
            );

            if (!isBottom) {
                // Top: heads-out (rotate char by angle + 90 deg)
                ctx.rotate(charAngle + Math.PI / 2);
            } else {
                // Bottom: heads-in (rotate char by angle - 90 deg)
                ctx.rotate(charAngle - Math.PI / 2);
            }

            ctx.fillText(ch, 0, 0);
            ctx.restore();

            if (!isBottom) {
                currentAngle += (cw / r); // Move clockwise for top
            } else {
                currentAngle -= (cw / r); // Move counter-clockwise for bottom (to go L->R)
            }
        }
        ctx.restore();
    }

    // ─── Main stamp drawing ──────────────────────────────────────────────────
    function drawCircleStamp(ctx, centerX, centerY, name, place, color) {
        // Multiplier based on current 1000px canvas vs original 180px design
        const SCALE = canvas.width / 180;
        const pad = 12 * SCALE;
        const maxR = Math.min(canvas.width, canvas.height) / 2 - pad;
        const radius = Math.max(60 * SCALE, Math.min(84 * SCALE, maxR));
        const innerRadius = Math.max(44 * SCALE, radius - 20 * SCALE);
        const textRadius = (radius + innerRadius) / 2;

        // Draw outer + inner circles
        ctx.lineWidth = 3.5 * SCALE;
        ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 2 * SCALE;
        ctx.beginPath(); ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2); ctx.stroke();

        // ── Auto-size font ──
        let fontSize = 14 * SCALE;
        const minFontSize = 7 * SCALE;

        function totalConsumed(fs) {
            return textArcAngle(name, fs, textRadius)
                + (place ? textArcAngle(place, fs, textRadius) : 0)
                + starArcAngle(fs, textRadius) * 2;
        }

        while (totalConsumed(fontSize) > Math.PI * 2 * 0.92 && fontSize > minFontSize) {
            fontSize -= 0.5;
        }

        const topAngle = textArcAngle(name, fontSize, textRadius);
        const botAngle = place ? textArcAngle(place, fontSize, textRadius) : 0;
        const sa = starArcAngle(fontSize, textRadius);
        const gapEach = Math.max(0, (Math.PI * 2 - topAngle - botAngle - sa * 2) / 2);

        // North pole = -PI/2, South pole = PI/2
        const midTop = -Math.PI / 2;
        const midBot = Math.PI / 2;

        // ── Draw text ──────────────────────────────────────────────────────
        // Top text: heads out
        drawArcText(name, centerX, centerY, textRadius, midTop, color, fontSize, false);

        // Bottom text: heads out (flipped so it reads L->R)
        if (place) {
            drawArcText(place, centerX, centerY, textRadius, midBot, color, fontSize, true);
        }

        // ── Draw stars ─────────────────────────────────────────────────────
        const leftStarPos = midBot + botAngle / 2 + gapEach / 2 + sa / 2;
        const rightStarPos = midTop + topAngle / 2 + gapEach / 2 + sa / 2;

        ctx.save();
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const starAngle of [leftStarPos, rightStarPos]) {
            ctx.save();
            ctx.translate(centerX + Math.cos(starAngle) * textRadius, centerY + Math.sin(starAngle) * textRadius);
            ctx.rotate(starAngle + Math.PI / 2);
            ctx.fillText('★', 0, 0);
            ctx.restore();
        }
        ctx.restore();
    }

    // ─── Debounce ────────────────────────────────────────────────────────────
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }
}
