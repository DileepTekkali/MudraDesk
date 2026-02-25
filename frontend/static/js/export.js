// Export Functions - PDF, JPEG, Print, Share

// Download as PDF with proper A4 sizing
// Download as PDF with proper A4 sizing
async function downloadPDF() {
    const { jsPDF } = window.jspdf;

    // Check if pages already exist (from preview pagination)
    let pages = document.querySelectorAll('.invoice-page');
    let restoreDOM = null;
    
    if (pages.length === 0) {
        // No paginated pages - check for original single page
        const billPreview = document.getElementById('billPreview');
        
        if (billPreview) {
            // Single-page exists - paginate temporarily
            console.log('Paginating invoice for PDF export...');
            restoreDOM = InvoicePaginator.paginateForExport();
            
            if (!restoreDOM) {
                showToast('Failed to prepare invoice for export', 'error');
                return;
            }
            
            // Small delay for DOM to settle
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Get pages after pagination
            pages = document.querySelectorAll('.invoice-page');
        }
    } else {
        console.log('Using existing paginated pages for PDF export');
    }
    
    if (pages.length === 0) {
        showToast('No pages found to export', 'error');
        if (restoreDOM) restoreDOM();
        return;
    }

    const defaultName = window.billNumber ? `${window.billNumber}.pdf` : 'invoice.pdf';
    const fileName = prompt('Enter filename for PDF:', defaultName);
    if (!fileName) {
        if (restoreDOM) restoreDOM();
        return;
    }

    showToast(`Generating PDF (${pages.length} pages)...`, 'info');

    try {
        // Remove page-shell wrappers temporarily for clean capture
        const shellWrappers = [];
        pages.forEach(page => {
            if (page.parentElement.classList.contains('page-shell')) {
                const shell = page.parentElement;
                shellWrappers.push({
                    shell: shell,
                    parent: shell.parentElement,
                    nextSibling: shell.nextSibling,
                    transform: page.style.transform
                });
                // Remove transform and unwrap
                page.style.transform = 'none';
                shell.parentElement.insertBefore(page, shell);
                shell.remove();
            }
        });

        // Ensure custom fonts are loaded
        if (document.fonts && document.fonts.ready) {
            try { await document.fonts.ready; } catch (_) {}
        }

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = 210;

        for (let i = 0; i < pages.length; i++) {
            if (i > 0) pdf.addPage();
            const page = pages[i];

            // Capture at full resolution
            const canvas = await html2canvas(page, {
                scale: 2.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: 794,
                height: 1153
            });

            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, imgWidth, imgHeight);
        }

        // Restore page-shell wrappers
        shellWrappers.forEach(({shell, parent, nextSibling, transform}, index) => {
            const page = pages[index];
            if (nextSibling) {
                parent.insertBefore(shell, nextSibling);
            } else {
                parent.appendChild(shell);
            }
            shell.appendChild(page);
            page.style.transform = transform;
        });
        
        // Restore original DOM if we paginated temporarily
        if (restoreDOM) {
            restoreDOM();
        }

        // Save PDF
        pdf.save(fileName.endsWith('.pdf') ? fileName : fileName + '.pdf');

        setTimeout(() => {
            showToast('PDF downloaded successfully!', 'success');
        }, 500);

    } catch (error) {
        console.error('PDF generation error:', error);
        showToast('Failed to generate PDF', 'error');
        
        if (restoreDOM) {
            restoreDOM();
        }
    }
}

