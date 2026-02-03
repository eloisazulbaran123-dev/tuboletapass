import { auth, supabase } from './supabase.ts';

// Estado global
let cartItem = null;
let selectedPaymentMethod = null;
let selectedProvider = null;

// Inicializar checkout
async function init() {

  // ===== VERIFICAR AUTENTICACIÓN =====
  try {
    const session = await auth.getSession();
    if (!session) {
      console.log('❌ Usuario no autenticado');
      localStorage.setItem('redirect-after-login', window.location.pathname);
      alert('Debes iniciar sesión para continuar con la compra');
      window.location.href = '/login.html';
      return;
    }
    console.log('✅ Usuario autenticado');
  } catch (error) {
    console.error('Error verificando sesión:', error);
    localStorage.setItem('redirect-after-login', window.location.pathname);
    window.location.href = '/login.html';
    return;
  }
  // ===== FIN VERIFICACIÓN =====

  // Cargar carrito
  const cart = localStorage.getItem('tuboleta-cart');
  if (!cart) {
    showEmptyCart();
    return;
  }

  try {
    cartItem = JSON.parse(cart);
    renderCart();
    renderSummary();
    setupPaymentMethods();
    setupProviders();
    setupPayButton();
    
    // Pre-llenar datos del usuario si está logueado
    await prefillUserData();
  } catch (error) {
    console.error('Error al inicializar checkout:', error);
    showEmptyCart();
  }
}

// Pre-llenar datos del usuario
async function prefillUserData() {
  try {
    const userData = await auth.getUserData();
    if (userData) {
      // Pre-llenar email
      const emailInput = document.getElementById('email');
      if (emailInput && userData.email) {
        emailInput.value = userData.email;
        emailInput.readOnly = true; // Bloquear si está logueado
      }

      // Pre-llenar nombre si está disponible
      const nameInput = document.getElementById('name');
      if (nameInput && userData.user_metadata?.full_name) {
        nameInput.value = userData.user_metadata.full_name;
      }

      // Pre-llenar teléfono si está disponible
      const phoneInput = document.getElementById('phone');
      if (phoneInput && userData.user_metadata?.phone) {
        phoneInput.value = userData.user_metadata.phone;
      }

      console.log('✅ Datos del usuario pre-llenados');
    }
  } catch (error) {
    console.log('Usuario no logueado, usando formulario vacío');
  }
}

