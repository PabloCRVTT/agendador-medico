export interface Isapre {
  id: string
  nombre: string
}

export interface Especialidad {
  id: string
  nombre: string
  categoria: string
  slug: string
}

export interface Comuna {
  id: string
  nombre: string
}

export interface ClinicaResultado {
  clinica_id: string
  nombre: string
  direccion: string
  lat: number
  lng: number
  url_agenda: string
  tiene_convenio: boolean
  proxima_hora: string | null
  url_reserva: string | null
}

export interface Medico {
  id: string
  nombre: string
  especialidad_id: string
}

export interface SlotDisponible {
  id: string
  fecha_hora: string
  url_reserva: string
}
