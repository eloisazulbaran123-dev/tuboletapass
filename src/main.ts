import { eventsApi, formatPrice } from './supabase.ts';
import { initAuthUI } from './auth-ui.ts';

// Types
interface Event {
  id: number;
  title: string;
  image: string;
  venue: string;
  city: string;
  category: string;
  price: number;
  date_day: string;
  date_month: string;
  date_full: string;
  time: string;
  description?: string;
  venue_map?: string;
  show_banner?: boolean;
  event_date?: string;
  has_discount?: boolean;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
}

interface Filters {
  city: string;
  category: string;
  search: string;
}

// Estado global
let allEvents: Event[] = [];
let currentFilters: Filters = {
  city: '',
  category: '',
  search: ''
};

// ============================================
// HERO BANNER DINÁMICO
// ============================================
async function renderHeroBanner(): Promise<void> {
  try {
    const bannerEvent = await eventsApi.getBannerEvent();
    
    if (!bannerEvent) {
      console.log('ℹ️ No hay banner activo');
      return;
    }

    console.log('🎯 Banner activo:', bannerEvent.title);

    const heroHTML = `
      <section class="hero-banner" onclick="window.location.href='evento.html?id=${bannerEvent.id}'" style="cursor: pointer;">
        <div class="hero-banner-image" style="background-image: url('${bannerEvent.image}')">
          <div class="hero-banner-overlay">
            <div class="container">
              <div class="hero-banner-content">
                <span class="hero-banner-tag">Destacado</span>
                <h1 class="hero-banner-title">${bannerEvent.title}</h1>
                <div class="hero-banner-info">
                  <span>📍 ${bannerEvent.venue}, ${bannerEvent.city}</span>
                  <span>📅 ${bannerEvent.date_full}</span>
                  <span>🕐 ${bannerEvent.time}</span>
                </div>
                <button class="hero-banner-btn">Ver evento →</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;

    const main = document.querySelector('main');
    const firstSection = document.querySelector('main .section');
    
    if (main && firstSection) {
      firstSection.insertAdjacentHTML('beforebegin', heroHTML);
    }
  } catch (error) {
    console.error('❌ Error renderizando hero banner:', error);
  }
}

// ============================================
// CARGAR EVENTOS CON FILTROS
// ============================================
async function loadEvents(): Promise<void> {
  try {
    console.log('🔄 Cargando eventos...', currentFilters);
    
    if (currentFilters.city) {
      allEvents = await eventsApi.getByCity(currentFilters.city);
      console.log(`✅ ${allEvents.length} eventos en ${currentFilters.city}`);
    } else if (currentFilters.category) {
      allEvents = await eventsApi.getByCategory(currentFilters.category);
      console.log(`✅ ${allEvents.length} eventos de ${currentFilters.category}`);
    } else {
      allEvents = await eventsApi.getAll();
      console.log(`✅ ${allEvents.length} eventos cargados`);
    }

    if (currentFilters.search) {
      const search = currentFilters.search.toLowerCase();
      allEvents = allEvents.filter(event => 
        event.title.toLowerCase().includes(search) ||
        event.venue.toLowerCase().includes(search) ||
        event.city.toLowerCase().includes(search)
      );
      console.log(`🔍 ${allEvents.length} eventos después de búsqueda`);
    }

    renderAllSections();
  } catch (error) {
    console.error('❌ Error cargando eventos:', error);
    showError('Error al cargar eventos. Por favor recarga la página.');
  }
}

// ============================================
// RENDERIZAR SECCIONES
// ============================================
function renderAllSections(): void {
  if (!allEvents || allEvents.length === 0) {
    showEmptyState();
    return;
  }

  // Destacados con diseño mejorado
  const featured = allEvents.slice(0, 6);
  renderFeaturedEvents(featured);

  // Conciertos
  const concerts = allEvents.filter(e => e.category === 'concierto');
  if (concerts.length > 0) {
    renderSection('concertEvents', concerts.slice(0, 8));
  }

  // Teatro
  const theater = allEvents.filter(e => e.category === 'teatro');
  if (theater.length > 0) {
    renderSection('theaterEvents', theater.slice(0, 8));
  }

  console.log(`📊 Renderizados: ${allEvents.length} eventos`);
}

// ============================================
// RENDERIZAR DESTACADOS CON DISEÑO MEJORADO
// ============================================
function renderFeaturedEvents(events: Event[]): void {
  const container = document.getElementById('featuredEvents');
  if (!container) return;

  if (events.length === 0) {
    container.innerHTML = '<p style="color: #999; padding: 2rem; text-align: center;">No hay eventos destacados</p>';
    return;
  }

  container.innerHTML = events.map(event => {
    const discountBadge = getDiscountBadge(event);
    const finalPrice = calculateFinalPrice(event.price, event.has_discount || false, event.discount_type, event.discount_value);
    
    let priceHTML = '';
    if (event.has_discount) {
      priceHTML = `
        <div style="display:flex;flex-direction:column;gap:0.25rem;">
          <span style="font-size:0.85rem;color:#999;text-decoration:line-through;">${formatPrice(event.price)}</span>
          <span class="event-card-price">${formatPrice(finalPrice)}</span>
        </div>
      `;
    } else {
      priceHTML = `<span class="event-card-price">${formatPrice(event.price)}</span>`;
    }
    
    return `
      <div class="event-card-improved" onclick="window.location.href='evento.html?id=${event.id}'">
        <div class="event-card-image" style="position:relative;">
          ${discountBadge}
          <img src="${event.image}" alt="${event.title}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22200%22%3E%3Crect fill=%22%23e5e7eb%22 width=%22400%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23666%22 font-size=%2218%22%3EEvento%3C/text%3E%3C/svg%3E'">
          <div class="event-card-date">
            <span class="date-day">${event.date_day}</span>
            <span class="date-month">${event.date_month}</span>
          </div>
        </div>
        <div class="event-card-body">
          <h3 class="event-card-title">${event.title}</h3>
          <p class="event-card-venue">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            ${event.venue}
          </p>
          <p class="event-card-city">${event.city}</p>
          <div class="event-card-footer">
            ${priceHTML}
            <button class="event-card-btn">Comprar →</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// RENDERIZAR SECCIÓN (otras categorías)
// ============================================
function renderSection(containerId: string, events: Event[]): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`⚠️ Container ${containerId} not found`);
    return;
  }

  if (events.length === 0) {
    container.innerHTML = '<p style="color: #999; padding: 2rem; text-align: center;">No hay eventos en esta categoría</p>';
    return;
  }

  const html = events.map(event => `
    <a href="/evento.html?id=${event.id}" class="event-card">
      <div class="event-card-image">
        <img src="${event.image}" alt="${event.title}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22250%22%3E%3Crect fill=%22%23e5e7eb%22 width=%22400%22 height=%22250%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23666%22 font-size=%2218%22%3EEvento%3C/text%3E%3C/svg%3E'">
        <div class="event-card-overlay">
          <span class="event-card-date">
            <span class="day">${event.date_day}</span>
            <span class="month">${event.date_month}</span>
          </span>
        </div>
      </div>
      <div class="event-card-content">
        <h3 class="event-card-title">${event.title}</h3>
        <p class="event-card-venue">${event.venue}</p>
        <p class="event-card-city">${event.city}</p>
        <p class="event-card-price">Desde ${formatPrice(event.price)}</p>
      </div>
    </a>
  `).join('');

  container.innerHTML = html;
}

