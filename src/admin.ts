import { auth, eventsApi, ordersApi, formatPrice, ticketsApi } from './supabase.ts';

async function checkAuth() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  
  try {
    const session = await auth.getSession();
    
    if (!session) {
      console.log('No session');
      window.location.href = '/admin-login.html';
      return false;
    }

    const isAdmin = await auth.isAdmin();
    
    if (!isAdmin) {
      console.log('Not admin');
      await auth.signOut();
      window.location.href = '/admin-login.html';
      return false;
    }

    const adminData = await auth.getAdminData();
    if (adminData) {
      const emailElement = document.getElementById('adminEmail');
      if (emailElement) {
        emailElement.textContent = adminData.email;
      }
    }

    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
    return true;

  } catch (error) {
    console.error('Auth error:', error);
    window.location.href = '/admin-login.html';
    return false;
  }
}

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  if (confirm('¿Cerrar sesión?')) {
    await auth.signOut();
    window.location.href = '/admin-login.html';
  }
});

let currentTab = 'events';
let currentFilter = 'all';
let allEvents: any[] = [];
let allOrders: any[] = [];

async function initAdmin() {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) return;

  await loadAllData();
  setupTabs();
  setupForms();
}

async function loadAllData() {
  try {
    allEvents = await eventsApi.getAll();
    renderEvents();

    allOrders = await ordersApi.getAll();
    updateOrdersStats();
    renderOrders();

  } catch (error) {
    console.error('Load error:', error);
    showToast('Error al cargar datos: ' + (error as Error).message, 'error');
  }
}

function renderEvents() {
  const grid = document.getElementById('eventsGrid');
  
  if (!grid) return;
  
  if (!allEvents || allEvents.length === 0) {
    grid.innerHTML = '<div class="empty-state">No hay eventos</div>';
    return;
  }

  grid.innerHTML = allEvents.map(event => `
    <div class="event-card">
      <img src="${event.image || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22200%22%3E%3Crect fill=%22%23e5e7eb%22 width=%22400%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23666%22 font-size=%2218%22%3EEvento%3C/text%3E%3C/svg%3E'}" alt="${event.title}">
      <div class="event-card-body">
        <h4>${event.title}</h4>
        <p>${event.venue}, ${event.city}</p>
        <p>${event.date_full}</p>
        <p>${event.category}</p>
        <p style="font-weight:700;color:var(--cyan)">${formatPrice(event.price)}</p>
        <div class="event-card-actions">
          <button class="btn-edit" onclick="window.editEvent(${event.id})">Editar</button>
          <button class="btn-manage" onclick="window.manageTickets(${event.id})">Localidades</button>
          <button class="btn-delete" onclick="window.deleteEvent(${event.id})">Eliminar</button>
        </div>
      </div>
    </div>
  `).join('');
}

let editingEventId: number | null = null;

window.openEventModal = function(eventId: number | null = null) {
  editingEventId = eventId;
  const modal = document.getElementById('eventModal');
  const form = document.getElementById('eventForm') as HTMLFormElement;
  
  if (!modal || !form) return;
  
  if (eventId) {
    const event = allEvents.find(e => e.id === eventId);
    if (!event) return;
    
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
      modalTitle.textContent = 'Editar Evento';
    }
    
    (form.elements as any).title.value = event.title;
    (form.elements as any).image.value = event.image;
    (form.elements as any).venue.value = event.venue;
    (form.elements as any).city.value = event.city;
    (form.elements as any).category.value = event.category;
    (form.elements as any).price.value = event.price;
    (form.elements as any).date_day.value = event.date_day;
    (form.elements as any).date_month.value = event.date_month;
    (form.elements as any).date_full.value = event.date_full;
    (form.elements as any).time.value = event.time;
    (form.elements as any).description.value = event.description || '';
  } else {
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
      modalTitle.textContent = 'Nuevo Evento';
    }
    form.reset();
  }
  
  modal.classList.add('active');
};

window.closeEventModal = function() {
  const modal = document.getElementById('eventModal');
  if (modal) {
    modal.classList.remove('active');
  }
  editingEventId = null;
};

async function saveEvent(formData: FormData) {
  try {
    const eventData = {
      title: formData.get('title') as string,
      image: formData.get('image') as string,
      venue: formData.get('venue') as string,
      city: formData.get('city') as string,
      category: formData.get('category') as string,
      price: parseInt(formData.get('price') as string),
      date_day: formData.get('date_day') as string,
      date_month: formData.get('date_month') as string,
      date_full: formData.get('date_full') as string,
      time: formData.get('time') as string,
      description: formData.get('description') as string || ''
    };

    let savedEventId: number;

    if (editingEventId) {
      await eventsApi.update(editingEventId, eventData);
      savedEventId = editingEventId;
      showToast('Evento actualizado', 'success');
    } else {
      const newEvent = await eventsApi.create(eventData);
      savedEventId = newEvent.id;
      showToast('Evento creado', 'success');
      
      // Crear localidades por defecto para el nuevo evento
      try {
        const defaultTickets = [
          {
            event_id: savedEventId,
            type: 'General',
            price: eventData.price,
            total: 100,
            available: 100,
            color: '#60a5fa'
          },
          {
            event_id: savedEventId,
            type: 'VIP',
            price: eventData.price * 2,
            total: 50,
            available: 50,
            color: '#fbbf24'
          },
          {
            event_id: savedEventId,
            type: 'Platea',
            price: Math.round(eventData.price * 1.5),
            total: 75,
            available: 75,
            color: '#34d399'
          }
        ];

        for (const ticket of defaultTickets) {
          await ticketsApi.create(ticket);
        }
        
        console.log('Localidades por defecto creadas para evento:', savedEventId);
      } catch (ticketError) {
        console.error('Error al crear localidades por defecto:', ticketError);
        showToast('Evento creado, pero hubo un error al crear localidades. Agrégalas manualmente.', 'error');
      }
    }

    window.closeEventModal();
    await loadAllData();

  } catch (error) {
    console.error('Save error:', error);
    showToast('Error: ' + (error as Error).message, 'error');
  }
}

