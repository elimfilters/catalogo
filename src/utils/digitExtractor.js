module.exports = {
    extract: (code) => {
        if (!code) return "0000";
        // Elimina caracteres no alfanuméricos y toma los últimos 4
        const clean = code.replace(/[^a-zA-Z0-9]/g, '');
        return clean.slice(-4);
    }
};