// ============================================
// ESTADOS ESPECIALES
// ============================================
function showEmptyState(): void {
  const message = `
    <div style="text-align: center; padding: 4rem 2rem; color: #666;">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-bottom: 1rem;">
        <circle cx="12" cy="12" r="10" stroke-width="2"/>
        <line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/>
        <line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2"/>
      </svg>
      <h3 style="margin-bottom: 0.5rem;">No se encontraron eventos</h3>
      <p>Intenta con otros filtros o búsqueda</p>
      <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1.5rem; background: var(--cyan); color: white; border: none; border-radius: 8px; cursor: pointer;">
        Ver todos los eventos
      </button>
    </div>
  `;

  const containers = ['featuredEvents', 'concertEvents', 'theaterEvents'];
  containers.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = message;
  });
}

function showError(message: string): void {
  const errorHtml = `
    <div style="text-align: center; padding: 3rem 2rem; color: #ef4444;">
      <p>${message}</p>
    </div>
  `;

  const containers = ['featuredEvents', 'concertEvents', 'theaterEvents'];
  containers.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = errorHtml;
  });
}

// ============================================
// SETUP FILTROS
// ============================================
function setupFilters(): void {
  console.log('🔧 Configurando filtros...');

  // FILTRO DE CIUDAD
  const cityFilter = document.getElementById('cityFilter');
  const cityDropdown = document.getElementById('cityDropdown');
  const cityLabel = document.getElementById('cityLabel');

  if (cityFilter && cityDropdown && cityLabel) {
    cityFilter.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      const isActive = cityDropdown.classList.contains('active');
      
      document.querySelectorAll('.filter-dropdown').forEach(d => {
        d.classList.remove('active');
      });

      cityDropdown.classList.toggle('active', !isActive);
    });

    cityDropdown.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', async (e: Event) => {
        e.stopPropagation();
        const value = (btn as HTMLButtonElement).dataset.value || '';
        
        console.log('🏙️ Ciudad seleccionada:', value || 'Todas');
        
        currentFilters.city = value;
        cityLabel.textContent = value || 'Ciudad';
        cityDropdown.classList.remove('active');
        
        await loadEvents();
      });
    });
  }

  // FILTRO DE CATEGORÍA
  const categoryFilter = document.getElementById('categoryFilter');
  const categoryDropdown = document.getElementById('categoryDropdown');
  const categoryLabel = document.getElementById('categoryLabel');

  if (categoryFilter && categoryDropdown && categoryLabel) {
    categoryFilter.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      const isActive = categoryDropdown.classList.contains('active');
      
      document.querySelectorAll('.filter-dropdown').forEach(d => {
        d.classList.remove('active');
      });

      categoryDropdown.classList.toggle('active', !isActive);
    });

    categoryDropdown.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', async (e: Event) => {
        e.stopPropagation();
        const value = (btn as HTMLButtonElement).dataset.value || '';
        
        console.log('🎭 Categoría seleccionada:', value || 'Todas');
        
        currentFilters.category = value;
        categoryLabel.textContent = btn.textContent || 'Categoría';
        categoryDropdown.classList.remove('active');
        
        await loadEvents();
      });
    });
  }

  // BÚSQUEDA
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  const searchBtn = document.getElementById('searchBtn');

  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', async () => {
      const value = searchInput.value.trim();
      console.log('🔍 Búsqueda:', value);
      
      currentFilters.search = value;
      await loadEvents();
    });

    searchInput.addEventListener('keypress', async (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const value = searchInput.value.trim();
        console.log('🔍 Búsqueda (Enter):', value);
        
        currentFilters.search = value;
        await loadEvents();
      }
    });
  }

  // Cerrar dropdowns al hacer clic fuera
  document.addEventListener('click', () => {
    document.querySelectorAll('.filter-dropdown').forEach(d => {
      d.classList.remove('active');
    });
  });

  console.log('✅ Filtros configurados correctamente');
}

