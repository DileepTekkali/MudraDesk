// Main App JavaScript

document.addEventListener('DOMContentLoaded', function () {
    // Mobile Navigation Toggle
    const navToggle = document.getElementById('navToggle');
    const sidebar = document.getElementById('sidebar');

    if (navToggle && sidebar) {
        navToggle.addEventListener('click', function () {
            sidebar.classList.toggle('open');
            document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', function (e) {
            if (sidebar.classList.contains('open') &&
                !sidebar.contains(e.target) &&
                !navToggle.contains(e.target)) {
                sidebar.classList.remove('open');
                document.body.style.overflow = '';
            }
        });
    }

    // File Upload Preview
    const logoInput = document.getElementById('logo');
    const signatureInput = document.getElementById('signature');

    if (logoInput) {
        logoInput.addEventListener('change', function (e) {
            previewFile(e.target, 'logoUploadArea', 'logoPreview');
        });
    }

    if (signatureInput) {
        signatureInput.addEventListener('change', function (e) {
            previewFile(e.target, 'signatureUploadArea', 'signaturePreview');
        });
    }

    

    // Remove Logo / Signature (sets hidden flags so backend clears saved files)
    const removeLogoBtn = document.getElementById('removeLogoBtn');
    const removeSignatureBtn = document.getElementById('removeSignatureBtn');
    const removeLogoFlag = document.getElementById('remove_logo');
    const removeSignatureFlag = document.getElementById('remove_signature');

    function resetUploadArea(areaId) {
        const area = document.getElementById(areaId);
        if (!area) return;
        // Keep placeholder blank as requested
        area.innerHTML = '';
    }

    if (logoInput) {
        logoInput.addEventListener('change', () => {
            if (removeLogoFlag) removeLogoFlag.value = '0';
        });
    }
    if (signatureInput) {
        signatureInput.addEventListener('change', () => {
            if (removeSignatureFlag) removeSignatureFlag.value = '0';
        });
    }

    if (removeLogoBtn) {
        removeLogoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (removeLogoFlag) removeLogoFlag.value = '1';
            if (logoInput) logoInput.value = '';
            // Remove immediately on backend, fallback to hidden flag on Save
            fetch('/template/remove_asset/logo', { method: 'POST' }).catch(() => {});
            resetUploadArea('logoUploadArea');
        });
    }

    if (removeSignatureBtn) {
        removeSignatureBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (removeSignatureFlag) removeSignatureFlag.value = '1';
            if (signatureInput) signatureInput.value = '';
            fetch('/template/remove_asset/signature', { method: 'POST' }).catch(() => {});
            resetUploadArea('signatureUploadArea');
        });
    }
const stampUploadInput = document.getElementById('stamp_upload');
    if (stampUploadInput) {
        stampUploadInput.addEventListener('change', function (e) {
            // If the user selects a new stamp, ensure any pending remove flag is cleared
            const removeStampFlagLocal = document.getElementById('remove_stamp');
            if (removeStampFlagLocal) removeStampFlagLocal.value = '0';
            previewFile(e.target, 'stampUploadArea', 'stampUploadPreview');
        });
    }

    // Remove Stamp (upload or auto-generated)
    const removeStampUploadBtn = document.getElementById('removeStampUploadBtn');
    const removeStampGeneratedBtn = document.getElementById('removeStampGeneratedBtn');
    const removeStampFlag = document.getElementById('remove_stamp');
    const stampDataInput = document.getElementById('stampData');
    const autoGenerateToggle = document.getElementById('autoGenerateStamp');
    const stampOptions = document.getElementById('stampOptions');
    const stampUploadSection = document.getElementById('stampUploadSection');

    function clearStampUI() {
        if (stampUploadInput) stampUploadInput.value = '';
        if (stampDataInput) stampDataInput.value = '';
        if (autoGenerateToggle) autoGenerateToggle.checked = false;
        if (stampOptions) stampOptions.style.display = 'none';
        if (stampUploadSection) stampUploadSection.style.display = 'block';
        resetUploadArea('stampUploadArea');
    }

    async function removeStamp() {
        if (removeStampFlag) removeStampFlag.value = '1';
        try { await fetch('/template/remove_asset/stamp', { method: 'POST' }); } catch (_) {}
        clearStampUI();
    }

    if (removeStampUploadBtn) {
        removeStampUploadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            removeStamp();
        });
    }

    if (removeStampGeneratedBtn) {
        removeStampGeneratedBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            removeStamp();
        });
    }
    // Explicit Click Relay for Upload Areas
    // (Even with z-index, some browsers/devices might miss the strict overlay click. This is a fallback.)
    const logoArea = document.getElementById('logoUploadArea');
    if (logoArea && logoInput) {
        logoArea.addEventListener('click', (e) => {
            if (e && e.target && e.target.closest && e.target.closest('.file-remove')) return;
            logoInput.click();
        });
    }

    const signatureArea = document.getElementById('signatureUploadArea');
    if (signatureArea && signatureInput) {
        signatureArea.addEventListener('click', (e) => {
            if (e && e.target && e.target.closest && e.target.closest('.file-remove')) return;
            signatureInput.click();
        });
    }

    const stampArea = document.getElementById('stampUploadArea');
    if (stampArea && stampUploadInput) {
        stampArea.addEventListener('click', () => stampUploadInput.click());
    }

    // Handle Enter Key Navigation (prevent form submit on non-submit buttons)
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                if (e.target.tagName !== 'TEXTAREA') {
                    // e.preventDefault(); // Optional: prevent submit. User might want it?
                    // But usually "Enter" in a form should submit.
                    // If user says "enter options not working", maybe they want next field?
                    // Let's just ensuring it isn't broken. If form submits, it's standard.
                    // But if "not working", maybe it does nothing?
                    // Let's leave standard behavior but log it?
                    // Actually, let's just ensure pressing Enter on the "Tap to upload" (if accessible) works?
                    // No, inputs.
                }
            }
        });
    });
});

// File Preview Function
function previewFile(input, areaId, previewId) {
    const area = document.getElementById(areaId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            let preview = document.getElementById(previewId);
            if (!preview) {
                preview = document.createElement('img');
                preview.id = previewId;
                preview.className = 'preview-image';
                area.innerHTML = '';
                area.appendChild(preview);
            }
            preview.src = e.target.result;

            // Add filename
            let fileName = area.querySelector('.file-name');
            if (!fileName) {
                fileName = document.createElement('span');
                fileName.className = 'file-name';
                area.appendChild(fileName);
            }
            fileName.textContent = input.files[0].name;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Format Currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(amount);
}

// Show Toast Notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 9999;
        animation: slideUp 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { transform: translateX(-50%) translateY(100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
