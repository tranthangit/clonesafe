export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          avatar_url: string | null
          phone: string | null
          is_volunteer: boolean
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          avatar_url?: string | null
          phone?: string | null
          is_volunteer?: boolean
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          avatar_url?: string | null
          phone?: string | null
          is_volunteer?: boolean
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sos_requests: {
        Row: {
          id: string
          user_id: string
          type: string
          description: string
          urgency: string
          people_affected: number
          location: Json
          status: string
          volunteer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          description: string
          urgency: string
          people_affected: number
          location: Json
          status?: string
          volunteer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          description?: string
          urgency?: string
          people_affected?: number
          location?: Json
          status?: string
          volunteer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      support_points: {
        Row: {
          id: string
          name: string
          description: string
          location: Json
          contact_info: Json
          opening_hours: Json
          services: string[]
          image_url: string | null
          verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          location: Json
          contact_info: Json
          opening_hours: Json
          services: string[]
          image_url?: string | null
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          location?: Json
          contact_info?: Json
          opening_hours?: Json
          services?: string[]
          image_url?: string | null
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          sos_request_id: string
          sender_id: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          sos_request_id: string
          sender_id: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          sos_request_id?: string
          sender_id?: string
          message?: string
          created_at?: string
        }
      }
      community_posts: {
        Row: {
          id: string
          user_id: string
          content: string
          images: string[] | null
          hashtags: string[] | null
          likes_count: number
          comments_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          images?: string[] | null
          hashtags?: string[] | null
          likes_count?: number
          comments_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          images?: string[] | null
          hashtags?: string[] | null
          likes_count?: number
          comments_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      post_comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
      }
      post_likes: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          created_at?: string
        }
      }
      user_activities: {
        Row: {
          id: string
          user_id: string
          activity_type: string
          related_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_type: string
          related_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_type?: string
          related_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
    }
  }
}