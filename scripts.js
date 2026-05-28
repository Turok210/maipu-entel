
// ===============================
// CONFIG SUPABASE
// ===============================

const SUPABASE_URL = 'https://eknenqltbbqoynvczxsc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrbmVucWx0YmJxb3ludmN6eHNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MTk0NzIsImV4cCI6MjA5NTQ5NTQ3Mn0.Kiq8IM_AxYTVJY_GkkX-o8S4toJ1SyocvBr6Ks_K_qI';

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ===============================
// VARIABLES GLOBALES
// ===============================

const today = new Date().toLocaleDateString();

document.getElementById('displayDate').innerText = `Fecha: ${today}`;

let ventas = [];

// POR AHORA estos siguen en localStorage
let ejecutivos = JSON.parse(
    localStorage.getItem('ejecutivosMaipu')
) || [
    "JORGE",
    "BARBARA",
    "CLAUDIA",
    "NOHAM",
    "AGUSTIN",
    "ALEX",
    "RODRIGO T",
    "NICOLAS"
];

let nombreTienda = localStorage.getItem(
    'tituloTiendaMaipu'
) || "Cierre Tienda Maipú Plaza";

let ventaEditandoId = null;
let ventaEliminarId = null;

let currentPageHoy = 1;
let currentPageHistorico = 1;

const pageSize = 10;

// ===============================
// CARGAR VENTAS
// ===============================

async function cargarVentas() {

    const { data, error } = await supabaseClient
        .from('ventas')
        .select('*')
        .order('id', { ascending: false });

    if(error) {
        console.error('Error cargando ventas:', error);
        alert('Error cargando ventas');
        return;
    }

    ventas = data || [];

    actualizarUI();
}

// ===============================
// ACTUALIZAR UI
// ===============================

function actualizarUI() {

    document.getElementById('tituloTiendaHeader').innerText = nombreTienda;

    document.getElementById('docTitle').innerText = nombreTienda;

    renderEjecutivos();

    renderKPIs(
        'grid-hoy',
        ventas.filter(v => v.fecha === today)
    );

    renderKPIs(
        'grid-acumulado',
        ventas
    );

    renderTablaDetalleHoy();

    renderTablaDetalleHistorico();

    renderTablaEjecutivo(
        'tabla-ejec-hoy',
        ventas.filter(v => v.fecha === today)
    );

    renderTablaEjecutivo(
        'tabla-ejec-acum',
        ventas
    );
}

// ===============================
// CAMBIAR NOMBRE TIENDA
// ===============================

function cambiarNombreTienda() {

    const nuevo = document
        .getElementById('nuevoNombreTienda')
        .value;

    if(!nuevo) return;

    nombreTienda = nuevo;

    localStorage.setItem(
        'tituloTiendaMaipu',
        nombreTienda
    );

    actualizarUI();
}

// ===============================
// EJECUTIVOS
// ===============================

function renderEjecutivos() {

    const select = document.getElementById('ejecutivo');

    select.innerHTML = ejecutivos
        .map(e => `
            <option value="${e}">
                ${e}
            </option>
        `)
        .join('');

    const lista = document.getElementById('listaEjecutivos');

    lista.innerHTML = ejecutivos
        .map(e => `
            <li class="flex justify-between items-center bg-gray-50 p-2 rounded text-xs">
                ${e}

                <button
                    onclick="eliminarEjecutivo('${e}')"
                    class="text-red-500 font-bold"
                >
                    X
                </button>
            </li>
        `)
        .join('');
}

function agregarEjecutivo() {

    const nombre = document
        .getElementById('nuevoEjecutivo')
        .value
        .toUpperCase();

    if(!nombre) return;

    if(ejecutivos.includes(nombre)) return;

    ejecutivos.push(nombre);

    localStorage.setItem(
        'ejecutivosMaipu',
        JSON.stringify(ejecutivos)
    );

    document.getElementById('nuevoEjecutivo').value = '';

    actualizarUI();
}

function eliminarEjecutivo(nombre) {

    ejecutivos = ejecutivos.filter(
        e => e !== nombre
    );

    localStorage.setItem(
        'ejecutivosMaipu',
        JSON.stringify(ejecutivos)
    );

    actualizarUI();
}

// ===============================
// REGISTRAR / EDITAR VENTA
// ===============================

