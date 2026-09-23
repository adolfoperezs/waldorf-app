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
    PostgrestVersion: "14.5"
  }
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
      acuerdos_aporte: {
        Row: {
          acordado_en: string
          anio_id: string
          created_at: string
          escuela_id: string
          familia_id: string
          horas_mensuales: number
          id: string
          monto_mensual: number
          notas: string | null
          tramo_id: string | null
          updated_at: string
        }
        Insert: {
          acordado_en?: string
          anio_id: string
          created_at?: string
          escuela_id: string
          familia_id: string
          horas_mensuales?: number
          id?: string
          monto_mensual?: number
          notas?: string | null
          tramo_id?: string | null
          updated_at?: string
        }
        Update: {
          acordado_en?: string
          anio_id?: string
          created_at?: string
          escuela_id?: string
          familia_id?: string
          horas_mensuales?: number
          id?: string
          monto_mensual?: number
          notas?: string | null
          tramo_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acuerdos_anio_fk"
            columns: ["anio_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "anios_escolares"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "acuerdos_aporte_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acuerdos_familia_fk"
            columns: ["familia_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "acuerdos_tramo_fk"
            columns: ["tramo_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "tramos_aporte"
            referencedColumns: ["id", "escuela_id"]
          },
        ]
      }
      anios_escolares: {
        Row: {
          activo: boolean
          created_at: string
          escuela_id: string
          fin: string
          id: string
          inicio: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          escuela_id: string
          fin: string
          id?: string
          inicio: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          escuela_id?: string
          fin?: string
          id?: string
          inicio?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anios_escolares_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
        ]
      }
      aportes: {
        Row: {
          anio_id: string
          campana_id: string | null
          comision_id: string | null
          created_at: string
          descripcion: string | null
          escuela_id: string
          estado: Database["public"]["Enums"]["estado_aporte"]
          familia_id: string
          fecha: string
          horas: number | null
          id: string
          moneda: Database["public"]["Enums"]["moneda_aporte"]
          monto: number | null
          periodo: string | null
          registrado_por: string | null
          updated_at: string
        }
        Insert: {
          anio_id: string
          campana_id?: string | null
          comision_id?: string | null
          created_at?: string
          descripcion?: string | null
          escuela_id: string
          estado?: Database["public"]["Enums"]["estado_aporte"]
          familia_id: string
          fecha?: string
          horas?: number | null
          id?: string
          moneda: Database["public"]["Enums"]["moneda_aporte"]
          monto?: number | null
          periodo?: string | null
          registrado_por?: string | null
          updated_at?: string
        }
        Update: {
          anio_id?: string
          campana_id?: string | null
          comision_id?: string | null
          created_at?: string
          descripcion?: string | null
          escuela_id?: string
          estado?: Database["public"]["Enums"]["estado_aporte"]
          familia_id?: string
          fecha?: string
          horas?: number | null
          id?: string
          moneda?: Database["public"]["Enums"]["moneda_aporte"]
          monto?: number | null
          periodo?: string | null
          registrado_por?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aportes_anio_fk"
            columns: ["anio_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "anios_escolares"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "aportes_campana_fk"
            columns: ["campana_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "campanas"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "aportes_comision_fk"
            columns: ["comision_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "comisiones"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "aportes_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aportes_familia_fk"
            columns: ["familia_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "aportes_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          actor: string | null
          datos_antes: Json | null
          datos_despues: Json | null
          escuela_id: string | null
          id: number
          ocurrido_en: string
          operacion: string
          registro_id: string | null
          tabla: string
        }
        Insert: {
          actor?: string | null
          datos_antes?: Json | null
          datos_despues?: Json | null
          escuela_id?: string | null
          id?: never
          ocurrido_en?: string
          operacion: string
          registro_id?: string | null
          tabla: string
        }
        Update: {
          actor?: string | null
          datos_antes?: Json | null
          datos_despues?: Json | null
          escuela_id?: string | null
          id?: never
          ocurrido_en?: string
          operacion?: string
          registro_id?: string | null
          tabla?: string
        }
        Relationships: []
      }
      campanas: {
        Row: {
          activa: boolean
          anio_id: string | null
          comision_id: string | null
          created_at: string
          descripcion: string | null
          epoca_id: string | null
          escuela_id: string
          fin: string | null
          id: string
          inicio: string | null
          meta_horas: number | null
          meta_monto: number | null
          nombre: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          anio_id?: string | null
          comision_id?: string | null
          created_at?: string
          descripcion?: string | null
          epoca_id?: string | null
          escuela_id: string
          fin?: string | null
          id?: string
          inicio?: string | null
          meta_horas?: number | null
          meta_monto?: number | null
          nombre: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          anio_id?: string | null
          comision_id?: string | null
          created_at?: string
          descripcion?: string | null
          epoca_id?: string | null
          escuela_id?: string
          fin?: string | null
          id?: string
          inicio?: string | null
          meta_horas?: number | null
          meta_monto?: number | null
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanas_anio_fk"
            columns: ["anio_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "anios_escolares"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "campanas_comision_fk"
            columns: ["comision_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "comisiones"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "campanas_epoca_fk"
            columns: ["epoca_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "epocas"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "campanas_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
        ]
      }
      ciclos: {
        Row: {
          acento: string
          created_at: string
          escuela_id: string
          id: string
          modalidad: Database["public"]["Enums"]["modalidad_ciclo"]
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          acento?: string
          created_at?: string
          escuela_id: string
          id?: string
          modalidad: Database["public"]["Enums"]["modalidad_ciclo"]
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          acento?: string
          created_at?: string
          escuela_id?: string
          id?: string
          modalidad?: Database["public"]["Enums"]["modalidad_ciclo"]
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ciclos_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
        ]
      }
      comision_miembros: {
        Row: {
          comision_id: string
          coordina: boolean
          created_at: string
          escuela_id: string
          id: string
          perfil_id: string
        }
        Insert: {
          comision_id: string
          coordina?: boolean
          created_at?: string
          escuela_id: string
          id?: string
          perfil_id: string
        }
        Update: {
          comision_id?: string
          coordina?: boolean
          created_at?: string
          escuela_id?: string
          id?: string
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comision_miembros_comision_fk"
            columns: ["comision_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "comisiones"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "comision_miembros_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comision_miembros_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comisiones: {
        Row: {
          activa: boolean
          created_at: string
          descripcion: string | null
          escuela_id: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          escuela_id: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          escuela_id?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comisiones_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
        ]
      }
      epocas: {
        Row: {
          anio_id: string
          created_at: string
          escuela_id: string
          fin: string
          grupo_id: string | null
          id: string
          inicio: string
          nombre: string
          orden: number
          tema: string | null
          updated_at: string
        }
        Insert: {
          anio_id: string
          created_at?: string
          escuela_id: string
          fin: string
          grupo_id?: string | null
          id?: string
          inicio: string
          nombre: string
          orden?: number
          tema?: string | null
          updated_at?: string
        }
        Update: {
          anio_id?: string
          created_at?: string
          escuela_id?: string
          fin?: string
          grupo_id?: string | null
          id?: string
          inicio?: string
          nombre?: string
          orden?: number
          tema?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "epocas_anio_fk"
            columns: ["anio_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "anios_escolares"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "epocas_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epocas_grupo_fk"
            columns: ["grupo_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id", "escuela_id"]
          },
        ]
      }
      escuelas: {
        Row: {
          activa: boolean
          created_at: string
          hemisferio: string
          id: string
          idioma: string
          moneda: string
          nombre: string
          pais: string
          slug: string
          updated_at: string
          zona_horaria: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          hemisferio?: string
          id?: string
          idioma?: string
          moneda?: string
          nombre: string
          pais?: string
          slug: string
          updated_at?: string
          zona_horaria?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          hemisferio?: string
          id?: string
          idioma?: string
          moneda?: string
          nombre?: string
          pais?: string
          slug?: string
          updated_at?: string
          zona_horaria?: string
        }
        Relationships: []
      }
      evento_inscripciones: {
        Row: {
          asistio: boolean | null
          created_at: string
          escuela_id: string
          evento_id: string
          id: string
          perfil_id: string
        }
        Insert: {
          asistio?: boolean | null
          created_at?: string
          escuela_id: string
          evento_id: string
          id?: string
          perfil_id: string
        }
        Update: {
          asistio?: boolean | null
          created_at?: string
          escuela_id?: string
          evento_id?: string
          id?: string
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_inscripciones_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_inscripciones_evento_fk"
            columns: ["evento_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "evento_inscripciones_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          anio_id: string | null
          created_at: string
          cupo: number | null
          descripcion: string | null
          epoca_id: string | null
          escuela_id: string
          fin: string | null
          grupo_id: string | null
          id: string
          inicio: string
          lugar: string | null
          publico: boolean
          requiere_inscripcion: boolean
          tipo: Database["public"]["Enums"]["tipo_evento"]
          titulo: string
          updated_at: string
        }
        Insert: {
          anio_id?: string | null
          created_at?: string
          cupo?: number | null
          descripcion?: string | null
          epoca_id?: string | null
          escuela_id: string
          fin?: string | null
          grupo_id?: string | null
          id?: string
          inicio: string
          lugar?: string | null
          publico?: boolean
          requiere_inscripcion?: boolean
          tipo: Database["public"]["Enums"]["tipo_evento"]
          titulo: string
          updated_at?: string
        }
        Update: {
          anio_id?: string | null
          created_at?: string
          cupo?: number | null
          descripcion?: string | null
          epoca_id?: string | null
          escuela_id?: string
          fin?: string | null
          grupo_id?: string | null
          id?: string
          inicio?: string
          lugar?: string | null
          publico?: boolean
          requiere_inscripcion?: boolean
          tipo?: Database["public"]["Enums"]["tipo_evento"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_anio_fk"
            columns: ["anio_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "anios_escolares"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "eventos_epoca_fk"
            columns: ["epoca_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "epocas"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "eventos_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_grupo_fk"
            columns: ["grupo_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id", "escuela_id"]
          },
        ]
      }
      familia_miembros: {
        Row: {
          created_at: string
          escuela_id: string
          familia_id: string
          id: string
          perfil_id: string
          principal: boolean
          relacion: string | null
        }
        Insert: {
          created_at?: string
          escuela_id: string
          familia_id: string
          id?: string
          perfil_id: string
          principal?: boolean
          relacion?: string | null
        }
        Update: {
          created_at?: string
          escuela_id?: string
          familia_id?: string
          id?: string
          perfil_id?: string
          principal?: boolean
          relacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "familia_miembros_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "familia_miembros_familia_fk"
            columns: ["familia_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "familia_miembros_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      familias: {
        Row: {
          activa: boolean
          created_at: string
          escuela_id: string
          id: string
          ingreso: string | null
          nombre: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          escuela_id: string
          id?: string
          ingreso?: string | null
          nombre: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          escuela_id?: string
          id?: string
          ingreso?: string | null
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "familias_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
        ]
      }
      festividades: {
        Row: {
          anio_id: string
          created_at: string
          descripcion: string | null
          epoca_id: string | null
          escuela_id: string
          fecha: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          anio_id: string
          created_at?: string
          descripcion?: string | null
          epoca_id?: string | null
          escuela_id: string
          fecha: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          anio_id?: string
          created_at?: string
          descripcion?: string | null
          epoca_id?: string | null
          escuela_id?: string
          fecha?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "festividades_anio_fk"
            columns: ["anio_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "anios_escolares"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "festividades_epoca_fk"
            columns: ["epoca_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "epocas"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "festividades_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
        ]
      }
      grupo_maestros: {
        Row: {
          created_at: string
          desde: string
          escuela_id: string
          grupo_id: string
          hasta: string | null
          id: string
          materia: string | null
          perfil_id: string
          tipo: Database["public"]["Enums"]["tipo_maestro"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          desde?: string
          escuela_id: string
          grupo_id: string
          hasta?: string | null
          id?: string
          materia?: string | null
          perfil_id: string
          tipo: Database["public"]["Enums"]["tipo_maestro"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          desde?: string
          escuela_id?: string
          grupo_id?: string
          hasta?: string | null
          id?: string
          materia?: string | null
          perfil_id?: string
          tipo?: Database["public"]["Enums"]["tipo_maestro"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupo_maestros_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupo_maestros_grupo_fk"
            columns: ["grupo_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "grupo_maestros_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos: {
        Row: {
          activo: boolean
          anio_cohorte: number
          ciclo_id: string | null
          created_at: string
          escuela_id: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          anio_cohorte: number
          ciclo_id?: string | null
          created_at?: string
          escuela_id: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          anio_cohorte?: number
          ciclo_id?: string | null
          created_at?: string
          escuela_id?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupos_ciclo_fk"
            columns: ["ciclo_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "ciclos"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "grupos_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
        ]
      }
      invitaciones: {
        Row: {
          aceptada_en: string | null
          aceptada_por: string | null
          creada_por: string | null
          created_at: string
          email: string | null
          escuela_id: string
          expira_en: string
          familia_id: string | null
          id: string
          revocada_en: string | null
          rol: Database["public"]["Enums"]["rol_escuela"]
          token_hash: string
          updated_at: string
        }
        Insert: {
          aceptada_en?: string | null
          aceptada_por?: string | null
          creada_por?: string | null
          created_at?: string
          email?: string | null
          escuela_id: string
          expira_en?: string
          familia_id?: string | null
          id?: string
          revocada_en?: string | null
          rol: Database["public"]["Enums"]["rol_escuela"]
          token_hash: string
          updated_at?: string
        }
        Update: {
          aceptada_en?: string | null
          aceptada_por?: string | null
          creada_por?: string | null
          created_at?: string
          email?: string | null
          escuela_id?: string
          expira_en?: string
          familia_id?: string | null
          id?: string
          revocada_en?: string | null
          rol?: Database["public"]["Enums"]["rol_escuela"]
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitaciones_aceptada_por_fkey"
            columns: ["aceptada_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitaciones_creada_por_fkey"
            columns: ["creada_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitaciones_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitaciones_familia_fk"
            columns: ["familia_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id", "escuela_id"]
          },
        ]
      }
      membresias: {
        Row: {
          activa: boolean
          created_at: string
          desde: string
          escuela_id: string
          hasta: string | null
          id: string
          perfil_id: string
          rol: Database["public"]["Enums"]["rol_escuela"]
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          desde?: string
          escuela_id: string
          hasta?: string | null
          id?: string
          perfil_id: string
          rol: Database["public"]["Enums"]["rol_escuela"]
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          desde?: string
          escuela_id?: string
          hasta?: string | null
          id?: string
          perfil_id?: string
          rol?: Database["public"]["Enums"]["rol_escuela"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membresias_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membresias_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      minutas: {
        Row: {
          created_at: string
          dia_semana: number
          epoca_id: string
          escuela_id: string
          id: string
          notas: string | null
          plato: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dia_semana: number
          epoca_id: string
          escuela_id: string
          id?: string
          notas?: string | null
          plato: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dia_semana?: number
          epoca_id?: string
          escuela_id?: string
          id?: string
          notas?: string | null
          plato?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "minutas_epoca_fk"
            columns: ["epoca_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "epocas"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "minutas_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
        ]
      }
      ninos: {
        Row: {
          apellidos: string
          created_at: string
          egreso: string | null
          escuela_id: string
          familia_id: string
          fecha_nacimiento: string
          grupo_id: string | null
          id: string
          ingreso: string | null
          nombre: string
          nombre_preferido: string | null
          updated_at: string
        }
        Insert: {
          apellidos: string
          created_at?: string
          egreso?: string | null
          escuela_id: string
          familia_id: string
          fecha_nacimiento: string
          grupo_id?: string | null
          id?: string
          ingreso?: string | null
          nombre: string
          nombre_preferido?: string | null
          updated_at?: string
        }
        Update: {
          apellidos?: string
          created_at?: string
          egreso?: string | null
          escuela_id?: string
          familia_id?: string
          fecha_nacimiento?: string
          grupo_id?: string | null
          id?: string
          ingreso?: string | null
          nombre?: string
          nombre_preferido?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ninos_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ninos_familia_fk"
            columns: ["familia_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "ninos_grupo_fk"
            columns: ["grupo_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id", "escuela_id"]
          },
        ]
      }
      perfiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nombre_completo: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nombre_completo: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nombre_completo?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ritmo_dias: {
        Row: {
          actividad: string | null
          alimento: string | null
          created_at: string
          dia_semana: number
          escuela_id: string
          id: string
          materias: string[]
          nota: string | null
          ritmo_id: string
          updated_at: string
        }
        Insert: {
          actividad?: string | null
          alimento?: string | null
          created_at?: string
          dia_semana: number
          escuela_id: string
          id?: string
          materias?: string[]
          nota?: string | null
          ritmo_id: string
          updated_at?: string
        }
        Update: {
          actividad?: string | null
          alimento?: string | null
          created_at?: string
          dia_semana?: number
          escuela_id?: string
          id?: string
          materias?: string[]
          nota?: string | null
          ritmo_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ritmo_dias_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ritmo_dias_ritmo_id_escuela_id_fkey"
            columns: ["ritmo_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "ritmos_semanales"
            referencedColumns: ["id", "escuela_id"]
          },
        ]
      }
      ritmos_semanales: {
        Row: {
          created_at: string
          escuela_id: string
          grupo_id: string
          id: string
          publicado_en: string | null
          publicado_por: string | null
          recordatorio: string | null
          semana: string
          tema: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          escuela_id: string
          grupo_id: string
          id?: string
          publicado_en?: string | null
          publicado_por?: string | null
          recordatorio?: string | null
          semana: string
          tema?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          escuela_id?: string
          grupo_id?: string
          id?: string
          publicado_en?: string | null
          publicado_por?: string | null
          recordatorio?: string | null
          semana?: string
          tema?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ritmos_semanales_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ritmos_semanales_grupo_id_escuela_id_fkey"
            columns: ["grupo_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "ritmos_semanales_publicado_por_fkey"
            columns: ["publicado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tramos_aporte: {
        Row: {
          anio_id: string
          created_at: string
          escuela_id: string
          horas_sugeridas: number | null
          id: string
          monto_sugerido: number | null
          nombre: string
          orden: number
        }
        Insert: {
          anio_id: string
          created_at?: string
          escuela_id: string
          horas_sugeridas?: number | null
          id?: string
          monto_sugerido?: number | null
          nombre: string
          orden?: number
        }
        Update: {
          anio_id?: string
          created_at?: string
          escuela_id?: string
          horas_sugeridas?: number | null
          id?: string
          monto_sugerido?: number | null
          nombre?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "tramos_anio_fk"
            columns: ["anio_id", "escuela_id"]
            isOneToOne: false
            referencedRelation: "anios_escolares"
            referencedColumns: ["id", "escuela_id"]
          },
          {
            foreignKeyName: "tramos_aporte_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "escuelas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aceptar_invitacion: { Args: { p_token: string }; Returns: string }
      activar_anio: { Args: { p_anio: string }; Returns: undefined }
      crear_escuela: {
        Args: {
          p_hemisferio?: string
          p_idioma?: string
          p_moneda?: string
          p_nombre: string
          p_pais?: string
          p_slug: string
          p_zona_horaria?: string
        }
        Returns: string
      }
      materializar_plantilla: {
        Args: { p_anio: string; p_plantilla: Json }
        Returns: undefined
      }
      ninos_de_escuela: {
        Args: { p_escuela: string }
        Returns: {
          apellidos: string
          familia_id: string
          fecha_nacimiento: string
          grupo_id: string
          id: string
          nombre: string
          nombre_preferido: string
        }[]
      }
      ninos_de_mi_familia: {
        Args: { p_escuela: string }
        Returns: {
          grupo_id: string
          id: string
          nombre: string
        }[]
      }
      sumar_familia: {
        Args: {
          p_email?: string
          p_escuela: string
          p_ninos: Json
          p_nombre: string
          p_token_hash: string
        }
        Returns: string
      }
      ver_invitacion: {
        Args: { p_token: string }
        Returns: {
          correo_coincide: boolean
          escuela_nombre: string
          escuela_slug: string
          estado: string
          familia_nombre: string
          requiere_correo: boolean
          rol: Database["public"]["Enums"]["rol_escuela"]
        }[]
      }
    }
    Enums: {
      estado_aporte: "registrado" | "confirmado" | "anulado"
      modalidad_ciclo: "jardin" | "escolar"
      moneda_aporte: "dinero" | "horas"
      rol_escuela:
        | "administracion"
        | "colegio_maestros"
        | "maestro_guia"
        | "maestro_especialidad"
        | "comision"
        | "familia"
      tipo_evento:
        | "jornada"
        | "asamblea"
        | "encuentro_1a1"
        | "taller"
        | "reunion_comision"
        | "festividad"
        | "otro"
      tipo_maestro: "guia" | "especialidad"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      estado_aporte: ["registrado", "confirmado", "anulado"],
      modalidad_ciclo: ["jardin", "escolar"],
      moneda_aporte: ["dinero", "horas"],
      rol_escuela: [
        "administracion",
        "colegio_maestros",
        "maestro_guia",
        "maestro_especialidad",
        "comision",
        "familia",
      ],
      tipo_evento: [
        "jornada",
        "asamblea",
        "encuentro_1a1",
        "taller",
        "reunion_comision",
        "festividad",
        "otro",
      ],
      tipo_maestro: ["guia", "especialidad"],
    },
  },
} as const
