-- ============================================
-- CONFIGURACIÓN COMPLETA DE SUPABASE
-- Para TuBoleta - Sistema de Venta de Eventos
-- ============================================

-- 1. CREAR TABLAS
-- ============================================

-- Tabla de eventos
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  image TEXT,
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  date_day TEXT NOT NULL,
  date_month TEXT NOT NULL,
  date_full TEXT NOT NULL,
  time TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de tickets (tipos de boletas por evento)
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  price INTEGER NOT NULL,
  color TEXT NOT NULL,
  available INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de órdenes de compra
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  payment_ref TEXT,
  provider TEXT,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, confirmed, rejected
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_phone TEXT,
  payment_method TEXT NOT NULL, -- card, transfer
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ
);

-- Tabla de items de cada orden (detalle de tickets comprados)
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES events(id),
  event_name TEXT NOT NULL,
  ticket_type TEXT NOT NULL,
  ticket_color TEXT,
  quantity INTEGER NOT NULL,
  price INTEGER NOT NULL
);

-- Tabla de usuarios administradores
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin', -- admin, superadmin
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Tabla de pagos con tarjeta
CREATE TABLE IF NOT EXISTS card_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_phone TEXT,
  card_last_four TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_payments ENABLE ROW LEVEL SECURITY;

-- 3. CREAR POLÍTICAS DE SEGURIDAD
-- ============================================

-- POLÍTICAS PARA EVENTOS
-- Lectura pública (cualquiera puede ver eventos)
DROP POLICY IF EXISTS "Public read events" ON events;
CREATE POLICY "Public read events" 
  ON events FOR SELECT 
  USING (true);

-- Solo admins pueden crear eventos
DROP POLICY IF EXISTS "Admin insert events" ON events;
CREATE POLICY "Admin insert events" 
  ON events FOR INSERT 
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Solo admins pueden actualizar eventos
DROP POLICY IF EXISTS "Admin update events" ON events;
CREATE POLICY "Admin update events" 
  ON events FOR UPDATE 
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Solo admins pueden eliminar eventos
DROP POLICY IF EXISTS "Admin delete events" ON events;
CREATE POLICY "Admin delete events" 
  ON events FOR DELETE 
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- POLÍTICAS PARA TICKETS
-- Lectura pública
DROP POLICY IF EXISTS "Public read tickets" ON tickets;
CREATE POLICY "Public read tickets" 
  ON tickets FOR SELECT 
  USING (true);

-- Solo admins pueden crear tickets
DROP POLICY IF EXISTS "Admin insert tickets" ON tickets;
CREATE POLICY "Admin insert tickets" 
  ON tickets FOR INSERT 
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Solo admins pueden actualizar tickets
DROP POLICY IF EXISTS "Admin update tickets" ON tickets;
CREATE POLICY "Admin update tickets" 
  ON tickets FOR UPDATE 
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Solo admins pueden eliminar tickets
DROP POLICY IF EXISTS "Admin delete tickets" ON tickets;
CREATE POLICY "Admin delete tickets" 
  ON tickets FOR DELETE 
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- POLÍTICAS PARA ÓRDENES
-- Cualquiera puede crear órdenes (comprar)
DROP POLICY IF EXISTS "Public insert orders" ON orders;
CREATE POLICY "Public insert orders" 
  ON orders FOR INSERT 
  WITH CHECK (true);

-- Admins pueden ver todas las órdenes
DROP POLICY IF EXISTS "Admin read orders" ON orders;
CREATE POLICY "Admin read orders" 
  ON orders FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Solo admins pueden actualizar órdenes
DROP POLICY IF EXISTS "Admin update orders" ON orders;
CREATE POLICY "Admin update orders" 
  ON orders FOR UPDATE 
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- POLÍTICAS PARA ORDER_ITEMS
-- Cualquiera puede insertar items (al comprar)
DROP POLICY IF EXISTS "Public insert order_items" ON order_items;
CREATE POLICY "Public insert order_items" 
  ON order_items FOR INSERT 
  WITH CHECK (true);

-- Lectura para admins
DROP POLICY IF EXISTS "Admin read order_items" ON order_items;
CREATE POLICY "Admin read order_items" 
  ON order_items FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- POLÍTICAS PARA ADMIN_USERS
-- Solo el propio admin puede ver su registro
DROP POLICY IF EXISTS "Admin read own record" ON admin_users;
CREATE POLICY "Admin read own record" 
  ON admin_users FOR SELECT 
  USING (user_id = auth.uid());