document
    .getElementById('ventaForm')
    .addEventListener('submit', async (e) => {

        e.preventDefault();

        const venta = {
            fecha: today,
            ejecutivo: document.getElementById('ejecutivo').value,
            tipo: document.getElementById('tipo').value,
            monto: parseFloat(
                document.getElementById('monto').value
            )
        };

        // NUEVA VENTA
        if(ventaEditandoId === null) {

            const { error } = await supabaseClient
                .from('ventas')
                .insert([venta]);

            if(error) {
                console.error(error);
                alert('Error registrando venta');
                return;
            }
        }

        // EDITAR VENTA
        else {

            const { error } = await supabaseClient
                .from('ventas')
                .update(venta)
                .eq('id', ventaEditandoId);

            if(error) {
                console.error(error);
                alert('Error actualizando venta');
                return;
            }

            resetForm();
        }

        e.target.reset();

        await cargarVentas();
    });

// ===============================
// KPIs
// ===============================

function renderKPIs(containerId, data) {

    const container = document.getElementById(containerId);

    const tipos = [
        "Línea Nueva",
        "Portabilidad",
        "Hogar",
        "Equipos",
        "Accesorios"
    ];

    const colors = [
        "bg-indigo-600",
        "bg-blue-600",
        "bg-emerald-600",
        "bg-orange-500",
        "bg-purple-600"
    ];

    container.innerHTML = tipos
        .map((t, i) => {

            const total = data
                .filter(v => v.tipo === t)
                .reduce((sum, v) => sum + Number(v.monto), 0);

            return `
                <div class="${colors[i]} text-white p-3 rounded-lg shadow">

                    <p class="text-[10px] uppercase">
                        ${t}
                    </p>

                    <h3 class="text-md font-bold">
                        $${total.toLocaleString()}
                    </h3>

                </div>
            `;
        })
        .join('');
}

// ===============================
// TABLA HOY
// ===============================

function renderTablaDetalleHoy() {

    const data = ventas.filter(
        v => v.fecha === today
    );

    const tabla = document.getElementById(
        'tablaDetalleHoy'
    );

    const startIndex = (
        (currentPageHoy - 1) * pageSize
    );

    const paginatedItems = data.slice(
        startIndex,
        startIndex + pageSize
    );

    tabla.innerHTML = paginatedItems
        .map(v => `
            <tr>

                <td class="p-2 border">
                    ${v.fecha}
                </td>

                <td class="p-2 border">
                    ${v.ejecutivo}
                </td>

                <td class="p-2 border">
                    ${v.tipo}
                </td>

                <td class="p-2 border">
                    $${Number(v.monto).toLocaleString()}
                </td>

                <td class="p-2 border">

                    <button
                        onclick="editarVenta(${v.id})"
                        class="text-blue-600 font-bold mr-2"
                    >
                        Editar
                    </button>

                    <button
                        onclick="prepararEliminar(${v.id})"
                        class="text-red-600 font-bold"
                    >
                        Eliminar
                    </button>

                </td>

            </tr>
        `)
        .join('');

    renderPaginacionHoy(data.length);
}

function renderPaginacionHoy(totalItems) {

    const controls = document.getElementById(
        'paginationHoyControls'
    );

    const totalPages = Math.ceil(
        totalItems / pageSize
    );

    controls.innerHTML = Array
        .from({ length: totalPages }, (_, i) => `
            <button
                onclick="changePageHoy(${i + 1})"
                class="px-3 py-1 border rounded ${
                    currentPageHoy === i + 1
                        ? 'bg-blue-600 text-white'
                        : 'bg-white'
                }"
            >
                ${i + 1}
            </button>
        `)
        .join('');
}

// ===============================
// TABLA HISTORICO
// ===============================

function renderTablaDetalleHistorico() {

    const tabla = document.getElementById(
        'tablaDetalleHistorico'
    );

    const startIndex = (
        (currentPageHistorico - 1) * pageSize
    );

    const paginatedItems = ventas.slice(
        startIndex,
        startIndex + pageSize
    );

    tabla.innerHTML = paginatedItems
        .map(v => `
            <tr>

                <td class="p-2 border">
                    ${v.fecha}
                </td>

                <td class="p-2 border">
                    ${v.ejecutivo}
                </td>

                <td class="p-2 border">
                    ${v.tipo}
                </td>

                <td class="p-2 border">
                    $${Number(v.monto).toLocaleString()}
                </td>

                <td class="p-2 border">

                    <button
                        onclick="editarVenta(${v.id})"
                        class="text-blue-600 font-bold mr-2"
                    >
                        Editar
                    </button>

                    <button
                        onclick="prepararEliminar(${v.id})"
                        class="text-red-600 font-bold"
                    >
                        Eliminar
                    </button>

                </td>

            </tr>
        `)
        .join('');

    renderPaginacionHistorico(ventas.length);
}

