class DomainRuleError(Exception):
    """Excepción lanzada cuando se viola una regla de negocio del dominio."""
    pass

class DomainPermissionError(Exception):
    """Excepción lanzada cuando un usuario no tiene permisos sobre una entidad del dominio."""
    pass
