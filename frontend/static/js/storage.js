/**
 * MudraDesk — Browser localStorage Storage Manager
 * 
 * All invoice/quotation history and templates are stored per-user
 * in the browser's localStorage. Supabase only holds user account data.
 * 
 * Storage keys are namespaced by userId, e.g.:
 *   mudra_<userId>_template
 *   mudra_<userId>_invoices
 *   mudra_<userId>_quotations
 */

const MudraStorage = (() => {
    let _userId = null;

    function _key(type) {
        if (!_userId) {
            // Try to get userId from meta tag injected by Flask
            const meta = document.querySelector('meta[name="user-id"]');
            _userId = meta ? meta.content : 'guest';
        }
        return `mudra_${_userId}_${type}`;
    }

    // ── Template ──────────────────────────────────────────────

    function saveTemplate(data) {
        try {
            localStorage.setItem(_key('template'), JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('[MudraStorage] saveTemplate failed:', e);
            return false;
        }
    }

    function loadTemplate() {
        try {
            const raw = localStorage.getItem(_key('template'));
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function clearTemplate() {
        localStorage.removeItem(_key('template'));
    }

    // ── Bills (invoices & quotations) ────────────────────────

    function _getBillList(type) {
        try {
            const raw = localStorage.getItem(_key(type));
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function _saveBillList(type, list) {
        try {
            localStorage.setItem(_key(type), JSON.stringify(list));
        } catch (e) {
            console.error('[MudraStorage] _saveBillList failed:', e);
        }
    }

    /**
     * Save a bill. Generates an ID automatically.
     * @param {string} type  'invoices' | 'quotations'
     * @param {object} bill  Bill data object
     * @returns {string} The generated bill ID
     */
    function saveBill(type, bill) {
        const list = _getBillList(type);
        const id = `${type.toUpperCase().slice(0, 3)}-${Date.now()}`;
        bill.id = id;
        bill.created_at = new Date().toISOString();

        // Generate a human-readable number
        const prefix = type === 'invoices' ? 'INV' : 'QTN';
        bill.bill_number = `${prefix}-${String(list.length + 1).padStart(3, '0')}`;

        list.unshift(bill); // newest first
        _saveBillList(type, list);

        // Also store separately for quick lookup
        try {
            localStorage.setItem(_key(`bill_${id}`), JSON.stringify(bill));
        } catch (e) { /* ignore */ }

        return id;
    }

    function getBillById(id) {
        try {
            const raw = localStorage.getItem(_key(`bill_${id}`));
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        // fallback: search in lists
        for (const type of ['invoices', 'quotations']) {
            const found = _getBillList(type).find(b => b.id === id);
            if (found) return found;
        }
        return null;
    }

    function getInvoices() { return _getBillList('invoices'); }
    function getQuotations() { return _getBillList('quotations'); }

    function deleteBill(type, id) {
        const list = _getBillList(type).filter(b => b.id !== id);
        _saveBillList(type, list);
        localStorage.removeItem(_key(`bill_${id}`));
    }

    // ── Utilities ─────────────────────────────────────────────

    function setUserId(id) {
        _userId = id;
    }

    function clearAll() {
        ['template', 'invoices', 'quotations'].forEach(k => {
            localStorage.removeItem(_key(k));
        });
    }

    return {
        setUserId,
        saveTemplate,
        loadTemplate,
        clearTemplate,
        saveBill,
        getBillById,
        getInvoices,
        getQuotations,
        deleteBill,
        clearAll
    };
})();
