export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      adjustment_history: {
        Row: {
          adjusted_by: string | null
          adjustment_notes: string
          created_at: string
          id: string
          measurement_id: string | null
          order_id: string
        }
        Insert: {
          adjusted_by?: string | null
          adjustment_notes: string
          created_at?: string
          id?: string
          measurement_id?: string | null
          order_id: string
        }
        Update: {
          adjusted_by?: string | null
          adjustment_notes?: string
          created_at?: string
          id?: string
          measurement_id?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adjustment_history_adjusted_by_fkey"
            columns: ["adjusted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_history_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_interactions: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          id: string
          interaction_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          id?: string
          interaction_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          interaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_interactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          discount_percentage: number | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          preferred_store_id: string | null
          updated_at: string
          vip_status: Database["public"]["Enums"]["vip_status"]
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          discount_percentage?: number | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          preferred_store_id?: string | null
          updated_at?: string
          vip_status?: Database["public"]["Enums"]["vip_status"]
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          discount_percentage?: number | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          preferred_store_id?: string | null
          updated_at?: string
          vip_status?: Database["public"]["Enums"]["vip_status"]
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_preferred_store_id_fkey"
            columns: ["preferred_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          email: string
          hourly_rate: number | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          store_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          store_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          store_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      fitting_appointments: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          is_completed: boolean
          notes: string | null
          order_id: string
          scheduled_at: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          order_id: string
          scheduled_at: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          order_id?: string
          scheduled_at?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitting_appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitting_appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitting_appointments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          category: string
          cost: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          min_stock_level: number
          name: string
          price: number
          quantity: number
          sku: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          category: string
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_stock_level?: number
          name: string
          price: number
          quantity?: number
          sku: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_stock_level?: number
          name?: string
          price?: number
          quantity?: number
          sku?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_templates: {
        Row: {
          created_at: string
          fields: Json
          garment_type: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          fields?: Json
          garment_type: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          fields?: Json
          garment_type?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      measurement_versions: {
        Row: {
          ankle_round: number | null
          armhole: number | null
          back_neck_depth: number | null
          bc: number | null
          bicep_round: number | null
          blouse_length: number | null
          bottom_length: number | null
          bust: number | null
          bust_distance: number | null
          bust_point_length: number | null
          change_reason: string | null
          changed_by: string | null
          collar_round: number | null
          created_at: string
          custom_notes: string | null
          fc: number | null
          front_neck_depth: number | null
          full_length: number | null
          garment_type: string
          hip_round: number | null
          id: string
          knee_round: number | null
          measurement_id: string
          seat_round: number | null
          shoulder: number | null
          shoulder_balance: number | null
          skirt_length: number | null
          sleeve_round: number | null
          slit_length: number | null
          slit_width: number | null
          stomach_length: number | null
          stomach_round: number | null
          thigh_round: number | null
          version_number: number
          waist_round: number | null
          yoke_length: number | null
          yoke_round: number | null
        }
        Insert: {
          ankle_round?: number | null
          armhole?: number | null
          back_neck_depth?: number | null
          bc?: number | null
          bicep_round?: number | null
          blouse_length?: number | null
          bottom_length?: number | null
          bust?: number | null
          bust_distance?: number | null
          bust_point_length?: number | null
          change_reason?: string | null
          changed_by?: string | null
          collar_round?: number | null
          created_at?: string
          custom_notes?: string | null
          fc?: number | null
          front_neck_depth?: number | null
          full_length?: number | null
          garment_type: string
          hip_round?: number | null
          id?: string
          knee_round?: number | null
          measurement_id: string
          seat_round?: number | null
          shoulder?: number | null
          shoulder_balance?: number | null
          skirt_length?: number | null
          sleeve_round?: number | null
          slit_length?: number | null
          slit_width?: number | null
          stomach_length?: number | null
          stomach_round?: number | null
          thigh_round?: number | null
          version_number?: number
          waist_round?: number | null
          yoke_length?: number | null
          yoke_round?: number | null
        }
        Update: {
          ankle_round?: number | null
          armhole?: number | null
          back_neck_depth?: number | null
          bc?: number | null
          bicep_round?: number | null
          blouse_length?: number | null
          bottom_length?: number | null
          bust?: number | null
          bust_distance?: number | null
          bust_point_length?: number | null
          change_reason?: string | null
          changed_by?: string | null
          collar_round?: number | null
          created_at?: string
          custom_notes?: string | null
          fc?: number | null
          front_neck_depth?: number | null
          full_length?: number | null
          garment_type?: string
          hip_round?: number | null
          id?: string
          knee_round?: number | null
          measurement_id?: string
          seat_round?: number | null
          shoulder?: number | null
          shoulder_balance?: number | null
          skirt_length?: number | null
          sleeve_round?: number | null
          slit_length?: number | null
          slit_width?: number | null
          stomach_length?: number | null
          stomach_round?: number | null
          thigh_round?: number | null
          version_number?: number
          waist_round?: number | null
          yoke_length?: number | null
          yoke_round?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "measurement_versions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_versions_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
        ]
      }
      measurements: {
        Row: {
          ankle_round: number | null
          armhole: number | null
          back_neck_depth: number | null
          bc: number | null
          bicep_round: number | null
          blouse_length: number | null
          bottom_length: number | null
          bust: number | null
          bust_distance: number | null
          bust_point_length: number | null
          collar_round: number | null
          created_at: string
          custom_notes: string | null
          diagram_url: string | null
          fc: number | null
          front_neck_depth: number | null
          full_length: number | null
          garment_type: string
          hip_round: number | null
          id: string
          is_primary: boolean
          knee_round: number | null
          materials_images: string[] | null
          materials_provided_by_customer: boolean
          order_id: string | null
          seat_round: number | null
          shoulder: number | null
          shoulder_balance: number | null
          skirt_length: number | null
          sleeve_round: number | null
          slit_length: number | null
          slit_width: number | null
          stomach_length: number | null
          stomach_round: number | null
          thigh_round: number | null
          updated_at: string
          waist_round: number | null
          yoke_length: number | null
          yoke_round: number | null
        }
        Insert: {
          ankle_round?: number | null
          armhole?: number | null
          back_neck_depth?: number | null
          bc?: number | null
          bicep_round?: number | null
          blouse_length?: number | null
          bottom_length?: number | null
          bust?: number | null
          bust_distance?: number | null
          bust_point_length?: number | null
          collar_round?: number | null
          created_at?: string
          custom_notes?: string | null
          diagram_url?: string | null
          fc?: number | null
          front_neck_depth?: number | null
          full_length?: number | null
          garment_type: string
          hip_round?: number | null
          id?: string
          is_primary?: boolean
          knee_round?: number | null
          materials_images?: string[] | null
          materials_provided_by_customer?: boolean
          order_id?: string | null
          seat_round?: number | null
          shoulder?: number | null
          shoulder_balance?: number | null
          skirt_length?: number | null
          sleeve_round?: number | null
          slit_length?: number | null
          slit_width?: number | null
          stomach_length?: number | null
          stomach_round?: number | null
          thigh_round?: number | null
          updated_at?: string
          waist_round?: number | null
          yoke_length?: number | null
          yoke_round?: number | null
        }
        Update: {
          ankle_round?: number | null
          armhole?: number | null
          back_neck_depth?: number | null
          bc?: number | null
          bicep_round?: number | null
          blouse_length?: number | null
          bottom_length?: number | null
          bust?: number | null
          bust_distance?: number | null
          bust_point_length?: number | null
          collar_round?: number | null
          created_at?: string
          custom_notes?: string | null
          diagram_url?: string | null
          fc?: number | null
          front_neck_depth?: number | null
          full_length?: number | null
          garment_type?: string
          hip_round?: number | null
          id?: string
          is_primary?: boolean
          knee_round?: number | null
          materials_images?: string[] | null
          materials_provided_by_customer?: boolean
          order_id?: string | null
          seat_round?: number | null
          shoulder?: number | null
          shoulder_balance?: number | null
          skirt_length?: number | null
          sleeve_round?: number | null
          slit_length?: number | null
          slit_width?: number | null
          stomach_length?: number | null
          stomach_round?: number | null
          thigh_round?: number | null
          updated_at?: string
          waist_round?: number | null
          yoke_length?: number | null
          yoke_round?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "measurements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          description: string
          id: string
          inventory_id: string | null
          is_custom_work: boolean
          measurement_id: string | null
          measurement_version_id: string | null
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          inventory_id?: string | null
          is_custom_work?: boolean
          measurement_id?: string | null
          measurement_version_id?: string | null
          order_id: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          inventory_id?: string | null
          is_custom_work?: boolean
          measurement_id?: string | null
          measurement_version_id?: string | null
          order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_measurement_version_id_fkey"
            columns: ["measurement_version_id"]
            isOneToOne: false
            referencedRelation: "measurement_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_settings: {
        Row: {
          code: string
          color: string
          created_at: string
          id: string
          is_active: boolean
          is_system: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          assigned_employee_id: string | null
          created_at: string
          customer_id: string
          deposit_amount: number
          discount_amount: number
          due_date: string | null
          id: string
          is_settled: boolean
          measurement_id: string | null
          measurement_version_id: string | null
          notes: string | null
          order_number: string
          remaining_balance: number
          status: Database["public"]["Enums"]["order_status"]
          store_id: string | null
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          assigned_employee_id?: string | null
          created_at?: string
          customer_id: string
          deposit_amount?: number
          discount_amount?: number
          due_date?: string | null
          id?: string
          is_settled?: boolean
          measurement_id?: string | null
          measurement_version_id?: string | null
          notes?: string | null
          order_number: string
          remaining_balance?: number
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string | null
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          assigned_employee_id?: string | null
          created_at?: string
          customer_id?: string
          deposit_amount?: number
          discount_amount?: number
          due_date?: string | null
          id?: string
          is_settled?: boolean
          measurement_id?: string | null
          measurement_version_id?: string | null
          notes?: string | null
          order_number?: string
          remaining_balance?: number
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string | null
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_measurement_version_id_fkey"
            columns: ["measurement_version_id"]
            isOneToOne: false
            referencedRelation: "measurement_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          order_id: string
          payment_type: string
          recorded_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          payment_type: string
          recorded_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          payment_type?: string
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          address: string
          city: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          opening_hours: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          opening_hours?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          opening_hours?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          order_id: string | null
          priority: number
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          order_id?: string | null
          priority?: number
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          order_id?: string | null
          priority?: number
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          store_id: string | null
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          store_id?: string | null
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vip_status_settings: {
        Row: {
          code: string
          color: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_authenticated_employee: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "store_manager" | "sales_associate" | "tailor"
      order_status:
        | "draft"
        | "pending"
        | "deposit_paid"
        | "materials_ordered"
        | "in_production"
        | "ready_for_fitting"
        | "ready_for_pickup"
        | "completed"
        | "cancelled"
      task_status: "pending" | "in_progress" | "completed"
      vip_status: "regular" | "silver" | "gold" | "platinum"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "store_manager", "sales_associate", "tailor"],
      order_status: [
        "draft",
        "pending",
        "deposit_paid",
        "materials_ordered",
        "in_production",
        "ready_for_fitting",
        "ready_for_pickup",
        "completed",
        "cancelled",
      ],
      task_status: ["pending", "in_progress", "completed"],
      vip_status: ["regular", "silver", "gold", "platinum"],
    },
  },
} as const
