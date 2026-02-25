import os
import re
import sys
import json
from datetime import datetime, timedelta
from flask import (Flask, render_template, request, redirect, url_for,
                   jsonify, send_file, session, flash)
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from io import BytesIO
from PIL import Image, ImageOps
import base64
import secrets

# Load .env if present (local development)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Add current directory to sys.path for robust imports on Vercel
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

template_dir = os.path.abspath(os.path.join(backend_dir, '..', 'frontend', 'templates'))
static_dir = os.path.abspath(os.path.join(backend_dir, '..', 'frontend', 'static'))

app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
app.secret_key = os.environ.get('SECRET_KEY', 'mudra-desk-secret-key-change-in-production')

# Use /tmp for uploads on Vercel (read-only filesystem fallback)
if os.environ.get('VERCEL') == '1' or os.environ.get('FLASK_ENV') == 'production':
    app.config['UPLOAD_FOLDER'] = '/tmp/uploads'
else:
    app.config['UPLOAD_FOLDER'] = os.path.join(backend_dir, 'uploads')

app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

# Cookie-based permanent sessions — persist forever (~100 years)
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = (os.environ.get('FLASK_ENV') == 'production' or os.environ.get('VERCEL') == '1')
SESSION_LIFETIME_DAYS = int(os.environ.get('SESSION_LIFETIME_DAYS', 36500))
app.permanent_session_lifetime = timedelta(days=SESSION_LIFETIME_DAYS)


# ---------------- Jinja Filters ----------------
def _format_indian_number(value, decimals=2):
    """Format a number using Indian digit grouping (e.g., 12,34,567.89)."""
    try:
        n = float(value)
    except (TypeError, ValueError):
        return value if value is not None else ''
    sign = '-' if n < 0 else ''
    n = abs(n)
    s = f"{n:.{decimals}f}"
    int_part, dec_part = s.split('.')
    if len(int_part) <= 3:
        grouped = int_part
    else:
        last3 = int_part[-3:]
        rest = int_part[:-3]
        parts = []
        while len(rest) > 2:
            parts.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            parts.insert(0, rest)
        grouped = ','.join(parts + [last3])
    return f"{sign}{grouped}.{dec_part}"

@app.template_filter('inr')
def inr_format(value):
    return _format_indian_number(value, decimals=2)


# Ensure upload directory exists
try:
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
except Exception:
    pass

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ============================================
# Password Strength Validation
# ============================================

