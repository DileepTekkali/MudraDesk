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
     * Draw text along a clockwise arc.
     * `arcStart` = angle of the first character's LEFT edge.
     * Characters are placed sequentially using their real measured widths.
     */
    function drawArcText(text, cx, cy, r, arcStart, color, fontSize) {
        ctx.save();
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let angle = arcStart;
        for (const ch of text) {
            const cw = ctx.measureText(ch).width * 1.04;
            const halfAngle = cw / 2 / r;
            const charAngle = angle + halfAngle;

            ctx.save();
            ctx.translate(
                cx + Math.cos(charAngle) * r,
                cy + Math.sin(charAngle) * r
            );
            ctx.rotate(charAngle + Math.PI / 2);
            ctx.fillText(ch, 0, 0);
            ctx.restore();

            angle += cw / r;
        }
        ctx.restore();
    }

    /**
     * Draw text along a counter-clockwise arc (used for bottom arc so the
     * reading direction stays left-to-right).
     * `arcStart` = angle of the first character's RIGHT edge (rightmost char first).
     * The string is reversed before iteration, so visual order is correct.
     */
    function drawArcTextReversed(text, cx, cy, r, arcStart, color, fontSize) {
        ctx.save();
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Reverse so we place characters from right → left while reading left → right
        const reversed = [...text].reverse().join('');
        let angle = arcStart;
        for (const ch of reversed) {
            const cw = ctx.measureText(ch).width * 1.04;
            const halfAngle = cw / 2 / r;
            const charAngle = angle - halfAngle;   // counter-clockwise

            ctx.save();
            ctx.translate(
                cx + Math.cos(charAngle) * r,
                cy + Math.sin(charAngle) * r
            );
            ctx.rotate(charAngle - Math.PI / 2);
            ctx.fillText(ch, 0, 0);
            ctx.restore();

            angle -= cw / r;
        }
        ctx.restore();
    }

    // ─── Main stamp drawing ──────────────────────────────────────────────────
    function drawCircleStamp(ctx, centerX, centerY, name, place, color) {
        const pad = 12;
        const maxR = Math.min(canvas.width, canvas.height) / 2 - pad;
        const radius = Math.max(60, Math.min(84, maxR));
        const innerRadius = Math.max(44, radius - 20);
        const textRadius = (radius + innerRadius) / 2;

        // Draw outer + inner circles
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2); ctx.stroke();

        // ── Auto-size font so all content fits within 92 % of the circle ──
        let fontSize = 14;
        const minFontSize = 7;

        function totalConsumed(fs) {
            return textArcAngle(name, fs, textRadius)
                + (place ? textArcAngle(place, fs, textRadius) : 0)
                + starArcAngle(fs, textRadius) * 2;
        }

        while (totalConsumed(fontSize) > Math.PI * 2 * 0.92 && fontSize > minFontSize) {
            fontSize -= 0.5;
        }

        // ── Compute exact positions ────────────────────────────────────────
        const topAngle = textArcAngle(name, fontSize, textRadius);
        const botAngle = place ? textArcAngle(place, fontSize, textRadius) : 0;
        const sa = starArcAngle(fontSize, textRadius);

        // Remaining arc is divided equally into the two gap regions
        const freeArc = Math.max(0, Math.PI * 2 - topAngle - botAngle - sa * 2);
        const gapEach = freeArc / 2;

        // North pole = −π/2.  Top text is centred there.
        const topStart = -Math.PI / 2 - topAngle / 2;
        const topEnd = topStart + topAngle;

        // Right gap → right star centre
        const rightStarCenter = topEnd + gapEach / 2 + sa / 2;

        // Bottom text is centred on the south pole (π/2).
        // For the reversed-draw function we need the rightmost edge.
        const botRightEdge = Math.PI / 2 + botAngle / 2;
        const botLeftEdge = botRightEdge - botAngle;

        // Left gap → left star centre
        const leftStarCenter = botRightEdge + gapEach / 2 + sa / 2;

        // ── Draw text ──────────────────────────────────────────────────────
        drawArcText(name, centerX, centerY, textRadius, topStart, color, fontSize);

        if (place) {
            drawArcTextReversed(place, centerX, centerY, textRadius, botRightEdge, color, fontSize);
        }

        // ── Draw stars ─────────────────────────────────────────────────────
        ctx.save();
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const starAngle of [rightStarCenter, leftStarCenter]) {
            ctx.save();
            ctx.translate(
                centerX + Math.cos(starAngle) * textRadius,
                centerY + Math.sin(starAngle) * textRadius
            );
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
