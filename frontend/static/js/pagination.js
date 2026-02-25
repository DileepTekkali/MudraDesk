/**
 * DOM-based Invoice Pagination
 * Splits content into multiple A4 page elements for WYSIWYG printing
 */

class InvoicePaginator {
    constructor() {
        this.A4_HEIGHT_MM = 297;
        this.MARGIN_MM = 10; // 10mm margin as requested
        // Usable height in px (approximate 96 DPI conversion: 1mm = 3.78px)
        // 297mm - 20mm (top+bottom) = 277mm
        this.MAX_HEIGHT_PX = (297 - (this.MARGIN_MM * 2)) * 3.78;
    }

    init() {
        // Prevent double pagination
        if (window.hasPaginated) {
            console.log('Pagination already completed');
            return true;
        }

        const originalPage = document.getElementById('billPreview');
        if (!originalPage) {
            console.error('Original page element not found');
            return false;
        }

        const success = this.paginate(originalPage);
        if (success) {
            window.hasPaginated = true;
        }
        return success;
    }

    paginate(originalPage) {
        // Store original HTML for restoration in case of error
        const wrapper = originalPage.parentElement;
        const originalHTML = wrapper.innerHTML;
        
        try {
            // 1. Validate required content parts exist
            const header = originalPage.querySelector('.bill-header-section');
            const customer = originalPage.querySelector('.customer-section');
            const itemsTable = originalPage.querySelector('.items-section table');
            const totals = originalPage.querySelector('.totals-and-signature');
            
            // Critical validation - abort if missing required elements
            if (!header || !customer || !itemsTable || !totals) {
                console.error('Pagination aborted: Missing required elements', {
                    header: !!header,
                    customer: !!customer,
                    itemsTable: !!itemsTable,
                    totals: !!totals
                });
                // Don't clear wrapper - leave original content
                return false;
            }
            
            const tbody = itemsTable.querySelector('tbody');
            if (!tbody) {
                console.error('Pagination aborted: Missing table tbody');
                return false;
            }
            
            const rows = Array.from(tbody.querySelectorAll('tr'));
            if (rows.length === 0) {
                console.error('Pagination aborted: No table rows found');
                return false;
            }
            
            // IMPORTANT: Capture quotation subject if it exists
            const subjectSection = originalPage.querySelector('.quotation-subject');
            
            // Retrieve footer safely, handling potential missing element
            const footerInfo = originalPage.querySelector('.invoice-footer-info') || 
                              (originalPage.lastElementChild?.tagName === 'DIV' && 
                               originalPage.lastElementChild.textContent.includes('Thank you') ? 
                               originalPage.lastElementChild : null);

            // 2. Clear wrapper (safe now - we've validated everything exists)
            wrapper.innerHTML = '';

            // 3. Create Page 1
            let currentPage = this.createPageElement(1);
            wrapper.appendChild(currentPage);

            // Add Header, Subject (if exists), & Customer to Page 1
            let contentContainer = currentPage.querySelector('.invoice-content');
            contentContainer.appendChild(header.cloneNode(true));
            
            // Add subject section if it exists (for quotations)
            if (subjectSection) {
                contentContainer.appendChild(subjectSection.cloneNode(true));
            }
            
            contentContainer.appendChild(customer.cloneNode(true));

            // Setup Table for Page 1
            let currentTable = this.createTableStructure(itemsTable);
            let currentTbody = currentTable.querySelector('tbody');
            contentContainer.appendChild(currentTable.parentElement); // Append .items-section wrapper

            // 4. Distribute Rows
            let currentHeight = this.MeasureContentHeight(currentPage);

            rows.forEach((row, index) => {
                // Append row temporarily to measure
                currentTbody.appendChild(row);

                // Check new height
                const newHeight = this.MeasureContentHeight(currentPage);

                // Simple overflow check
                if (newHeight > this.MAX_HEIGHT_PX) {
                    // Overflow!
                    currentTbody.removeChild(row); // Remove from current

                    // Create Page N
                    const pageNum = wrapper.children.length + 1;
                    currentPage = this.createPageElement(pageNum);
                    wrapper.appendChild(currentPage);
                    contentContainer = currentPage.querySelector('.invoice-content');

                    // Add Table Header (Repeated)
                    currentTable = this.createTableStructure(itemsTable);
                    currentTbody = currentTable.querySelector('tbody');
                    contentContainer.appendChild(currentTable.parentElement);

                    // Add row to new page
                    currentTbody.appendChild(row);

                    // Reset height tracker
                    currentHeight = this.MeasureContentHeight(currentPage);
                }
            });

            // 5. Append Totals/Signature
            // clone totals
            const totalsClone = totals.cloneNode(true);
            contentContainer.appendChild(totalsClone);
            let footerClone = null;
            if (footerInfo) {
                footerClone = footerInfo.cloneNode(true);
                contentContainer.appendChild(footerClone);
            }

            if (this.MeasureContentHeight(currentPage) > this.MAX_HEIGHT_PX) {
                // Totals overflowed
                contentContainer.removeChild(totalsClone); // Remove totals
                if (footerClone) contentContainer.removeChild(footerClone); // Remove footer

                // Create Last Page
                const pageNum = wrapper.children.length + 1;
                currentPage = this.createPageElement(pageNum);
                wrapper.appendChild(currentPage);
                contentContainer = currentPage.querySelector('.invoice-content');

                // Add totals to fresh page
                contentContainer.appendChild(totalsClone);
                if (footerClone) contentContainer.appendChild(footerClone);
            }
            
            console.log('Pagination completed successfully:', wrapper.children.length, 'pages');
            return true;
            
        } catch (error) {
            console.error('Pagination error:', error);
            // Restore original HTML on any error
            wrapper.innerHTML = originalHTML;
            console.log('Original content restored due to pagination error');
            return false;
        }
    }