-- POLÍTICAS PARA CARD_PAYMENTS
-- Cualquiera puede insertar (al pagar con tarjeta)
DROP POLICY IF EXISTS "Public insert card_payments" ON card_payments;
CREATE POLICY "Public insert card_payments" 
  ON card_payments FOR INSERT 
  WITH CHECK (true);

-- Solo admins pueden leer pagos
DROP POLICY IF EXISTS "Admin read card_payments" ON card_payments;
CREATE POLICY "Admin read card_payments" 
  ON card_payments FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- 4. INSERTAR DATOS DE PRUEBA
-- ============================================

-- Eventos de ejemplo
INSERT INTO events (title, image, venue, city, category, price, date_day, date_month, date_full, time, description) VALUES
('Festival Estéreo Picnic 2026', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800', 'Parque Simón Bolívar', 'Bogotá', 'festival', 380000, '21', 'MAR', '21-23 Marzo 2026', '12:00 PM', 'El festival de música más grande de Colombia'),
('Coldplay: Music of the Spheres', 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800', 'Estadio El Campín', 'Bogotá', 'concierto', 250000, '15', 'ABR', '15 Abril 2026', '7:00 PM', 'Tour mundial de Coldplay llega a Colombia'),
('Hamilton - El Musical', 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800', 'Teatro Colón', 'Bogotá', 'teatro', 180000, '10', 'MAY', '10-30 Mayo 2026', '8:00 PM', 'El aclamado musical de Broadway'),
('Colombia vs Argentina', 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800', 'Estadio Metropolitano', 'Barranquilla', 'deportes', 120000, '05', 'JUN', '5 Junio 2026', '5:00 PM', 'Eliminatorias Mundial 2026'),
('Rock al Parque 2026', 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800', 'Parque Simón Bolívar', 'Bogotá', 'festival', 0, '15', 'JUL', '15-17 Julio 2026', '2:00 PM', 'Festival gratuito de rock más grande de Latinoamérica'),
('Maluma en Concierto', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800', 'Movistar Arena', 'Bogotá', 'concierto', 180000, '20', 'AGO', '20 Agosto 2026', '8:00 PM', 'Papi Juancho World Tour')
ON CONFLICT DO NOTHING;

-- Tickets para cada evento
INSERT INTO tickets (event_id, type, price, color, available) VALUES
-- Festival Estéreo Picnic
(1, 'Pase 1 Día', 380000, '#00b4d8', 100),
(1, 'Pase 3 Días', 850000, '#f59e0b', 50),
(1, 'VIP 3 Días', 1500000, '#ef4444', 20),
-- Coldplay
(2, 'General', 250000, '#22c55e', 200),
(2, 'Preferencial', 450000, '#00b4d8', 100),
(2, 'VIP', 750000, '#f59e0b', 30),
-- Hamilton
(3, 'Balcón', 180000, '#22c55e', 80),
(3, 'Platea', 280000, '#00b4d8', 60),
(3, 'Palco VIP', 450000, '#ef4444', 20),
-- Colombia vs Argentina
(4, 'Oriental', 120000, '#22c55e', 500),
(4, 'Occidental', 150000, '#00b4d8', 300),
(4, 'Norte VIP', 280000, '#f59e0b', 100),
-- Rock al Parque (Gratis)
(5, 'Entrada Gratuita', 0, '#22c55e', 50000),
-- Maluma
(6, 'General', 180000, '#22c55e', 1000),
(6, 'Preferencial', 300000, '#00b4d8', 300)
ON CONFLICT DO NOTHING;

-- 5. CREAR ÍNDICES PARA MEJORAR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date_day);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(user_email);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

-- ============================================
-- INSTRUCCIONES PARA CREAR USUARIO ADMIN
-- ============================================
-- 
-- IMPORTANTE: Después de ejecutar este SQL:
--
-- 1. Ve a Authentication > Users en el panel de Supabase
-- 2. Haz clic en "Add user" > "Create new user"
-- 3. Ingresa:
--    - Email: admin@tuboleta.com (o el que prefieras)
--    - Password: (tu contraseña segura)
--    - Auto Confirm User: ✅ ACTIVADO
--
-- 4. Una vez creado el usuario, copia su UUID
-- 5. Ejecuta este SQL reemplazando YOUR_USER_UUID:
--
-- INSERT INTO admin_users (user_id, email, role) 
-- VALUES ('YOUR_USER_UUID', 'admin@tuboleta.com', 'superadmin');
--
-- Ahora podrás iniciar sesión en /admin-login.html
-- ============================================
