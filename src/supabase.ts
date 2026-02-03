import { createClient } from '@supabase/supabase-js'
//port type { User as SupabaseUser } from '@supabase/auth-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// TYPES
// ============================================
export interface Event {
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
  created_at?: string;
}

export interface Ticket {
  id: number;
  event_id: number;
  type: string;
  price: number;
  quantity: number;
  available: number;
  created_at?: string;
}

export interface Order {
  id: number;
  user_id: string;
  event_id: number;
  tickets: any;
  total_amount: number;
  status: string;
  payment_method?: string;
  payment_reference?: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  user_metadata?: any;
  [key: string]: any;
}

interface AdminUser {
  id: number;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

// ============================================
// AUTENTICACIÓN (UNIFICADA)
// ============================================
export const auth = {
  // Obtener usuario actual
  // Obtener usuario actual (normalizado)
async getUser(): Promise<{
  id: string;
  email: string;
  name: string;
  phone: string;
} | null> {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Error getting user:', error);
    return null;
  }

  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? '',
    name: user.user_metadata?.name ?? '',
    phone: user.user_metadata?.phone ?? ''
  };
},

// Alias para compatibilidad con código de clientes
async getUserData() {
  return this.getUser();
},


  // Obtener sesión actual (normalizada)
async getSession(): Promise<{
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    phone: string;
  };
} | null> {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Error getting session:', error);
    return null;
  }

  if (!session) return null;

  return {
    access_token: session.access_token,
    user: {
      id: session.user.id,
      email: session.user.email ?? '',
      name: session.user.user_metadata?.name ?? '',
      phone: session.user.user_metadata?.phone ?? ''
    }
  };
},


  // Login con email y contraseña (para admin - con verificación)
  async signInAdmin(email: string, password: string): Promise<{ user: any; error: any }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return { user: null, error };
    }

    // Verificar que el usuario sea admin
    const normalizedUser = data.user
  ? {
      id: data.user.id,
      email: data.user.email ?? '',
      name: data.user.user_metadata?.name ?? '',
      phone: data.user.user_metadata?.phone ?? ''
    }
  : null;

    const isAdmin = normalizedUser ? await this.isAdmin(normalizedUser) : false;
    if (!isAdmin) {
      await this.signOut();
      return { 
        user: null, 
        error: { message: 'No tienes permisos de administrador' }
      };
    }

   return { user: data.user ?? null, error: null };
  },

  // Login simple para clientes (sin verificación de admin)
  async signIn(email: string, password: string): Promise<any> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  // Registro de nuevo usuario
  async signUp(email: string, password: string, metadata?: any): Promise<any> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    if (error) throw error;
    return data;
  },

  // Cerrar sesión
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  // Restablecer contraseña
  async resetPassword(email: string): Promise<any> {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`
    });
    if (error) throw error;
    return data;
  },

  // Escuchar cambios en autenticación
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },

  // Verificar si es admin
  async isAdmin(user?: User | null): Promise<boolean> {
    const currentUser = user || await this.getUser();
    if (!currentUser) return false;

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', currentUser.id)
        .single();

      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }

      return data?.role === 'admin' || data?.role === 'superadmin';
    } catch (error) {
      console.error('Error in isAdmin:', error);
      return false;
    }
  },

  // Obtener datos del admin
  async getAdminData(): Promise<AdminUser | null> {
    const user = await this.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error getting admin data:', error);
      return null;
    }

    return data;
  }
};

// ============================================
// EVENTS API
// ============================================
export const eventsApi = {
  async getAll(): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      throw error;
    }

    return data || [];
  },

  async getById(id: number): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching event:', error);
      return null;
    }

    return data;
  },

  async getByCity(city: string): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('city', city)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events by city:', error);
      throw error;
    }

    return data || [];
  },

  async getByCategory(category: string): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events by category:', error);
      throw error;
    }

    return data || [];
  },

  async create(eventData: Omit<Event, 'id' | 'created_at'>): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .insert([eventData])
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      throw error;
    }

    // Crear tickets por defecto
    if (data) {
      await ticketsApi.createDefaults(data.id);
    }

    return data;
  },

  async update(id: number, eventData: Partial<Event>): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .update(eventData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      throw error;
    }

    return data;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }
};

// ============================================
// TICKETS API
// ============================================
export const ticketsApi = {
  async getByEventId(eventId: number): Promise<Ticket[]> {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('event_id', eventId)
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching tickets:', error);
      return [];
    }

    return data || [];
  },

  async createDefaults(eventId: number): Promise<void> {
    const defaultTickets = [
      { event_id: eventId, type: 'General', price: 50000, quantity: 100, available: 100, color: '#60a5fa' },
      { event_id: eventId, type: 'VIP', price: 100000, quantity: 50, available: 50, color: '#fbbf24' },
      { event_id: eventId, type: 'Platea', price: 75000, quantity: 75, available: 75, color: '#34d399' }
    ];

    const { error } = await supabase
      .from('tickets')
      .insert(defaultTickets);

    if (error) {
      console.error('Error creating default tickets:', error);
      throw error;
    }
  },

  async create(ticketData: any): Promise<Ticket> {
    const { data, error } = await supabase
      .from('tickets')
      .insert([ticketData])
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }

    return data;
  },

  async update(id: number, ticketData: Partial<Ticket>): Promise<Ticket> {
    const { data, error } = await supabase
      .from('tickets')
      .update(ticketData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }

    return data;
  },

  async decreaseAvailability(id: number, quantity: number): Promise<void> {
    const { error } = await supabase.rpc('decrease_ticket_availability', {
      ticket_id: id,
      decr_quantity: quantity
    });

    if (error) {
      console.error('Error decreasing ticket availability:', error);
      throw error;
    }
  }
};

// ============================================
// ORDERS API
// ============================================
export const ordersApi = {
  async create(orderData: Omit<Order, 'id' | 'created_at'>): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (error) {
      console.error('Error creating order:', error);
      throw error;
    }

    return data;
  },

  async getByUserId(userId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        events (title, image, venue)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user orders:', error);
      return [];
    }

    return data || [];
  },

  async getAll(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        events (title, image, venue)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all orders:', error);
      return [];
    }

    return data || [];
  },

  async getById(orderId: number): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items (
        ticketId: ticket_id,
        quantity
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    console.error('Error fetching order by id:', error);
    throw error;
  }

  return data;
},

  async updateStatus(id: number, status: string): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating order status:', error);
      throw error;
    }

    return data;
  }
};

// ============================================
// UTILITIES
// ============================================
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
