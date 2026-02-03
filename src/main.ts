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
// CARGAR EVENTOS CON FILTROS
// ============================================
async function loadEvents(): Promise<void> {
  try {
    console.log('📄 Cargando eventos...', currentFilters);
    
    // Si hay filtro de ciudad, usar getByCity
    if (currentFilters.city) {
      allEvents = await eventsApi.getByCity(currentFilters.city);
      console.log(`✅ ${allEvents.length} eventos en ${currentFilters.city}`);
    }
    // Si hay filtro de categoría, usar getByCategory
    else if (currentFilters.category) {
      allEvents = await eventsApi.getByCategory(currentFilters.category);
      console.log(`✅ ${allEvents.length} eventos de ${currentFilters.category}`);
    }
    // Sin filtros, traer todos
    else {
      allEvents = await eventsApi.getAll();
      console.log(`✅ ${allEvents.length} eventos cargados`);
    }

    // Aplicar filtro de búsqueda en el frontend
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

  // Destacados (primeros 4-6 eventos)
  const featured = allEvents.slice(0, 6);
  renderSection('featuredEvents', featured, true);

  // Conciertos
  const concerts = allEvents.filter(e => e.category === 'concierto');
  if (concerts.length > 0) {
    renderSection('concertEvents', concerts.slice(0, 8), false);
  }

  // Teatro
  const theater = allEvents.filter(e => e.category === 'teatro');
  if (theater.length > 0) {
    renderSection('theaterEvents', theater.slice(0, 8), false);
  }

  console.log(`📊 Renderizados: ${allEvents.length} eventos`);
}

// ============================================
// RENDERIZAR SECCIÓN
// ============================================
function renderSection(containerId: string, events: Event[], isGrid: boolean = false): void {
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
    // Toggle dropdown
    cityFilter.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      const isActive = cityDropdown.classList.contains('active');
      
      // Cerrar otros dropdowns
      document.querySelectorAll('.filter-dropdown').forEach(d => {
        d.classList.remove('active');
      });

      // Toggle este dropdown
      cityDropdown.classList.toggle('active', !isActive);
    });

    // Seleccionar ciudad
    cityDropdown.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', async (e: Event) => {
        e.stopPropagation();
        const value = (btn as HTMLButtonElement).dataset.value || '';
        
        console.log('🏙️ Ciudad seleccionada:', value || 'Todas');
        
        currentFilters.city = value;
        cityLabel.textContent = value || 'Ciudad';
        cityDropdown.classList.remove('active');
        
        // Recargar eventos con filtro
        await loadEvents();
      });
    });
  } else {
    console.warn('⚠️ Elementos de filtro de ciudad no encontrados');
  }

  // FILTRO DE CATEGORÍA
  const categoryFilter = document.getElementById('categoryFilter');
  const categoryDropdown = document.getElementById('categoryDropdown');
  const categoryLabel = document.getElementById('categoryLabel');

  if (categoryFilter && categoryDropdown && categoryLabel) {
    // Toggle dropdown
    categoryFilter.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      const isActive = categoryDropdown.classList.contains('active');
      
      // Cerrar otros dropdowns
      document.querySelectorAll('.filter-dropdown').forEach(d => {
        d.classList.remove('active');
      });

      // Toggle este dropdown
      categoryDropdown.classList.toggle('active', !isActive);
    });

    // Seleccionar categoría
    categoryDropdown.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', async (e: Event) => {
        e.stopPropagation();
        const value = (btn as HTMLButtonElement).dataset.value || '';
        
        console.log('🎭 Categoría seleccionada:', value || 'Todas');
        
        currentFilters.category = value;
        categoryLabel.textContent = btn.textContent || 'Categoría';
        categoryDropdown.classList.remove('active');
        
        // Recargar eventos con filtro
        await loadEvents();
      });
    });
  } else {
    console.warn('⚠️ Elementos de filtro de categoría no encontrados');
  }

  // BÚSQUEDA
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  const searchBtn = document.getElementById('searchBtn');

  if (searchBtn && searchInput) {
    // Botón de búsqueda
    searchBtn.addEventListener('click', async () => {
      const value = searchInput.value.trim();
      console.log('🔍 Búsqueda:', value);
      
      currentFilters.search = value;
      await loadEvents();
    });

    // Enter en input
    searchInput.addEventListener('keypress', async (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const value = searchInput.value.trim();
        console.log('🔍 Búsqueda (Enter):', value);
        
        currentFilters.search = value;
        await loadEvents();
      }
    });
  } else {
    console.warn('⚠️ Elementos de búsqueda no encontrados');
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
        console.log('🔖 Navegación a categoría:', category);
        
        // Actualizar filtro
        currentFilters.category = categoryMap[category];
        currentFilters.city = '';
        currentFilters.search = '';
        
        // Actualizar label
        const categoryLabel = document.getElementById('categoryLabel');
        if (categoryLabel) {
          categoryLabel.textContent = link.textContent || 'Categoría';
        }
        
        // Recargar eventos
        await loadEvents();
        
        // Scroll suave
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
function init(): void {
  console.log('🚀 Inicializando aplicación...');
  loadEvents();
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