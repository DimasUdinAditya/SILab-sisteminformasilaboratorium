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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          answer_text: string | null
          attempt_id: string
          feedback: string | null
          graded_by: string | null
          id: string
          question_id: string
          score: number | null
          selected_options: Json | null
        }
        Insert: {
          answer_text?: string | null
          attempt_id: string
          feedback?: string | null
          graded_by?: string | null
          id?: string
          question_id: string
          score?: number | null
          selected_options?: Json | null
        }
        Update: {
          answer_text?: string | null
          attempt_id?: string
          feedback?: string | null
          graded_by?: string | null
          id?: string
          question_id?: string
          score?: number | null
          selected_options?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_attempts: {
        Row: {
          assessment_id: string
          attempt_no: number
          id: string
          started_at: string
          status: Database["public"]["Enums"]["attempt_status"]
          student_id: string
          submitted_at: string | null
          total_score: number | null
        }
        Insert: {
          assessment_id: string
          attempt_no: number
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          student_id: string
          submitted_at?: string | null
          total_score?: number | null
        }
        Update: {
          assessment_id?: string
          attempt_no?: number
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          student_id?: string
          submitted_at?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          duration_min: number | null
          id: string
          max_attempt: number | null
          module_id: string
          passing_grade: number | null
          title: string
          type: Database["public"]["Enums"]["assessment_type"]
        }
        Insert: {
          duration_min?: number | null
          id?: string
          max_attempt?: number | null
          module_id: string
          passing_grade?: number | null
          title: string
          type: Database["public"]["Enums"]["assessment_type"]
        }
        Update: {
          duration_min?: number | null
          id?: string
          max_attempt?: number | null
          module_id?: string
          passing_grade?: number | null
          title?: string
          type?: Database["public"]["Enums"]["assessment_type"]
        }
        Relationships: [
          {
            foreignKeyName: "assessments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      borrowing_endorsements: {
        Row: {
          borrowing_id: string | null
          created_at: string
          dean_id: string | null
          endorsed_at: string | null
          id: string
          lab_usage_request_id: string | null
          note: string | null
          request_type: Database["public"]["Enums"]["request_type"]
          status: Database["public"]["Enums"]["endorsement_status"]
        }
        Insert: {
          borrowing_id?: string | null
          created_at?: string
          dean_id?: string | null
          endorsed_at?: string | null
          id?: string
          lab_usage_request_id?: string | null
          note?: string | null
          request_type: Database["public"]["Enums"]["request_type"]
          status?: Database["public"]["Enums"]["endorsement_status"]
        }
        Update: {
          borrowing_id?: string | null
          created_at?: string
          dean_id?: string | null
          endorsed_at?: string | null
          id?: string
          lab_usage_request_id?: string | null
          note?: string | null
          request_type?: Database["public"]["Enums"]["request_type"]
          status?: Database["public"]["Enums"]["endorsement_status"]
        }
        Relationships: [
          {
            foreignKeyName: "borrowing_endorsements_borrowing_id_fkey"
            columns: ["borrowing_id"]
            isOneToOne: true
            referencedRelation: "equipment_borrowings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowing_endorsements_dean_id_fkey"
            columns: ["dean_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowing_endorsements_lab_usage_request_id_fkey"
            columns: ["lab_usage_request_id"]
            isOneToOne: true
            referencedRelation: "lab_usage_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      borrowing_items: {
        Row: {
          borrowing_id: string
          consumable_id: string | null
          equipment_id: string | null
          id: string
          item_type: Database["public"]["Enums"]["item_type"]
          must_return: boolean
          quantity: number
        }
        Insert: {
          borrowing_id: string
          consumable_id?: string | null
          equipment_id?: string | null
          id?: string
          item_type: Database["public"]["Enums"]["item_type"]
          must_return: boolean
          quantity: number
        }
        Update: {
          borrowing_id?: string
          consumable_id?: string | null
          equipment_id?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["item_type"]
          must_return?: boolean
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "borrowing_items_borrowing_id_fkey"
            columns: ["borrowing_id"]
            isOneToOne: false
            referencedRelation: "equipment_borrowings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowing_items_consumable_id_fkey"
            columns: ["consumable_id"]
            isOneToOne: false
            referencedRelation: "consumables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowing_items_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      borrowing_readiness: {
        Row: {
          borrowing_id: string
          id: string
          note: string | null
          photo_url: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          borrowing_id: string
          id?: string
          note?: string | null
          photo_url: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          borrowing_id?: string
          id?: string
          note?: string | null
          photo_url?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "borrowing_readiness_borrowing_id_fkey"
            columns: ["borrowing_id"]
            isOneToOne: false
            referencedRelation: "equipment_borrowings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowing_readiness_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      borrowing_return_evidence: {
        Row: {
          borrowing_id: string
          id: string
          note: string | null
          photo_url: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          borrowing_id: string
          id?: string
          note?: string | null
          photo_url: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          borrowing_id?: string
          id?: string
          note?: string | null
          photo_url?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "borrowing_return_evidence_borrowing_id_fkey"
            columns: ["borrowing_id"]
            isOneToOne: false
            referencedRelation: "equipment_borrowings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowing_return_evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      borrowing_verifications: {
        Row: {
          borrowing_id: string
          discrepancy_note: string | null
          follow_up: string | null
          id: string
          result: Database["public"]["Enums"]["verification_result"]
          verified_at: string
          verified_by: string
        }
        Insert: {
          borrowing_id: string
          discrepancy_note?: string | null
          follow_up?: string | null
          id?: string
          result: Database["public"]["Enums"]["verification_result"]
          verified_at?: string
          verified_by: string
        }
        Update: {
          borrowing_id?: string
          discrepancy_note?: string | null
          follow_up?: string | null
          id?: string
          result?: Database["public"]["Enums"]["verification_result"]
          verified_at?: string
          verified_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "borrowing_verifications_borrowing_id_fkey"
            columns: ["borrowing_id"]
            isOneToOne: false
            referencedRelation: "equipment_borrowings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowing_verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calibrations: {
        Row: {
          certificate_url: string | null
          equipment_id: string
          id: string
          last_calibrated: string | null
          next_calibration: string | null
          status: Database["public"]["Enums"]["calibration_status"]
          updated_by: string | null
        }
        Insert: {
          certificate_url?: string | null
          equipment_id: string
          id?: string
          last_calibrated?: string | null
          next_calibration?: string | null
          status?: Database["public"]["Enums"]["calibration_status"]
          updated_by?: string | null
        }
        Update: {
          certificate_url?: string | null
          equipment_id?: string
          id?: string
          last_calibrated?: string | null
          next_calibration?: string | null
          status?: Database["public"]["Enums"]["calibration_status"]
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calibrations_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibrations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consumables: {
        Row: {
          id: string
          laboratory_id: string
          min_stock: number
          name: string
          stock: number
          unit: string
          description: string | null
          photo_url: string | null
          code: string | null
        }
        Insert: {
          id?: string
          laboratory_id: string
          min_stock?: number
          name: string
          stock?: number
          unit: string
          description?: string | null
          photo_url?: string | null
          code?: string | null
        }
        Update: {
          id?: string
          laboratory_id?: string
          min_stock?: number
          name?: string
          stock?: number
          unit?: string
          description?: string | null
          photo_url?: string | null
          code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consumables_laboratory_id_fkey"
            columns: ["laboratory_id"]
            isOneToOne: false
            referencedRelation: "laboratories"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          id: string
          name: string
          program_study_id: string
          semester: number | null
        }
        Insert: {
          code: string
          id?: string
          name: string
          program_study_id: string
          semester?: number | null
        }
        Update: {
          code?: string
          id?: string
          name?: string
          program_study_id?: string
          semester?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_program_study_id_fkey"
            columns: ["program_study_id"]
            isOneToOne: false
            referencedRelation: "program_studies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          id: string
          is_active: boolean
          name: string
          request_type: Database["public"]["Enums"]["request_type"]
          template_html: string
          version: number
        }
        Insert: {
          id?: string
          is_active?: boolean
          name: string
          request_type: Database["public"]["Enums"]["request_type"]
          template_html: string
          version?: number
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          request_type?: Database["public"]["Enums"]["request_type"]
          template_html?: string
          version?: number
        }
        Relationships: []
      }
      endorsement_history: {
        Row: {
          actor_id: string | null
          changed_at: string
          endorsement_id: string
          from_status: string | null
          id: string
          note: string | null
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          changed_at?: string
          endorsement_id: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status: string
        }
        Update: {
          actor_id?: string | null
          changed_at?: string
          endorsement_id?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "endorsement_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endorsement_history_endorsement_id_fkey"
            columns: ["endorsement_id"]
            isOneToOne: false
            referencedRelation: "borrowing_endorsements"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          category_id: string
          code: string
          condition: string | null
          id: string
          laboratory_id: string
          name: string
          qty_available: number
          qty_total: number
          requires_calibration: boolean
          description: string | null
          photo_url: string | null
        }
        Insert: {
          category_id: string
          code: string
          condition?: string | null
          id?: string
          laboratory_id: string
          name: string
          qty_available?: number
          qty_total?: number
          requires_calibration?: boolean
          description?: string | null
          photo_url?: string | null
        }
        Update: {
          category_id?: string
          code?: string
          condition?: string | null
          id?: string
          laboratory_id?: string
          name?: string
          qty_available?: number
          qty_total?: number
          requires_calibration?: boolean
          description?: string | null
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_laboratory_id_fkey"
            columns: ["laboratory_id"]
            isOneToOne: false
            referencedRelation: "laboratories"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_borrowings: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          borrow_date: string
          borrower_id: string
          created_at: string
          id: string
          is_overdue: boolean
          laboratory_id: string
          purpose: string
          rejection_reason: string | null
          return_due_date: string | null
          status: Database["public"]["Enums"]["borrowing_status"]
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          borrow_date: string
          borrower_id: string
          created_at?: string
          id?: string
          is_overdue?: boolean
          laboratory_id: string
          purpose: string
          rejection_reason?: string | null
          return_due_date?: string | null
          status?: Database["public"]["Enums"]["borrowing_status"]
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          borrow_date?: string
          borrower_id?: string
          created_at?: string
          id?: string
          is_overdue?: boolean
          laboratory_id?: string
          purpose?: string
          rejection_reason?: string | null
          return_due_date?: string | null
          status?: Database["public"]["Enums"]["borrowing_status"]
        }
        Relationships: [
          {
            foreignKeyName: "equipment_borrowings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_borrowings_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_borrowings_laboratory_id_fkey"
            columns: ["laboratory_id"]
            isOneToOne: false
            referencedRelation: "laboratories"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_categories: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      faculties: {
        Row: {
          code: string
          id: string
          name: string
        }
        Insert: {
          code: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      hotspots: {
        Row: {
          description: string | null
          id: string
          material_id: string
          media_asset_id: string | null
          pos_x: number
          pos_y: number
          title: string
        }
        Insert: {
          description?: string | null
          id?: string
          material_id: string
          media_asset_id?: string | null
          pos_x: number
          pos_y: number
          title: string
        }
        Update: {
          description?: string | null
          id?: string
          material_id?: string
          media_asset_id?: string | null
          pos_x?: number
          pos_y?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotspots_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotspots_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      kalab_signatures: {
        Row: {
          id: string
          is_active: boolean
          kalab_id: string
          method: string
          signature_file: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          kalab_id: string
          method?: string
          signature_file: string
        }
        Update: {
          id?: string
          is_active?: boolean
          kalab_id?: string
          method?: string
          signature_file?: string
        }
        Relationships: [
          {
            foreignKeyName: "kalab_signatures_kalab_id_fkey"
            columns: ["kalab_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_usage_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          end_time: string
          id: string
          laboratory_id: string
          purpose: string
          rejection_reason: string | null
          requester_id: string
          start_time: string
          status: Database["public"]["Enums"]["lab_request_status"]
          usage_date: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_time: string
          id?: string
          laboratory_id: string
          purpose: string
          rejection_reason?: string | null
          requester_id: string
          start_time: string
          status?: Database["public"]["Enums"]["lab_request_status"]
          usage_date: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_time?: string
          id?: string
          laboratory_id?: string
          purpose?: string
          rejection_reason?: string | null
          requester_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["lab_request_status"]
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_usage_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_usage_requests_laboratory_id_fkey"
            columns: ["laboratory_id"]
            isOneToOne: false
            referencedRelation: "laboratories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_usage_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      laboratories: {
        Row: {
          capacity: number | null
          description: string | null
          id: string
          kalab_id: string
          location: string | null
          name: string
          program_study_id: string
        }
        Insert: {
          capacity?: number | null
          description?: string | null
          id?: string
          kalab_id: string
          location?: string | null
          name: string
          program_study_id: string
        }
        Update: {
          capacity?: number | null
          description?: string | null
          id?: string
          kalab_id?: string
          location?: string | null
          name?: string
          program_study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "laboratories_kalab_id_fkey"
            columns: ["kalab_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laboratories_program_study_id_fkey"
            columns: ["program_study_id"]
            isOneToOne: false
            referencedRelation: "program_studies"
            referencedColumns: ["id"]
          },
        ]
      }
      laboratory_schedule_entries: {
        Row: {
          activity: string | null
          date: string
          end_time: string
          id: string
          is_locked: boolean
          lab_usage_request_id: string | null
          laboratory_id: string
          start_time: string
        }
        Insert: {
          activity?: string | null
          date: string
          end_time: string
          id?: string
          is_locked?: boolean
          lab_usage_request_id?: string | null
          laboratory_id: string
          start_time: string
        }
        Update: {
          activity?: string | null
          date?: string
          end_time?: string
          id?: string
          is_locked?: boolean
          lab_usage_request_id?: string | null
          laboratory_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "laboratory_schedule_entries_lab_usage_request_id_fkey"
            columns: ["lab_usage_request_id"]
            isOneToOne: true
            referencedRelation: "lab_usage_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laboratory_schedule_entries_laboratory_id_fkey"
            columns: ["laboratory_id"]
            isOneToOne: false
            referencedRelation: "laboratories"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_progress: {
        Row: {
          completed_at: string | null
          completed_steps: Json
          current_step: string | null
          id: string
          last_accessed_at: string
          module_id: string
          percent: number
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: Json
          current_step?: string | null
          id?: string
          last_accessed_at?: string
          module_id: string
          percent?: number
          student_id: string
        }
        Update: {
          completed_at?: string | null
          completed_steps?: Json
          current_step?: string | null
          id?: string
          last_accessed_at?: string
          module_id?: string
          percent?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lecturer_assignments: {
        Row: {
          academic_year: string
          course_id: string
          id: string
          lecturer_id: string
        }
        Insert: {
          academic_year: string
          course_id: string
          id?: string
          lecturer_id: string
        }
        Update: {
          academic_year?: string
          course_id?: string
          id?: string
          lecturer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecturer_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecturer_assignments_lecturer_id_fkey"
            columns: ["lecturer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          content: string | null
          id: string
          media_asset_id: string | null
          module_id: string
          sort_order: number
          title: string
          type: Database["public"]["Enums"]["material_type"]
        }
        Insert: {
          content?: string | null
          id?: string
          media_asset_id?: string | null
          module_id: string
          sort_order?: number
          title: string
          type: Database["public"]["Enums"]["material_type"]
        }
        Update: {
          content?: string | null
          id?: string
          media_asset_id?: string | null
          module_id?: string
          sort_order?: number
          title?: string
          type?: Database["public"]["Enums"]["material_type"]
        }
        Relationships: [
          {
            foreignKeyName: "materials_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          created_at: string
          file_url: string
          id: string
          mime_type: string | null
          size_kb: number | null
          type: Database["public"]["Enums"]["media_type"]
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          mime_type?: string | null
          size_kb?: number | null
          type: Database["public"]["Enums"]["media_type"]
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          mime_type?: string | null
          size_kb?: number | null
          type?: Database["public"]["Enums"]["media_type"]
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_access: {
        Row: {
          granted_at: string
          id: string
          module_id: string
          student_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          module_id: string
          student_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          module_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_access_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_access_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          description: string | null
          id: string
          lecturer_id: string
          published_at: string | null
          published_by: string | null
          status: Database["public"]["Enums"]["module_status"]
          step_order: Json
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          description?: string | null
          id?: string
          lecturer_id: string
          published_at?: string | null
          published_by?: string | null
          status?: Database["public"]["Enums"]["module_status"]
          step_order?: Json
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          description?: string | null
          id?: string
          lecturer_id?: string
          published_at?: string | null
          published_by?: string | null
          status?: Database["public"]["Enums"]["module_status"]
          step_order?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_lecturer_id_fkey"
            columns: ["lecturer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link_url: string | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          description: string | null
          id: string
        }
        Insert: {
          code: string
          description?: string | null
          id?: string
        }
        Update: {
          code?: string
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      procedures: {
        Row: {
          id: string
          instruction: string | null
          media_asset_id: string | null
          module_id: string
          step_no: number
          title: string
        }
        Insert: {
          id?: string
          instruction?: string | null
          media_asset_id?: string | null
          module_id: string
          step_no: number
          title: string
        }
        Update: {
          id?: string
          instruction?: string | null
          media_asset_id?: string | null
          module_id?: string
          step_no?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedures_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          nim_nip: string | null
          program_study_id: string | null
          role_id: string
          semester: number | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          name: string
          nim_nip?: string | null
          program_study_id?: string | null
          role_id: string
          semester?: number | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          nim_nip?: string | null
          program_study_id?: string | null
          role_id?: string
          semester?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_program_study_id_fkey"
            columns: ["program_study_id"]
            isOneToOne: false
            referencedRelation: "program_studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_studies: {
        Row: {
          code: string
          faculty_id: string
          id: string
          name: string
        }
        Insert: {
          code: string
          faculty_id: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          faculty_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_studies_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
        ]
      }
      question_options: {
        Row: {
          id: string
          is_correct: boolean
          option_text: string
          question_id: string
        }
        Insert: {
          id?: string
          is_correct?: boolean
          option_text: string
          question_id: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          assessment_id: string
          id: string
          question_text: string
          score: number
          sort_order: number
          topic_id: string | null
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          assessment_id: string
          id?: string
          question_text: string
          score?: number
          sort_order?: number
          topic_id?: string | null
          type: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          assessment_id?: string
          id?: string
          question_text?: string
          score?: number
          sort_order?: number
          topic_id?: string | null
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_approvals: {
        Row: {
          approved_role_id: string | null
          decided_at: string
          decided_by: string
          decision: Database["public"]["Enums"]["registration_decision"]
          id: string
          registration_id: string
          rejection_reason: string | null
        }
        Insert: {
          approved_role_id?: string | null
          decided_at?: string
          decided_by: string
          decision: Database["public"]["Enums"]["registration_decision"]
          id?: string
          registration_id: string
          rejection_reason?: string | null
        }
        Update: {
          approved_role_id?: string | null
          decided_at?: string
          decided_by?: string
          decision?: Database["public"]["Enums"]["registration_decision"]
          id?: string
          registration_id?: string
          rejection_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_approvals_approved_role_id_fkey"
            columns: ["approved_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_approvals_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_approvals_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "user_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      remedial_assignments: {
        Row: {
          assigned_by: string | null
          attempt_id: string
          id: string
          material_id: string
          note: string | null
          status: string
        }
        Insert: {
          assigned_by?: string | null
          attempt_id: string
          id?: string
          material_id: string
          note?: string | null
          status?: string
        }
        Update: {
          assigned_by?: string | null
          attempt_id?: string
          id?: string
          material_id?: string
          note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "remedial_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remedial_assignments_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remedial_assignments_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      request_documents: {
        Row: {
          borrowing_id: string | null
          file_url: string
          id: string
          is_signed: boolean
          issued_at: string
          issued_by: string
          lab_usage_request_id: string | null
          letter_number: string | null
          signature_id: string
          template_id: string
        }
        Insert: {
          borrowing_id?: string | null
          file_url: string
          id?: string
          is_signed?: boolean
          issued_at?: string
          issued_by: string
          lab_usage_request_id?: string | null
          letter_number?: string | null
          signature_id: string
          template_id: string
        }
        Update: {
          borrowing_id?: string | null
          file_url?: string
          id?: string
          is_signed?: boolean
          issued_at?: string
          issued_by?: string
          lab_usage_request_id?: string | null
          letter_number?: string | null
          signature_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_documents_borrowing_id_fkey"
            columns: ["borrowing_id"]
            isOneToOne: true
            referencedRelation: "equipment_borrowings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_documents_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_documents_lab_usage_request_id_fkey"
            columns: ["lab_usage_request_id"]
            isOneToOne: true
            referencedRelation: "lab_usage_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_documents_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "kalab_signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: Database["public"]["Enums"]["app_role"]
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: Database["public"]["Enums"]["app_role"]
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: Database["public"]["Enums"]["app_role"]
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      self_evaluation_responses: {
        Row: {
          answers: Json
          id: string
          self_evaluation_id: string
          student_id: string
          submitted_at: string
        }
        Insert: {
          answers: Json
          id?: string
          self_evaluation_id: string
          student_id: string
          submitted_at?: string
        }
        Update: {
          answers?: Json
          id?: string
          self_evaluation_id?: string
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "self_evaluation_responses_self_evaluation_id_fkey"
            columns: ["self_evaluation_id"]
            isOneToOne: false
            referencedRelation: "self_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "self_evaluation_responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      self_evaluations: {
        Row: {
          id: string
          items: Json
          module_id: string
          title: string
        }
        Insert: {
          id?: string
          items?: Json
          module_id: string
          title: string
        }
        Update: {
          id?: string
          items?: Json
          module_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "self_evaluations_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      simulations: {
        Row: {
          config: Json | null
          external_url: string | null
          id: string
          media_asset_id: string | null
          module_id: string
          title: string
          type: Database["public"]["Enums"]["simulation_type"]
        }
        Insert: {
          config?: Json | null
          external_url?: string | null
          id?: string
          media_asset_id?: string | null
          module_id: string
          title: string
          type: Database["public"]["Enums"]["simulation_type"]
        }
        Update: {
          config?: Json | null
          external_url?: string | null
          id?: string
          media_asset_id?: string | null
          module_id?: string
          title?: string
          type?: Database["public"]["Enums"]["simulation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "simulations_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulations_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      status_history: {
        Row: {
          borrowing_id: string | null
          changed_at: string
          changed_by: string | null
          from_status: string | null
          id: string
          lab_usage_request_id: string | null
          note: string | null
          to_status: string
        }
        Insert: {
          borrowing_id?: string | null
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          lab_usage_request_id?: string | null
          note?: string | null
          to_status: string
        }
        Update: {
          borrowing_id?: string | null
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          lab_usage_request_id?: string | null
          note?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_history_borrowing_id_fkey"
            columns: ["borrowing_id"]
            isOneToOne: false
            referencedRelation: "equipment_borrowings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_history_lab_usage_request_id_fkey"
            columns: ["lab_usage_request_id"]
            isOneToOne: false
            referencedRelation: "lab_usage_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          borrowing_item_id: string | null
          consumable_id: string
          created_at: string
          created_by: string | null
          id: string
          quantity: number
          type: Database["public"]["Enums"]["stock_movement_type"]
        }
        Insert: {
          borrowing_item_id?: string | null
          consumable_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          quantity: number
          type: Database["public"]["Enums"]["stock_movement_type"]
        }
        Update: {
          borrowing_item_id?: string | null
          consumable_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          quantity?: number
          type?: Database["public"]["Enums"]["stock_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_borrowing_item_id_fkey"
            columns: ["borrowing_item_id"]
            isOneToOne: false
            referencedRelation: "borrowing_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_consumable_id_fkey"
            columns: ["consumable_id"]
            isOneToOne: false
            referencedRelation: "consumables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      usage_instructions: {
        Row: {
          content: string | null
          equipment_id: string
          id: string
          media_asset_id: string | null
        }
        Insert: {
          content?: string | null
          equipment_id: string
          id?: string
          media_asset_id?: string | null
        }
        Update: {
          content?: string | null
          equipment_id?: string
          id?: string
          media_asset_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_instructions_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_instructions_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_registrations: {
        Row: {
          auth_user_id: string
          email: string
          full_name: string
          id: string
          nim_nip: string
          profile_id: string | null
          program_study_id: string | null
          requested_role_id: string
          semester: number | null
          status: Database["public"]["Enums"]["registration_status"]
          submitted_at: string
        }
        Insert: {
          auth_user_id: string
          email: string
          full_name: string
          id?: string
          nim_nip: string
          profile_id?: string | null
          program_study_id?: string | null
          requested_role_id: string
          semester?: number | null
          status?: Database["public"]["Enums"]["registration_status"]
          submitted_at?: string
        }
        Update: {
          auth_user_id?: string
          email?: string
          full_name?: string
          id?: string
          nim_nip?: string
          profile_id?: string | null
          program_study_id?: string | null
          requested_role_id?: string
          semester?: number | null
          status?: Database["public"]["Enums"]["registration_status"]
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_registrations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_registrations_program_study_id_fkey"
            columns: ["program_study_id"]
            isOneToOne: false
            referencedRelation: "program_studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_registrations_requested_role_id_fkey"
            columns: ["requested_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_stock: {
        Args: {
          _consumable_id: string
          _qty: number
          _type: Database["public"]["Enums"]["stock_movement_type"]
        }
        Returns: number
      }
      approve_borrowing: { Args: { _id: string }; Returns: undefined }
      approve_lab_request: { Args: { _id: string }; Returns: string }
      approve_registration: {
        Args: {
          p_program_study_id?: string
          p_registration_id: string
          p_role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      assessment_module_id: {
        Args: { _assessment_id: string }
        Returns: string
      }
      attempt_module_id: { Args: { _attempt_id: string }; Returns: string }
      attempt_student_id: { Args: { _attempt_id: string }; Returns: string }
      audit_write: {
        Args: {
          _action: string
          _actor: string
          _entity: string
          _id: string
          _new: Json
          _old: Json
        }
        Returns: undefined
      }
      borrowing_for_kalab: {
        Args: {
          _expected: Database["public"]["Enums"]["borrowing_status"]
          _id: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          borrow_date: string
          borrower_id: string
          created_at: string
          id: string
          is_overdue: boolean
          laboratory_id: string
          purpose: string
          rejection_reason: string | null
          return_due_date: string | null
          status: Database["public"]["Enums"]["borrowing_status"]
        }
        SetofOptions: {
          from: "*"
          to: "equipment_borrowings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      calibration_status_for: {
        Args: { _next: string }
        Returns: Database["public"]["Enums"]["calibration_status"]
      }
      can_manage_certificate: { Args: { _path: string }; Returns: boolean }
      can_manage_module: { Args: { _module_id: string }; Returns: boolean }
      can_upload_readiness: { Args: { _path: string }; Returns: boolean }
      can_upload_return: { Args: { _path: string }; Returns: boolean }
      can_view_borrowing: { Args: { _id: string }; Returns: boolean }
      can_view_lab_request: { Args: { _id: string }; Returns: boolean }
      can_view_media: { Args: { _asset_id: string }; Returns: boolean }
      can_view_media_path: { Args: { _path: string }; Returns: boolean }
      can_view_module: { Args: { _module_id: string }; Returns: boolean }
      close_borrowing: {
        Args: { _follow_up: string; _id: string }
        Returns: undefined
      }
      complete_consumable_borrowing: {
        Args: { _id: string }
        Returns: undefined
      }
      confirm_readiness: {
        Args: { _id: string; _note: string; _photo_path: string }
        Returns: undefined
      }
      consumable_lab_id: { Args: { _id: string }; Returns: string }
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      current_role_id: { Args: never; Returns: string }
      dekan_can_view_profile: { Args: { p_profile: string }; Returns: boolean }
      dekan_can_view_request: {
        Args: { p_borrow: string; p_lab: string }
        Returns: boolean
      }
      delete_laboratory: {
        Args: { _id: string }
        Returns: undefined
      }
      duplicate_module: { Args: { _module_id: string }; Returns: string }
      endorse_request: {
        Args: { p_endorsement_id: string; p_note?: string }
        Returns: undefined
      }
      equipment_calibration_ok: {
        Args: { _equipment_id: string }
        Returns: boolean
      }
      equipment_lab_id: { Args: { _id: string }; Returns: string }
      get_assessment_for_student: {
        Args: { _assessment_id: string }
        Returns: Json
      }
      get_attempt_review: { Args: { _attempt_id: string }; Returns: Json }
      get_endorsement_status: {
        Args: { _borrow: string; _lab: string }
        Returns: Json
      }
      grade_attempt: {
        Args: { _attempt_id: string; _grades: Json }
        Returns: Json
      }
      has_module_access: { Args: { _module_id: string }; Returns: boolean }
      is_active_member: { Args: never; Returns: boolean }
      is_course_lecturer: { Args: { _course_id: string }; Returns: boolean }
      is_lab_client: { Args: { _profile_id: string }; Returns: boolean }
      is_lab_head: { Args: { _profile_id: string }; Returns: boolean }
      is_lab_kalab: { Args: { _lab_id: string }; Returns: boolean }
      is_lecturer_student: { Args: { _student_id: string }; Returns: boolean }
      jkt_today: { Args: never; Returns: string }
      kalab_owns_endorsement: {
        Args: {
          e: Database["public"]["Tables"]["borrowing_endorsements"]["Row"]
        }
        Returns: boolean
      }
      lab_operations_summary: {
        Args: { _from?: string; _to?: string }
        Returns: Json
      }
      leadership_summary: {
        Args: { _from?: string; _to?: string }
        Returns: Json
      }
      log_status: {
        Args: {
          _borrowing_id: string
          _from: string
          _note: string
          _request_id: string
          _to: string
        }
        Returns: undefined
      }
      material_module_id: { Args: { _material_id: string }; Returns: string }
      notify_role: {
        Args: {
          p_link: string
          p_message: string
          p_role: Database["public"]["Enums"]["app_role"]
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      publish_module: { Args: { _module_id: string }; Returns: number }
      question_module_id: { Args: { _question_id: string }; Returns: string }
      record_progress: {
        Args: {
          _completed_step: string
          _current_step: string
          _module_id: string
        }
        Returns: Json
      }
      reject_borrowing: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      reject_lab_request: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      reject_registration: {
        Args: { p_reason: string; p_registration_id: string }
        Returns: undefined
      }
      restore_borrowed_equipment: { Args: { _id: string }; Returns: undefined }
      save_calibration: {
        Args: {
          _certificate_path: string
          _equipment_id: string
          _last: string
          _next: string
        }
        Returns: {
          certificate_url: string | null
          equipment_id: string
          id: string
          last_calibrated: string | null
          next_calibration: string | null
          status: Database["public"]["Enums"]["calibration_status"]
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "calibrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_laboratory: {
        Args: {
          _capacity: number
          _description: string
          _id: string
          _kalab_id?: string
          _location: string
          _name: string
          _program_study_id?: string
        }
        Returns: string
      }
      self_evaluation_module_id: { Args: { _id: string }; Returns: string }
      set_kalab_signature: { Args: { _path: string }; Returns: string }
      set_profile_active: {
        Args: { _active: boolean; _id: string }
        Returns: undefined
      }
      start_attempt: { Args: { _assessment_id: string }; Returns: string }
      submit_attempt: {
        Args: { _answers: Json; _attempt_id: string }
        Returns: Json
      }
      submit_borrowing: {
        Args: {
          _borrow_date: string
          _items: Json
          _lab_id: string
          _purpose: string
          _return_due_date: string
        }
        Returns: string
      }
      submit_lab_request: {
        Args: {
          _date: string
          _end: string
          _lab_id: string
          _purpose: string
          _start: string
        }
        Returns: string
      }
      submit_return: {
        Args: { _id: string; _note: string; _photo_path: string }
        Returns: undefined
      }
      try_uuid: { Args: { _t: string }; Returns: string }
      verify_return: {
        Args: {
          _id: string
          _note: string
          _result: Database["public"]["Enums"]["verification_result"]
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "mahasiswa"
        | "dosen"
        | "kalab"
        | "kaprodi"
        | "wadek1"
        | "super_admin"
        | "dekan"
      assessment_type: "pre_test" | "post_test"
      attempt_status: "in_progress" | "waiting_review" | "graded"
      borrowing_status:
        | "Diajukan"
        | "Disetujui"
        | "Dipinjam"
        | "Dikembalikan"
        | "Ditunggu"
        | "Dikonfirmasi"
        | "Ditolak"
      calibration_status: "Valid" | "Mendekati" | "Kedaluwarsa"
      endorsement_status: "Menunggu_Pengesahan" | "Disahkan"
      item_type: "Alat" | "Bahan"
      lab_request_status: "Diajukan" | "Disetujui" | "Ditolak"
      material_type:
        | "text"
        | "image"
        | "diagram"
        | "pdf"
        | "reference"
        | "hotspot"
      media_type: "image" | "pdf" | "video" | "other"
      module_status: "Draft" | "Published"
      question_type: "pg" | "pg_kompleks" | "benar_salah" | "esai"
      registration_decision: "Disetujui" | "Ditolak"
      registration_status: "Menunggu" | "Disetujui" | "Ditolak"
      request_type: "lab_usage" | "borrowing"
      simulation_type: "video" | "interactive"
      stock_movement_type: "in" | "out" | "adjustment"
      verification_result: "Sesuai" | "Tidak_Sesuai"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "mahasiswa",
        "dosen",
        "kalab",
        "kaprodi",
        "wadek1",
        "super_admin",
        "dekan",
      ],
      assessment_type: ["pre_test", "post_test"],
      attempt_status: ["in_progress", "waiting_review", "graded"],
      borrowing_status: [
        "Diajukan",
        "Disetujui",
        "Dipinjam",
        "Dikembalikan",
        "Ditunggu",
        "Dikonfirmasi",
        "Ditolak",
      ],
      calibration_status: ["Valid", "Mendekati", "Kedaluwarsa"],
      endorsement_status: ["Menunggu_Pengesahan", "Disahkan"],
      item_type: ["Alat", "Bahan"],
      lab_request_status: ["Diajukan", "Disetujui", "Ditolak"],
      material_type: [
        "text",
        "image",
        "diagram",
        "pdf",
        "reference",
        "hotspot",
      ],
      media_type: ["image", "pdf", "video", "other"],
      module_status: ["Draft", "Published"],
      question_type: ["pg", "pg_kompleks", "benar_salah", "esai"],
      registration_decision: ["Disetujui", "Ditolak"],
      registration_status: ["Menunggu", "Disetujui", "Ditolak"],
      request_type: ["lab_usage", "borrowing"],
      simulation_type: ["video", "interactive"],
      stock_movement_type: ["in", "out", "adjustment"],
      verification_result: ["Sesuai", "Tidak_Sesuai"],
    },
  },
} as const
