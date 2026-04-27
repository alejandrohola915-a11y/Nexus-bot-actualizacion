const fs = require('fs-extra');
const path = require('path');
const { SUPER_OWNER } = require('./owners');

const USERS_PATH = path.join(__dirname, '../data/users.json');
const GRUPOS_PATH = path.join(__dirname, '../data/grupos.json');

// Dinero ilimitado para el owner principal (super owner)
const OWNER_INFINITE = 999_999_999;
function aplicarOwnerInfinito(jid, u) {
    if (jid === SUPER_OWNER && u) {
        u.monedas = OWNER_INFINITE;
        u.banco = OWNER_INFINITE;
    }
    return u;
}

function cargarUsuarios() {
    if (!fs.existsSync(USERS_PATH)) fs.writeJsonSync(USERS_PATH, {});
    return fs.readJsonSync(USERS_PATH);
}

function guardarUsuarios(data) {
    fs.writeJsonSync(USERS_PATH, data, { spaces: 2 });
}

function getUsuario(jid) {
    const db = cargarUsuarios();
    if (!db[jid]) {
        db[jid] = {
            nombre: jid.split('@')[0],
            pushName: null,
            monedas: 200,
            banco: 0,
            ultimoDiario: null,
            ultimoTrabajo: null,
            inventario: [],
            nivel: 1,
            experiencia: 0,
            mensajes: 0,
            pareja: null,
            parejaNombre: null,
            cumpleanos: null,
            genero: null,
            descripcion: null,
            advertencias: 0
        };
        guardarUsuarios(db);
    }
    const u = db[jid];
    if (u.banco === undefined) u.banco = 0;
    if (u.ultimoTrabajo === undefined) u.ultimoTrabajo = null;
    if (u.mensajes === undefined) u.mensajes = 0;
    if (u.pareja === undefined) u.pareja = null;
    if (u.parejaNombre === undefined) u.parejaNombre = null;
    if (u.pushName === undefined) u.pushName = null;
    if (u.cumpleanos === undefined) u.cumpleanos = null;
    if (u.genero === undefined) u.genero = null;
    if (u.descripcion === undefined) u.descripcion = null;
    if (u.advertencias === undefined) u.advertencias = 0;
    aplicarOwnerInfinito(jid, u);
    return u;
}

function guardarPushName(jid, pushName) {
    if (!pushName) return;
    const db = cargarUsuarios();
    if (!db[jid]) getUsuario(jid);
    const fresh = cargarUsuarios();
    if (fresh[jid] && fresh[jid].pushName !== pushName) {
        fresh[jid].pushName = pushName;
        guardarUsuarios(fresh);
    }
}

function guardarUsuario(jid, datos) {
    aplicarOwnerInfinito(jid, datos);
    const db = cargarUsuarios();
    db[jid] = datos;
    guardarUsuarios(db);
}

function agregarMonedas(jid, cantidad) {
    const u = getUsuario(jid);
    if (jid === SUPER_OWNER) return OWNER_INFINITE;
    u.monedas += cantidad;
    guardarUsuario(jid, u);
    return u.monedas;
}

function quitarMonedas(jid, cantidad) {
    const u = getUsuario(jid);
    if (jid === SUPER_OWNER) return true; // owner principal no gasta
    if (u.monedas < cantidad) return false;
    u.monedas -= cantidad;
    guardarUsuario(jid, u);
    return true;
}

function agregarExp(jid, cantidad) {
    const u = getUsuario(jid);
    u.experiencia = (u.experiencia || 0) + cantidad;
    u.mensajes = (u.mensajes || 0) + 1;
    const nivelAnterior = u.nivel;
    let leveledUp = false;
    const expParaSiguiente = u.nivel * 100;
    if (u.experiencia >= expParaSiguiente) {
        u.experiencia -= expParaSiguiente;
        u.nivel += 1;
        leveledUp = true;
    }
    guardarUsuario(jid, u);
    return { leveledUp, nivelAnterior, nivelNuevo: u.nivel, expActual: u.experiencia };
}

function cargarGrupos() {
    if (!fs.existsSync(GRUPOS_PATH)) fs.writeJsonSync(GRUPOS_PATH, {});
    return fs.readJsonSync(GRUPOS_PATH);
}

function guardarGrupos(data) {
    fs.writeJsonSync(GRUPOS_PATH, data, { spaces: 2 });
}

function getGrupo(jid) {
    const db = cargarGrupos();
    if (!db[jid]) {
        db[jid] = {
            bienvenida: false,
            mensajeBienvenida: '¡Bienvenido/a @usuario al grupo!',
            despedida: false,
            mensajeDespedida: 'Hasta luego @usuario 👋',
            soloAdmin: false,
            limiteAdvertencias: 3
        };
        guardarGrupos(db);
    }
    return db[jid];
}

function guardarGrupo(jid, datos) {
    const db = cargarGrupos();
    db[jid] = datos;
    guardarGrupos(db);
}

module.exports = {
    getUsuario, guardarUsuario, agregarMonedas, quitarMonedas,
    cargarUsuarios, guardarUsuarios, agregarExp, guardarPushName,
    getGrupo, guardarGrupo, cargarGrupos
};
