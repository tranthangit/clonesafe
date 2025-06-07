import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file');
}

export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

export type User = {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  is_volunteer: boolean;
  is_admin: boolean;
  created_at: string;
};

export type SosRequest = {
  id: string;
  user_id: string;
  user: User;
  type: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  people_affected: number;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  status: 'active' | 'assigned' | 'resolved' | 'cancelled';
  volunteer_id?: string;
  volunteer?: User;
  created_at: string;
  updated_at: string;
};

export type SupportPoint = {
  id: string;
  name: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  contact_info: {
    phone?: string;
    email?: string;
    website?: string;
  };
  opening_hours: {
    open: string;
    close: string;
    days: number[];
  };
  services: string[];
  image_url?: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  sos_request_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

export type CommunityPost = {
  id: string;
  user_id: string;
  user: User;
  content: string;
  images?: string[];
  hashtags?: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
};

export type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  user: User;
  content: string;
  created_at: string;
};