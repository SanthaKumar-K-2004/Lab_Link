export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string;
          created_at: string | null;
          description: string | null;
          entity_id: string;
          entity_type: string;
          id: string;
          ip_address: string | null;
          new_values: Json | null;
          old_values: Json | null;
          performed_by: string | null;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          created_at?: string | null;
          description?: string | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          ip_address?: string | null;
          new_values?: Json | null;
          old_values?: Json | null;
          performed_by?: string | null;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string | null;
          description?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          ip_address?: string | null;
          new_values?: Json | null;
          old_values?: Json | null;
          performed_by?: string | null;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      analytics_cache: {
        Row: {
          cache_data: Json;
          cache_key: string;
          created_at: string | null;
          expires_at: string;
          id: string;
        };
        Insert: {
          cache_data: Json;
          cache_key: string;
          created_at?: string | null;
          expires_at: string;
          id?: string;
        };
        Update: {
          cache_data?: Json;
          cache_key?: string;
          created_at?: string | null;
          expires_at?: string;
          id?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          created_at: string | null;
          device_info: string | null;
          entity_id: string | null;
          entity_type: string;
          id: string;
          ip_address: string | null;
          new_values: Json | null;
          old_values: Json | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string | null;
          device_info?: string | null;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          ip_address?: string | null;
          new_values?: Json | null;
          old_values?: Json | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string | null;
          device_info?: string | null;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          ip_address?: string | null;
          new_values?: Json | null;
          old_values?: Json | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      backups: {
        Row: {
          backup_name: string;
          backup_type: string;
          completed_at: string | null;
          created_at: string | null;
          created_by: string | null;
          error_message: string | null;
          file_path: string | null;
          file_size_bytes: number | null;
          id: string;
          notes: string | null;
          started_at: string | null;
          status: string | null;
          tables_included: string[] | null;
        };
        Insert: {
          backup_name: string;
          backup_type: string;
          completed_at?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          error_message?: string | null;
          file_path?: string | null;
          file_size_bytes?: number | null;
          id?: string;
          notes?: string | null;
          started_at?: string | null;
          status?: string | null;
          tables_included?: string[] | null;
        };
        Update: {
          backup_name?: string;
          backup_type?: string;
          completed_at?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          error_message?: string | null;
          file_path?: string | null;
          file_size_bytes?: number | null;
          id?: string;
          notes?: string | null;
          started_at?: string | null;
          status?: string | null;
          tables_included?: string[] | null;
        };
        Relationships: [];
      };
      borrow_messages: {
        Row: {
          additional_instructions: string | null;
          borrow_request_id: string;
          collection_datetime: string | null;
          conditions: string | null;
          created_at: string | null;
          id: string;
          is_read: boolean | null;
          message: string;
          message_type: string;
          pickup_location: string | null;
          recipient_id: string;
          sender_id: string | null;
          subject: string | null;
        };
        Insert: {
          additional_instructions?: string | null;
          borrow_request_id: string;
          collection_datetime?: string | null;
          conditions?: string | null;
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message: string;
          message_type?: string;
          pickup_location?: string | null;
          recipient_id: string;
          sender_id?: string | null;
          subject?: string | null;
        };
        Update: {
          additional_instructions?: string | null;
          borrow_request_id?: string;
          collection_datetime?: string | null;
          conditions?: string | null;
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message?: string;
          message_type?: string;
          pickup_location?: string | null;
          recipient_id?: string;
          sender_id?: string | null;
          subject?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "borrow_messages_borrow_request_id_fkey";
            columns: ["borrow_request_id"];
            isOneToOne: false;
            referencedRelation: "borrow_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "borrow_messages_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "borrow_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      borrow_requests: {
        Row: {
          approved_by: string | null;
          approved_date: string | null;
          collection_datetime: string | null;
          conditions: string | null;
          created_at: string | null;
          id: string;
          item_department_id: string | null;
          item_id: string;
          pickup_location: string | null;
          purpose: string | null;
          quantity: number | null;
          rejection_reason: string | null;
          requested_end_date: string;
          requested_start_date: string;
          staff_message: string | null;
          status: Database["public"]["Enums"]["request_status"] | null;
          student_id: string;
          updated_at: string | null;
        };
        Insert: {
          approved_by?: string | null;
          approved_date?: string | null;
          collection_datetime?: string | null;
          conditions?: string | null;
          created_at?: string | null;
          id?: string;
          item_department_id?: string | null;
          item_id: string;
          pickup_location?: string | null;
          purpose?: string | null;
          quantity?: number | null;
          rejection_reason?: string | null;
          requested_end_date: string;
          requested_start_date: string;
          staff_message?: string | null;
          status?: Database["public"]["Enums"]["request_status"] | null;
          student_id: string;
          updated_at?: string | null;
        };
        Update: {
          approved_by?: string | null;
          approved_date?: string | null;
          collection_datetime?: string | null;
          conditions?: string | null;
          created_at?: string | null;
          id?: string;
          item_department_id?: string | null;
          item_id?: string;
          pickup_location?: string | null;
          purpose?: string | null;
          quantity?: number | null;
          rejection_reason?: string | null;
          requested_end_date?: string;
          requested_start_date?: string;
          staff_message?: string | null;
          status?: Database["public"]["Enums"]["request_status"] | null;
          student_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "borrow_requests_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "borrow_requests_item_department_id_fkey";
            columns: ["item_department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "borrow_requests_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "borrow_requests_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          color_hex: string | null;
          created_at: string | null;
          description: string | null;
          icon_name: string | null;
          id: string;
          low_stock_threshold: number | null;
          name: string;
          parent_category_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          color_hex?: string | null;
          created_at?: string | null;
          description?: string | null;
          icon_name?: string | null;
          id?: string;
          low_stock_threshold?: number | null;
          name: string;
          parent_category_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          color_hex?: string | null;
          created_at?: string | null;
          description?: string | null;
          icon_name?: string | null;
          id?: string;
          low_stock_threshold?: number | null;
          name?: string;
          parent_category_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_category_id_fkey";
            columns: ["parent_category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      chemical_hazard_types: {
        Row: {
          code: string;
          color_hex: string | null;
          created_at: string | null;
          description: string | null;
          icon_name: string | null;
          id: string;
          name: string;
          safety_precautions: string[] | null;
          updated_at: string | null;
        };
        Insert: {
          code: string;
          color_hex?: string | null;
          created_at?: string | null;
          description?: string | null;
          icon_name?: string | null;
          id?: string;
          name: string;
          safety_precautions?: string[] | null;
          updated_at?: string | null;
        };
        Update: {
          code?: string;
          color_hex?: string | null;
          created_at?: string | null;
          description?: string | null;
          icon_name?: string | null;
          id?: string;
          name?: string;
          safety_precautions?: string[] | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      chemical_transactions: {
        Row: {
          approved_by: string | null;
          chemical_id: string;
          created_at: string | null;
          from_location: string | null;
          id: string;
          notes: string | null;
          performed_by: string | null;
          purpose: string | null;
          quantity: number;
          quantity_after: number | null;
          quantity_before: number | null;
          to_location: string | null;
          transaction_date: string | null;
          transaction_type: string;
          unit: string;
        };
        Insert: {
          approved_by?: string | null;
          chemical_id: string;
          created_at?: string | null;
          from_location?: string | null;
          id?: string;
          notes?: string | null;
          performed_by?: string | null;
          purpose?: string | null;
          quantity: number;
          quantity_after?: number | null;
          quantity_before?: number | null;
          to_location?: string | null;
          transaction_date?: string | null;
          transaction_type: string;
          unit: string;
        };
        Update: {
          approved_by?: string | null;
          chemical_id?: string;
          created_at?: string | null;
          from_location?: string | null;
          id?: string;
          notes?: string | null;
          performed_by?: string | null;
          purpose?: string | null;
          quantity?: number;
          quantity_after?: number | null;
          quantity_before?: number | null;
          to_location?: string | null;
          transaction_date?: string | null;
          transaction_type?: string;
          unit?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chemical_transactions_chemical_id_fkey";
            columns: ["chemical_id"];
            isOneToOne: false;
            referencedRelation: "chemicals";
            referencedColumns: ["id"];
          },
        ];
      };
      chemicals: {
        Row: {
          batch_number: string | null;
          cas_number: string | null;
          created_at: string | null;
          created_by: string | null;
          current_quantity: number;
          department_id: string | null;
          description: string | null;
          expiry_date: string | null;
          formula: string | null;
          hazard_type_id: string | null;
          id: string;
          is_active: boolean | null;
          is_expired: boolean | null;
          manufacture_date: string | null;
          minimum_quantity: number | null;
          msds_url: string | null;
          name: string;
          received_date: string | null;
          safety_data: Json | null;
          storage_conditions: string | null;
          storage_location: string | null;
          supplier_contact: string | null;
          supplier_name: string | null;
          unit: string;
          updated_at: string | null;
        };
        Insert: {
          batch_number?: string | null;
          cas_number?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          current_quantity?: number;
          department_id?: string | null;
          description?: string | null;
          expiry_date?: string | null;
          formula?: string | null;
          hazard_type_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_expired?: boolean | null;
          manufacture_date?: string | null;
          minimum_quantity?: number | null;
          msds_url?: string | null;
          name: string;
          received_date?: string | null;
          safety_data?: Json | null;
          storage_conditions?: string | null;
          storage_location?: string | null;
          supplier_contact?: string | null;
          supplier_name?: string | null;
          unit?: string;
          updated_at?: string | null;
        };
        Update: {
          batch_number?: string | null;
          cas_number?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          current_quantity?: number;
          department_id?: string | null;
          description?: string | null;
          expiry_date?: string | null;
          formula?: string | null;
          hazard_type_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_expired?: boolean | null;
          manufacture_date?: string | null;
          minimum_quantity?: number | null;
          msds_url?: string | null;
          name?: string;
          received_date?: string | null;
          safety_data?: Json | null;
          storage_conditions?: string | null;
          storage_location?: string | null;
          supplier_contact?: string | null;
          supplier_name?: string | null;
          unit?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chemicals_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chemicals_hazard_type_id_fkey";
            columns: ["hazard_type_id"];
            isOneToOne: false;
            referencedRelation: "chemical_hazard_types";
            referencedColumns: ["id"];
          },
        ];
      };
      damage_reports: {
        Row: {
          created_at: string | null;
          damage_type: string | null;
          description: string | null;
          id: string;
          item_id: string;
          photos_urls: string[] | null;
          reported_by: string;
          reviewed_by: string | null;
          reviewed_date: string | null;
          severity: Database["public"]["Enums"]["damage_severity"] | null;
          status: Database["public"]["Enums"]["request_status"] | null;
        };
        Insert: {
          created_at?: string | null;
          damage_type?: string | null;
          description?: string | null;
          id?: string;
          item_id: string;
          photos_urls?: string[] | null;
          reported_by: string;
          reviewed_by?: string | null;
          reviewed_date?: string | null;
          severity?: Database["public"]["Enums"]["damage_severity"] | null;
          status?: Database["public"]["Enums"]["request_status"] | null;
        };
        Update: {
          created_at?: string | null;
          damage_type?: string | null;
          description?: string | null;
          id?: string;
          item_id?: string;
          photos_urls?: string[] | null;
          reported_by?: string;
          reviewed_by?: string | null;
          reviewed_date?: string | null;
          severity?: Database["public"]["Enums"]["damage_severity"] | null;
          status?: Database["public"]["Enums"]["request_status"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "damage_reports_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "damage_reports_reported_by_fkey";
            columns: ["reported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "damage_reports_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      departments: {
        Row: {
          budget: number | null;
          contact_email: string | null;
          created_at: string | null;
          head_user_id: string | null;
          id: string;
          is_active: boolean | null;
          location_building: string | null;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          budget?: number | null;
          contact_email?: string | null;
          created_at?: string | null;
          head_user_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          location_building?: string | null;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          budget?: number | null;
          contact_email?: string | null;
          created_at?: string | null;
          head_user_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          location_building?: string | null;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "departments_head_user_id_fkey";
            columns: ["head_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      issued_items: {
        Row: {
          borrow_request_id: string | null;
          condition_at_issue: string | null;
          created_at: string | null;
          due_date: string;
          id: string;
          issued_by: string;
          issued_date: string;
          issued_to: string;
          item_id: string;
          quantity_issued: number | null;
          returned_date: string | null;
          status: string | null;
        };
        Insert: {
          borrow_request_id?: string | null;
          condition_at_issue?: string | null;
          created_at?: string | null;
          due_date: string;
          id?: string;
          issued_by: string;
          issued_date?: string;
          issued_to: string;
          item_id: string;
          quantity_issued?: number | null;
          returned_date?: string | null;
          status?: string | null;
        };
        Update: {
          borrow_request_id?: string | null;
          condition_at_issue?: string | null;
          created_at?: string | null;
          due_date?: string;
          id?: string;
          issued_by?: string;
          issued_date?: string;
          issued_to?: string;
          item_id?: string;
          quantity_issued?: number | null;
          returned_date?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "issued_items_borrow_request_id_fkey";
            columns: ["borrow_request_id"];
            isOneToOne: false;
            referencedRelation: "borrow_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issued_items_issued_by_fkey";
            columns: ["issued_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issued_items_issued_to_fkey";
            columns: ["issued_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issued_items_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      item_images: {
        Row: {
          caption: string | null;
          created_at: string | null;
          id: string;
          image_type: string | null;
          image_url: string;
          is_primary: boolean | null;
          item_id: string;
          search_query: string | null;
          sort_order: number | null;
          source: string | null;
          uploaded_by: string | null;
        };
        Insert: {
          caption?: string | null;
          created_at?: string | null;
          id?: string;
          image_type?: string | null;
          image_url: string;
          is_primary?: boolean | null;
          item_id: string;
          search_query?: string | null;
          sort_order?: number | null;
          source?: string | null;
          uploaded_by?: string | null;
        };
        Update: {
          caption?: string | null;
          created_at?: string | null;
          id?: string;
          image_type?: string | null;
          image_url?: string;
          is_primary?: boolean | null;
          item_id?: string;
          search_query?: string | null;
          sort_order?: number | null;
          source?: string | null;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "item_images_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      item_transactions: {
        Row: {
          created_at: string | null;
          from_location: string | null;
          id: string;
          item_id: string;
          notes: string | null;
          performed_by: string | null;
          quantity: number;
          quantity_after: number | null;
          quantity_before: number | null;
          related_user_id: string | null;
          to_location: string | null;
          transaction_type: string;
        };
        Insert: {
          created_at?: string | null;
          from_location?: string | null;
          id?: string;
          item_id: string;
          notes?: string | null;
          performed_by?: string | null;
          quantity: number;
          quantity_after?: number | null;
          quantity_before?: number | null;
          related_user_id?: string | null;
          to_location?: string | null;
          transaction_type: string;
        };
        Update: {
          created_at?: string | null;
          from_location?: string | null;
          id?: string;
          item_id?: string;
          notes?: string | null;
          performed_by?: string | null;
          quantity?: number;
          quantity_after?: number | null;
          quantity_before?: number | null;
          related_user_id?: string | null;
          to_location?: string | null;
          transaction_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_transactions_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      item_units: {
        Row: {
          condition: string | null;
          created_at: string | null;
          current_holder_id: string | null;
          current_location: string | null;
          due_date: string | null;
          id: string;
          issued_date: string | null;
          item_id: string;
          notes: string | null;
          qr_code_data: string;
          qr_code_url: string | null;
          status: string | null;
          unit_number: number;
          unit_serial_number: string;
          updated_at: string | null;
        };
        Insert: {
          condition?: string | null;
          created_at?: string | null;
          current_holder_id?: string | null;
          current_location?: string | null;
          due_date?: string | null;
          id?: string;
          issued_date?: string | null;
          item_id: string;
          notes?: string | null;
          qr_code_data: string;
          qr_code_url?: string | null;
          status?: string | null;
          unit_number: number;
          unit_serial_number: string;
          updated_at?: string | null;
        };
        Update: {
          condition?: string | null;
          created_at?: string | null;
          current_holder_id?: string | null;
          current_location?: string | null;
          due_date?: string | null;
          id?: string;
          issued_date?: string | null;
          item_id?: string;
          notes?: string | null;
          qr_code_data?: string;
          qr_code_url?: string | null;
          status?: string | null;
          unit_number?: number;
          unit_serial_number?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "item_units_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      items: {
        Row: {
          archived_at: string | null;
          asset_tag: string | null;
          barcode: string | null;
          brand: string | null;
          calibration_cert_url: string | null;
          category_id: string | null;
          condition: string | null;
          created_at: string | null;
          created_by: string | null;
          current_quantity: number | null;
          department_id: string;
          description: string | null;
          expiry_date: string | null;
          hazard_type: string | null;
          id: string;
          image_url: string | null;
          invoice_reference: string | null;
          is_borrowable: boolean | null;
          item_code: string | null;
          item_type: string | null;
          lab_location: string | null;
          last_maintenance_date: string | null;
          maintenance_interval_days: number | null;
          manual_url: string | null;
          model_number: string | null;
          name: string;
          next_maintenance_date: string | null;
          notes: string | null;
          other_docs: Json | null;
          power_rating: string | null;
          purchase_date: string | null;
          purchase_price: number | null;
          qr_code_data: string | null;
          reorder_threshold: number | null;
          safety_level: Database["public"]["Enums"]["safety_level"] | null;
          sds_url: string | null;
          serial_number: string | null;
          shelf_location: string | null;
          special_handling_notes: string | null;
          specifications: Json | null;
          status: Database["public"]["Enums"]["item_status"] | null;
          storage_location: string | null;
          storage_requirements: string | null;
          sub_images: string[] | null;
          supplier_contact: string | null;
          supplier_name: string | null;
          unit: string | null;
          updated_at: string | null;
          voltage: string | null;
          warranty_until: string | null;
        };
        Insert: {
          archived_at?: string | null;
          asset_tag?: string | null;
          barcode?: string | null;
          brand?: string | null;
          calibration_cert_url?: string | null;
          category_id?: string | null;
          condition?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          current_quantity?: number | null;
          department_id: string;
          description?: string | null;
          expiry_date?: string | null;
          hazard_type?: string | null;
          id?: string;
          image_url?: string | null;
          invoice_reference?: string | null;
          is_borrowable?: boolean | null;
          item_code?: string | null;
          item_type?: string | null;
          lab_location?: string | null;
          last_maintenance_date?: string | null;
          maintenance_interval_days?: number | null;
          manual_url?: string | null;
          model_number?: string | null;
          name: string;
          next_maintenance_date?: string | null;
          notes?: string | null;
          other_docs?: Json | null;
          power_rating?: string | null;
          purchase_date?: string | null;
          purchase_price?: number | null;
          qr_code_data?: string | null;
          reorder_threshold?: number | null;
          safety_level?: Database["public"]["Enums"]["safety_level"] | null;
          sds_url?: string | null;
          serial_number?: string | null;
          shelf_location?: string | null;
          special_handling_notes?: string | null;
          specifications?: Json | null;
          status?: Database["public"]["Enums"]["item_status"] | null;
          storage_location?: string | null;
          storage_requirements?: string | null;
          sub_images?: string[] | null;
          supplier_contact?: string | null;
          supplier_name?: string | null;
          unit?: string | null;
          updated_at?: string | null;
          voltage?: string | null;
          warranty_until?: string | null;
        };
        Update: {
          archived_at?: string | null;
          asset_tag?: string | null;
          barcode?: string | null;
          brand?: string | null;
          calibration_cert_url?: string | null;
          category_id?: string | null;
          condition?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          current_quantity?: number | null;
          department_id?: string;
          description?: string | null;
          expiry_date?: string | null;
          hazard_type?: string | null;
          id?: string;
          image_url?: string | null;
          invoice_reference?: string | null;
          is_borrowable?: boolean | null;
          item_code?: string | null;
          item_type?: string | null;
          lab_location?: string | null;
          last_maintenance_date?: string | null;
          maintenance_interval_days?: number | null;
          manual_url?: string | null;
          model_number?: string | null;
          name?: string;
          next_maintenance_date?: string | null;
          notes?: string | null;
          other_docs?: Json | null;
          power_rating?: string | null;
          purchase_date?: string | null;
          purchase_price?: number | null;
          qr_code_data?: string | null;
          reorder_threshold?: number | null;
          safety_level?: Database["public"]["Enums"]["safety_level"] | null;
          sds_url?: string | null;
          serial_number?: string | null;
          shelf_location?: string | null;
          special_handling_notes?: string | null;
          specifications?: Json | null;
          status?: Database["public"]["Enums"]["item_status"] | null;
          storage_location?: string | null;
          storage_requirements?: string | null;
          sub_images?: string[] | null;
          supplier_contact?: string | null;
          supplier_name?: string | null;
          unit?: string | null;
          updated_at?: string | null;
          voltage?: string | null;
          warranty_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
        ];
      };
      login_attempts: {
        Row: {
          browser: string | null;
          city: string | null;
          country: string | null;
          created_at: string | null;
          device_type: string | null;
          email: string;
          failure_reason: string | null;
          id: string;
          ip_address: string | null;
          success: boolean;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          browser?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string | null;
          device_type?: string | null;
          email: string;
          failure_reason?: string | null;
          id?: string;
          ip_address?: string | null;
          success: boolean;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          browser?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string | null;
          device_type?: string | null;
          email?: string;
          failure_reason?: string | null;
          id?: string;
          ip_address?: string | null;
          success?: boolean;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      login_logs: {
        Row: {
          device_info: string | null;
          id: string;
          ip_address: string | null;
          login_time: string | null;
          logout_time: string | null;
          session_duration: unknown;
          user_id: string | null;
        };
        Insert: {
          device_info?: string | null;
          id?: string;
          ip_address?: string | null;
          login_time?: string | null;
          logout_time?: string | null;
          session_duration?: unknown;
          user_id?: string | null;
        };
        Update: {
          device_info?: string | null;
          id?: string;
          ip_address?: string | null;
          login_time?: string | null;
          logout_time?: string | null;
          session_duration?: unknown;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "login_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_records: {
        Row: {
          actual_completion: string | null;
          assigned_to: string | null;
          cost: number | null;
          created_at: string | null;
          damage_report_id: string | null;
          estimated_completion: string | null;
          id: string;
          item_id: string;
          parts_used: string | null;
          reason: string | null;
          repair_notes: string | null;
          repair_photos_urls: string[] | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["maintenance_status"] | null;
          updated_at: string | null;
        };
        Insert: {
          actual_completion?: string | null;
          assigned_to?: string | null;
          cost?: number | null;
          created_at?: string | null;
          damage_report_id?: string | null;
          estimated_completion?: string | null;
          id?: string;
          item_id: string;
          parts_used?: string | null;
          reason?: string | null;
          repair_notes?: string | null;
          repair_photos_urls?: string[] | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["maintenance_status"] | null;
          updated_at?: string | null;
        };
        Update: {
          actual_completion?: string | null;
          assigned_to?: string | null;
          cost?: number | null;
          created_at?: string | null;
          damage_report_id?: string | null;
          estimated_completion?: string | null;
          id?: string;
          item_id?: string;
          parts_used?: string | null;
          reason?: string | null;
          repair_notes?: string | null;
          repair_photos_urls?: string[] | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["maintenance_status"] | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_records_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_records_damage_report_id_fkey";
            columns: ["damage_report_id"];
            isOneToOne: false;
            referencedRelation: "damage_reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_records_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_rules: {
        Row: {
          auto_create_ticket: boolean | null;
          category_id: string | null;
          condition_type: string;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          priority: string | null;
          threshold_value: number;
        };
        Insert: {
          auto_create_ticket?: boolean | null;
          category_id?: string | null;
          condition_type?: string;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          priority?: string | null;
          threshold_value?: number;
        };
        Update: {
          auto_create_ticket?: boolean | null;
          category_id?: string | null;
          condition_type?: string;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          priority?: string | null;
          threshold_value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_rules_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string | null;
          id: string;
          is_read: boolean | null;
          link: string | null;
          message: string | null;
          metadata: Json | null;
          notification_type: string;
          related_entity_id: string | null;
          related_entity_type: string | null;
          title: string;
          type: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          link?: string | null;
          message?: string | null;
          metadata?: Json | null;
          notification_type: string;
          related_entity_id?: string | null;
          related_entity_type?: string | null;
          title: string;
          type?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          link?: string | null;
          message?: string | null;
          metadata?: Json | null;
          notification_type?: string;
          related_entity_id?: string | null;
          related_entity_type?: string | null;
          title?: string;
          type?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      otp_verifications: {
        Row: {
          created_at: string | null;
          email: string;
          expires_at: string;
          id: string;
          otp: string;
          verified: boolean | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          expires_at: string;
          id?: string;
          otp: string;
          verified?: boolean | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          expires_at?: string;
          id?: string;
          otp?: string;
          verified?: boolean | null;
        };
        Relationships: [];
      };
      password_history: {
        Row: {
          created_at: string | null;
          id: string;
          password_hash: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          password_hash: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          password_hash?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          additional_info: string | null;
          address: string | null;
          college_name: string | null;
          created_at: string | null;
          email: string;
          failed_login_attempts: number | null;
          full_name: string;
          id: string;
          is_active: boolean | null;
          is_default_admin: boolean | null;
          is_verified: boolean | null;
          last_login: string | null;
          last_login_at: string | null;
          locked_until: string | null;
          login_count: number | null;
          must_change_password: boolean | null;
          password_changed_at: string | null;
          phone: string | null;
          profile_image_url: string | null;
          register_number: string | null;
          staff_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          additional_info?: string | null;
          address?: string | null;
          college_name?: string | null;
          created_at?: string | null;
          email: string;
          failed_login_attempts?: number | null;
          full_name: string;
          id: string;
          is_active?: boolean | null;
          is_default_admin?: boolean | null;
          is_verified?: boolean | null;
          last_login?: string | null;
          last_login_at?: string | null;
          locked_until?: string | null;
          login_count?: number | null;
          must_change_password?: boolean | null;
          password_changed_at?: string | null;
          phone?: string | null;
          profile_image_url?: string | null;
          register_number?: string | null;
          staff_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          additional_info?: string | null;
          address?: string | null;
          college_name?: string | null;
          created_at?: string | null;
          email?: string;
          failed_login_attempts?: number | null;
          full_name?: string;
          id?: string;
          is_active?: boolean | null;
          is_default_admin?: boolean | null;
          is_verified?: boolean | null;
          last_login?: string | null;
          last_login_at?: string | null;
          locked_until?: string | null;
          login_count?: number | null;
          must_change_password?: boolean | null;
          password_changed_at?: string | null;
          phone?: string | null;
          profile_image_url?: string | null;
          register_number?: string | null;
          staff_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      qr_codes: {
        Row: {
          created_at: string | null;
          id: string;
          item_id: string;
          qr_image_url: string | null;
          qr_payload: Json;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          item_id: string;
          qr_image_url?: string | null;
          qr_payload: Json;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          item_id?: string;
          qr_image_url?: string | null;
          qr_payload?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "qr_codes_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: true;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      qr_scan_logs: {
        Row: {
          created_at: string | null;
          device_info: Json | null;
          id: string;
          item_id: string | null;
          scan_location: string | null;
          scan_result: string | null;
          scanned_by: string | null;
        };
        Insert: {
          created_at?: string | null;
          device_info?: Json | null;
          id?: string;
          item_id?: string | null;
          scan_location?: string | null;
          scan_result?: string | null;
          scanned_by?: string | null;
        };
        Update: {
          created_at?: string | null;
          device_info?: Json | null;
          id?: string;
          item_id?: string | null;
          scan_location?: string | null;
          scan_result?: string | null;
          scanned_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "qr_scan_logs_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      report_templates: {
        Row: {
          config: Json;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          id: string;
          is_public: boolean | null;
          name: string;
          template_type: string;
          updated_at: string | null;
        };
        Insert: {
          config?: Json;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_public?: boolean | null;
          name: string;
          template_type: string;
          updated_at?: string | null;
        };
        Update: {
          config?: Json;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_public?: boolean | null;
          name?: string;
          template_type?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      return_logs: {
        Row: {
          condition_at_return: string | null;
          created_at: string | null;
          damage_report_id: string | null;
          damage_reported: boolean | null;
          id: string;
          issued_item_id: string;
          notes: string | null;
          returned_by_staff: string;
          returned_date: string;
        };
        Insert: {
          condition_at_return?: string | null;
          created_at?: string | null;
          damage_report_id?: string | null;
          damage_reported?: boolean | null;
          id?: string;
          issued_item_id: string;
          notes?: string | null;
          returned_by_staff: string;
          returned_date?: string;
        };
        Update: {
          condition_at_return?: string | null;
          created_at?: string | null;
          damage_report_id?: string | null;
          damage_reported?: boolean | null;
          id?: string;
          issued_item_id?: string;
          notes?: string | null;
          returned_by_staff?: string;
          returned_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_damage_report";
            columns: ["damage_report_id"];
            isOneToOne: false;
            referencedRelation: "damage_reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "return_logs_issued_item_id_fkey";
            columns: ["issued_item_id"];
            isOneToOne: false;
            referencedRelation: "issued_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "return_logs_returned_by_staff_fkey";
            columns: ["returned_by_staff"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      return_requests: {
        Row: {
          additional_images: string[] | null;
          borrow_request_id: string;
          condition_notes: string | null;
          created_at: string | null;
          id: string;
          item_condition: string;
          item_id: string;
          notes: string | null;
          quantity: number;
          rejection_reason: string | null;
          return_datetime: string;
          return_image_url: string;
          status: string;
          student_id: string;
          updated_at: string | null;
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          additional_images?: string[] | null;
          borrow_request_id: string;
          condition_notes?: string | null;
          created_at?: string | null;
          id?: string;
          item_condition?: string;
          item_id: string;
          notes?: string | null;
          quantity?: number;
          rejection_reason?: string | null;
          return_datetime?: string;
          return_image_url: string;
          status?: string;
          student_id: string;
          updated_at?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          additional_images?: string[] | null;
          borrow_request_id?: string;
          condition_notes?: string | null;
          created_at?: string | null;
          id?: string;
          item_condition?: string;
          item_id?: string;
          notes?: string | null;
          quantity?: number;
          rejection_reason?: string | null;
          return_datetime?: string;
          return_image_url?: string;
          status?: string;
          student_id?: string;
          updated_at?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "return_requests_borrow_request_id_fkey";
            columns: ["borrow_request_id"];
            isOneToOne: false;
            referencedRelation: "borrow_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "return_requests_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "return_requests_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "return_requests_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      sso_trusted_domains: {
        Row: {
          auto_role: string | null;
          created_at: string | null;
          created_by: string | null;
          domain: string;
          id: string;
          is_active: boolean | null;
          notes: string | null;
        };
        Insert: {
          auto_role?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          domain: string;
          id?: string;
          is_active?: boolean | null;
          notes?: string | null;
        };
        Update: {
          auto_role?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          domain?: string;
          id?: string;
          is_active?: boolean | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      stock_alerts: {
        Row: {
          alert_type: string;
          created_at: string | null;
          id: string;
          is_read: boolean | null;
          is_resolved: boolean | null;
          item_id: string;
          message: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          alert_type: string;
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          is_resolved?: boolean | null;
          item_id: string;
          message: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: {
          alert_type?: string;
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          is_resolved?: boolean | null;
          item_id?: string;
          message?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "stock_alerts_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_history: {
        Row: {
          id: string;
          item_id: string;
          quantity_change: number;
          reason: string | null;
          recorded_at: string | null;
          recorded_by: string | null;
        };
        Insert: {
          id?: string;
          item_id: string;
          quantity_change: number;
          reason?: string | null;
          recorded_at?: string | null;
          recorded_by?: string | null;
        };
        Update: {
          id?: string;
          item_id?: string;
          quantity_change?: number;
          reason?: string | null;
          recorded_at?: string | null;
          recorded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "stock_history_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_history_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      system_settings: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string | null;
          updated_by: string | null;
          value: string;
        };
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string | null;
          updated_by?: string | null;
          value: string;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          value?: string;
        };
        Relationships: [];
      };
      user_departments: {
        Row: {
          created_at: string | null;
          department_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          department_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          department_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_departments_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_departments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_sessions: {
        Row: {
          browser: string | null;
          city: string | null;
          country: string | null;
          created_at: string | null;
          device_name: string | null;
          device_type: string | null;
          ended_at: string | null;
          expires_at: string | null;
          id: string;
          ip_address: string | null;
          is_active: boolean | null;
          is_current: boolean | null;
          last_activity_at: string | null;
          os: string | null;
          session_token: string | null;
          user_id: string;
        };
        Insert: {
          browser?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string | null;
          device_name?: string | null;
          device_type?: string | null;
          ended_at?: string | null;
          expires_at?: string | null;
          id?: string;
          ip_address?: string | null;
          is_active?: boolean | null;
          is_current?: boolean | null;
          last_activity_at?: string | null;
          os?: string | null;
          session_token?: string | null;
          user_id: string;
        };
        Update: {
          browser?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string | null;
          device_name?: string | null;
          device_type?: string | null;
          ended_at?: string | null;
          expires_at?: string | null;
          id?: string;
          ip_address?: string | null;
          is_active?: boolean | null;
          is_current?: boolean | null;
          last_activity_at?: string | null;
          os?: string | null;
          session_token?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          created_at: string | null;
          email_notifications: boolean | null;
          id: string;
          low_stock_alerts: boolean | null;
          maintenance_alerts: boolean | null;
          request_alerts: boolean | null;
          theme: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email_notifications?: boolean | null;
          id: string;
          low_stock_alerts?: boolean | null;
          maintenance_alerts?: boolean | null;
          request_alerts?: boolean | null;
          theme?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email_notifications?: boolean | null;
          id?: string;
          low_stock_alerts?: boolean | null;
          maintenance_alerts?: boolean | null;
          request_alerts?: boolean | null;
          theme?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      tally_config: {
        Row: {
          company_name: string;
          created_at: string | null;
          created_by: string | null;
          host: string;
          id: string;
          is_enabled: boolean;
          last_sync_at: string | null;
          port: number;
          updated_at: string | null;
        };
        Insert: {
          company_name?: string;
          created_at?: string | null;
          created_by?: string | null;
          host?: string;
          id?: string;
          is_enabled?: boolean;
          last_sync_at?: string | null;
          port?: number;
          updated_at?: string | null;
        };
        Update: {
          company_name?: string;
          created_at?: string | null;
          created_by?: string | null;
          host?: string;
          id?: string;
          is_enabled?: boolean;
          last_sync_at?: string | null;
          port?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tally_config_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      vendors: {
        Row: {
          address: string | null;
          city: string | null;
          contact_person: string | null;
          created_at: string | null;
          created_by: string | null;
          credit_limit: number | null;
          email: string | null;
          gstin: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          pan: string | null;
          payment_terms: string | null;
          phone: string | null;
          pincode: string | null;
          state: string | null;
          tally_ledger_name: string | null;
          updated_at: string | null;
        };
        Insert: {
          address?: string | null;
          city?: string | null;
          contact_person?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          credit_limit?: number | null;
          email?: string | null;
          gstin?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          pan?: string | null;
          payment_terms?: string | null;
          phone?: string | null;
          pincode?: string | null;
          state?: string | null;
          tally_ledger_name?: string | null;
          updated_at?: string | null;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          contact_person?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          credit_limit?: number | null;
          email?: string | null;
          gstin?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          pan?: string | null;
          payment_terms?: string | null;
          phone?: string | null;
          pincode?: string | null;
          state?: string | null;
          tally_ledger_name?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vendors_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_orders: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          cgst_amount: number;
          created_at: string | null;
          created_by: string | null;
          department_id: string | null;
          expected_delivery_date: string | null;
          grand_total: number;
          id: string;
          igst_amount: number;
          notes: string | null;
          order_date: string;
          po_number: string;
          rejected_at: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          sgst_amount: number;
          status: Database["public"]["Enums"]["purchase_order_status"];
          subtotal: number;
          tally_sync_error: string | null;
          tally_sync_status: Database["public"]["Enums"]["tally_sync_status"];
          tally_synced_at: string | null;
          tally_voucher_number: string | null;
          total_gst: number;
          updated_at: string | null;
          vendor_id: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          cgst_amount?: number;
          created_at?: string | null;
          created_by?: string | null;
          department_id?: string | null;
          expected_delivery_date?: string | null;
          grand_total?: number;
          id?: string;
          igst_amount?: number;
          notes?: string | null;
          order_date?: string;
          po_number?: string;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          sgst_amount?: number;
          status?: Database["public"]["Enums"]["purchase_order_status"];
          subtotal?: number;
          tally_sync_error?: string | null;
          tally_sync_status?: Database["public"]["Enums"]["tally_sync_status"];
          tally_synced_at?: string | null;
          tally_voucher_number?: string | null;
          total_gst?: number;
          updated_at?: string | null;
          vendor_id: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          cgst_amount?: number;
          created_at?: string | null;
          created_by?: string | null;
          department_id?: string | null;
          expected_delivery_date?: string | null;
          grand_total?: number;
          id?: string;
          igst_amount?: number;
          notes?: string | null;
          order_date?: string;
          po_number?: string;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          sgst_amount?: number;
          status?: Database["public"]["Enums"]["purchase_order_status"];
          subtotal?: number;
          tally_sync_error?: string | null;
          tally_sync_status?: Database["public"]["Enums"]["tally_sync_status"];
          tally_synced_at?: string | null;
          tally_voucher_number?: string | null;
          total_gst?: number;
          updated_at?: string | null;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_rejected_by_fkey";
            columns: ["rejected_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_order_items: {
        Row: {
          batch_number: string | null;
          cgst_amount: number;
          chemical_id: string | null;
          created_at: string | null;
          description: string | null;
          discount_percent: number | null;
          expiry_date: string | null;
          gst_rate: number;
          hsn_code: string | null;
          id: string;
          igst_amount: number;
          item_id: string | null;
          item_name: string;
          manufacture_date: string | null;
          purchase_order_id: string;
          quantity: number;
          rate: number;
          sgst_amount: number;
          tally_stock_item_name: string | null;
          total: number;
          unit: string;
        };
        Insert: {
          batch_number?: string | null;
          cgst_amount?: number;
          chemical_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          discount_percent?: number | null;
          expiry_date?: string | null;
          gst_rate?: number;
          hsn_code?: string | null;
          id?: string;
          igst_amount?: number;
          item_id?: string | null;
          item_name: string;
          manufacture_date?: string | null;
          purchase_order_id: string;
          quantity?: number;
          rate?: number;
          sgst_amount?: number;
          tally_stock_item_name?: string | null;
          total?: number;
          unit?: string;
        };
        Update: {
          batch_number?: string | null;
          cgst_amount?: number;
          chemical_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          discount_percent?: number | null;
          expiry_date?: string | null;
          gst_rate?: number;
          hsn_code?: string | null;
          id?: string;
          igst_amount?: number;
          item_id?: string | null;
          item_name?: string;
          manufacture_date?: string | null;
          purchase_order_id?: string;
          quantity?: number;
          rate?: number;
          sgst_amount?: number;
          tally_stock_item_name?: string | null;
          total?: number;
          unit?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_chemical_id_fkey";
            columns: ["chemical_id"];
            isOneToOne: false;
            referencedRelation: "chemicals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_items_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      tally_sync_mappings: {
        Row: {
          created_at: string | null;
          entity_type: string;
          id: string;
          lablink_id: string;
          lablink_name: string;
          last_synced_at: string | null;
          sync_error: string | null;
          sync_status: Database["public"]["Enums"]["tally_sync_status"];
          tally_name: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          entity_type: string;
          id?: string;
          lablink_id: string;
          lablink_name: string;
          last_synced_at?: string | null;
          sync_error?: string | null;
          sync_status?: Database["public"]["Enums"]["tally_sync_status"];
          tally_name: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          entity_type?: string;
          id?: string;
          lablink_id?: string;
          lablink_name?: string;
          last_synced_at?: string | null;
          sync_error?: string | null;
          sync_status?: Database["public"]["Enums"]["tally_sync_status"];
          tally_name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      tally_sync_logs: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          entity_id: string | null;
          entity_name: string | null;
          entity_type: string | null;
          error_message: string | null;
          id: string;
          operation: string;
          status: string;
          tally_request_xml: string | null;
          tally_response: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          entity_id?: string | null;
          entity_name?: string | null;
          entity_type?: string | null;
          error_message?: string | null;
          id?: string;
          operation: string;
          status?: string;
          tally_request_xml?: string | null;
          tally_response?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          entity_id?: string | null;
          entity_name?: string | null;
          entity_type?: string | null;
          error_message?: string | null;
          id?: string;
          operation?: string;
          status?: string;
          tally_request_xml?: string | null;
          tally_response?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tally_sync_logs_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_password_change_required: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      check_predictive_maintenance: { Args: never; Returns: undefined };
      clean_expired_analytics_cache: { Args: never; Returns: number };
      create_notification: {
        Args: {
          p_link?: string;
          p_message?: string;
          p_metadata?: Json;
          p_title: string;
          p_type?: string;
          p_user_id: string;
        };
        Returns: string;
      };
      create_user_session: {
        Args: {
          p_browser?: string;
          p_device_type?: string;
          p_ip_address?: string;
          p_os?: string;
          p_user_id: string;
        };
        Returns: string;
      };
      end_all_other_sessions: {
        Args: { p_current_session_id: string };
        Returns: number;
      };
      end_user_session: { Args: { p_session_id: string }; Returns: boolean };
      get_department_staff: {
        Args: { dept_id: string };
        Returns: {
          user_id: string;
        }[];
      };
      get_item_by_qr: {
        Args: { p_qr_code: string };
        Returns: {
          category_name: string;
          condition: string;
          current_holder: string;
          department_name: string;
          due_date: string;
          image_url: string;
          issued_date: string;
          item_code: string;
          item_id: string;
          item_name: string;
          status: string;
          unit_id: string;
          unit_serial: string;
        }[];
      };
      get_item_scan_count: {
        Args: { p_days?: number; p_item_id: string };
        Returns: number;
      };
      get_unread_notification_count: { Args: never; Returns: number };
      get_user_role: {
        Args: { _user_id: string };
        Returns: Database["public"]["Enums"]["app_role"];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin_or_staff: { Args: { _user_id: string }; Returns: boolean };
      log_activity: {
        Args: {
          p_action: string;
          p_description?: string;
          p_entity_id: string;
          p_entity_type: string;
          p_new_values?: Json;
          p_old_values?: Json;
        };
        Returns: string;
      };
      log_login_attempt: {
        Args: {
          p_email: string;
          p_failure_reason?: string;
          p_ip_address?: string;
          p_success: boolean;
          p_user_agent?: string;
        };
        Returns: string;
      };
      log_qr_scan: {
        Args: {
          p_device_info?: Json;
          p_item_id: string;
          p_scan_result?: string;
        };
        Returns: string;
      };
      mark_all_notifications_read: { Args: never; Returns: number };
      mark_notification_read: {
        Args: { p_notification_id: string };
        Returns: boolean;
      };
      mark_password_changed: { Args: { p_user_id: string }; Returns: boolean };
      create_otp: {
        Args: { p_email: string; p_otp?: string };
        Returns: string;
      };
      verify_otp: {
        Args: { p_email: string; p_otp: string };
        Returns: boolean;
      };
      log_public_scan: {
        Args: { p_item_id: string };
        Returns: undefined;
      };
      kiosk_checkout: {
        Args: { p_due_date?: string | null; p_item_id: string };
        Returns: Json;
      };
      kiosk_return: {
        Args: { p_issued_item_id: string };
        Returns: Json;
      };
      update_item_repair_status: {
        Args: { p_item_id: string; p_status: string };
        Returns: Json;
      };
    };
    Enums: {
      app_role: "admin" | "staff" | "student" | "technician";
      damage_severity: "minor" | "moderate" | "severe";
      item_condition:
        | "new"
        | "excellent"
        | "good"
        | "fair"
        | "poor"
        | "damaged"
        | "scrapped";
      item_status:
        | "available"
        | "borrowed"
        | "under_maintenance"
        | "damaged"
        | "archived";
      item_type:
        | "equipment"
        | "consumable"
        | "chemical"
        | "tool"
        | "glassware"
        | "electronic"
        | "furniture"
        | "other";
      maintenance_status:
        | "pending"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "scrapped";
      purchase_order_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "sent_to_tally"
        | "rejected"
        | "cancelled";
      request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "returned"
        | "return_pending";
      safety_level: "low" | "medium" | "high" | "hazardous";
      tally_sync_status:
        | "pending"
        | "synced"
        | "failed"
        | "not_applicable";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff", "student", "technician"],
      damage_severity: ["minor", "moderate", "severe"],
      item_condition: [
        "new",
        "excellent",
        "good",
        "fair",
        "poor",
        "damaged",
        "scrapped",
      ],
      item_status: [
        "available",
        "borrowed",
        "under_maintenance",
        "damaged",
        "archived",
      ],
      item_type: [
        "equipment",
        "consumable",
        "chemical",
        "tool",
        "glassware",
        "electronic",
        "furniture",
        "other",
      ],
      maintenance_status: [
        "pending",
        "in_progress",
        "on_hold",
        "completed",
        "scrapped",
      ],
      purchase_order_status: [
        "draft",
        "pending_approval",
        "approved",
        "sent_to_tally",
        "rejected",
        "cancelled",
      ],
      request_status: [
        "pending",
        "approved",
        "rejected",
        "returned",
        "return_pending",
      ],
      safety_level: ["low", "medium", "high", "hazardous"],
      tally_sync_status: ["pending", "synced", "failed", "not_applicable"],
    },
  },
} as const;
