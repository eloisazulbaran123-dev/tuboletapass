import { supabase, auth } from './supabase.ts';

const container = document.getElementById('ticketsContainer');

async function loadTickets() {
  try {
    const user = await auth.getUserData();
    if (!user || !user.email) {
      container.innerHTML = '<p>Debes iniciar sesión para ver tus boletas.</p>';
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_email', user.email)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      container.innerHTML = '<p>Error cargando boletas.</p>';
      return;
    }

    if (!data.length) {
      container.innerHTML = '<p>No tienes boletas confirmadas aún.</p>';
      return;
    }

    container.innerHTML = data.map(order => `
      <div class="ticket-card">
        <h3>🎫 Orden ${order.order_number}</h3>
        <p><strong>Monto:</strong> $${order.amount.toLocaleString()}</p>
        <p><strong>Proveedor:</strong> ${order.provider || 'N/A'}</p>
        <p><strong>Referencia:</strong> ${order.payment_ref || 'N/A'}</p>
        <p><strong>Fecha:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
      </div>
    `).join('');

  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Error cargando boletas.</p>';
  }
}

loadTickets();
