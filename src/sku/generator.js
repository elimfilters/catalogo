module.exports = {
    create: (prefix, digits) => {
        // Asegura el formato EL8 + 100...
        return `${prefix}${digits}`;
    }
};
