const API_URL = "http://127.0.0.1:8000";

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
            alert("Error al registrarse: " + data.detail);
        }
    } catch (error) {
        console.error("Error de conexión:", error);
        alert("No se pudo conectar con el servidor. Revisá que FastAPI esté corriendo.");
    }
}
