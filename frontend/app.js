const API_URL = `${window.location.protocol}//${window.location.hostname}:8000`;

// Sistema de navegación SPA
function navegar(idDestino) {
    // 1. Ocultar todas las vistas
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    // 2. Mostrar la vista destino
    document.getElementById(idDestino).classList.add('active');

    // 3. Lógica de la Navbar Top
    const navbar = document.getElementById('main-navbar');
    if (idDestino === 'view-login' || idDestino === 'view-registro') {
        navbar.style.display = 'none'; // Ocultar navbar en login/registro
    } else {
        navbar.style.display = 'flex'; // Mostrar navbar en la app
        
        // Actualizar links activos
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active', 'fw-bold'));
        
        if (idDestino === 'view-home') {
            document.getElementById('nav-home').classList.add('active', 'fw-bold');
        } else if (idDestino === 'view-profile' || idDestino === 'view-edit-profile') {
            document.getElementById('nav-profile').classList.add('active', 'fw-bold');
        }
    }
    
    // Volver arriba al cambiar de página
    window.scrollTo(0, 0);
}

// Funciones simuladas
function simularLogin() {
    navegar('view-home');
}

function guardarPerfil() {
    navegar('view-profile');
}

function cerrarSesion() {
    navegar('view-login');
    // Limpiar inputs si fuera necesario
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
}

// Funciones de Conexión con el Backend
async function registrarUsuario() {
    const nombre = document.getElementById('reg-nombre').value;
    const apellido = document.getElementById('reg-apellido').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const edad = parseInt(document.getElementById('reg-edad').value);
    const genero = document.getElementById('reg-genero').value;
    const zona = document.getElementById('reg-zona').value;

    const datosUsuario = {
        nombre: nombre,
        apellido: apellido,
        email: email,
        password: password,
        edad: edad,
        genero: genero,
        zona: zona
    };

    try {
        const respuesta = await fetch(`${API_URL}/registro`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datosUsuario)
        });

        const data = await respuesta.json();

        if (respuesta.ok) {
            alert(`¡Registro exitoso! Hola ${data.nombre}`);
            navegar('view-login');
        } else {
            // Si FastAPI detectó datos inválidos, devuelve una lista de errores en "data.detail"
            if (Array.isArray(data.detail)) {
                // Recorremos la lista de errores para armar un mensaje claro y amigable
                let mensajesError = data.detail.map(err => {
                    const campo = err.loc[err.loc.length - 1]; // "email", "nombre", etc.
                    
                    switch(campo) {
                        case 'nombre':
                            return "• El nombre no puede estar vacío.";
                        case 'apellido':
                            return "• El apellido no puede estar vacío.";
                        case 'password':
                            return "• La contraseña debe tener como mínimo 8 caracteres.";
                        case 'email':
                            return "• El email ingresado no es válido (ej: usuario@correo.com).";
                        case 'edad':
                            return "• La edad debe ser un número válido.";
                        case 'genero':
                            return "• Tenés que seleccionar una opción de género.";
                        case 'zona':
                            return "• La zona de juego no puede estar vacía.";
                        default:
                            return `• Por favor, revisá el campo: ${campo}.`;
                    }
                });
                alert("Revisá los datos ingresados:\n\n" + mensajesError.join('\n'));
            } else {
                // Errores generales (ej: "El email ya existe")
                alert("Error al registrarse: " + data.detail);
            }
        }
    } catch (error) {
        console.error("Error de conexión:", error);
        alert("No se pudo conectar con el servidor. Revisá que FastAPI esté corriendo.");
    }
}
