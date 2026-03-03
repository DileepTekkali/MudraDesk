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
    // Removed duplicate change listeners as they are handled in page-specific script

    // Remove Logo / Signature (sets hidden flags so backend clears saved files)
    const removeLogoBtn = document.getElementById('removeLogoBtn');
    const removeSignatureBtn = document.getElementById('removeSignatureBtn');
    const removeLogoFlag = document.getElementById('remove_logo');
    const removeSignatureFlag = document.getElementById('remove_signature');
    function resetUploadArea(areaId) {
        console.log('Resetting upload area:', areaId);
        const area = document.getElementById(areaId);
        if (!area) return;
        const preview = area.querySelector('.preview-image');
        if (preview) {
            preview.src = '';
            preview.style.display = 'none';
        }
        const fileName = area.querySelector('.file-name');
        if (fileName) fileName.textContent = '';
        const hint = area.querySelector('.upload-hint');
        if (hint) hint.style.display = 'block';
        const removeBtn = area.querySelector('.file-remove');
        if (removeBtn) removeBtn.style.display = 'none';
    }
    if (logoInput) {
        // Removed change listener
    }
    if (signatureInput) {
        // Removed change listener
    }
    if (removeLogoBtn) {
        removeLogoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Remove logo clicked');
            if (removeLogoFlag) removeLogoFlag.value = '1';
            if (logoInput) logoInput.value = '';
            // Removed fetch as handled in page script
            resetUploadArea('logoUploadArea');
        });
    }
    if (removeSignatureBtn) {
        removeSignatureBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Remove signature clicked');
            if (removeSignatureFlag) removeSignatureFlag.value = '1';
            if (signatureInput) signatureInput.value = '';
            // Removed fetch as handled in page script
            resetUploadArea('signatureUploadArea');
        });
    }
    const stampUploadInput = document.getElementById('stamp_upload');
    if (stampUploadInput) {
        // Removed change listener
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
        console.log('Clearing stamp UI');
        if (stampUploadInput) stampUploadInput.value = '';
        if (stampDataInput) stampDataInput.value = '';
        if (autoGenerateToggle) autoGenerateToggle.checked = false;
        if (stampOptions) stampOptions.style.display = 'none';
        if (stampUploadSection) stampUploadSection.style.display = 'block';
        resetUploadArea('stampUploadArea');
    }
    async function removeStamp() {
        console.log('Removing stamp locally');
        if (removeStampFlag) removeStampFlag.value = '1';
        clearStampUI();
    }
    if (removeStampUploadBtn) {
        removeStampUploadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Remove uploaded stamp clicked');
            removeStamp();
        });
    }
    if (removeStampGeneratedBtn) {
        removeStampGeneratedBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Remove generated stamp clicked');
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
// File Preview Function (Base64)
function previewFile(input, areaId, previewId) {
    console.log('Previewing file for area:', areaId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const area = document.getElementById(areaId);
            let preview = document.getElementById(previewId);
            if (!preview) {
                preview = document.createElement('img');
                preview.id = previewId;
                preview.className = 'preview-image';
                area.innerHTML = '';
                area.appendChild(preview);
            }
            preview.src = e.target.result;
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