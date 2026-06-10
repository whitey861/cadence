export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_uploaded_by_profiles_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          after: Json | null
          before: Json | null
          entity_id: string | null
          entity_type: string
          id: number
          occurred_at: string
          workspace_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: never
          occurred_at?: string
          workspace_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: never
          occurred_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_user_id_profiles_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          deleted_at: string | null
          entity_id: string
          entity_type: string
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_user_id_profiles_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      delegation_acknowledgments: {
        Row: {
          acknowledged_at: string
          delegation_assignment_id: string
          id: string
          instrument_version: number
          position_assignment_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          acknowledged_at?: string
          delegation_assignment_id: string
          id?: string
          instrument_version: number
          position_assignment_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          acknowledged_at?: string
          delegation_assignment_id?: string
          id?: string
          instrument_version?: number
          position_assignment_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegation_acknowledgments_delegation_assignment_id_fkey"
            columns: ["delegation_assignment_id"]
            isOneToOne: false
            referencedRelation: "delegation_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegation_acknowledgments_delegation_assignment_id_fkey"
            columns: ["delegation_assignment_id"]
            isOneToOne: false
            referencedRelation: "delegations_register"
            referencedColumns: ["delegation_assignment_id"]
          },
          {
            foreignKeyName: "delegation_acknowledgments_delegation_assignment_id_fkey"
            columns: ["delegation_assignment_id"]
            isOneToOne: false
            referencedRelation: "pending_delegation_acknowledgments"
            referencedColumns: ["delegation_assignment_id"]
          },
          {
            foreignKeyName: "delegation_acknowledgments_position_assignment_id_fkey"
            columns: ["position_assignment_id"]
            isOneToOne: false
            referencedRelation: "current_position_occupants"
            referencedColumns: ["position_assignment_id"]
          },
          {
            foreignKeyName: "delegation_acknowledgments_position_assignment_id_fkey"
            columns: ["position_assignment_id"]
            isOneToOne: false
            referencedRelation: "delegations_register"
            referencedColumns: ["position_assignment_id"]
          },
          {
            foreignKeyName: "delegation_acknowledgments_position_assignment_id_fkey"
            columns: ["position_assignment_id"]
            isOneToOne: false
            referencedRelation: "pending_delegation_acknowledgments"
            referencedColumns: ["position_assignment_id"]
          },
          {
            foreignKeyName: "delegation_acknowledgments_position_assignment_id_fkey"
            columns: ["position_assignment_id"]
            isOneToOne: false
            referencedRelation: "position_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegation_acknowledgments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegation_acks_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delegation_assignments: {
        Row: {
          created_at: string
          delegation_id: string
          effective_from: string
          effective_to: string | null
          id: string
          position_id: string
          status: Database["public"]["Enums"]["delegation_assignment_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          delegation_id: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          position_id: string
          status?: Database["public"]["Enums"]["delegation_assignment_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          delegation_id?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          position_id?: string
          status?: Database["public"]["Enums"]["delegation_assignment_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegation_assignments_delegation_id_fkey"
            columns: ["delegation_id"]
            isOneToOne: false
            referencedRelation: "delegations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegation_assignments_delegation_id_fkey"
            columns: ["delegation_id"]
            isOneToOne: false
            referencedRelation: "delegations_register"
            referencedColumns: ["delegation_id"]
          },
          {
            foreignKeyName: "delegation_assignments_delegation_id_fkey"
            columns: ["delegation_id"]
            isOneToOne: false
            referencedRelation: "pending_delegation_acknowledgments"
            referencedColumns: ["delegation_id"]
          },
          {
            foreignKeyName: "delegation_assignments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "delegations_register"
            referencedColumns: ["position_id"]
          },
          {
            foreignKeyName: "delegation_assignments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "pending_delegation_acknowledgments"
            referencedColumns: ["position_id"]
          },
          {
            foreignKeyName: "delegation_assignments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegation_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      delegation_instruments: {
        Row: {
          adopted_date: string | null
          created_at: string
          family_id: string
          id: string
          instrument_type: Database["public"]["Enums"]["delegation_instrument_type"]
          resolution_reference: string | null
          status: Database["public"]["Enums"]["delegation_instrument_status"]
          supersedes_id: string | null
          title: string
          updated_at: string
          version: number
          workspace_id: string
        }
        Insert: {
          adopted_date?: string | null
          created_at?: string
          family_id?: string
          id?: string
          instrument_type: Database["public"]["Enums"]["delegation_instrument_type"]
          resolution_reference?: string | null
          status?: Database["public"]["Enums"]["delegation_instrument_status"]
          supersedes_id?: string | null
          title: string
          updated_at?: string
          version?: number
          workspace_id: string
        }
        Update: {
          adopted_date?: string | null
          created_at?: string
          family_id?: string
          id?: string
          instrument_type?: Database["public"]["Enums"]["delegation_instrument_type"]
          resolution_reference?: string | null
          status?: Database["public"]["Enums"]["delegation_instrument_status"]
          supersedes_id?: string | null
          title?: string
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegation_instruments_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "delegation_instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegation_instruments_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "delegations_register"
            referencedColumns: ["instrument_id"]
          },
          {
            foreignKeyName: "delegation_instruments_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "pending_delegation_acknowledgments"
            referencedColumns: ["instrument_id"]
          },
          {
            foreignKeyName: "delegation_instruments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      delegation_provisions: {
        Row: {
          created_at: string
          delegation_id: string
          id: string
          provision_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          delegation_id: string
          id?: string
          provision_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          delegation_id?: string
          id?: string
          provision_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegation_provisions_delegation_id_fkey"
            columns: ["delegation_id"]
            isOneToOne: false
            referencedRelation: "delegations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegation_provisions_delegation_id_fkey"
            columns: ["delegation_id"]
            isOneToOne: false
            referencedRelation: "delegations_register"
            referencedColumns: ["delegation_id"]
          },
          {
            foreignKeyName: "delegation_provisions_delegation_id_fkey"
            columns: ["delegation_id"]
            isOneToOne: false
            referencedRelation: "pending_delegation_acknowledgments"
            referencedColumns: ["delegation_id"]
          },
          {
            foreignKeyName: "delegation_provisions_provision_id_fkey"
            columns: ["provision_id"]
            isOneToOne: false
            referencedRelation: "legislative_provisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegation_provisions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      delegations: {
        Row: {
          conditions_limitations: string | null
          created_at: string
          delegation_instrument_id: string
          function_description: string | null
          function_title: string
          id: string
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          conditions_limitations?: string | null
          created_at?: string
          delegation_instrument_id: string
          function_description?: string | null
          function_title: string
          id?: string
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          conditions_limitations?: string | null
          created_at?: string
          delegation_instrument_id?: string
          function_description?: string | null
          function_title?: string
          id?: string
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegations_delegation_instrument_id_fkey"
            columns: ["delegation_instrument_id"]
            isOneToOne: false
            referencedRelation: "delegation_instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegations_delegation_instrument_id_fkey"
            columns: ["delegation_instrument_id"]
            isOneToOne: false
            referencedRelation: "delegations_register"
            referencedColumns: ["instrument_id"]
          },
          {
            foreignKeyName: "delegations_delegation_instrument_id_fkey"
            columns: ["delegation_instrument_id"]
            isOneToOne: false
            referencedRelation: "pending_delegation_acknowledgments"
            referencedColumns: ["instrument_id"]
          },
          {
            foreignKeyName: "delegations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      legislative_instruments: {
        Row: {
          created_at: string
          id: string
          jurisdiction: string
          name: string
          source_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          jurisdiction?: string
          name: string
          source_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          jurisdiction?: string
          name?: string
          source_url?: string | null
        }
        Relationships: []
      }
      legislative_provisions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          instrument_id: string
          reference: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          instrument_id: string
          reference: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          instrument_id?: string
          reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "legislative_provisions_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "legislative_instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["membership_role"]
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      org_units: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          unit_type: Database["public"]["Enums"]["org_unit_type"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          unit_type?: Database["public"]["Enums"]["org_unit_type"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          unit_type?: Database["public"]["Enums"]["org_unit_type"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "delegation_ack_compliance_by_org_unit"
            referencedColumns: ["org_unit_id"]
          },
          {
            foreignKeyName: "org_units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "delegations_register"
            referencedColumns: ["org_unit_id"]
          },
          {
            foreignKeyName: "org_units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "pending_delegation_acknowledgments"
            referencedColumns: ["org_unit_id"]
          },
          {
            foreignKeyName: "org_units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "policies_register"
            referencedColumns: ["org_unit_id"]
          },
          {
            foreignKeyName: "org_units_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          adopted_date: string | null
          body_storage_path: string | null
          category: string | null
          created_at: string
          family_id: string
          id: string
          next_review_date: string | null
          owner_position_id: string | null
          policy_number: string | null
          review_cycle_months: number | null
          status: Database["public"]["Enums"]["policy_status"]
          supersedes_id: string | null
          title: string
          updated_at: string
          version: number
          workspace_id: string
        }
        Insert: {
          adopted_date?: string | null
          body_storage_path?: string | null
          category?: string | null
          created_at?: string
          family_id?: string
          id?: string
          next_review_date?: string | null
          owner_position_id?: string | null
          policy_number?: string | null
          review_cycle_months?: number | null
          status?: Database["public"]["Enums"]["policy_status"]
          supersedes_id?: string | null
          title: string
          updated_at?: string
          version?: number
          workspace_id: string
        }
        Update: {
          adopted_date?: string | null
          body_storage_path?: string | null
          category?: string | null
          created_at?: string
          family_id?: string
          id?: string
          next_review_date?: string | null
          owner_position_id?: string | null
          policy_number?: string | null
          review_cycle_months?: number | null
          status?: Database["public"]["Enums"]["policy_status"]
          supersedes_id?: string | null
          title?: string
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_owner_position_id_fkey"
            columns: ["owner_position_id"]
            isOneToOne: false
            referencedRelation: "delegations_register"
            referencedColumns: ["position_id"]
          },
          {
            foreignKeyName: "policies_owner_position_id_fkey"
            columns: ["owner_position_id"]
            isOneToOne: false
            referencedRelation: "pending_delegation_acknowledgments"
            referencedColumns: ["position_id"]
          },
          {
            foreignKeyName: "policies_owner_position_id_fkey"
            columns: ["owner_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "pending_policy_acknowledgments"
            referencedColumns: ["policy_id"]
          },
          {
            foreignKeyName: "policies_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "policies_register"
            referencedColumns: ["policy_id"]
          },
          {
            foreignKeyName: "policies_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "policy_ack_compliance_by_org_unit"
            referencedColumns: ["policy_id"]
          },
          {
            foreignKeyName: "policies_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "policy_ack_targets"
            referencedColumns: ["policy_id"]
          },
          {
            foreignKeyName: "policies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_ack_requirements: {
        Row: {
          created_at: string
          id: string
          policy_id: string
          scope: Database["public"]["Enums"]["ack_scope"]
          scope_ref: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          policy_id: string
          scope: Database["public"]["Enums"]["ack_scope"]
          scope_ref?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          policy_id?: string
          scope?: Database["public"]["Enums"]["ack_scope"]
          scope_ref?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_ack_requirements_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "pending_policy_acknowledgments"
            referencedColumns: ["policy_id"]
          },
          {
            foreignKeyName: "policy_ack_requirements_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_ack_requirements_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies_register"
            referencedColumns: ["policy_id"]
          },
          {
            foreignKeyName: "policy_ack_requirements_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policy_ack_compliance_by_org_unit"
            referencedColumns: ["policy_id"]
          },
          {
            foreignKeyName: "policy_ack_requirements_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policy_ack_targets"
            referencedColumns: ["policy_id"]
          },
          {
            foreignKeyName: "policy_ack_requirements_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_acknowledgments: {
        Row: {
          acknowledged_at: string
          id: string
          policy_version: number
          requirement_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          acknowledged_at?: string
          id?: string
          policy_version: number
          requirement_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          acknowledged_at?: string
          id?: string
          policy_version?: number
          requirement_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_acknowledgments_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "pending_policy_acknowledgments"
            referencedColumns: ["requirement_id"]
          },
          {
            foreignKeyName: "policy_acknowledgments_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "policy_ack_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_acknowledgments_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "policy_ack_targets"
            referencedColumns: ["requirement_id"]
          },
          {
            foreignKeyName: "policy_acknowledgments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_acks_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      position_assignments: {
        Row: {
          assignment_type: Database["public"]["Enums"]["assignment_type"]
          created_at: string
          end_date: string | null
          id: string
          position_id: string
          start_date: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          assignment_type?: Database["public"]["Enums"]["assignment_type"]
          created_at?: string
          end_date?: string | null
          id?: string
          position_id: string
          start_date: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          assignment_type?: Database["public"]["Enums"]["assignment_type"]
          created_at?: string
          end_date?: string | null
          id?: string
          position_id?: string
          start_date?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_assignments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "delegations_register"
            referencedColumns: ["position_id"]
          },
          {
            foreignKeyName: "position_assignments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "pending_delegation_acknowledgments"
            referencedColumns: ["position_id"]
          },
          {
            foreignKeyName: "position_assignments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_assignments_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string
          id: string
          org_unit_id: string | null
          position_code: string | null
          status: Database["public"]["Enums"]["position_status"]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_unit_id?: string | null
          position_code?: string | null
          status?: Database["public"]["Enums"]["position_status"]
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_unit_id?: string | null
          position_code?: string | null
          status?: Database["public"]["Enums"]["position_status"]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "delegation_ack_compliance_by_org_unit"
            referencedColumns: ["org_unit_id"]
          },
          {
            foreignKeyName: "positions_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "delegations_register"
            referencedColumns: ["org_unit_id"]
          },
          {
            foreignKeyName: "positions_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "pending_delegation_acknowledgments"
            referencedColumns: ["org_unit_id"]
          },
          {
            foreignKeyName: "positions_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "policies_register"
            referencedColumns: ["org_unit_id"]
          },
          {
            foreignKeyName: "positions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      review_tasks: {
        Row: {
          assigned_position_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          due_date: string
          entity_id: string
          entity_type: string
          id: string
          status: Database["public"]["Enums"]["review_task_status"]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_position_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date: string
          entity_id: string
          entity_type: string
          id?: string
          status?: Database["public"]["Enums"]["review_task_status"]
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_position_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date?: string
          entity_id?: string
          entity_type?: string
          id?: string
          status?: Database["public"]["Enums"]["review_task_status"]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_tasks_assigned_position_id_fkey"
            columns: ["assigned_position_id"]
            isOneToOne: false
            referencedRelation: "delegations_register"
            referencedColumns: ["position_id"]
          },
          {
            foreignKeyName: "review_tasks_assigned_position_id_fkey"
            columns: ["assigned_position_id"]
            isOneToOne: false
            referencedRelation: "pending_delegation_acknowledgments"
            referencedColumns: ["position_id"]
          },
          {
            foreignKeyName: "review_tasks_assigned_position_id_fkey"
            columns: ["assigned_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json
          slug: string
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json
          slug: string
          state?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json
          slug?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      current_position_occupants: {
        Row: {
          assignment_type: Database["public"]["Enums"]["assignment_type"] | null
          end_date: string | null
          position_assignment_id: string | null
          position_id: string | null
          start_date: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          assignment_type?:
            | Database["public"]["Enums"]["assignment_type"]
            | null
          end_date?: string | null
          position_assignment_id?: string | null
          position_id?: string | null
          start_date?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          assignment_type?:
            | Database["public"]["Enums"]["assignment_type"]
            | null
          end_date?: string | null
          position_assignment_id?: string | null
          position_id?: string | null
          start_date?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "position_assignments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "delegations_register"
            referencedColumns: ["position_id"]
          },
          {
            foreignKeyName: "position_assignments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "pending_delegation_acknowledgments"
            referencedColumns: ["position_id"]
          },
          {
            foreignKeyName: "position_assignments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_assignments_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      delegation_ack_compliance_by_org_unit: {
        Row: {
          acknowledged: number | null
          org_unit_id: string | null
          org_unit_name: string | null
          pending: number | null
          required: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delegation_instruments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      delegations_register: {
        Row: {
          acknowledged_at: string | null
          acknowledgment_id: string | null
          acknowledgment_pending: boolean | null
          adopted_date: string | null
          conditions_limitations: string | null
          delegation_assignment_id: string | null
          delegation_id: string | null
          effective_from: string | null
          effective_to: string | null
          function_description: string | null
          function_title: string | null
          instrument_id: string | null
          instrument_title: string | null
          instrument_type:
            | Database["public"]["Enums"]["delegation_instrument_type"]
            | null
          instrument_version: number | null
          occupant_name: string | null
          occupant_user_id: string | null
          org_unit_id: string | null
          org_unit_name: string | null
          position_assignment_id: string | null
          position_code: string | null
          position_id: string | null
          position_title: string | null
          provisions_text: string | null
          resolution_reference: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delegation_instruments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_assignments_user_id_profiles_fkey"
            columns: ["occupant_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_delegation_acknowledgments: {
        Row: {
          conditions_limitations: string | null
          delegation_assignment_id: string | null
          delegation_id: string | null
          function_title: string | null
          instrument_id: string | null
          instrument_title: string | null
          instrument_version: number | null
          occupant_name: string | null
          occupant_user_id: string | null
          org_unit_id: string | null
          org_unit_name: string | null
          position_assignment_id: string | null
          position_id: string | null
          position_title: string | null
          provisions_text: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delegation_instruments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_assignments_user_id_profiles_fkey"
            columns: ["occupant_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_policy_acknowledgments: {
        Row: {
          policy_id: string | null
          policy_number: string | null
          policy_title: string | null
          policy_version: number | null
          requirement_id: string | null
          scope: Database["public"]["Enums"]["ack_scope"] | null
          scope_ref: string | null
          user_id: string | null
          user_name: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      policies_register: {
        Row: {
          adopted_date: string | null
          category: string | null
          next_review_date: string | null
          org_unit_id: string | null
          org_unit_name: string | null
          owner_position_id: string | null
          owner_position_title: string | null
          policy_id: string | null
          policy_number: string | null
          review_cycle_months: number | null
          status: Database["public"]["Enums"]["policy_status"] | null
          title: string | null
          version: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_owner_position_id_fkey"
            columns: ["owner_position_id"]
            isOneToOne: false
            referencedRelation: "delegations_register"
            referencedColumns: ["position_id"]
          },
          {
            foreignKeyName: "policies_owner_position_id_fkey"
            columns: ["owner_position_id"]
            isOneToOne: false
            referencedRelation: "pending_delegation_acknowledgments"
            referencedColumns: ["position_id"]
          },
          {
            foreignKeyName: "policies_owner_position_id_fkey"
            columns: ["owner_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_ack_compliance_by_org_unit: {
        Row: {
          acknowledged: number | null
          org_unit_id: string | null
          org_unit_name: string | null
          pending: number | null
          policy_id: string | null
          policy_number: string | null
          policy_title: string | null
          required: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "delegation_ack_compliance_by_org_unit"
            referencedColumns: ["org_unit_id"]
          },
          {
            foreignKeyName: "positions_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "delegations_register"
            referencedColumns: ["org_unit_id"]
          },
          {
            foreignKeyName: "positions_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "pending_delegation_acknowledgments"
            referencedColumns: ["org_unit_id"]
          },
          {
            foreignKeyName: "positions_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "policies_register"
            referencedColumns: ["org_unit_id"]
          },
        ]
      }
      policy_ack_targets: {
        Row: {
          policy_id: string | null
          policy_number: string | null
          policy_title: string | null
          policy_version: number | null
          requirement_id: string | null
          scope: Database["public"]["Enums"]["ack_scope"] | null
          scope_ref: string | null
          user_id: string | null
          user_name: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      adopt_delegation_instrument: {
        Args: {
          p_adopted_date: string
          p_instrument_id: string
          p_resolution_reference?: string
        }
        Returns: undefined
      }
      adopt_policy: {
        Args: { p_adopted_date: string; p_policy_id: string }
        Returns: undefined
      }
      current_sydney_date: { Args: never; Returns: string }
      has_workspace_role: {
        Args: {
          allowed: Database["public"]["Enums"]["membership_role"][]
          ws: string
        }
        Returns: boolean
      }
      is_workspace_member: { Args: { ws: string }; Returns: boolean }
      shares_workspace_with: { Args: { target: string }; Returns: boolean }
      supersede_delegation_instrument: {
        Args: { p_instrument_id: string }
        Returns: string
      }
      supersede_policy: { Args: { p_policy_id: string }; Returns: string }
    }
    Enums: {
      ack_scope: "all_staff" | "org_unit" | "position"
      assignment_type: "substantive" | "acting" | "relieving"
      delegation_assignment_status: "active" | "revoked"
      delegation_instrument_status:
        | "draft"
        | "adopted"
        | "superseded"
        | "archived"
      delegation_instrument_type: "council_to_gm" | "gm_to_staff"
      membership_role:
        | "admin"
        | "governance_officer"
        | "risk_owner"
        | "manager"
        | "staff"
        | "read_only"
      membership_status: "active" | "invited" | "suspended" | "removed"
      org_unit_type: "directorate" | "division" | "section"
      policy_status:
        | "draft"
        | "consultation"
        | "adopted"
        | "under_review"
        | "superseded"
        | "rescinded"
        | "archived"
      position_status: "active" | "inactive" | "abolished"
      review_task_status: "open" | "complete" | "cancelled"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ack_scope: ["all_staff", "org_unit", "position"],
      assignment_type: ["substantive", "acting", "relieving"],
      delegation_assignment_status: ["active", "revoked"],
      delegation_instrument_status: [
        "draft",
        "adopted",
        "superseded",
        "archived",
      ],
      delegation_instrument_type: ["council_to_gm", "gm_to_staff"],
      membership_role: [
        "admin",
        "governance_officer",
        "risk_owner",
        "manager",
        "staff",
        "read_only",
      ],
      membership_status: ["active", "invited", "suspended", "removed"],
      org_unit_type: ["directorate", "division", "section"],
      policy_status: [
        "draft",
        "consultation",
        "adopted",
        "under_review",
        "superseded",
        "rescinded",
        "archived",
      ],
      position_status: ["active", "inactive", "abolished"],
      review_task_status: ["open", "complete", "cancelled"],
    },
  },
} as const

