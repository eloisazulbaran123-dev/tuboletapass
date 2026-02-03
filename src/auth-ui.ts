// auth-ui.ts - SOLO ícono circular + tu logo de imagen

import { auth } from './supabase.ts';

export function initAuthUI() {
  const headerActions = document.querySelector('.header-actions');
  if (!headerActions) {
    console.warn('⚠️ .header-actions not found');
    return;
  }

  const authContainer = document.createElement('div');
  authContainer.id = 'auth-ui';
  authContainer.style.cssText = 'display:flex;align-items:center;gap:1rem;';
  
  const cartBtn = headerActions.querySelector('.cart-btn');
  if (cartBtn) {
    headerActions.insertBefore(authContainer, cartBtn);
  } else {
    headerActions.appendChild(authContainer);
  }

  renderAuthUI();
}

async function renderAuthUI() {
  const container = document.getElementById('auth-ui');
  if (!container) return;

  try {
    const session = await auth.getSession();
    
    if (session) {
      // Usuario logueado - Menú de usuario
      const userData = await auth.getUserData();
      container.innerHTML = `
        <div class="user-menu" style="position:relative;">
          <button class="user-btn" style="display:flex;align-items:center;gap:0.5rem;background:rgba(255,255,255,0.1);border:none;color:white;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-family:inherit;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span style="font-size:0.9rem;font-weight:500;">${userData?.name || userData?.email || 'Usuario'}</span>
          </button>
          <div class="user-dropdown" style="display:none;position:absolute;top:calc(100% + 0.5rem);right:0;background:white;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.2);min-width:200px;z-index:100;">
            <a href="/perfil.html" style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;text-decoration:none;color:#1a3a4a;transition:background 0.2s;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span style="font-size:0.9rem;">Mi Perfil</span>
            </a>
            <a href="/mis-ordenes.html" style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;text-decoration:none;color:#1a3a4a;transition:background 0.2s;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18"/>
              </svg>
              <span style="font-size:0.9rem;">Mis Órdenes</span>
            </a>
            <div style="border-top:1px solid #e0e0e0;margin:0.5rem 0;"></div>
            <button onclick="window.handleLogout()" style="width:100%;display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;background:none;border:none;color:#ef4444;cursor:pointer;font-family:inherit;font-size:0.9rem;text-align:left;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      `;

      const userBtn = container.querySelector('.user-btn');
      const dropdown = container.querySelector('.user-dropdown');
      
      userBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      });

      document.addEventListener('click', () => {
        if (dropdown) dropdown.style.display = 'none';
      });

      container.querySelectorAll('a, button').forEach(el => {
        if (el.classList.contains('user-btn')) return;
        el.addEventListener('mouseenter', () => {
          el.style.background = '#f5f5f5';
        });
        el.addEventListener('mouseleave', () => {
          el.style.background = 'transparent';
        });
      });

    } else {
      // Usuario no logueado - SOLO ícono circular + TU LOGO
      // ⚠️ CAMBIA LA RUTA AQUÍ ↓
      container.innerHTML = `
        <a href="/login.html" class="tuboleta-pass-btn">
          <div class="user-circle-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <img 
            src="/logos/tuboleta-pass.png" 
            alt="Tuboleta Pass" 
            class="tuboleta-logo-img"
            onerror="console.error('❌ Logo no encontrado en:', this.src); this.style.display='none';"
          />
        </a>
      `;
      // ⚠️ Posibles rutas para probar:
      // /logos/tuboleta-pass.png
      // /public/logos/tuboleta-pass.png
      // /assets/tuboleta-pass.png
      // ./logos/tuboleta-pass.png
    }
  } catch (error) {
    console.error('Error rendering auth UI:', error);
  }
}

window.handleLogout = async function() {
  if (!confirm('¿Cerrar sesión?')) return;
  
  try {
    await auth.signOut();
    window.location.reload();
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cerrar sesión');
  }
};

auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event);
  renderAuthUI();
});
