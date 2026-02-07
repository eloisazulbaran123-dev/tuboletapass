import { auth, supabase, ordersApi, formatPrice } from './supabase.ts';

// Estado global
let cartItem = null;
let selectedPaymentMethod = null;
let selectedProvider = null;
let currentUser = null;

// Inicializar checkout
async function init() {
  // ===== VERIFICAR AUTENTICACIÓN =====
  try {
    currentUser = await auth.getUser();
    
    if (!currentUser) {
      console.log('❌ Usuario no autenticado');
      localStorage.setItem('redirect-after-login', window.location.pathname);
      alert('Debes iniciar sesión para continuar con la compra');
      window.location.href = '/login.html';
      return;
    }
    console.log('✅ Usuario autenticado:', currentUser.email);
  } catch (error) {
    console.error('Error verificando sesión:', error);
    localStorage.setItem('redirect-after-login', window.location.pathname);
    window.location.href = '/login.html';
    return;
  }

  // Cargar carrito
  const cart = localStorage.getItem('tuboleta-cart');
  if (!cart) {
    showEmptyCart();
    return;
  }

  try {
    cartItem = JSON.parse(cart);
    console.log('🛒 Carrito cargado:', cartItem);
    
    renderCart();
    renderSummary();
    setupPaymentMethods();
    setupProviders();
    setupPayButton();
    await prefillUserData();
  } catch (error) {
    console.error('Error al inicializar checkout:', error);
    showEmptyCart();
  }
}

// Pre-llenar datos del usuario
async function prefillUserData() {
  if (!currentUser) return;

  const emailInput = document.getElementById('email');
  const nameInput = document.getElementById('name');
  const phoneInput = document.getElementById('phone');

  if (emailInput && currentUser.email) {
    emailInput.value = currentUser.email;
    emailInput.disabled = true;
  }

  if (nameInput && currentUser.name) {
    nameInput.value = currentUser.name;
  }

  if (phoneInput && currentUser.phone) {
    phoneInput.value = currentUser.phone;
  }

  console.log('✅ Datos del usuario pre-llenados');
}

// Renderizar carrito
function renderCart() {
  if (!cartItem) return;

  const cartContainer = document.getElementById('cartItems');
  if (!cartContainer) return;

  const eventImage = cartItem.eventImage || cartItem.image || '';
  const eventName = cartItem.eventName || cartItem.title || '';
  const eventVenue = cartItem.eventVenue || cartItem.venue || '';
  const eventDate = cartItem.eventDate || '';
  const ticketType = cartItem.ticketType || '';

  cartContainer.innerHTML = `
    <div class="order-item">
      <img src="${eventImage}" alt="${eventName}">
      <div class="order-item-info">
        <h4>${eventName}</h4>
        <p>${eventVenue}</p>
        <p>${eventDate}</p>
        <p style="color:var(--cyan);font-weight:600;margin-top:0.5rem;">${ticketType}</p>
      </div>
    </div>
  `;
}

// Renderizar resumen
function renderSummary() {
  if (!cartItem) return;

  const subtotal = cartItem.subtotal || 0;
  const fee = cartItem.serviceFee || 0;
  const total = cartItem.total || 0;

  document.getElementById('subtotal').textContent = formatPrice(subtotal);
  document.getElementById('fee').textContent = formatPrice(fee);
  document.getElementById('total').textContent = formatPrice(total);

  const summaryItems = document.getElementById('summaryItems');
  if (summaryItems) {
    summaryItems.innerHTML = `
      <div style="margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid var(--border);">
        <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;">
          <span style="font-weight:500;color:var(--blue);">${cartItem.ticketType}</span>
          <span style="color:var(--text-light);">x${cartItem.quantity}</span>
        </div>
        <div style="font-size:0.85rem;color:var(--text-light);">${cartItem.eventName}</div>
      </div>
    `;
  }
}

// Setup métodos de pago
function setupPaymentMethods() {
  const paymentMethods = document.querySelectorAll('.payment-method');
  
  paymentMethods.forEach(method => {
    method.addEventListener('click', () => {
      document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
      method.classList.add('selected');
      selectedPaymentMethod = method.dataset.method;

      const cardForm = document.getElementById('cardForm');
      const transferForm = document.getElementById('transferForm');

      if (selectedPaymentMethod === 'card') {
        cardForm?.classList.remove('hidden');
        transferForm?.classList.add('hidden');
        selectedProvider = null;
      } else {
        cardForm?.classList.add('hidden');
        transferForm?.classList.remove('hidden');
      }
    });
  });
}

