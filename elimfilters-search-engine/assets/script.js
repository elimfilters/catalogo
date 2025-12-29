jQuery(document).ready(function($) {
    const hints = { 'part': 'Search by ELIMFILTERS or other part number', 'vin': 'Enter 17-character VIN', 'equipment': 'Enter equipment model or series' };
    $('.efs-tab').click(function() {
        $('.efs-tab').removeClass('active');
        $(this).addClass('active');
        $('.efs-input').attr('placeholder', hints[$(this).data('tab')]);
    });
});