// Download as JPEG with proper A4 sizing
async function downloadJPEG() {
    // Check if pages already exist (from preview pagination)
    let pages = document.querySelectorAll('.invoice-page');
    let restoreDOM = null;
    
    if (pages.length === 0) {
        const billPreview = document.getElementById('billPreview');
        
        if (billPreview) {
            console.log('Paginating invoice for JPEG export...');
            restoreDOM = InvoicePaginator.paginateForExport();
            
            if (!restoreDOM) {
                showToast('Failed to prepare invoice for export', 'error');
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            pages = document.querySelectorAll('.invoice-page');
        }
    } else {
        console.log('Using existing paginated pages for JPEG export');
    }

    if (pages.length === 0) {
        if (restoreDOM) restoreDOM();
        return;
    }

    const defaultBase = window.billNumber || 'invoice';
    const baseName = prompt('Enter base filename for images:', defaultBase);
    if (!baseName) {
        if (restoreDOM) restoreDOM();
        return;
    }

    showToast(`Generating images (${pages.length} pages)...`, 'info');

    try {
        // Remove page-shell wrappers temporarily
        const shellWrappers = [];
        pages.forEach(page => {
            if (page.parentElement.classList.contains('page-shell')) {
                const shell = page.parentElement;
                shellWrappers.push({
                    shell: shell,
                    parent: shell.parentElement,
                    nextSibling: shell.nextSibling,
                    transform: page.style.transform
                });
                page.style.transform = 'none';
                shell.parentElement.insertBefore(page, shell);
                shell.remove();
            }
        });

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const canvas = await html2canvas(page, {
                scale: 2.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: 794,
                height: 1153
            });

            await new Promise((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Canvas to Blob failed'));
                        return;
                    }
                    const link = document.createElement('a');
                    const fileName = `${baseName}_page${i + 1}.jpg`;

                    link.download = fileName;
                    link.href = URL.createObjectURL(blob);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    setTimeout(() => {
                        URL.revokeObjectURL(link.href);
                        resolve();
                    }, 100);
                }, 'image/jpeg', 0.90);
            });
        }

        // Restore page-shell wrappers
        shellWrappers.forEach(({shell, parent, nextSibling, transform}, index) => {
            const page = pages[index];
            if (nextSibling) {
                parent.insertBefore(shell, nextSibling);
            } else {
                parent.appendChild(shell);
            }
            shell.appendChild(page);
            page.style.transform = transform;
        });
        
        if (restoreDOM) {
            restoreDOM();
        }

        showToast('Images downloaded successfully!', 'success');
    } catch (error) {
        console.error('JPEG generation error:', error);
        showToast('Failed to generate image', 'error');
        
        if (restoreDOM) {
            restoreDOM();
        }
    }
}

// Share Bill as PDF (Web Share API with fallback)
// मोबाइल में share बटन दबाते ही सीधे apps (WhatsApp/Gmail/Drive etc.) की share-sheet open होगी.
async function shareBill() {
    const { jsPDF } = window.jspdf || {};
    
    if (!jsPDF) {
        showToast('PDF library not loaded. Please refresh and try again.', 'error');
        return;
    }

    // Check if we need to paginate first
    let restoreDOM = null;
    const billPreview = document.getElementById('billPreview');
    
    if (billPreview) {
        // Original single-page DOM exists - paginate temporarily
        console.log('Paginating invoice for sharing...');
        restoreDOM = InvoicePaginator.paginateForExport();
        
        if (!restoreDOM) {
            showToast('Failed to prepare invoice for sharing', 'error');
            return;
        }
        
        // Small delay for DOM to settle
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const pages = document.querySelectorAll('.invoice-page');
    if (pages.length === 0) {
        showToast('No pages found to share', 'error');
        if (restoreDOM) restoreDOM();
        return;
    }

    showToast(`Preparing PDF (${pages.length} page${pages.length > 1 ? 's' : ''}) for sharing...`, 'info');

    try {
        const baseName = window.billNumber || 'invoice';

        // Temporarily remove transform for accurate capture
        const scaleContainer = document.getElementById('scaleContainer');
        const originalTransform = scaleContainer ? scaleContainer.style.transform : '';
        const originalPosition = scaleContainer ? scaleContainer.style.position : '';
        
        if (scaleContainer) {
            scaleContainer.style.transform = 'none';
            scaleContainer.style.position = 'static';
        }

        // Ensure fonts are loaded so all text is included in the captured PDF
        if (document.fonts && document.fonts.ready) {
            try { await document.fonts.ready; } catch (_) {}
        }

        // Build PDF in-memory
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = 210;

        for (let i = 0; i < pages.length; i++) {
            if (i > 0) pdf.addPage();

            const canvas = await html2canvas(pages[i], {
                scale: 2.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: 794,
                height: 1153
            });

            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, imgWidth, imgHeight);
        }

        // Restore original transform and position
        if (scaleContainer) {
            scaleContainer.style.transform = originalTransform;
            scaleContainer.style.position = originalPosition;
        }
        
        // Restore original DOM if we paginated
        if (restoreDOM) {
            restoreDOM();
        }

        const blob = pdf.output('blob');
        const fileName = `${baseName}.pdf`;
        const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

        // Web Share API (best on Android/iOS browsers)
        // Some browsers support navigator.share but do not implement navigator.canShare.
        if (navigator.share) {
            const canFileShare = (navigator.canShare) ? navigator.canShare({ files: [pdfFile] }) : true;
            if (canFileShare) {
                try {
                    await navigator.share({ files: [pdfFile], title: fileName });
                    showToast('Shared successfully!', 'success');
                    return;
                } catch (shareError) {
                    if (shareError.name === 'AbortError') return; // user cancelled
                    console.log('PDF share failed, falling back to share options:', shareError);
                }
            }
        }

        // If file sharing isn't supported, create a public link (same server)
        // so we can share via WhatsApp/Twitter/Facebook/etc on ANY browser.
        let shareUrl = '';
        try {
            shareUrl = await uploadPdfForSharing(blob, fileName);
        } catch (e) {
            console.log('Share link upload failed, will continue without link:', e);
        }

        
        // If we have a share URL, try native share sheet with URL (shows installed apps on many devices/desktops)
        if (shareUrl && navigator.share) {
            try {
                await navigator.share({ title: fileName, url: shareUrl });
                showToast('Shared successfully!', 'success');
                return;
            } catch (e) {
                if (e.name === 'AbortError') return; // user cancelled
                console.log('URL share failed, falling back to modal:', e);
            }
        }
showToast('Opening share options...', 'info');
        openShareFallbackPanel({ pdfBlob: blob, fileName, shareUrl });

    } catch (e) {
        console.error('Share PDF failed:', e);
        showToast('Failed to share PDF. Please try Download PDF.', 'error');
        
        // Restore DOM on error
        if (restoreDOM) {
            restoreDOM();
        }
        
        // Restore transform on error
        const scaleContainer = document.getElementById('scaleContainer');
        if (scaleContainer) {
            scaleContainer.style.transform = '';
            scaleContainer.style.position = 'absolute';
            if (typeof scalePreview === 'function') scalePreview();
        }
    }
}