// ============================================
// HELPERS PARA DESCUENTOS
// ============================================
function getDiscountBadge(event: Event): string {
  if (!event.has_discount) return '';
  
  const badgeText = event.discount_type === 'percentage' 
    ? `-${Math.round(event.discount_value || 0)}%`
    : 'PROMO';
  
  const badgeClass = event.discount_type === 'percentage' ? 'discount-badge' : 'discount-badge promo';
  
  return `
    <div class="${badgeClass}" style="position:absolute;top:0.75rem;right:0.75rem;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;padding:0.4rem 0.9rem;border-radius:20px;font-weight:800;font-size:0.85rem;z-index:10;box-shadow:0 4px 12px rgba(239,68,68,0.4);">
      ${badgeText}
    </div>
  `;
}

function calculateFinalPrice(price: number, hasDiscount: boolean, discountType?: string, discountValue?: number): number {
  if (!hasDiscount || !discountValue) return price;
  
  if (discountType === 'percentage') {
    return price - (price * discountValue / 100);
  }
  return price - discountValue;
}

// ============================================
// SETUP NAVEGACIÓN POR CATEGORÍAS
// ============================================
function setupNavigation(): void {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    link.addEventListener('click', async (e: Event) => {
      e.preventDefault();
      const category = href.substring(1);
      
      const categoryMap: { [key: string]: string } = {
        'conciertos': 'concierto',
        'teatro': 'teatro',
        'deportes': 'deportes',
        'festivales': 'festival',
        'familiar': 'familiar'
      };

      if (categoryMap[category]) {
        console.log('📖 Navegación a categoría:', category);
        
        currentFilters.category = categoryMap[category];
        currentFilters.city = '';
        currentFilters.search = '';
        
        const categoryLabel = document.getElementById('categoryLabel');
        if (categoryLabel) {
          categoryLabel.textContent = link.textContent || 'Categoría';
        }
        
        await loadEvents();
        
        const target = document.getElementById('destacados');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

// ============================================
// INICIALIZACIÓN
// ============================================
async function init(): Promise<void> {
  console.log('🚀 Inicializando aplicación...');
  
  // Renderizar hero banner primero
  await renderHeroBanner();
  
  // Cargar eventos
  await loadEvents();
  
  // Configurar filtros y navegación
  setupFilters();
  setupNavigation();
}

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
    initAuthUI();
  });
} else {
  init();
  initAuthUI();
}
