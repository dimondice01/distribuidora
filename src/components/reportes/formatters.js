export const formatCurrency = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value || 0);

export const formatCurrencyCompact = (value) => new Intl.NumberFormat('es-AR', { notation: 'compact', style: 'currency', currency: 'ARS', maximumFractionDigits: 1 }).format(value || 0);

export function calcularDeltaPercent(actual, anterior) {
    if (!anterior) return null;
    return ((actual - anterior) / Math.abs(anterior)) * 100;
}
