from ..core.exceptions import DomainRuleError, DomainPermissionError
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date, Time, Table
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from ..core.db import Base

partido_jugadores = Table(
    "partido_jugadores",
    Base.metadata,
    Column("partido_id", Integer, ForeignKey("partidos.id"), primary_key=True),
    Column("usuario_id", Integer, ForeignKey("usuarios.id"), primary_key=True),
)

class Partido(Base):
    __tablename__ = "partidos"

    id = Column(Integer, primary_key=True, index=True)
    cancha_id = Column(Integer, ForeignKey("canchas.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    horario = Column(Time, nullable=False)
    modalidad = Column(String, nullable=False)
    tipo = Column(String, nullable=False)  # "abierto" o "cerrado"
    cantidad_jugadores = Column(Integer, nullable=False)
    cupos_disponibles = Column(Integer, nullable=False, default=0)
    descripcion = Column(String, nullable=True)
    estado = Column(String, nullable=False, default="pendiente")
    organizador_id = Column(Integer, ForeignKey("usuarios.id")) # hay que agregar nullable=False luego
    cliente_nombre = Column(String(200), nullable=True)
    cliente_apellido = Column(String(200), nullable=True)
    cliente_telefono = Column(String(50), nullable=True)
    reserva_manual = Column(Boolean, default=False)

    cancha = relationship("Cancha", back_populates="partidos")
    organizador = relationship("Usuario", back_populates="partidos_organizados")
    jugadores = relationship("Usuario", secondary=partido_jugadores, back_populates="partidos_inscritos")

    # ─────────────────────────────────────────────
    # Factory Methods
    # ─────────────────────────────────────────────
    @classmethod
    def crear_abierto(cls, cancha_id, fecha, horario, modalidad, cantidad_jugadores, cupos_disponibles, descripcion, organizador_id):
        if cupos_disponibles is None or cupos_disponibles < 1 or cupos_disponibles >= cantidad_jugadores:
            raise DomainRuleError(f"Para partidos abiertos, debes especificar entre 1 y {cantidad_jugadores - 1} cupos disponibles")
        return cls(
            cancha_id=cancha_id, fecha=fecha, horario=horario, modalidad=modalidad,
            tipo="abierto", cantidad_jugadores=cantidad_jugadores, cupos_disponibles=cupos_disponibles,
            descripcion=descripcion, estado="pendiente", organizador_id=organizador_id
        )

    @classmethod
    def crear_cerrado(cls, cancha_id, fecha, horario, modalidad, cantidad_jugadores, descripcion, organizador_id):
        return cls(
            cancha_id=cancha_id, fecha=fecha, horario=horario, modalidad=modalidad,
            tipo="cerrado", cantidad_jugadores=cantidad_jugadores, cupos_disponibles=0,
            descripcion=descripcion, estado="pendiente", organizador_id=organizador_id
        )

    @classmethod
    def crear_reserva_manual(cls, cancha_id, fecha, horario, modalidad, cantidad_jugadores, organizador_id, cliente_nombre, cliente_apellido, cliente_telefono):
        return cls(
            cancha_id=cancha_id, fecha=fecha, horario=horario, modalidad=modalidad,
            tipo="cerrado", cantidad_jugadores=cantidad_jugadores, cupos_disponibles=0,
            estado="pendiente", organizador_id=organizador_id,
            cliente_nombre=cliente_nombre, cliente_apellido=cliente_apellido,
            cliente_telefono=cliente_telefono, reserva_manual=True
        )

    @classmethod
    def crear_bloqueo(cls, cancha_id, fecha, horario, modalidad, cantidad_jugadores, organizador_id):
        return cls(
            cancha_id=cancha_id, fecha=fecha, horario=horario, modalidad=modalidad,
            tipo="cerrado", cantidad_jugadores=cantidad_jugadores, cupos_disponibles=0,
            estado="bloqueado", organizador_id=organizador_id, reserva_manual=True
        )

    # ─────────────────────────────────────────────
    # Comportamientos de Dominio
    # ─────────────────────────────────────────────
    def inscribir_jugador(self, usuario):
        if self.organizador_id == usuario.id:
            raise DomainRuleError("El organizador no puede inscribirse nuevamente en su propio partido")
        if self.tipo != "abierto":
            raise DomainRuleError("Solo te podés inscribir en partidos abiertos")
        if self.estado == "Cancelado":
            raise DomainRuleError("No te podés inscribir a un partido cancelado")
        if any(jugador.id == usuario.id for jugador in self.jugadores):
            raise DomainRuleError("Ya estás inscripto en este partido")
        if self.cupos_disponibles <= 0:
            raise DomainRuleError("El partido ya no tiene cupos disponibles")
            
        self.cupos_disponibles -= 1
        self.jugadores.append(usuario)

    def bajar_jugador(self, usuario, hora_actual):
        if self.tipo != "abierto":
            raise DomainRuleError("Solo te podés bajar de partidos abiertos")
        if self.estado == "Cancelado":
            raise DomainRuleError("No te podés bajar de un partido cancelado")
        if not any(jugador.id == usuario.id for jugador in self.jugadores):
            raise DomainRuleError("No estás inscripto en este partido")

        hora_partido_limpia = self.horario.replace(tzinfo=None) if hasattr(self.horario, 'replace') else self.horario
        partido_inicio = datetime.combine(self.fecha, hora_partido_limpia)
        # Se permite bajarse en cualquier momento antes del inicio del partido.
        if hora_actual >= partido_inicio:
            raise DomainRuleError("El partido ya comenzó o está en curso")

        debe_otorgar_partido_a_favor = (partido_inicio - hora_actual) >= timedelta(hours=2)

        self.cupos_disponibles += 1
        self.jugadores = [j for j in self.jugadores if j.id != usuario.id]

        # Devuelve True si corresponde otorgar un "partido a favor" por baja anticipada.
        return debe_otorgar_partido_a_favor

    def cancelar_por_organizador(self, usuario_id):
        if self.organizador_id != usuario_id:
            raise DomainPermissionError("Solo el organizador puede cancelar este partido")
        if self.estado == "Cancelado":
            raise DomainRuleError("El partido ya se encuentra cancelado")
        self.estado = "Cancelado"

    def cancelar_por_admin(self):
        if self.estado == "Cancelado":
            raise DomainRuleError("La reserva ya se encuentra cancelada")
        if self.estado == "bloqueado":
            raise DomainRuleError("Para desbloquear un turno, usá la función de desbloqueo")
        self.estado = "Cancelado"

    def verificar_desbloqueo(self):
        if self.estado != "bloqueado":
            raise DomainRuleError("El turno no está bloqueado")

    def verificar_edicion(self, usuario_id):
        if self.organizador_id != usuario_id:
            raise DomainPermissionError("Solo el organizador puede editar este partido")
        if self.estado == "Cancelado":
            raise DomainRuleError("No se puede editar un partido cancelado")

    def actualizar_datos(self, cancha_id, fecha, horario, modalidad, cantidad_jugadores, tipo, cupos_disponibles, descripcion):
        if self.cantidad_jugadores != cantidad_jugadores:
            raise DomainRuleError("No se puede cambiar la modalidad del partido. Si deseas jugar en otra modalidad, cancelá el partido y creá uno nuevo.")
            
        if tipo == "abierto":
            if cupos_disponibles is None or cupos_disponibles < 1 or cupos_disponibles >= cantidad_jugadores:
                raise DomainRuleError(f"Para partidos abiertos, debes especificar entre 1 y {cantidad_jugadores - 1} cupos disponibles")
        else:
            cupos_disponibles = 0

        self.cancha_id = cancha_id
        self.fecha = fecha
        self.horario = horario
        self.modalidad = modalidad
        self.tipo = tipo
        self.cupos_disponibles = cupos_disponibles
        if descripcion is not None:
            self.descripcion = descripcion

    def verificar_reprogramacion(self):
        if self.estado == "Cancelado":
            raise DomainRuleError("No se puede reprogramar una reserva cancelada")
        if self.estado == "bloqueado":
            raise DomainRuleError("No se puede reprogramar un turno bloqueado")

    def obtener_fecha_hora_legible(self):
        return self.fecha.strftime("%d/%m/%Y"), self.horario.strftime("%H:%M")

    def reprogramar(self, cancha_id, fecha, horario, modalidad=None, cantidad_jugadores=None):
        self.cancha_id = cancha_id
        self.fecha = fecha
        self.horario = horario
        if modalidad:
            self.modalidad = modalidad
            self.cantidad_jugadores = cantidad_jugadores