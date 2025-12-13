(function($) {
    'use strict';
    let filterData = null;
    
    $(document).ready(function() {
        // Manejar el envío del nuevo formulario de búsqueda
        $('.efs-search-form').on('submit', function(e) {
            e.preventDefault();
            // Buscar el input dentro de este formulario específico
            const input = $(this).find('input').val().trim();
            const type = 'part'; // Por defecto es búsqueda de parte en este diseño

            if (input) {
                // Redirigir a la página de resultados
                window.location.href = efsData.resultsUrl + '?type=' + type + '&q=' + encodeURIComponent(input);
            }
        });

        // La lógica de la página de resultados (part_results) se mantiene igual
        // ... (resto del código igual para loadResults, etc.)
        if ($('#efs-results-root').length) {
            loadResults();
        }
        
        // Download PDF binding
        $(document).on('click', '.efs-download', generatePDF);
        
        // Results tabs logic
        $(document).on('click', '.efs-results-tab', function() {
            const tab = $(this).data('tab');
            $('.efs-results-tab').removeClass('active');
            $('.efs-results-panel').removeClass('active');
            $(this).addClass('active');
            $('#results-' + tab).addClass('active');
        });
    });

    // ... (Mantén el resto de las funciones: loadResults, searchPart, displayResults, etc. del archivo original) ...
    // Asegúrate de copiar las funciones auxiliares del archivo original aquí abajo
    
    function loadResults() {
        const params = new URLSearchParams(window.location.search);
        const type = params.get('type') || 'part';
        const query = params.get('q');
        
        if (!query) return; // Si no hay query, no hace nada (se queda en la página de resultados vacía)
        
        showLoading();
        // ... lógica existente ...
        if (type === 'part') searchPart(query);
    }
    
    // ... (Copia aquí las funciones searchPart, tryFallback, displayResults, etc. tal cual estaban)
    function searchPart(query) {
        const url = efsData.apiUrl + '/detect/' + encodeURIComponent(query);
        $.ajax({
            url: url, method: 'GET', timeout: 10000,
            success: function(resp) {
                if (resp.success) { filterData = resp; displayResults(resp); } 
                else { tryFallback(query); }
            },
            error: function() { tryFallback(query); }
        });
    }

    function tryFallback(query) {
        const url = efsData.apiUrl + '/catalog/search?q=' + encodeURIComponent(query);
        $.ajax({
            url: url, method: 'GET', timeout: 10000,
            success: function(resp) {
                if (resp.success) { filterData = resp; displayResults(resp); } 
                else { showError('No results found'); }
            },
            error: function() { showError('Connection error'); }
        });
    }

    // Mantén las funciones de displayResults y PDF tal cual tu archivo original para no romper la página de resultados
    // Solo hemos cambiado cómo se inicia la búsqueda desde la home.

    function showLoading() {
        $('#efs-results-root').html('<div class="efs-loading"><div class="efs-spinner"></div><p style="color:#aaa;">Searching...</p></div>');
    }
    
    function showError(msg) {
        $('#efs-results-root').html('<div class="efs-error"><h2 style="color:#d4af37;margin-bottom:16px;">Error</h2><p>' + esc(msg) + '</p></div>');
    }

    // Helper functions
    function esc(text) { if (!text) return ''; return $('<div>').text(text).html(); }
    
    // ... Asegúrate de incluir generatePDF y formatLabel aquí ...
    // Para simplificar, si no cambiaste la lógica de PDF, deja esas funciones igual.

})(jQuery);
