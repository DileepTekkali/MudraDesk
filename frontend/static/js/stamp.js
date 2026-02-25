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

    function generateStamp() {
        if (!autoGenerateToggle.checked) return;

        const name = (stampNameInput?.value || 'SEAL').toUpperCase();
        const place = (stampPlaceInput?.value || '').toUpperCase();

        // Respect the canvas size defined in HTML (keeps preview crisp and consistent)
        // (Do NOT override width/height here.)
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const stampColor = '#1e3a8a';

        ctx.strokeStyle = stampColor;
        ctx.fillStyle = stampColor;

        // Only circular stamps
        drawCircleStamp(ctx, centerX, centerY, name, place, stampColor);

        stampDataInput.value = canvas.toDataURL('image/png');
    }

    function drawCircleStamp(ctx, centerX, centerY, name, place, color) {
        // Radius adapts to canvas size so long text stays inside neatly
        const pad = 10;
        const maxR = Math.min(canvas.width, canvas.height) / 2 - pad;
        const radius = Math.max(60, Math.min(82, maxR));
        const innerRadius = Math.max(42, radius - 22);
        const textRadius = (radius + innerRadius) / 2;

        // Draw Circles
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2); ctx.stroke();

        // Start with larger font and reduce until BOTH text and stars fit without colliding.
        let fontSize = 16;
        const minFontSize = 6;
        // Keep text compact so stars can sit close to the text while still leaving a *single space* gap.
        const kerningFactor = 1.06;

        function angleSpanForText(text, fSize) {
            ctx.font = `bold ${fSize}px Inter`;
            // Width-to-angle approximation on the arc. KerningFactor provides breathing room.
            return (ctx.measureText(text).width / textRadius) * kerningFactor;
        }

        function computeFit(fSize) {
            const topAngle = angleSpanForText(name, fSize);
            const botAngle = place ? angleSpanForText(place, fSize) : 0;

            // "Single space" around stars: translate one literal space into angular margin on the arc.
            // This updates with font size so it stays exactly like one space, even for long text.
            ctx.font = `bold ${fSize}px Inter`;
            const marginAngle = (ctx.measureText(' ').width / textRadius);

            // Star width in angular terms (+ 1-space margin so it doesn't visually touch the text)
            const starAngle = (ctx.measureText('★').width / textRadius) + marginAngle;

            // Arc bounds (top centered at -PI/2, bottom centered at +PI/2)
            const topCenter = -Math.PI / 2;
            const botCenter = Math.PI / 2;

            const topRightEdge = topCenter + topAngle / 2;
            const topLeftEdge = topCenter - topAngle / 2;
            const botRightEdge = botCenter - botAngle / 2;
            const botLeftEdge = botCenter + botAngle / 2;

            // Available gaps on right (around angle 0) and left (around PI)
            // Right gap: from topRightEdge to botRightEdge (wrapping through 0)
            let rightStart = topRightEdge;
            let rightEnd = botRightEdge;
            if (rightEnd < rightStart) rightEnd += Math.PI * 2;
            const rightGap = rightEnd - rightStart;

            // Left gap: from botLeftEdge to topLeftEdge (wrapping through PI)
            let leftStart = botLeftEdge;
            let leftEnd = topLeftEdge;
            if (leftEnd < leftStart) leftEnd += Math.PI * 2;
            const leftGap = leftEnd - leftStart;

            // Need space for 1 star on each side
            const need = starAngle * 2;
            const canPlaceStars = (rightGap >= need) && (leftGap >= need);

            // Also ensure total coverage isn't excessive (keeps things visually clean)
            const total = topAngle + botAngle + (starAngle * 2) + (marginAngle * 2);
            const withinCircle = total <= (Math.PI * 2 * 0.94);

            return {
                topAngle,
                botAngle,
                starAngle,
                marginAngle,
                canPlaceStars,
                withinCircle,
                // star centers
                rightCenter: rightStart + rightGap / 2,
                leftCenter: leftStart + leftGap / 2
            };
        }

        let fit = computeFit(fontSize);
        while ((!(fit.canPlaceStars && fit.withinCircle)) && fontSize > minFontSize) {
            fontSize -= 0.5;
            fit = computeFit(fontSize);
        }

        ctx.font = `bold ${fontSize}px Inter`;

        // Draw top text (business name)
        renderArcText(ctx, name, centerX, centerY, textRadius, color, `bold ${fontSize}px Inter`, false, fit.topAngle);
        
        // Draw bottom text (place) if exists
        if (place) {
            renderArcText(ctx, place, centerX, centerY, textRadius, color, `bold ${fontSize}px Inter`, true, fit.botAngle);
        }

        ctx.font = `bold ${fontSize}px Inter`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Stars automatically move into the available gaps so they never collide with text
        const stars = [
            { angle: normalizeAngle(fit.leftCenter), rotation: Math.PI },
            { angle: normalizeAngle(fit.rightCenter), rotation: 0 }
        ];

        stars.forEach(star => {
            ctx.save();
            const x = centerX + Math.cos(star.angle) * textRadius;
            const y = centerY + Math.sin(star.angle) * textRadius;
            ctx.translate(x, y);
            ctx.rotate(star.rotation);
            ctx.fillText('★', 0, 0);
            ctx.restore();
        });
    }

    function normalizeAngle(a) {
        const twoPi = Math.PI * 2;
        let out = a % twoPi;
        if (out < -Math.PI) out += twoPi;
        if (out > Math.PI) out -= twoPi;
        return out;
    }

    // New unified rendering function to ensure consistent spacing
    function renderArcText(ctx, str, cx, cy, radius, color, font, isBottom, totalAngle) {
        ctx.save();
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const anglePerChar = totalAngle / Math.max(str.length, 1);
        let startAngle;

        if (!isBottom) {
            // Top: centered north (-PI/2)
            startAngle = -Math.PI / 2 - (totalAngle / 2) + (anglePerChar / 2);
        } else {
            // Bottom: centered south (PI/2), reversing for readable LTR
            startAngle = Math.PI / 2 + (totalAngle / 2) - (anglePerChar / 2);
        }

        for (let i = 0; i < str.length; i++) {
            const charAngle = isBottom ? (startAngle - i * anglePerChar) : (startAngle + i * anglePerChar);
            ctx.save();
            ctx.translate(cx + Math.cos(charAngle) * radius, cy + Math.sin(charAngle) * radius);
            if (!isBottom) {
                ctx.rotate(charAngle + Math.PI / 2);
            } else {
                ctx.rotate(charAngle - Math.PI / 2);
            }
            ctx.fillText(str[i], 0, 0);
            ctx.restore();
        }
        ctx.restore();
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }
}
