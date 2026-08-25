// impresion.js
// Script modular para la vista de impresión

document.addEventListener('DOMContentLoaded', function() {
    // Aplicar estilos a todos los elementos
    const participantes = document.querySelectorAll('.participante, .participant-pair, td, th, p, span, div');
    participantes.forEach(element => {
        element.style.fontFamily = '"Arial Narrow", Arial, sans-serif';
        element.style.fontWeight = 'normal';
    });

    document.getElementById('print-btn').onclick = function() {
        window.print();
    };
    document.getElementById('close-btn').onclick = function() {
        window.close();
    };
    document.getElementById('download-png-btn').onclick = function() {
        // Aplicar estilos antes de generar la imagen
        const elements = document.querySelectorAll('.participante, .participant-pair, td, th, p, span, div');
        elements.forEach(element => {
            element.style.fontFamily = '"Arial Narrow", Arial, sans-serif';
            element.style.fontWeight = 'normal';
        });
        
        var container = document.getElementById('print-container');
        html2canvas(container, {scale:2, useCORS:true}).then(function(canvas) {
            var link = document.createElement('a');
            link.download = 'programa.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    };
    // Aquí puedes agregar la lógica para generar el contenido dinámico
    // Ejemplo:
    document.getElementById('print-container').innerHTML = '<h2>Ejemplo de Programa</h2><p>Contenido generado dinámicamente.</p>';
});