    createPageElement(pageNum) {
        const page = document.createElement('div');
        page.className = 'bill-preview invoice-page';
        page.id = `billPage${pageNum}`;
        page.style.position = 'relative';
        // Margins handled by CSS for print, screen logic here or CSS

        // Watermark (every page)
        if (window.watermarkEnabled && window.watermarkLogoUrl) {
            const wm = document.createElement('img');
            wm.src = window.watermarkLogoUrl;
            wm.className = 'doc-watermark';
            wm.alt = '';
            page.appendChild(wm);
        }

        const content = document.createElement('div');
        content.className = 'invoice-content';
        // content.style.height = '100%'; // Let it grow naturally? No, we check fit.
        page.appendChild(content);

        return page;
    }

    createTableStructure(originalTable) {
        // Clone table but empty tbody
        const section = document.createElement('div');
        section.className = 'items-section';
        // Ensure section styling fits
        section.style.marginBottom = '24px';

        const table = originalTable.cloneNode(true);
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = ''; // Start empty

        section.appendChild(table);
        return table;
    }

    MeasureContentHeight(page) {
        return page.querySelector('.invoice-content').offsetHeight;
    }
    
    // Temporary pagination for export - returns cleanup function
    static paginateForExport() {
        const originalPage = document.getElementById('billPreview');
        const wrapper = originalPage?.parentElement;
        
        if (!originalPage || !wrapper) {
            console.error('Cannot paginate for export: elements not found');
            return null;
        }
        
        // Backup original HTML
        const originalHTML = wrapper.innerHTML;
        
        try {
            const paginator = new InvoicePaginator();
            const success = paginator.paginate(originalPage);
            
            if (!success) {
                console.error('Pagination for export failed');
                return null;
            }
            
            console.log('Temporary pagination for export created:', 
                wrapper.querySelectorAll('.invoice-page').length, 'pages');
            
            // Return cleanup function to restore original
            return function restoreOriginalDOM() {
                wrapper.innerHTML = originalHTML;
                console.log('Original single-page DOM restored');
                
                // Re-apply scaling to original page
                if (typeof window.scalePreview === 'function') {
                    setTimeout(() => window.scalePreview(), 100);
                }
            };
            
        } catch (error) {
            console.error('Pagination for export error:', error);
            wrapper.innerHTML = originalHTML;
            return null;
        }
    }
}

// Auto-paginate on preview page load for multi-page display
// Pages will be displayed vertically with fit-to-width scaling
document.addEventListener('DOMContentLoaded', () => {
    // Wait for fonts and images to load
    let initAttempts = 0;
    const maxAttempts = 10;
    
    function attemptInit() {
        initAttempts++;
        
        const originalPage = document.getElementById('billPreview');
        if (!originalPage) {
            if (initAttempts < maxAttempts) {
                console.log('Pagination init attempt', initAttempts, '- waiting for DOM');
                setTimeout(attemptInit, 200);
            }
            return;
        }
        
        // Check if images are loaded
        const images = originalPage.querySelectorAll('img');
        const allLoaded = Array.from(images).every(img => img.complete);
        
        if (!allLoaded && initAttempts < maxAttempts) {
            console.log('Pagination init attempt', initAttempts, '- waiting for images');
            setTimeout(attemptInit, 200);
            return;
        }
        
        // Initialize pagination
        const paginator = new InvoicePaginator();
        const success = paginator.init();
        
        if (success) {
            console.log('✅ Pagination completed successfully');
            
            // Dispatch event for preview fit
            window.dispatchEvent(new Event('paginationComplete'));
            
            // Direct call as backup
            if (typeof window.applyPreviewFit === 'function') {
                setTimeout(() => {
                    window.applyPreviewFit();
                }, 150);
            }
        } else {
            console.error('❌ Pagination failed');
        }
    }
    
    // Start initialization after a small delay for fonts
    setTimeout(attemptInit, 300);
});

// Export for use in export scripts
window.InvoicePaginator = InvoicePaginator;