// Renderizar carrito
function renderCart() {
  if (!cartItem) return;

  const cartContainer = document.getElementById('cartItems');
  if (!cartContainer) return;

  cartContainer.innerHTML = `
    <div class="order-item">
      <img src="${cartItem.eventImage}" alt="${cartItem.eventName}">
      <div class="order-item-info">
        <h4>${cartItem.eventName}</h4>
        <p>${cartItem.eventVenue}</p>
        <p>${cartItem.eventDate}</p>
        <p style="color:var(--cyan);font-weight:600;margin-top:0.5rem;">${cartItem.ticketType}</p>
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

  // Items en resumen
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
  
  if (paymentMethods.length === 0) {
    console.warn('⚠️ No se encontraron métodos de pago');
    // Reintentar después de un pequeño delay
    setTimeout(setupPaymentMethods, 100);
    return;
  }

  console.log('✅ Configurando', paymentMethods.length, 'métodos de pago');

  paymentMethods.forEach(method => {
    method.addEventListener('click', () => {
      console.log('🔄 Método seleccionado:', method.dataset.method);
      
      // Remover selección anterior
      document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
      
      // Seleccionar nuevo
      method.classList.add('selected');
      selectedPaymentMethod = method.dataset.method;

      // Mostrar/ocultar formularios
      const cardForm = document.getElementById('cardForm');
      const transferForm = document.getElementById('transferForm');

      if (selectedPaymentMethod === 'card') {
        if (cardForm) {
          cardForm.classList.remove('hidden');
          cardForm.style.display = 'block';
        }
        if (transferForm) {
          transferForm.classList.add('hidden');
          transferForm.style.display = 'none';
        }
        selectedProvider = null;
      } else {
        if (cardForm) {
          cardForm.classList.add('hidden');
          cardForm.style.display = 'none';
        }
        if (transferForm) {
          transferForm.classList.remove('hidden');
          transferForm.style.display = 'block';
        }
      }
    });
  });
}

// Setup proveedores
function setupProviders() {
  const providers = document.querySelectorAll('.provider-option');
  
  if (providers.length === 0) {
    console.warn('⚠️ No se encontraron proveedores');
    // Reintentar después de un pequeño delay
    setTimeout(setupProviders, 100);
    return;
  }

  console.log('✅ Configurando', providers.length, 'proveedores');

  providers.forEach(provider => {
    provider.addEventListener('click', () => {
      console.log('💳 Proveedor seleccionado:', provider.dataset.provider);
      
      // Remover selección anterior
      document.querySelectorAll('.provider-option').forEach(p => p.classList.remove('selected'));
      
      // Seleccionar nuevo
      provider.classList.add('selected');
      selectedProvider = provider.dataset.provider;
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
      console.error('Error al procesar pago:', error);
      alert('Error al procesar el pago. Por favor intenta nuevamente.');
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

    // Validación básica de tarjeta
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

// Procesar pago con tarjeta
async function processCardPayment() {
  const orderNumber = generateOrderNumber();
  
  // Obtener email del usuario logueado o del formulario
  let userEmail = document.getElementById('email').value;
  try {
    const userData = await auth.getUserData();
    if (userData && userData.email) {
      userEmail = userData.email;
    }
  } catch (error) {
    console.log('Usuario no logueado, usando email del formulario');
  }

  const orderData = {
    order: orderNumber,
    email: userEmail,  // ← Email del usuario
    name: document.getElementById('name').value,
    phone: document.getElementById('phone').value,
    amount: cartItem.total,
    items: [{
      eventName: cartItem.eventName,
      eventImage: cartItem.eventImage,
      ticketType: cartItem.ticketType,
      quantity: cartItem.quantity,
      subtotal: cartItem.subtotal
    }],
    status: 'completed',
    date: new Date().toISOString(),
    paymentMethod: 'card',
    cardLastFour: document.getElementById('cardNumber').value.slice(-4)
  };

  // Guardar en localStorage
  const cardPayments = JSON.parse(localStorage.getItem('tuboleta-card-payments') || '[]');
  cardPayments.push(orderData);
  localStorage.setItem('tuboleta-card-payments', JSON.stringify(cardPayments));

  // Limpiar carrito
  localStorage.removeItem('tuboleta-cart');

  // Mostrar éxito
  // Guardar orden pagada
localStorage.setItem('tuboleta-last-order', JSON.stringify({
  order: orderNumber,
  ref: null,
  amount: cartItem.total,
  status: 'paid'
}));

// Ir a pantalla de confirmación
window.location.href = '/confirmacion.html';

}

// Procesar pago con transferencia/billetera
async function processTransferPayment() {
  const orderNumber = generateOrderNumber();
  const referenceNumber = generateReferenceNumber();

  // 🔹 Obtener email del usuario logueado o del formulario
  let userEmail = document.getElementById('email').value;

  try {
    const userData = await auth.getUserData();
    if (userData && userData.email) {
      userEmail = userData.email;
    }
  } catch (e) {
    console.log('Usuario no logueado, usando email del formulario');
  }

  // 🧾 GUARDAR ORDEN EN SUPABASE
try {
  const userData = await auth.getUserData();
  const userEmail = userData?.email || document.getElementById('email').value;

  const { error } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      payment_ref: referenceNumber,
      provider: selectedProvider,
      amount: cartItem.total,
      status: 'pending',
      user_email: userEmail,
      user_name: document.getElementById('name').value,
      user_phone: document.getElementById('phone').value,
      payment_met: 'transfer'
    });

  if (error) {
    console.error('❌ Error guardando orden en BD:', error);
  } else {
    console.log('✅ Orden guardada en Supabase');
  }

} catch (err) {
  console.error('❌ Error general guardando orden:', err);
}
  // 💾 GUARDAR DATOS PARA LA PÁGINA DE CONFIRMACIÓN
  localStorage.setItem('tuboleta-last-order', JSON.stringify({
    order: orderNumber,
    ref: referenceNumber,
    amount: cartItem.total,
    status: 'pending'
  }));

  // 🛒 LIMPIAR CARRITO
  localStorage.removeItem('tuboleta-cart');

  // 🚀 IR A LA PANTALLA DE CONFIRMACIÓN
  window.location.href = '/confirmacion.html';
}

// Generar número de orden
function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `TB-${timestamp}${random}`;
}

// Generar número de referencia
function generateReferenceNumber() {
  return Math.floor(100000000 + Math.random() * 900000000).toString();
}

// Mostrar éxito
function showSuccess(orderNumber) {
  document.getElementById('checkoutStep').classList.add('hidden');
  document.getElementById('pendingStep').classList.add('hidden');
  document.getElementById('successStep').classList.remove('hidden');
  document.getElementById('successOrder').textContent = orderNumber;
}

// Mostrar carrito vacío
function showEmptyCart() {
  const container = document.querySelector('.checkout-page .container');
  if (!container) return;

  container.innerHTML = `
    <div class="empty-cart">
      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.3;margin-bottom:1.5rem;">
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

// Formatear precio
function formatPrice(price) {
  return '$' + Math.round(price).toLocaleString('es-CO');
}

// Auto-format card number
const cardNumberInput = document.getElementById('cardNumber');
if (cardNumberInput) {
  cardNumberInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\s/g, '');
    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
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

// Copiar referencia
window.copyReference = function() {
  const ref = document.getElementById('pendingRef').textContent;
  navigator.clipboard.writeText(ref).then(() => {
    alert('Referencia copiada');
  }).catch(err => {
    console.error('Error al copiar:', err);
  });
};

// Inicializar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