def validate_password_strength(password: str) -> list[str]:
    """
    Returns a list of error messages for password weaknesses.
    Empty list => password is strong enough.
    Requirements: min 8 chars, 1 uppercase, 1 digit, 1 special character.
    """
    errors = []
    if len(password) < 8:
        errors.append('Password must be at least 8 characters long.')
    if not re.search(r'[A-Z]', password):
        errors.append('Password must contain at least one uppercase letter.')
    if not re.search(r'[0-9]', password):
        errors.append('Password must contain at least one number.')
    if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`\';\s]', password):
        errors.append('Password must contain at least one special character (e.g. @, #, !, $).')
    return errors


# ============================================
# Supabase Integration
# ============================================

# Import helpers
# ============================================
# Supabase Integration
# ============================================

# ============================================
# Supabase Integration (optional — falls back
# to SQLite when credentials are not set)
# ============================================

_supabase_enabled = bool(os.environ.get('SUPABASE_URL') and
                         (os.environ.get('SUPABASE_SERVICE_KEY') or os.environ.get('SUPABASE_ANON_KEY')))

if _supabase_enabled:
    try:
        from supabase_client import (get_supabase, get_user_by_id, get_user_by_email,
                                     create_user_profile, update_user_profile,
                                     list_all_users, list_pending_users, delete_user_profile)
        print("[MudraDesk] Supabase integration enabled.")
    except Exception as e:
        _supabase_enabled = False
        print(f"[MudraDesk] Supabase integration error: {e}")
else:
    print("[MudraDesk] WARNING: No Supabase credentials found. User auth will not work.")


# User fetching helpers are now just wrappers around supabase_client functions
def _get_user_from_any_store(user_id: str) -> dict | None:
    if not _supabase_enabled: return None
    try: return get_user_by_id(user_id)
    except Exception: return None

def _get_user_by_email_any(email: str) -> dict | None:
    if not _supabase_enabled: return None
    try: return get_user_by_email(email)
    except Exception: return None

# Import auth and other modules AFTER supabase setup is initialized to prevent circular imports
from auth import login_required, admin_required, get_current_user
from gst_verification import verify_gst


# ============================================
# Main Routes
# ============================================

@app.route('/')
@login_required
def index():
    user = get_current_user()
    # Bills/templates are in localStorage — just pass the user
    return render_template('index.html', user=user)


@app.route('/health')
def health_check():
    """Detailed health check for Vercel debugging."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'supabase_configured': _supabase_enabled,
        'env': {
            'vercel': os.environ.get('VERCEL') == '1',
            'flask_env': os.environ.get('FLASK_ENV'),
            'admin_email_set': bool(os.environ.get('ADMIN_EMAIL')),
            'admin_password_set': bool(os.environ.get('ADMIN_PASSWORD')),
            'secret_key_custom': os.environ.get('SECRET_KEY') is not None
        },
        'paths': {
            'backend': os.path.dirname(os.path.abspath(__file__)),
            'template': template_dir,
            'static': static_dir,
            'cwd': os.getcwd()
        }
    })


@app.route('/template', methods=['GET', 'POST'])
@login_required
def template():
    user = get_current_user()
    if request.method == 'POST':
        # Handle file uploads (logo, signature, stamp) — still server-side files
        logo_path = _handle_file_upload('logo', 'logo')
        signature_path = _handle_file_upload('signature', 'sig')
        stamp_upload_path = _handle_file_upload('stamp_upload', 'stamp')
        stamp_data = request.form.get('stamp_data', '')

        # Return paths so the client can save them to localStorage
        return jsonify({
            'success': True,
            'logo_path': logo_path,
            'signature_path': signature_path,
            'stamp_upload_path': stamp_upload_path,
            'stamp_data': stamp_data
        })

    return render_template('template.html')


def _handle_file_upload(field_name: str, prefix: str) -> str | None:
    """Upload a file and return its filename (or None)."""
    if field_name not in request.files:
        return None
    f = request.files[field_name]
    if f and f.filename and allowed_file(f.filename):
        filename = secure_filename(f"{prefix}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{f.filename}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        f.save(filepath)
        return filename
    return None


@app.route('/template/upload-asset', methods=['POST'])
@login_required
def upload_template_asset():
    """Upload a single asset (logo/signature/stamp) and return its URL."""
    asset_type = request.form.get('asset_type', 'logo')
    prefix_map = {'logo': 'logo', 'signature': 'sig', 'stamp': 'stamp'}
    prefix = prefix_map.get(asset_type, 'file')
    filename = _handle_file_upload('file', prefix)
    if filename:
        return jsonify({
            'success': True,
            'filename': filename,
            'url': url_for('uploaded_file', filename=filename)
        })
    return jsonify({'success': False, 'error': 'No valid file uploaded'}), 400


@app.route('/template/remove-asset', methods=['POST'])
@login_required
def remove_template_asset():
    """Delete an uploaded file asset."""
    data = request.get_json()
    filename = data.get('filename', '')
    if not filename:
        return jsonify({'success': False, 'error': 'No filename provided'}), 400
    safe_name = secure_filename(filename)
    path = os.path.join(app.config['UPLOAD_FOLDER'], safe_name)
    if os.path.exists(path):
        try:
            os.remove(path)
        except Exception:
            pass
    return jsonify({'success': True})


@app.route('/bill/create', methods=['GET', 'POST'])
@login_required
def create_bill():
    user = get_current_user()
    return render_template('bill.html', doc_type='invoice', user=user)


@app.route('/quotation/create', methods=['GET', 'POST'])
@login_required
def create_quotation():
    user = get_current_user()
    return render_template('bill.html', doc_type='quotation', user=user)


@app.route('/bill/preview')
@login_required
def preview_bill():
    """Preview page — bill data is read from localStorage client-side."""
    bill_id = request.args.get('bill_id', '')
    return render_template('preview.html', bill_id=bill_id)


@app.route('/history')
@login_required
def history():
    """Invoice history page — history is loaded from localStorage client-side."""
    return render_template('history.html', doc_type='invoice')


@app.route('/quotation/history')
@login_required
def quotation_history():
    """Quotation history page — history is loaded from localStorage client-side."""
    return render_template('history.html', doc_type='quotation')


@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_file(os.path.join(app.config['UPLOAD_FOLDER'], filename))


@app.route('/uploads/watermark/<filename>')
@login_required
def watermark_file(filename):
    """Serve a grayscale version of the logo for watermark usage."""
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(file_path):
        return jsonify({'error': 'Not found'}), 404
    try:
        img = Image.open(file_path).convert('RGBA')
        r, g, b, a = img.split()
        gray = ImageOps.grayscale(img)
        gray_rgba = Image.merge('RGBA', (gray, gray, gray, a))
        buf = BytesIO()
        gray_rgba.save(buf, format='PNG')
        buf.seek(0)
        return send_file(buf, mimetype='image/png')
    except Exception:
        return send_file(file_path)


# ============================================
# Share Links (Cross-browser PDF sharing)
# ============================================

SHARED_FOLDER = os.path.join(app.config['UPLOAD_FOLDER'], 'shared')
os.makedirs(SHARED_FOLDER, exist_ok=True)


@app.route('/api/share/upload', methods=['POST'])
@login_required
def upload_share_pdf():
    if 'file' not in request.files:
        return jsonify({'error': 'Missing file'}), 400
    f = request.files['file']
    if not f or not f.filename:
        return jsonify({'error': 'Missing filename'}), 400
    filename = secure_filename(f.filename)
    if not filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Only PDF is supported'}), 400
    token = secrets.token_urlsafe(12)
    stored_name = f"{token}.pdf"
    save_path = os.path.join(SHARED_FOLDER, stored_name)
    f.save(save_path)
    return jsonify({'url': url_for('serve_shared_pdf', token=token)}), 200


@app.route('/share/<token>.pdf')
def serve_shared_pdf(token):
    safe_token = ''.join([c for c in token if c.isalnum() or c in ['-', '_']])
    path = os.path.join(SHARED_FOLDER, f"{safe_token}.pdf")
    if not os.path.exists(path):
        return "Not found", 404
    return send_file(path, mimetype='application/pdf', as_attachment=True, download_name='invoice.pdf')


# ============================================
# Authentication Routes
# ============================================

@app.route('/register', methods=['GET', 'POST'])
def register():
    if 'user_id' in session:
        return redirect(url_for('index'))

    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        business_name = request.form.get('business_name', '').strip()
        business_address = request.form.get('business_address', '').strip()
        owner_name = request.form.get('owner_name', '').strip()
        mobile = request.form.get('mobile', '').strip()
        gst_number = request.form.get('gst_number', '').strip().upper()

        # Required field validation
        if not all([email, password, business_name, business_address, owner_name, mobile]):
            flash('All fields except GST number are required.', 'error')
            return render_template('register.html')

        if password != confirm_password:
            flash('Passwords do not match.', 'error')
            return render_template('register.html')

        # Strong password validation
        pw_errors = validate_password_strength(password)
        if pw_errors:
            for err in pw_errors:
                flash(err, 'error')
            return render_template('register.html')

        # Verify GST if provided
        gst_verified = 0
        if gst_number:
            gst_result = verify_gst(gst_number)
            if not gst_result['valid']:
                flash(f"GST Verification Failed: {gst_result.get('error', 'Invalid GST')}", 'error')
                return render_template('register.html')
            gst_verified = 1

        # Check duplicate email
        existing = _get_user_by_email_any(email)
        if existing:
            flash('Email already registered.', 'error')
            return render_template('register.html')

        # Create user
        user_id = secrets.token_hex(16)
        password_hash = generate_password_hash(password, method='pbkdf2:sha256')
        user_data = {
            'id': user_id,
            'email': email,
            'password_hash': password_hash,
            'business_name': business_name,
            'business_address': business_address,
            'owner_name': owner_name,
            'mobile': mobile,
            'gst_number': gst_number,
            'gst_verified': gst_verified,
            'is_admin': False,
            'is_approved': False,
            'is_active': True,
            'created_at': datetime.now().isoformat()
        }

        try:
            if not _supabase_enabled:
                flash('Registration currently unavailable (Supabase not configured).', 'error')
                return render_template('register.html')

            create_user_profile(user_id, user_data)
            flash('Registration successful! Please wait for admin approval.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            flash(f'Registration failed: {str(e)}', 'error')
            return render_template('register.html')

    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('index'))

    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        remember_me = request.form.get('remember_me') == 'on'

        if not email or not password:
            flash('Email and password are required.', 'error')
            return render_template('login.html')

        # 1. Check for "Super Admin" in Environment Variables
        env_admin_email = os.environ.get('ADMIN_EMAIL')
        env_admin_password = os.environ.get('ADMIN_PASSWORD')
        
        if env_admin_email and env_admin_password:
            if email == env_admin_email.strip().lower() and password == env_admin_password:
                session.permanent = True
                session['user_id'] = 'superadmin_' + secrets.token_hex(4)
                session['is_admin'] = True
                print(f"[DEBUG] Super Admin login success: {email}")
                flash(f"Welcome back, Super Admin! 👋", 'success')
                return redirect(url_for('index'))
            else:
                print(f"[DEBUG] Super Admin login mismatch for: {email}")
        else:
            print(f"[DEBUG] Super Admin env vars not fully set. Email: {bool(env_admin_email)}, Pwd: {bool(env_admin_password)}")

        # 2. Check Database (Supabase)
        user = _get_user_by_email_any(email)

        if not user or not check_password_hash(user['password_hash'], password):
            flash('Invalid email or password.', 'error')
            return render_template('login.html')

        if not user.get('is_active', True):
            flash('Your account has been deactivated.', 'error')
            return render_template('login.html')

        if not user.get('is_approved') and not user.get('is_admin'):
            session['user_id'] = user['id']
            return redirect(url_for('pending_approval'))

        # Set session — always permanent (cookie persists forever)
        session.permanent = True
        session['user_id'] = user['id']
        session['is_admin'] = bool(user.get('is_admin'))
        flash(f"Welcome back, {user['owner_name']}! 👋", 'success')
        return redirect(url_for('index'))

    return render_template('login.html')


@app.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))


@app.route('/pending-approval')
def pending_approval():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = get_current_user()
    if user and user.get('is_approved'):
        return redirect(url_for('index'))
    return render_template('pending_approval.html', user=user)


# ============================================
# Admin Routes
# ============================================

@app.route('/admin/dashboard')
@admin_required
def admin_dashboard():
    user = get_current_user()
    if _supabase_enabled:
        try:
            all_users = list_all_users()
            pending = [u for u in all_users if not u.get('is_approved')]
        except Exception:
            all_users, pending = [], []
    else:
        all_users, pending = [], []

    total_users = len(all_users)
    pending_users = len(pending)

    return render_template('admin_dashboard.html',
                           user=user,
                           total_users=total_users,
                           pending_users=pending_users,
                           total_bills=0,  # Bills are in localStorage
                           pending=pending,
                           all_users=all_users)





@app.route('/admin/approve/<user_id>')
@admin_required
def approve_user(user_id):
    now = datetime.now().isoformat()
    admin = get_current_user()
    try:
        if _supabase_enabled:
            update_user_profile(user_id, {'is_approved': True, 'approved_at': now, 'approved_by': admin['id']})
            flash('User approved successfully.', 'success')
        else:
            flash('Supabase not configured.', 'error')
    except Exception as e:
        flash(f'Error approving user: {e}', 'error')
    except Exception as e:
        flash(f'Error approving user: {e}', 'error')
    return redirect(url_for('admin_dashboard'))


@app.route('/admin/reject/<user_id>')
@admin_required
def reject_user(user_id):
    try:
        if _supabase_enabled:
            delete_user_profile(user_id)
            flash('User rejected and removed.', 'info')
        else:
            flash('Supabase not configured.', 'error')
    except Exception as e:
        flash(f'Error rejecting user: {e}', 'error')
    except Exception as e:
        flash(f'Error rejecting user: {e}', 'error')
    return redirect(url_for('admin_dashboard'))


@app.route('/admin/toggle-active/<user_id>')
@admin_required
def toggle_user_active(user_id):
    try:
        if _supabase_enabled:
            user = get_user_by_id(user_id)
            if not user:
                flash('User not found.', 'error')
                return redirect(url_for('admin_dashboard'))
            
            new_status = not bool(user['is_active'])
            update_user_profile(user_id, {'is_active': new_status})
            status_text = 'activated' if new_status else 'deactivated'
            flash(f"User {user['email']} has been {status_text}.", 'success')
        else:
            flash('Supabase not configured.', 'error')
    except Exception as e:
        flash(f'Error updating user: {e}', 'error')
    return redirect(url_for('admin_dashboard'))


@app.route('/admin/delete-user/<user_id>')
@admin_required
def delete_user(user_id):
    try:
        if _supabase_enabled:
            user = get_user_by_id(user_id)
            if not user:
                flash('User not found.', 'error')
            elif user['is_admin']:
                flash('Cannot delete admin account.', 'error')
            else:
                delete_user_profile(user_id)
                flash(f"User {user['email']} permanently deleted.", 'success')
        else:
            flash('Supabase not configured.', 'error')
    except Exception as e:
        flash(f'Error deleting user: {e}', 'error')
    return redirect(url_for('admin_dashboard'))


@app.route('/admin/profile', methods=['GET', 'POST'])
@admin_required
def admin_profile():
    user = get_current_user()
    if request.method == 'POST':
        new_email = request.form.get('email', '').strip().lower()
        current_password = request.form.get('current_password', '')
        new_password = request.form.get('new_password', '')
        confirm_password = request.form.get('confirm_password', '')

        if not check_password_hash(user['password_hash'], current_password):
            flash('Current password is incorrect.', 'error')
            return render_template('admin_profile.html', user=user)

        changes = {}

        if new_email and new_email != user['email']:
            existing = _get_user_by_email_any(new_email)
            if existing:
                flash('Email already in use by another user.', 'error')
                return render_template('admin_profile.html', user=user)
            changes['email'] = new_email

        if new_password:
            if new_password != confirm_password:
                flash('New passwords do not match.', 'error')
                return render_template('admin_profile.html', user=user)
            pw_errors = validate_password_strength(new_password)
            if pw_errors:
                for err in pw_errors:
                    flash(err, 'error')
                return render_template('admin_profile.html', user=user)
            changes['password_hash'] = generate_password_hash(new_password, method='pbkdf2:sha256')

        if changes:
            try:
                if _supabase_enabled:
                    update_user_profile(user['id'], changes)
                    flash('Profile updated successfully.', 'success')
                else:
                    flash('Supabase not configured.', 'error')
            except Exception as e:
                flash(f'Update failed: {e}', 'error')

        if 'email' in changes:
            session.clear()
            flash('Email updated. Please log in again.', 'info')
            return redirect(url_for('login'))

        return redirect(url_for('admin_profile'))

    return render_template('admin_profile.html', user=user)


# ============================================
# API Routes
# ============================================

@app.route('/api/verify-gst', methods=['POST'])
def api_verify_gst():
    data = request.get_json()
    gst_number = data.get('gst_number', '').strip().upper()
    result = verify_gst(gst_number)
    return jsonify(result)


@app.route('/api/current-user')
@login_required
def api_current_user():
    """Return current user info as JSON (for localStorage namespace initialization)."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    return jsonify({
        'id': user['id'],
        'email': user['email'],
        'owner_name': user['owner_name'],
        'business_name': user['business_name']
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
