from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional

class AgendaBuilder:
    """Orquestador que cruza reglas de dominio de la Cancha con información de Partidos."""
    
    def __init__(self, cancha, fecha: date):
        self.cancha = cancha
        self.fecha = fecha
        self.slots = []

    def generar_slots_vacios(self, incluir_detalle: bool = False) -> 'AgendaBuilder':
        """Genera la grilla base vacía basándose en los horarios de la cancha."""
        if not self.cancha.opera_en_fecha(self.fecha):
            return self

        apertura, cierre = self.cancha.obtener_rango_datetime()
        duracion = self.cancha.duracion_turno
        
        actual = apertura
        while actual < cierre:
            fin_slot = actual + timedelta(minutes=duracion)
            if fin_slot > cierre:
                break
                
            slot_data = {
                "horario": actual.strftime("%H:%M"),
                "estado": "disponible"
            }
            
            if incluir_detalle:
                slot_data.update({
                    "partido_id": None,
                    "cliente_nombre": None,
                    "cliente_apellido": None,
                    "cliente_telefono": None,
                    "organizador_nombre": None,
                    "organizador_apellido": None,
                    "es_reserva_manual": False,
                })
                
            self.slots.append(slot_data)
            actual = fin_slot
            
        return self

    def inyectar_partidos(self, partidos: List, excluir_partido_id: Optional[int] = None, incluir_detalle: bool = False) -> 'AgendaBuilder':
        """Cruza los slots vacíos con los partidos existentes en la base de datos."""
        if not self.slots:
            return self

        duracion_td = timedelta(minutes=self.cancha.duracion_turno)

        for slot in self.slots:
            slot_inicio = datetime.combine(self.fecha, datetime.strptime(slot["horario"], "%H:%M").time())
            slot_fin = slot_inicio + duracion_td

            for p in partidos:
                if excluir_partido_id is not None and p.id == excluir_partido_id:
                    continue
                
                p_inicio = datetime.combine(p.fecha, p.horario)
                p_fin = p_inicio + duracion_td

                # Si hay solapamiento de horarios
                if slot_inicio < p_fin and slot_fin > p_inicio:
                    slot["estado"] = "bloqueado" if p.estado == "bloqueado" else "ocupado"
                    
                    if incluir_detalle:
                        slot["partido_id"] = p.id
                        slot["cliente_nombre"] = p.cliente_nombre
                        slot["cliente_apellido"] = p.cliente_apellido
                        slot["cliente_telefono"] = p.cliente_telefono
                        slot["organizador_nombre"] = p.organizador.nombre if p.organizador else None
                        slot["organizador_apellido"] = p.organizador.apellido if p.organizador else None
                        slot["es_reserva_manual"] = p.reserva_manual if p.reserva_manual is not None else False
                    break
                    
        return self

    def build(self) -> List[Dict[str, Any]]:
        """Devuelve la lista final de slots construidos."""
        return self.slots