window.editEvent = function(eventId: number) {
  window.openEventModal(eventId);
};

window.manageTickets = function(eventId: number) {
  // Redirigir a una página de gestión de localidades
  window.location.href = `/admin-tickets.html?eventId=${eventId}`;
};

window.deleteEvent = async function(eventId: number) {
  if (!confirm('¿Eliminar este evento? Esta acción no se puede deshacer.')) return;

  try {
    await eventsApi.delete(eventId);
    showToast('Evento eliminado', 'success');
    await loadAllData();
  } catch (error) {
    console.error('Delete error:', error);
    showToast('Error: ' + (error as Error).message, 'error');
  }
};

function updateOrdersStats() {
  const total = allOrders.length;
  const pending = allOrders.filter(o => o.status === 'pending').length;
  const confirmed = allOrders.filter(o => o.status === 'confirmed').length;

  const totalElement = document.getElementById('totalOrders');
  const pendingElement = document.getElementById('pendingOrders');
  const confirmedElement = document.getElementById('confirmedOrders');

  if (totalElement) totalElement.textContent = total.toString();
  if (pendingElement) pendingElement.textContent = pending.toString();
  if (confirmedElement) confirmedElement.textContent = confirmed.toString();
}

function renderOrders() {
  const list = document.getElementById('ordersList');
  
  if (!list) return;
  
  let orders = allOrders;

  if (currentFilter !== 'all') {
    orders = orders.filter(o => o.status === currentFilter);
  }

  if (orders.length === 0) {
    list.innerHTML = '<div class="empty-state">No hay órdenes</div>';
    return;
  }

  list.innerHTML = orders.map(order => `
    <div class="order-row">
      <div class="order-info">
        <h4>#${order.order_number}</h4>
        <p>${order.user_name}</p>
        <p>${order.user_email}</p>
        <p>${new Date(order.created_at).toLocaleString('es-CO')}</p>
      </div>
      <div class="order-info">
        <p style="font-weight:700;color:var(--cyan)">${formatPrice(order.amount)}</p>
        <p>Ref: ${order.payment_ref || 'N/A'}</p>
        <span class="order-status ${order.status}">${
          order.status === 'pending' ? 'Pendiente' :
          order.status === 'confirmed' ? 'Confirmada' : 'Rechazada'
        }</span>
      </div>
      <div class="order-actions">
        ${order.status === 'pending' ? `
          <button class="action-btn confirm" onclick="window.confirmOrder('${order.id}')">Confirmar</button>
          <button class="action-btn reject" onclick="window.rejectOrder('${order.id}')">Rechazar</button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

window.confirmOrder = async function(orderId: string) {
  const numericOrderId = Number(orderId); // 👈 conversión aquí

  if (!confirm('¿Confirmar esta orden?')) return;

  try {
    // 1️⃣ Confirmar estado
    await ordersApi.updateStatus(numericOrderId, 'confirmed');

    // 2️⃣ Traer la orden completa con sus items
   const order: any = await ordersApi.getById(numericOrderId);

    // 3️⃣ Descontar disponibilidad de boletas
    for (const item of order.items) {
      try {
        await ticketsApi.decreaseAvailability(item.ticketId, item.quantity);
      } catch (error) {
        console.error('Error descontando boletas:', error);
      }
    }

    showToast('Orden confirmada', 'success');
    await loadAllData();
  } catch (error) {
    showToast('Error: ' + (error as Error).message, 'error');
  }
};

window.rejectOrder = async function(orderId: string) {
  const numericOrderId = Number(orderId);

  if (!confirm('¿Rechazar esta orden?')) return;

  try {
    await ordersApi.updateStatus(numericOrderId, 'rejected');

    showToast('Orden rechazada', 'error');
    await loadAllData();

  } catch (error) {
    showToast('Error: ' + (error as Error).message, 'error');
  }
};


function setupTabs() {
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      const tabElement = document.getElementById(`tab-${(tab as HTMLElement).dataset.tab}`);
      if (tabElement) {
        tabElement.classList.add('active');
      }
      currentTab = (tab as HTMLElement).dataset.tab || 'events';
    });
  });

  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = (tab as HTMLElement).dataset.filter || 'all';
      renderOrders();
    });
  });
}

function setupForms() {
  const eventForm = document.getElementById('eventForm');
  if (eventForm) {
    eventForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveEvent(new FormData(e.target as HTMLFormElement));
    });
  }

  const addEventBtn = document.getElementById('addEventBtn');
  if (addEventBtn) {
    addEventBtn.addEventListener('click', () => {
      window.openEventModal();
    });
  }

  const closeModal = document.getElementById('closeModal');
  if (closeModal) {
    closeModal.addEventListener('click', window.closeEventModal);
  }
  
  const eventModal = document.getElementById('eventModal');
  if (eventModal) {
    eventModal.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'eventModal') {
        window.closeEventModal();
      }
    });
  }
}

function showToast(message: string, type: 'success' | 'error' = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Declaraciones globales para TypeScript
declare global {
  interface Window {
    openEventModal: (eventId?: number | null) => void;
    closeEventModal: () => void;
    editEvent: (eventId: number) => void;
    manageTickets: (eventId: number) => void;
    deleteEvent: (eventId: number) => void;
    confirmOrder: (orderId: string) => void;
    rejectOrder: (orderId: string) => void;
  }
}

// Inicialización
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}
