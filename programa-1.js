// programa.js
// Script modular para la vista principal del programa

document.addEventListener('DOMContentLoaded', function() {
    // Aquí puedes agregar la lógica para generar el contenido dinámico
    // Ejemplo:
    document.getElementById('programa-container').innerHTML = `
        <h1>Programa Semanal</h1>
        <ul>
            <li>Presidente: <b>Ejemplo</b></li>
            <li>Consejero Auxiliar N°2: <b>Ejemplo</b></li>
            <li>Consejero Auxiliar N°3: <b>Ejemplo</b></li>
            <li>Oración de Inicio: <b>Ejemplo</b></li>
        </ul>
        <table border="1" cellpadding="8">
            <thead>
                <tr><th>Parte</th><th>Participante</th></tr>
            </thead>
            <tbody>
                <tr><td>Tesoros de la Biblia</td><td>Ejemplo</td></tr>
                <tr><td>Seamos Mejores Maestros</td><td>Ejemplo</td></tr>
                <tr><td>Nuestra Vida Cristiana</td><td>Ejemplo</td></tr>
            </tbody>
        </table>
    `;
    // Puedes reemplazar el contenido anterior por datos dinámicos
});
