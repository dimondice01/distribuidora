const fs = require('fs');
const path = 'c:/Users/subli/OneDrive/Documentos/Proyecto/distribuidora/src/components/Facturacion.jsx';
let content = fs.readFileSync(path, 'utf8');

const target = `<div className="logo-container">
                            <div className="logo-icon">N</div>
                            <div className="logo-text">NOAR <span style="color: #d97706; font-weight: 300; letter-spacing: 2px; font-size: 14px;">ERP</span></div>
                        </div>`;

const replacement = `<div className="logo-container">
                            \${logoUrl ? \`
                                <img src="\${logoUrl}" alt="Logo" style="max-height: 40px; max-width: 150px; object-contain: left;">
                            \` : \`
                                <div className="logo-icon">\${companyName[0].toUpperCase()}</div>
                                <div className="logo-text">\${companyName}</div>
                            \`}
                        </div>`;

const newContent = content.replace(target, replacement);

if (content !== newContent) {
    fs.writeFileSync(path, newContent);
    console.log('Facturacion.jsx parchado con éxito.');
} else {
    console.log('No se encontró el bloque de logo o ya está parchado.');
}