// Setup proveedores
function setupProviders() {
  const providers = document.querySelectorAll('.provider-option');
  
  providers.forEach(provider => {
    provider.addEventListener('click', () => {
      document.querySelectorAll('.provider-option').forEach(p => p.classList.remove('selected'));
      provider.classList.add('selected');
      selectedProvider = provider.dataset.provider;
      console.log('💳 Proveedor seleccionado:', selectedProvider);
    });
  });
}

// Setup botón de pago
function setupPayButton() {
  const payBtn = document.getElementById('payBtn');
  if (!payBtn) return;

  payBtn.addEventListener('click', async () => {
    if (!validateForm()) return;
    
    payBtn.disabled = true;
    payBtn.textContent = 'Procesando...';

    try {
      if (selectedPaymentMethod === 'card') {
        await processCardPayment();
      } else {
        await processTransferPayment();
      }
    } catch (error) {
      console.error('❌ Error al procesar pago:', error);
      alert('Error al procesar el pago: ' + error.message);
      payBtn.disabled = false;
      payBtn.textContent = 'Pagar';
    }
  });
}

// Validar formulario
function validateForm() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();

  if (!name || !email || !phone) {
    alert('Por favor completa todos los campos obligatorios');
    return false;
  }

  if (!selectedPaymentMethod) {
    alert('Por favor selecciona un método de pago');
    return false;
  }

  if (selectedPaymentMethod === 'card') {
    const cardNumber = document.getElementById('cardNumber').value.trim();
    const cardExpiry = document.getElementById('cardExpiry').value.trim();
    const cardCvc = document.getElementById('cardCvc').value.trim();
    const cardName = document.getElementById('cardName').value.trim();

    if (!cardNumber || !cardExpiry || !cardCvc || !cardName) {
      alert('Por favor completa todos los datos de la tarjeta');
      return false;
    }

    if (cardNumber.replace(/\s/g, '').length < 15) {
      alert('Número de tarjeta inválido');
      return false;
    }
  } else {
    if (!selectedProvider) {
      alert('Por favor selecciona un proveedor de pago');
      return false;
    }
  }

  return true;
}

// Procesar pago con tarjeta - GUARDAR EN SUPABASE
async function processCardPayment() {
  const orderNumber = 'TB-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  
  const userName = document.getElementById('name').value.trim();
  const userPhone = document.getElementById('phone').value.trim();
  
  if (!userName) {
    alert('❌ Por favor ingresa tu nombre');
    throw new Error('Nombre requerido');
  }

  // Calcular totales CORRECTAMENTE
  const subtotal = parseInt(Math.round(cartItem.subtotal || (cartItem.total / 1.1)));
  const serviceFee = parseInt(Math.round(cartItem.serviceFee || (cartItem.total - subtotal)));
  const total = parseInt(Math.round(cartItem.total || 0));

  try {
    console.log('💳 Procesando pago con tarjeta...');
    console.log('📊 Totales calculados:', { subtotal, serviceFee, total });
    
    // GUARDAR EN SUPABASE usando ordersApi
    const orderData = {
      user_id: currentUser.id,
      user_email: currentUser.email,
      user_name: userName,
      event_id: parseInt(cartItem.eventId),
      tickets: {
        ticketType: cartItem.ticketType,
        quantity: cartItem.quantity,
        price: cartItem.price || cartItem.subtotal
      },
      amount: total,
      total_amount: total,
      payment_details: {
        subtotal: subtotal,
        serviceFee: serviceFee,
        total: total,
        ticketType: cartItem.ticketType,
        quantity: cartItem.quantity
      },
      status: 'completed',
      payment_method: 'card',
      payment_reference: orderNumber
    };

    console.log('📤 Guardando orden en Supabase:', orderData);
    
    const supabaseOrder = await ordersApi.create(orderData);
    
    console.log('✅ Orden guardada en Supabase con ID:', supabaseOrder.id);
    
    // Guardar en localStorage para página de confirmación
    localStorage.setItem('tuboleta-last-order', JSON.stringify({
      orderId: supabaseOrder.id,
      orderNumber: orderNumber,
      email: currentUser.email,
      name: userName,
      phone: userPhone,
      amount: total,
      status: 'completed',
      paymentMethod: 'card'
    }));

    // Limpiar carrito
    localStorage.removeItem('tuboleta-cart');

    console.log('✅ Redirigiendo a confirmación...');
    
    // Ir a confirmación
    window.location.href = '/confirmacion.html';
    
  } catch (error) {
    console.error('❌ Error guardando orden:', error);
    alert('Error al guardar la orden: ' + error.message);
    throw error;
  }
}

