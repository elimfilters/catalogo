<?php
/**
 * Plugin Name: ELIMFILTERS Search Professional V6.2
 * Version: 6.2.0
 * Author: ELIMFILTERS
 */
if (!defined('ABSPATH')) exit;
class ELIMFILTERS_Search_Professional {
    public static function init() {
        add_action('wp_enqueue_scripts', [new self, 'assets']);
        add_shortcode('part_search', [new self, 'render_search']);
        add_shortcode('part_results', [new self, 'render_results']);
    }
    public function assets() {
        wp_enqueue_style('efs-styles', plugins_url('assets/styles.css', __FILE__));
        wp_enqueue_script('efs-script', plugins_url('assets/script.js', __FILE__), array('jquery'), '6.2.0', true);
        wp_localize_script('efs-script', 'efsData', array(
            'apiUrl' => 'https://catalogo-production-7cef.up.railway.app/api',
            'resultsUrl' => home_url('/pagina-resultados/')
        ));
    }
    public function render_search() { return '<div class="efs-wrapper"><div class="efs-search-box"><div class="efs-tabs"><button class="efs-tab active" data-tab="part">PART NUMBER</button><button class="efs-tab" data-tab="vin">VIN</button><button class="efs-tab" data-tab="equipment">EQUIPMENT</button></div><div class="efs-content"><div class="efs-row"><input type="text" class="efs-input" placeholder="Search by ELIMFILTERS or other part number"><button class="efs-btn">SEARCH</button></div></div></div></div>'; }
    public function render_results() { return '<div id="efs-results-root"></div>'; }
}
add_action('plugins_loaded', ['ELIMFILTERS_Search_Professional', 'get_instance']); // Adaptado de v6