// Universal fallback share UI (for browsers that don't support file sharing)
function openShareFallbackPanel({ pdfBlob, fileName, shareUrl = '' }) {
    // Avoid opening multiple modals
    const existing = document.getElementById('shareFallbackModal');
    if (existing) existing.remove();

    const blobUrl = URL.createObjectURL(pdfBlob);

    const modal = document.createElement('div');
    modal.id = 'shareFallbackModal';
    modal.className = 'share-modal';
    const hasLink = !!shareUrl;
    const linkRow = hasLink ? `
        <div class="share-link-row">
            <input class="share-link" type="text" value="${escapeHtml(shareUrl)}" readonly>
            <button type="button" class="share-btn" data-action="copylink">Copy Link</button>
        </div>
    ` : `
        <div class="share-subtitle" style="margin-top:6px;">Tip: Download PDF, then share from your device/apps.</div>
    `;

    const appRow = hasLink ? `
        <div class="share-apps">
            <button type="button" class="share-btn" data-action="wa">WhatsApp</button>
            <button type="button" class="share-btn" data-action="tg">Telegram</button>
            <button type="button" class="share-btn" data-action="x">X / Twitter</button>
            <button type="button" class="share-btn" data-action="fb">Facebook</button>
        </div>
        <div class="share-hint">Arattai or any other app: tap <b>Copy Link</b> and paste in the app.</div>
    ` : '';

    modal.innerHTML = `
        <div class="share-card" role="dialog" aria-modal="true" aria-label="Share options">
            <div class="share-title">Share</div>
            <div class="share-subtitle">Choose an option (works in any browser)</div>

            ${linkRow}
            ${appRow}

            <button type="button" class="share-btn" data-action="download">Download PDF</button>
            <button type="button" class="share-btn" data-action="print">Print / Save as PDF</button>
            <button type="button" class="share-btn" data-action="copy">Copy details</button>
            <button type="button" class="share-btn" data-action="email">Share via Email</button>

            <button type="button" class="share-close" data-action="close">Close</button>
        </div>
    `;
    document.body.appendChild(modal);

    const cleanup = () => {
        try { URL.revokeObjectURL(blobUrl); } catch (_) {}
        modal.remove();
    };

    const onClick = async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        if (!action) return;

        if (action === 'close') {
            cleanup();
            return;
        }

        if (action === 'download') {
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('PDF downloaded. You can share it from your device.', 'success');
            return;
        }

        if (action === 'print') {
            const w = window.open(blobUrl, '_blank');
            if (!w) {
                showToast('Popup blocked. Please allow popups or use Download PDF.', 'error');
                return;
            }
            // Some browsers need a small delay before print
            w.onload = () => {
                try { w.focus(); w.print(); } catch (_) {}
            };
            return;
        }

        if (action === 'copy') {
            const text = buildShareText();
            try {
                await navigator.clipboard.writeText(text);
                showToast('Copied!', 'success');
            } catch (err) {
                // Older browsers
                window.prompt('Copy this text:', text);
            }
            return;
        }

        if (action === 'email') {
            const subject = encodeURIComponent(buildShareEmailSubject());
            const body = encodeURIComponent(buildShareText(shareUrl));
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
            return;
        }

        if (action === 'copylink') {
            if (!shareUrl) {
                showToast('Share link not available. Please use Download PDF.', 'error');
                return;
            }
            try {
                await navigator.clipboard.writeText(shareUrl);
                showToast('Link copied!', 'success');
            } catch (_) {
                window.prompt('Copy this link:', shareUrl);
            }
            return;
        }

        // App share buttons (work best on mobile; open web share/intent URLs)
        if (action === 'wa' || action === 'tg' || action === 'x' || action === 'fb') {
            if (!shareUrl) {
                showToast('Share link not available. Please use Download PDF.', 'error');
                return;
            }
            const text = buildShareText(shareUrl);
            const encodedText = encodeURIComponent(text);
            const encodedUrl = encodeURIComponent(shareUrl);
            let target = '';
            if (action === 'wa') target = `https://wa.me/?text=${encodedText}`;
            if (action === 'tg') target = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
            if (action === 'x') target = `https://twitter.com/intent/tweet?text=${encodedText}`;
            if (action === 'fb') target = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
            window.open(target, '_blank');
            return;
        }
    };

    modal.addEventListener('click', (e) => {
        // clicking outside closes modal
        if (e.target === modal) cleanup();
    });
    modal.querySelector('.share-card')?.addEventListener('click', onClick);

    // ESC to close
    const onKey = (e) => {
        if (e.key === 'Escape') {
            document.removeEventListener('keydown', onKey);
            cleanup();
        }
    };
    document.addEventListener('keydown', onKey);
}

