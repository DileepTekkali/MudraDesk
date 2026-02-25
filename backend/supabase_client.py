"""
Supabase client initialization for MudraDesk.
Only user profile data is stored in Supabase.
Bills, invoices, quotations, and templates are stored in the browser's localStorage.
"""
import os
import sys

# Add current directory to sys.path for robust imports on Vercel
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from supabase import create_client, Client

_supabase_client: Client = None


def get_supabase() -> Client:
    """Get the Supabase client (singleton)."""
    global _supabase_client
    if _supabase_client is None:
        url = os.environ.get('SUPABASE_URL', '')
        key = os.environ.get('SUPABASE_SERVICE_KEY', os.environ.get('SUPABASE_ANON_KEY', ''))
        if not url or not key:
            raise RuntimeError(
                "Supabase credentials not configured. "
                "Set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file."
            )
        _supabase_client = create_client(url, key)
    return _supabase_client


def get_user_by_id(user_id: str) -> dict | None:
    """Fetch user profile from Supabase by ID."""
    try:
        client = get_supabase()
        result = client.table('users').select('*').eq('id', user_id).single().execute()
        return result.data
    except Exception:
        return None


def get_user_by_email(email: str) -> dict | None:
    """Fetch user profile from Supabase by email."""
    try:
        client = get_supabase()
        result = client.table('users').select('*').eq('email', email).single().execute()
        return result.data
    except Exception:
        return None


def create_user_profile(user_id: str, data: dict) -> dict | None:
    """Create a user profile record in Supabase."""
    try:
        client = get_supabase()
        data['id'] = user_id
        result = client.table('users').insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        raise RuntimeError(f"Failed to create user profile: {e}")


def update_user_profile(user_id: str, data: dict) -> dict | None:
    """Update a user profile record in Supabase."""
    try:
        client = get_supabase()
        result = client.table('users').update(data).eq('id', user_id).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        raise RuntimeError(f"Failed to update user profile: {e}")


def list_all_users() -> list:
    """List all non-admin user profiles (for admin dashboard)."""
    try:
        client = get_supabase()
        result = client.table('users').select('*').eq('is_admin', False).order('created_at', desc=True).execute()
        return result.data or []
    except Exception:
        return []


def list_pending_users() -> list:
    """List users pending approval."""
    try:
        client = get_supabase()
        result = client.table('users').select('*').eq('is_approved', False).eq('is_admin', False).order('created_at', desc=True).execute()
        return result.data or []
    except Exception:
        return []


def delete_user_profile(user_id: str) -> bool:
    """Delete a user profile from Supabase."""
    try:
        client = get_supabase()
        client.table('users').delete().eq('id', user_id).execute()
        return True
    except Exception:
        return False