function renderPaginacionHistorico(totalItems) {

    const controls = document.getElementById(
        'paginationControls'
    );

    const totalPages = Math.ceil(
        totalItems / pageSize
    );

    controls.innerHTML = Array
        .from({ length: totalPages }, (_, i) => `
            <button
                onclick="changePageHistorico(${i + 1})"
                class="px-3 py-1 border rounded ${
                    currentPageHistorico === i + 1
                        ? 'bg-blue-600 text-white'
                        : 'bg-white'
                }"
            >
                ${i + 1}
            </button>
        `)
        .join('');
}

// ===============================
// PAGINACION
// ===============================

function changePageHoy(page) {

    currentPageHoy = page;

    renderTablaDetalleHoy();
}

function changePageHistorico(page) {

    currentPageHistorico = page;

    renderTablaDetalleHistorico();
}

// ===============================
// EDITAR
// ===============================

function editarVenta(id) {

    const venta = ventas.find(
        v => v.id === id
    );

    if(!venta) return;

    ventaEditandoId = id;

    document.getElementById('ejecutivo').value =
        venta.ejecutivo;

    document.getElementById('tipo').value =
        venta.tipo;

    document.getElementById('monto').value =
        venta.monto;

    document.getElementById('btnSubmit').innerText =
        'Actualizar Venta';

    document
        .getElementById('btnCancelar')
        .classList
        .remove('hidden');

    document.getElementById('formTitle').innerText =
        'Editando Venta';

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function resetForm() {

    ventaEditandoId = null;

    document.getElementById('btnSubmit').innerText =
        'Registrar Venta';

    document
        .getElementById('btnCancelar')
        .classList
        .add('hidden');

    document.getElementById('formTitle').innerText =
        'Nueva Venta';

    document.getElementById('ventaForm').reset();
}

document.getElementById('btnCancelar').onclick =
    resetForm;

// ===============================
// ELIMINAR
// ===============================

function prepararEliminar(id) {

    ventaEliminarId = id;

    document.getElementById('modalTitulo').innerText =
        'Confirmar Eliminación';

    document
        .getElementById('modalConfirmar')
        .classList
        .remove('hidden');
}

document.getElementById('btnLimpiar').onclick = () => {

    ventaEliminarId = null;

    document.getElementById('modalTitulo').innerText =
        'Confirmar Borrado Total';

    document
        .getElementById('modalConfirmar')
        .classList
        .remove('hidden');
};

document
    .getElementById('btnConfirmarAccion')
    .onclick = async () => {

        const clave = document
            .getElementById('inputClave')
            .value;

        if(clave !== '221286') {
            alert('Clave incorrecta');
            return;
        }

        // BORRAR TODO
        if(ventaEliminarId === null) {

            const { error } = await supabaseClient
                .from('ventas')
                .delete()
                .neq('id', 0);

            if(error) {
                console.error(error);
                alert('Error borrando ventas');
                return;
            }
        }

        // BORRAR UNA
        else {

            const { error } = await supabaseClient
                .from('ventas')
                .delete()
                .eq('id', ventaEliminarId);

            if(error) {
                console.error(error);
                alert('Error eliminando venta');
                return;
            }
        }

        cerrarModal();

        await cargarVentas();
    };

// ===============================
// TABLAS EJECUTIVOS
// ===============================

function renderTablaEjecutivo(tableId, data) {

    const tabla = document.getElementById(tableId);

    const tipos = [
        "Línea Nueva",
        "Portabilidad",
        "Hogar",
        "Equipos",
        "Accesorios"
    ];

    let html = `
        <thead>
            <tr class="bg-gray-200">

                <th class="p-2 border">
                    Ejecutivo
                </th>

                ${tipos.map(t => `
                    <th class="p-2 border">
                        ${t.split(' ')[0]}
                    </th>
                `).join('')}

            </tr>
        </thead>

        <tbody>
    `;

    ejecutivos.forEach(e => {

        html += `
            <tr>

                <td class="p-2 border font-bold">
                    ${e}
                </td>
        `;

        tipos.forEach(t => {

            const total = data
                .filter(v =>
                    v.ejecutivo === e &&
                    v.tipo === t
                )
                .reduce(
                    (sum, v) =>
                        sum + Number(v.monto),
                    0
                );

            html += `
                <td class="p-2 border">
                    $${total.toLocaleString()}
                </td>
            `;
        });

        html += `</tr>`;
    });

    html += `</tbody>`;

    tabla.innerHTML = html;
}

// ===============================
// MODAL
// ===============================

function cerrarModal() {

    document
        .getElementById('modalConfirmar')
        .classList
        .add('hidden');

    document.getElementById('inputClave').value = '';
}

// ===============================
// INIT
// ===============================

window.onload = cargarVentas;

