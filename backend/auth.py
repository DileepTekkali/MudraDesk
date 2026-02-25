import os
import sys
from functools import wraps
from flask import session, redirect, url_for, flash

# Add current directory to sys.path for robust imports on Vercel
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)


def get_current_user() -> dict | None:
    """Get the currently logged-in user from session."""
    if 'user_id' not in session:
        return None
    user_id = session['user_id']

    # Use Supabase directly from supabase_client to avoid circular imports
    try:
        from supabase_client import get_user_by_id
        return get_user_by_id(user_id)
    except Exception:
        return None


def login_required(f):
    """Decorator: require user to be logged in and approved."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('login'))

        user = get_current_user()

        if not user:
            session.clear()
            flash('Session expired. Please log in again.', 'error')
            return redirect(url_for('login'))

        if not user.get('is_approved') and not user.get('is_admin'):
            return redirect(url_for('pending_approval'))

        if not user.get('is_active', True):
            session.clear()
            flash('Your account has been deactivated.', 'error')
            return redirect(url_for('login'))

        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    """Decorator: require admin privileges."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('login'))

        user = get_current_user()

        if not user or not user.get('is_admin'):
            flash('Admin access required.', 'error')
            return redirect(url_for('index'))

        return f(*args, **kwargs)
    return decorated_function
