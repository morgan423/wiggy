/**
 * Types de la base — FICHIER GÉNÉRÉ par `npm run db:types` depuis le schéma
 * réel (les migrations rejouées sur un Postgres jetable).
 *
 * Ne pas éditer : modifier une migration, puis régénérer. Ces types sont ce qui
 * transforme une faute de frappe sur un nom de colonne en erreur de
 * compilation plutôt qu'en `undefined` silencieux à l'exécution.
 */

export type AppointmentSource = 'online' | 'manual'
export type AppointmentStatus = 'pending' | 'conditional' | 'confirmed' | 'in_progress' | 'done' | 'cancelled'
export type BookingConfirmationMode = 'auto' | 'manual'
export type NotificationKind = 'reponse_proposition' | 'annulation' | 'acompte_recu' | 'avis_recu' | 'demande_traitee'
export type PaymentMode = 'off' | 'client_choice' | 'required'
export type PropositionKind = 'contre_proposition' | 'forfait' | 'report'
export type PropositionStatus = 'en_attente' | 'acceptee' | 'refusee' | 'caduque'
export type ServiceAreaMode = 'communes' | 'radius'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled'
export type Tier = 'tier_1' | 'tier_2' | 'tier_3'

export type Database = {
  public: {
    Tables: {
      appointment_photos: {
        Row: {
        id: string
        appointment_id: string
        storage_path: string
        kind: string
        created_at: string
        }
        Insert: {
        id?: string
        appointment_id: string
        storage_path: string
        kind?: string
        created_at?: string
        }
        Update: {
        id?: string
        appointment_id?: string
        storage_path?: string
        kind?: string
        created_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
        id: string
        pro_id: string
        client_id: string | null
        service_id: string | null
        service_name: string
        price_cents: number
        starts_at: string
        ends_at: string
        status: AppointmentStatus
        source: AppointmentSource
        address_line1: string | null
        address_line2: string | null
        postal_code: string | null
        city: string | null
        lat: number | null
        lng: number | null
        access_notes: string | null
        note: string | null
        actual_duration_min: number | null
        completed_at: string | null
        travel_min_from_previous: number | null
        cancelled_at: string | null
        cancelled_by: string | null
        created_at: string
        updated_at: string
        out_of_zone: boolean
        stay_from: string | null
        stay_to: string | null
        public_token: string
        duration_declared: boolean
        }
        Insert: {
        id?: string
        pro_id: string
        client_id?: string | null
        service_id?: string | null
        service_name: string
        price_cents: number
        starts_at: string
        ends_at: string
        status?: AppointmentStatus
        source?: AppointmentSource
        address_line1?: string | null
        address_line2?: string | null
        postal_code?: string | null
        city?: string | null
        lat?: number | null
        lng?: number | null
        access_notes?: string | null
        note?: string | null
        actual_duration_min?: number | null
        completed_at?: string | null
        travel_min_from_previous?: number | null
        cancelled_at?: string | null
        cancelled_by?: string | null
        created_at?: string
        updated_at?: string
        out_of_zone?: boolean
        stay_from?: string | null
        stay_to?: string | null
        public_token?: string
        duration_declared?: boolean
        }
        Update: {
        id?: string
        pro_id?: string
        client_id?: string | null
        service_id?: string | null
        service_name?: string
        price_cents?: number
        starts_at?: string
        ends_at?: string
        status?: AppointmentStatus
        source?: AppointmentSource
        address_line1?: string | null
        address_line2?: string | null
        postal_code?: string | null
        city?: string | null
        lat?: number | null
        lng?: number | null
        access_notes?: string | null
        note?: string | null
        actual_duration_min?: number | null
        completed_at?: string | null
        travel_min_from_previous?: number | null
        cancelled_at?: string | null
        cancelled_by?: string | null
        created_at?: string
        updated_at?: string
        out_of_zone?: boolean
        stay_from?: string | null
        stay_to?: string | null
        public_token?: string
        duration_declared?: boolean
        }
        Relationships: []
      }
      blocked_slots: {
        Row: {
        id: string
        pro_id: string
        starts_at: string
        ends_at: string
        label: string | null
        created_at: string
        }
        Insert: {
        id?: string
        pro_id: string
        starts_at: string
        ends_at: string
        label?: string | null
        created_at?: string
        }
        Update: {
        id?: string
        pro_id?: string
        starts_at?: string
        ends_at?: string
        label?: string | null
        created_at?: string
        }
        Relationships: []
      }
      city_waitlist: {
        Row: {
        id: string
        email: string
        city_key: string
        city_name: string
        postal_code: string | null
        insee_code: string | null
        created_at: string
        notified_at: string | null
        }
        Insert: {
        id?: string
        email: string
        city_key: string
        city_name: string
        postal_code?: string | null
        insee_code?: string | null
        created_at?: string
        notified_at?: string | null
        }
        Update: {
        id?: string
        email?: string
        city_key?: string
        city_name?: string
        postal_code?: string | null
        insee_code?: string | null
        created_at?: string
        notified_at?: string | null
        }
        Relationships: []
      }
      client_addresses: {
        Row: {
        id: string
        client_id: string
        label: string | null
        line1: string
        line2: string | null
        postal_code: string | null
        city: string | null
        lat: number | null
        lng: number | null
        access_notes: string | null
        is_primary: boolean
        }
        Insert: {
        id?: string
        client_id: string
        label?: string | null
        line1: string
        line2?: string | null
        postal_code?: string | null
        city?: string | null
        lat?: number | null
        lng?: number | null
        access_notes?: string | null
        is_primary?: boolean
        }
        Update: {
        id?: string
        client_id?: string
        label?: string | null
        line1?: string
        line2?: string | null
        postal_code?: string | null
        city?: string | null
        lat?: number | null
        lng?: number | null
        access_notes?: string | null
        is_primary?: boolean
        }
        Relationships: []
      }
      client_notes: {
        Row: {
        id: string
        pro_id: string
        client_id: string
        appointment_id: string | null
        fait_le: string
        contenu: string
        created_at: string
        }
        Insert: {
        id?: string
        pro_id: string
        client_id: string
        appointment_id?: string | null
        fait_le?: string
        contenu: string
        created_at?: string
        }
        Update: {
        id?: string
        pro_id?: string
        client_id?: string
        appointment_id?: string | null
        fait_le?: string
        contenu?: string
        created_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
        id: string
        pro_id: string
        first_name: string
        last_name: string | null
        phone: string | null
        email: string | null
        technical_notes: string | null
        typical_return_days: number | null
        created_at: string
        updated_at: string
        phone_verified_at: string | null
        }
        Insert: {
        id?: string
        pro_id: string
        first_name: string
        last_name?: string | null
        phone?: string | null
        email?: string | null
        technical_notes?: string | null
        typical_return_days?: number | null
        created_at?: string
        updated_at?: string
        phone_verified_at?: string | null
        }
        Update: {
        id?: string
        pro_id?: string
        first_name?: string
        last_name?: string | null
        phone?: string | null
        email?: string | null
        technical_notes?: string | null
        typical_return_days?: number | null
        created_at?: string
        updated_at?: string
        phone_verified_at?: string | null
        }
        Relationships: []
      }
      communes: {
        Row: {
        insee_code: string
        name: string
        postal_codes: string[]
        lat: number | null
        lng: number | null
        population: number
        search_key: string
        updated_at: string
        }
        Insert: {
        insee_code: string
        name: string
        postal_codes?: string[]
        lat?: number | null
        lng?: number | null
        population?: number
        search_key: string
        updated_at?: string
        }
        Update: {
        insee_code?: string
        name?: string
        postal_codes?: string[]
        lat?: number | null
        lng?: number | null
        population?: number
        search_key?: string
        updated_at?: string
        }
        Relationships: []
      }
      communes_import: {
        Row: {
        id: boolean
        importe_le: string
        lignes: number
        }
        Insert: {
        id?: boolean
        importe_le?: string
        lignes?: number
        }
        Update: {
        id?: boolean
        importe_le?: string
        lignes?: number
        }
        Relationships: []
      }
      distance_fees: {
        Row: {
        id: string
        pro_id: string
        from_km: number
        fee_cents: number
        }
        Insert: {
        id?: string
        pro_id: string
        from_km: number
        fee_cents: number
        }
        Update: {
        id?: string
        pro_id?: string
        from_km?: number
        fee_cents?: number
        }
        Relationships: []
      }
      geocodage_refus: {
        Row: {
        id: string
        requete: string
        code_postal: string | null
        ville: string | null
        candidats: unknown
        origine: string
        created_at: string
        }
        Insert: {
        id?: string
        requete: string
        code_postal?: string | null
        ville?: string | null
        candidats?: unknown
        origine: string
        created_at?: string
        }
        Update: {
        id?: string
        requete?: string
        code_postal?: string | null
        ville?: string | null
        candidats?: unknown
        origine?: string
        created_at?: string
        }
        Relationships: []
      }
      journees: {
        Row: {
        pro_id: string
        jour: string
        lancee_at: string
        }
        Insert: {
        pro_id: string
        jour: string
        lancee_at?: string
        }
        Update: {
        pro_id?: string
        jour?: string
        lancee_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
        id: string
        pro_id: string
        kind: NotificationKind
        titre: string
        detail: string | null
        lien: string | null
        lu_le: string | null
        created_at: string
        }
        Insert: {
        id?: string
        pro_id: string
        kind: NotificationKind
        titre: string
        detail?: string | null
        lien?: string | null
        lu_le?: string | null
        created_at?: string
        }
        Update: {
        id?: string
        pro_id?: string
        kind?: NotificationKind
        titre?: string
        detail?: string | null
        lien?: string | null
        lu_le?: string | null
        created_at?: string
        }
        Relationships: []
      }
      phone_verifications: {
        Row: {
        id: string
        pro_id: string | null
        phone: string
        code_hash: string
        usage: string
        expires_at: string
        attempts: number
        consumed_at: string | null
        created_at: string
        }
        Insert: {
        id?: string
        pro_id?: string | null
        phone: string
        code_hash: string
        usage?: string
        expires_at: string
        attempts?: number
        consumed_at?: string | null
        created_at?: string
        }
        Update: {
        id?: string
        pro_id?: string | null
        phone?: string
        code_hash?: string
        usage?: string
        expires_at?: string
        attempts?: number
        consumed_at?: string | null
        created_at?: string
        }
        Relationships: []
      }
      pro_photos: {
        Row: {
        id: string
        pro_id: string
        chemin: string
        position: number
        created_at: string
        }
        Insert: {
        id?: string
        pro_id: string
        chemin: string
        position?: number
        created_at?: string
        }
        Update: {
        id?: string
        pro_id?: string
        chemin?: string
        position?: number
        created_at?: string
        }
        Relationships: []
      }
      pro_settings: {
        Row: {
        pro_id: string
        payment_mode: PaymentMode
        default_deposit_percent: number
        booking_confirmation_mode: BookingConfirmationMode
        free_cancellation_hours: number
        new_client_buffer_min: number
        sms_enabled: boolean
        gps_app: string
        updated_at: string
        push_reponse_cliente: boolean
        push_avis: boolean
        }
        Insert: {
        pro_id: string
        payment_mode?: PaymentMode
        default_deposit_percent?: number
        booking_confirmation_mode?: BookingConfirmationMode
        free_cancellation_hours?: number
        new_client_buffer_min?: number
        sms_enabled?: boolean
        gps_app?: string
        updated_at?: string
        push_reponse_cliente?: boolean
        push_avis?: boolean
        }
        Update: {
        pro_id?: string
        payment_mode?: PaymentMode
        default_deposit_percent?: number
        booking_confirmation_mode?: BookingConfirmationMode
        free_cancellation_hours?: number
        new_client_buffer_min?: number
        sms_enabled?: boolean
        gps_app?: string
        updated_at?: string
        push_reponse_cliente?: boolean
        push_avis?: boolean
        }
        Relationships: []
      }
      propositions: {
        Row: {
        id: string
        appointment_id: string
        pro_id: string
        kind: PropositionKind
        status: PropositionStatus
        service_id: string | null
        service_name: string | null
        price_cents: number | null
        duration_min: number | null
        starts_at: string | null
        message: string | null
        public_token: string
        created_at: string
        responded_at: string | null
        }
        Insert: {
        id?: string
        appointment_id: string
        pro_id: string
        kind: PropositionKind
        status?: PropositionStatus
        service_id?: string | null
        service_name?: string | null
        price_cents?: number | null
        duration_min?: number | null
        starts_at?: string | null
        message?: string | null
        public_token?: string
        created_at?: string
        responded_at?: string | null
        }
        Update: {
        id?: string
        appointment_id?: string
        pro_id?: string
        kind?: PropositionKind
        status?: PropositionStatus
        service_id?: string | null
        service_name?: string | null
        price_cents?: number | null
        duration_min?: number | null
        starts_at?: string | null
        message?: string | null
        public_token?: string
        created_at?: string
        responded_at?: string | null
        }
        Relationships: []
      }
      pros: {
        Row: {
        id: string
        slug: string
        display_name: string
        headline: string | null
        bio: string | null
        city: string | null
        photo_url: string | null
        instagram_url: string | null
        phone: string | null
        years_experience: number | null
        published: boolean
        created_at: string
        updated_at: string
        pronoun: string | null
        phone_verified_at: string | null
        mode: string
        start_line1: string | null
        start_postal_code: string | null
        start_city: string | null
        start_lat: number | null
        start_lng: number | null
        }
        Insert: {
        id: string
        slug: string
        display_name: string
        headline?: string | null
        bio?: string | null
        city?: string | null
        photo_url?: string | null
        instagram_url?: string | null
        phone?: string | null
        years_experience?: number | null
        published?: boolean
        created_at?: string
        updated_at?: string
        pronoun?: string | null
        phone_verified_at?: string | null
        mode?: string
        start_line1?: string | null
        start_postal_code?: string | null
        start_city?: string | null
        start_lat?: number | null
        start_lng?: number | null
        }
        Update: {
        id?: string
        slug?: string
        display_name?: string
        headline?: string | null
        bio?: string | null
        city?: string | null
        photo_url?: string | null
        instagram_url?: string | null
        phone?: string | null
        years_experience?: number | null
        published?: boolean
        created_at?: string
        updated_at?: string
        pronoun?: string | null
        phone_verified_at?: string | null
        mode?: string
        start_line1?: string | null
        start_postal_code?: string | null
        start_city?: string | null
        start_lat?: number | null
        start_lng?: number | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
        cle: string
        fenetre_debut: string
        compteur: number
        }
        Insert: {
        cle: string
        fenetre_debut?: string
        compteur?: number
        }
        Update: {
        cle?: string
        fenetre_debut?: string
        compteur?: number
        }
        Relationships: []
      }
      service_area_communes: {
        Row: {
        pro_id: string
        insee_code: string
        name: string
        postal_code: string | null
        lat: number | null
        lng: number | null
        }
        Insert: {
        pro_id: string
        insee_code: string
        name: string
        postal_code?: string | null
        lat?: number | null
        lng?: number | null
        }
        Update: {
        pro_id?: string
        insee_code?: string
        name?: string
        postal_code?: string | null
        lat?: number | null
        lng?: number | null
        }
        Relationships: []
      }
      service_areas: {
        Row: {
        pro_id: string
        mode: ServiceAreaMode
        center_lat: number | null
        center_lng: number | null
        radius_km: number | null
        }
        Insert: {
        pro_id: string
        mode?: ServiceAreaMode
        center_lat?: number | null
        center_lng?: number | null
        radius_km?: number | null
        }
        Update: {
        pro_id?: string
        mode?: ServiceAreaMode
        center_lat?: number | null
        center_lng?: number | null
        radius_km?: number | null
        }
        Relationships: []
      }
      services: {
        Row: {
        id: string
        pro_id: string
        name: string
        description: string | null
        price_cents: number
        duration_min: number
        deposit_percent: number | null
        active: boolean
        position: number
        created_at: string
        category: string | null
        photos_required: boolean
        }
        Insert: {
        id?: string
        pro_id: string
        name: string
        description?: string | null
        price_cents: number
        duration_min: number
        deposit_percent?: number | null
        active?: boolean
        position?: number
        created_at?: string
        category?: string | null
        photos_required?: boolean
        }
        Update: {
        id?: string
        pro_id?: string
        name?: string
        description?: string | null
        price_cents?: number
        duration_min?: number
        deposit_percent?: number | null
        active?: boolean
        position?: number
        created_at?: string
        category?: string | null
        photos_required?: boolean
        }
        Relationships: []
      }
      sms_usage: {
        Row: {
        pro_id: string
        period_start: string
        sent: number
        alerted_at: string | null
        }
        Insert: {
        pro_id: string
        period_start: string
        sent?: number
        alerted_at?: string | null
        }
        Update: {
        pro_id?: string
        period_start?: string
        sent?: number
        alerted_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
        pro_id: string
        tier: Tier
        status: SubscriptionStatus
        trial_ends_at: string | null
        current_period_end: string | null
        cancel_at_period_end: boolean
        stripe_customer_id: string | null
        stripe_subscription_id: string | null
        is_ambassador: boolean
        ambassador_until: string | null
        updated_at: string
        }
        Insert: {
        pro_id: string
        tier?: Tier
        status?: SubscriptionStatus
        trial_ends_at?: string | null
        current_period_end?: string | null
        cancel_at_period_end?: boolean
        stripe_customer_id?: string | null
        stripe_subscription_id?: string | null
        is_ambassador?: boolean
        ambassador_until?: string | null
        updated_at?: string
        }
        Update: {
        pro_id?: string
        tier?: Tier
        status?: SubscriptionStatus
        trial_ends_at?: string | null
        current_period_end?: string | null
        cancel_at_period_end?: boolean
        stripe_customer_id?: string | null
        stripe_subscription_id?: string | null
        is_ambassador?: boolean
        ambassador_until?: string | null
        updated_at?: string
        }
        Relationships: []
      }
      time_off: {
        Row: {
        id: string
        pro_id: string
        starts_at: string
        ends_at: string
        label: string | null
        }
        Insert: {
        id?: string
        pro_id: string
        starts_at: string
        ends_at: string
        label?: string | null
        }
        Update: {
        id?: string
        pro_id?: string
        starts_at?: string
        ends_at?: string
        label?: string | null
        }
        Relationships: []
      }
      working_hours: {
        Row: {
        id: string
        pro_id: string
        weekday: number
        starts_at: string
        ends_at: string
        }
        Insert: {
        id?: string
        pro_id: string
        weekday: number
        starts_at: string
        ends_at: string
        }
        Update: {
        id?: string
        pro_id?: string
        weekday?: number
        starts_at?: string
        ends_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      consommer_quota: {
        Args: { p_cle: string; p_limite: number; p_fenetre_sec: number }
        Returns: boolean
      }
      consommer_sms: {
        Args: { p_pro: string; p_mois: string }
        Returns: number
      }
      marquer_alerte_sms: {
        Args: { p_pro: string; p_mois: string }
        Returns: boolean
      }
    }
    Enums: {
      appointment_source: AppointmentSource
      appointment_status: AppointmentStatus
      booking_confirmation_mode: BookingConfirmationMode
      notification_kind: NotificationKind
      payment_mode: PaymentMode
      proposition_kind: PropositionKind
      proposition_status: PropositionStatus
      service_area_mode: ServiceAreaMode
      subscription_status: SubscriptionStatus
      tier: Tier
    }
    CompositeTypes: Record<string, never>
  }
}

/** Raccourci : le type d'une ligne de table. */
export type Ligne<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