// Procesar pago con transferencia - GUARDAR EN SUPABASE
async function processTransferPayment() {
  const orderNumber = 'TB-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const referenceNumber = Math.floor(100000000 + Math.random() * 900000000).toString();

  const userName = document.getElementById('name').value.trim();
  const userPhone = document.getElementById('phone').value.trim();
  
  if (!userName) {
    alert('❌ Por favor ingresa tu nombre');
    throw new Error('Nombre requerido');
  }

  // Calcular totales CORRECTAMENTE
  const subtotal = parseInt(Math.round(cartItem.subtotal || (cartItem.total / 1.1)));
  const serviceFee = parseInt(Math.round(cartItem.serviceFee || (cartItem.total - subtotal)));
  const total = parseInt(Math.round(cartItem.total || 0));

  try {
    console.log('🏦 Procesando pago con transferencia...');
    console.log('📊 Totales calculados:', { subtotal, serviceFee, total });
    console.log('💳 Proveedor:', selectedProvider);
    
    // GUARDAR EN SUPABASE usando ordersApi
    const orderData = {
      user_id: currentUser.id,
      user_email: currentUser.email,
      user_name: userName,
      event_id: parseInt(cartItem.eventId),
      tickets: {
        ticketType: cartItem.ticketType,
        quantity: cartItem.quantity,
        price: cartItem.price || cartItem.subtotal
      },
      amount: total,
      total_amount: total,
      payment_details: {
        subtotal: subtotal,
        serviceFee: serviceFee,
        total: total,
        ticketType: cartItem.ticketType,
        quantity: cartItem.quantity,
        provider: selectedProvider
      },
      status: 'pending',
      payment_method: 'transfer',
      payment_reference: referenceNumber
    };

    console.log('📤 Guardando orden en Supabase:', orderData);
    
    const supabaseOrder = await ordersApi.create(orderData);
    
    console.log('✅ Orden guardada en Supabase con ID:', supabaseOrder.id);
    
    // Guardar en localStorage para página de confirmación
    localStorage.setItem('tuboleta-last-order', JSON.stringify({
      orderId: supabaseOrder.id,
      orderNumber: orderNumber,
      referenceNumber: referenceNumber,
      email: currentUser.email,
      name: userName,
      phone: userPhone,
      amount: total,
      status: 'pending',
      paymentMethod: 'transfer',
      provider: selectedProvider
    }));

    // Limpiar carrito
    localStorage.removeItem('tuboleta-cart');

    console.log('✅ Redirigiendo a confirmación...');
    
    // Ir a confirmación
    window.location.href = '/confirmacion.html';
    
  } catch (error) {
    console.error('❌ Error guardando orden:', error);
    alert('Error al guardar la orden: ' + error.message);
    throw error;
  }
}

// Mostrar carrito vacío
function showEmptyCart() {
  const container = document.querySelector('.checkout-page .container');
  if (!container) return;

  container.innerHTML = `
    <div class="empty-cart" style="text-align:center;padding:3rem 1rem;">
      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.3;margin:0 auto 1.5rem;">
        <circle cx="9" cy="21" r="1"/>
        <circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
      </svg>
      <h2 style="color:var(--blue);margin-bottom:0.5rem;">Tu carrito está vacío</h2>
      <p style="color:var(--text-light);margin-bottom:1.5rem;">Agrega eventos para continuar con tu compra</p>
      <a href="/" style="display:inline-block;padding:0.75rem 1.5rem;background:var(--cyan);color:white;text-decoration:none;border-radius:8px;font-weight:600;">Ver Eventos</a>
    </div>
  `;
}

// Auto-format card number
const cardNumberInput = document.getElementById('cardNumber');
if (cardNumberInput) {
  cardNumberInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\s/g, '');
    let formattedValue = value.match(/.{1,4}/g/)?.join(' ') || value;
    e.target.value = formattedValue;
  });
}

// Auto-format expiry
const cardExpiryInput = document.getElementById('cardExpiry');
if (cardExpiryInput) {
  cardExpiryInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    e.target.value = value;
  });
}

// Inicializar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
