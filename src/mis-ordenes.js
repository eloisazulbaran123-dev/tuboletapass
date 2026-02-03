import { auth } from './supabase.ts';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const container = document.getElementById('ordersContainer');

  // 🔐 Verificar sesión
  const session = await auth.getSession();
  if (!session) {
    alert('Debes iniciar sesión');
    window.location.href = '/login.html';
    return;
  }

  const userEmail = session.user.email;

  // 📦 Órdenes guardadas localmente
  const cardOrders = JSON.parse(localStorage.getItem('tuboleta-card-payments') || '[]');
  const pendingOrders = JSON.parse(localStorage.getItem('tuboleta-pending') || '[]');

  // 🔎 Filtrar solo las del usuario
  let orders = [...cardOrders, ...pendingOrders]
    .filter(o => o.email === userEmail)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!orders.length) {
    container.innerHTML = '<p>No tienes órdenes todavía</p>';
    return;
  }

  renderOrders(orders);
}

function renderOrders(orders) {
  const container = document.getElementById('ordersContainer');

  container.innerHTML = orders.map(order => `
    <div class="order-card">
      <h3>Orden #${order.order}</h3>
      <p><strong>Fecha:</strong> ${new Date(order.date).toLocaleString()}</p>
      <p><strong>Total:</strong> $${Number(order.amount).toLocaleString('es-CO')}</p>
      <p><strong>Estado:</strong> ${order.status === 'completed' ? '✅ Pagada' : '🕒 Pendiente'}</p>
      <p><strong>Método:</strong> ${order.paymentMethod}</p>
      ${order.ref ? `<p><strong>Referencia:</strong> ${order.ref}</p>` : ''}

      <div style="margin-top:10px;">
        ${order.items.map(item => `
          <div style="padding:6px 0;border-top:1px solid #eee;">
            🎟 ${item.eventName} — ${item.ticketType} x${item.quantity}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}