function buildShareEmailSubject() {
    const docType = (window.docType || 'invoice').toString().toLowerCase();
    const label = docType === 'quotation' ? 'Quotation' : 'Invoice';
    const num = window.billNumber || '';
    return `${label} ${num}`.trim();
}

function buildShareText(shareUrl = '') {
    const docType = (window.docType || 'invoice').toString().toLowerCase();
    const label = docType === 'quotation' ? 'Quotation' : 'Invoice';
    const num = window.billNumber || '';
    const business = window.businessName || '';
    const date = window.billDate || '';

    let out = `${label}${num ? ' #' + num : ''}`;
    if (business) out += `\nFrom: ${business}`;
    if (date) out += `\nDate: ${date}`;
    if (shareUrl) {
        out += `\n\nPDF Link: ${shareUrl}`;
    }
    out += `\n\nTip: If your app doesn't accept links, download the PDF and attach it.`;
    return out;
}

async function uploadPdfForSharing(pdfBlob, fileName) {
    // Uploads the PDF to the same server and returns a public link.
    const fd = new FormData();
    fd.append('file', pdfBlob, fileName);

    const res = await fetch('/api/share/upload', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin'
    });
    if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Upload failed');
    }
    const data = await res.json();
    if (!data.url) throw new Error('No url in response');
    // Convert relative URL to absolute
    return new URL(data.url, window.location.origin).toString();
}

function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

// Toast notification function (if not already defined)
if (typeof showToast === 'undefined') {
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
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}
