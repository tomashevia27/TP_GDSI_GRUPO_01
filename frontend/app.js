const API_URL = `${window.location.protocol}//${window.location.hostname}:8000`;
const AUTH_SESSION_KEY = 'teamup_auth_user_id';

function usuarioAutenticado() {
    return sessionStorage.getItem(AUTH_SESSION_KEY) !== null;
}

function guardarSesion(usuarioId) {
    sessionStorage.setItem(AUTH_SESSION_KEY, String(usuarioId));
}

function obtenerUsuarioId() {
    return sessionStorage.getItem(AUTH_SESSION_KEY);
}

function limpiarSesion() {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
}

// Sistema de navegación SPA
function navegar(idDestino) {
    const vistasProtegidas = ['view-home', 'view-profile', 'view-edit-profile'];

    if (vistasProtegidas.includes(idDestino) && !usuarioAutenticado()) {
        idDestino = 'view-login';
    }

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

    if (idDestino === 'view-profile' || idDestino === 'view-edit-profile') {
        cargarPerfil();
    }
}

// Función para Iniciar Sesión (US 2)
async function iniciarSesion() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // Validación Front-end: ambos son requeridos
    if (!email || !password) {
        alert("El email y la contraseña son requeridos.");
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: email, password: password })
        });

        const data = await respuesta.json();

        if (respuesta.ok) {
            guardarSesion(data.usuario_id);
            alert("¡Inicio de sesión exitoso!");
            navegar('view-home'); // Panel principal
        } else {
            // Manejamos los errores que nos manda el backend
            if (Array.isArray(data.detail)) {
                alert("Por favor, ingresá un formato de email válido.");
            } else {
                alert(data.detail); // "Email o contraseña incorrectos", "La cuenta no está activa aún"
            }
        }
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        alert("No se pudo conectar con el servidor.");
    }
}

async function cargarPerfil() {
    const userId = obtenerUsuarioId();
    if (!userId) return;

    try {
        const respuesta = await fetch(`${API_URL}/usuarios/${userId}`);
        const data = await respuesta.json();

        if (respuesta.ok) {
            // Llenar vista de perfil
            document.getElementById('display-fullname').textContent = `${data.nombre} ${data.apellido}`;
            document.getElementById('display-zona').textContent = data.zona;
            document.getElementById('display-edad').textContent = data.edad;
            document.getElementById('display-genero').textContent = data.genero;
            
            const avatarUrl = data.foto_perfil || `https://ui-avatars.com/api/?name=${data.nombre}+${data.apellido}&background=198754&color=fff&size=200`;
            document.getElementById('display-avatar').src = avatarUrl;
            document.getElementById('edit-avatar-preview').src = avatarUrl;

            // Llenar inputs de edición
            document.getElementById('edit-nombre').value = data.nombre;
            document.getElementById('edit-apellido').value = data.apellido;
            document.getElementById('edit-edad').value = data.edad;
            document.getElementById('edit-genero').value = data.genero;
            document.getElementById('edit-zona').value = data.zona;
            document.getElementById('edit-password').value = ""; // No pre-llenar password

        }
    } catch (error) {
        console.error("Error al cargar el perfil:", error);
    }
}

async function guardarPerfil() {
    const userId = obtenerUsuarioId();
    if (!userId) return;

    const nombre = document.getElementById('edit-nombre').value.trim();
    const apellido = document.getElementById('edit-apellido').value.trim();
    const edad = document.getElementById('edit-edad').value;
    const genero = document.getElementById('edit-genero').value;
    const zona = document.getElementById('edit-zona').value.trim();
    const password = document.getElementById('edit-password').value;
    const fotoInput = document.getElementById('edit-foto');

    if (!nombre || !apellido) {
        alert("El nombre y apellido son obligatorios y no pueden quedar en blanco.");
        return;
    }

    if (!password) {
        alert("Debes ingresar tu contraseña (o una nueva) para confirmar los cambios.");
        return;
    }

    const datosUsuario = {
        nombre: nombre,
        apellido: apellido,
        edad: parseInt(edad),
        genero: genero,
        zona: zona,
        password: password
    };

    if (fotoInput.files && fotoInput.files[0]) {
        try {
            const urlImagen = await subirImagenACloudinary(fotoInput.files[0]);
            datosUsuario.foto_perfil = urlImagen;
        } catch (error) {
            alert("Error al subir la nueva foto de perfil.");
            return;
        }
    } else {
        // Si no sube una nueva, mandamos la que ya tenía (la URL actual del preview)
        const previewUrl = document.getElementById('edit-avatar-preview').src;
        if (!previewUrl.includes('ui-avatars.com')) {
            datosUsuario.foto_perfil = previewUrl;
        }
    }

    try {
        const respuesta = await fetch(`${API_URL}/usuarios/${userId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datosUsuario)
        });

        if (respuesta.ok) {
            alert("¡Perfil actualizado correctamente!");
            navegar('view-profile');
        } else {
            const data = await respuesta.json();
            alert("Error al actualizar perfil: " + (data.detail || "Datos inválidos"));
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión al actualizar el perfil.");
    }
}

function cerrarSesion() {
    limpiarSesion();
    navegar('view-login');
    // Limpiar inputs si fuera necesario
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
}
// --- Configuración de Cloudinary ---
// IMPORTANTE: Tenés que reemplazar estos valores con los de tu cuenta
const CLOUD_NAME = "dzsrgcgq6";
const UPLOAD_PRESET = "TeamUp_preset";

// Función para subir imagen a Cloudinary
async function subirImagenACloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const respuesta = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData
    });

    if (!respuesta.ok) {
        throw new Error("Error al subir la imagen a Cloudinary");
    }

    const data = await respuesta.json();
    return data.secure_url; // Cloudinary nos devuelve la URL definitiva
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
    const fotoInput = document.getElementById('reg-foto');

    const datosUsuario = {
        nombre: nombre,
        apellido: apellido,
        email: email,
        password: password,
        edad: edad,
        genero: genero,
        zona: zona
    };

    // Si el usuario seleccionó un archivo, lo subimos a Cloudinary primero
    if (fotoInput.files && fotoInput.files[0]) {
        const archivo = fotoInput.files[0];
        try {
            // Subimos a Cloudinary y guardamos la URL que nos devuelve
            const urlImagen = await subirImagenACloudinary(archivo);
            datosUsuario.foto_perfil = urlImagen;
        } catch (error) {
            console.error(error);
            alert("Hubo un problema al subir tu foto de perfil. Por favor, intentá de nuevo.");
            return; // Frenamos el registro para que no se cree el usuario sin la foto
        }
    }

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

                    switch (campo) {
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
