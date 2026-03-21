import re

def update_css():
    with open("style.css", "r") as f:
        css = f.read()

    # 1. Update :root to Light Mode with UI structural variables
    root_pattern = r":root\s*\{.*?(?=\}\s*\n\s*/\* \.dark-theme overrides)"
    root_replacement = """:root {
    /* Colors */
    --navy: #1a237e;
    --slate: #2c3e50;
    --charcoal: #2d2d2d;
    --teal: #008080;
    --emerald: #2ecc71;
    --red: #e74c3c;
    --amber: #f39c12;
    --soft-blue: #3498db;
    --white: #ffffff;
    --light-gray: #ecf0f1;
    --dark-gray: #34495e;

    /* Theme variables (Light Mode) */
    --theme-bg: linear-gradient(135deg, #f6f8fb, #e4ebf2);
    --theme-nav: #1a237e;
    --theme-text: #1f2a36;
    --theme-text-muted: #5b6b7a;
    --theme-surface: rgba(255, 255, 255, 0.95);
    --theme-surface-alt: #f2f5f9;
    --theme-card: rgba(255, 255, 255, 0.95);
    --theme-card-border: rgba(0, 0, 0, 0.08);
    --theme-map-overlay-bg: rgba(15, 23, 42, 0.85);
    --theme-map-overlay-text: #b8ffd1;
    --theme-heading: #1a237e;
    --theme-accent: #008080;
    --theme-item-bg: #ecf0f1;
    --theme-item-text: #2c3e50;
    --theme-item-muted: #5b6b7a;
    --theme-input-bg: #ffffff;
    --theme-input-border: #d7dee6;
    --theme-pill-bg: rgba(44, 62, 80, 0.08);
    --theme-pill-text: #2ecc71;
    --theme-warn-bg: #fff2e6;
    --theme-warn-text: #b94a00;
    --theme-btn-secondary-bg: #ffffff;
    --theme-btn-secondary-text: #1a237e;
    --theme-btn-secondary-border: #1a237e;
    --theme-btn-secondary-hover-bg: #1a237e;
    --theme-btn-secondary-hover-text: #ffffff;
    --theme-toggle-track: #cfd6de;
    --theme-toggle-thumb: #ffffff;
    --theme-modal-bg: #ffffff;
    --theme-modal-text: #2d2d2d;
    --theme-modal-heading: #1a237e;
    --theme-skeleton-1: #ecf0f1;
    --theme-skeleton-2: #e0e0e0;
    --theme-scrollbar-track: #ecf0f1;
    --theme-scrollbar-thumb: #008080;
    --theme-scrollbar-thumb-hover: #1a237e;
    
    /* Layout Variables (Glassmorphism structural mapping) */
    --theme-sidebar-bg: rgba(246, 248, 251, 0.85); /* Frosty light sidebar */
    --theme-pill-bg-gps-ok: #2ecc71;
    --theme-pill-text-gps-ok: #0b1a0f;

    /* Typography */
    --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-mono: 'Roboto Mono', 'SF Mono', monospace;
    --font-display: 'Lexend', sans-serif;

    /* Font weights */
    --weight-light: 300;
    --weight-regular: 400;
    --weight-medium: 500;
    --weight-semibold: 600;
    --weight-bold: 700;

    /* Effects */
    --glass-bg: rgba(255, 255, 255, 0.9);
    --glass-border: rgba(0, 0, 0, 0.1);
    --shadow-sm: 0 4px 15px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 8px 25px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 12px 35px rgba(0, 0, 0, 0.15);"""
    css = re.sub(root_pattern, root_replacement, css, count=1, flags=re.DOTALL)

    # 2. Add back .dark-theme right after :root
    dark_theme_block = """}

.dark-theme {
    --theme-bg: linear-gradient(135deg, #0b1520 0%, #030811 100%);
    --theme-nav: #0b132a;
    --theme-text: #ffffff;
    --theme-text-muted: #a3b3c2;
    --theme-surface: rgba(255, 255, 255, 0.05);
    --theme-surface-alt: #0f1b2d;
    --theme-card: rgba(255, 255, 255, 0.05);
    --theme-card-border: rgba(255, 255, 255, 0.1);
    --theme-map-overlay-bg: rgba(10, 16, 24, 0.85);
    --theme-map-overlay-text: #7df0b4;
    --theme-heading: #ffffff;
    --theme-accent: #31d0c7;
    --theme-item-bg: rgba(255, 255, 255, 0.08); /* Inner items */
    --theme-item-text: #ffffff;
    --theme-item-muted: #a3b3c2;
    --theme-input-bg: rgba(0, 0, 0, 0.2);
    --theme-input-border: rgba(255, 255, 255, 0.1);
    --theme-pill-bg: rgba(49, 208, 199, 0.12);
    --theme-pill-text: #7df0b4;
    --theme-warn-bg: rgba(231, 76, 60, 0.15);
    --theme-warn-text: #f0b37a;
    --theme-btn-secondary-bg: rgba(0, 0, 0, 0.2);
    --theme-btn-secondary-text: #ffffff;
    --theme-btn-secondary-border: rgba(255, 255, 255, 0.15);
    --theme-btn-secondary-hover-bg: rgba(255, 255, 255, 0.2);
    --theme-btn-secondary-hover-text: #ffffff;
    --theme-toggle-track: rgba(0, 0, 0, 0.3);
    --theme-toggle-thumb: #e5e7eb;
    --theme-modal-bg: rgba(15, 23, 42, 0.95);
    --theme-modal-text: #ffffff;
    --theme-modal-heading: #ffffff;
    --theme-skeleton-1: rgba(255, 255, 255, 0.05);
    --theme-skeleton-2: rgba(255, 255, 255, 0.1);
    --theme-scrollbar-track: rgba(255, 255, 255, 0.02);
    --theme-scrollbar-thumb: rgba(255, 255, 255, 0.2);
    --theme-scrollbar-thumb-hover: rgba(255, 255, 255, 0.3);
    
    --theme-sidebar-bg: rgba(11, 21, 32, 0.85); /* Deep Navy Glass Sidebar */
    --theme-pill-bg-gps-ok: rgba(46, 204, 113, 0.15);
    --theme-pill-text-gps-ok: #2ecc71;
    
    --glass-bg: rgba(255, 255, 255, 0.05);
    --glass-border: rgba(255, 255, 255, 0.1);
    --shadow-sm: 0 4px 15px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 8px 25px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 12px 35px rgba(0, 0, 0, 0.5);
}"""
    css = re.sub(r"(?<=--shadow-lg: 0 12px 35px rgba\(0, 0, 0, 0\.15\);)\s*\}", dark_theme_block, css, count=1)

    # 3. Fix controls-panel background to use variable
    cp_pattern = r"background:\s*rgba\(11,\s*21,\s*32,\s*0\.85\);\s*/\*\s*Tinted Deep Navy Glassmorphism to counter bright map\s*\*/"
    cp_repl = "background: var(--theme-sidebar-bg);"
    css = re.sub(cp_pattern, cp_repl, css)

    # 4. Fix panel-section background to use variable
    ps_pattern = r"\.panel-section\s*\{\s*background:\s*rgba\(255,\s*255,\s*255,\s*0\.05\);"
    ps_repl = ".panel-section {\n    background: var(--theme-card);"
    css = re.sub(ps_pattern, ps_repl, css)

    # 5. Fix coordinate-display.gps-ok colors
    cd_pattern = r"\.coordinate-display\.gps-ok\s*\{\s*background:\s*var\(--emerald\);\s*color:\s*#0b1a0f;"
    cd_repl = ".coordinate-display.gps-ok {\n    background: var(--theme-pill-bg-gps-ok);\n    color: var(--theme-pill-text-gps-ok);"
    css = re.sub(cd_pattern, cd_repl, css)

    # 6. Fix .sos-slide-progress artifact
    sp_pattern = r"\.sos-slide-progress\s*\{\s*position:\s*absolute;\s*top:\s*0;\s*left:\s*0;\s*height:\s*100%;\s*background:\s*rgba\(255, 255, 255, 0\.2\);"
    sp_repl = ".sos-slide-progress {\n    position: absolute;\n    top: 0;\n    left: 0;\n    height: 100%;\n    width: 0;\n    background: rgba(255, 255, 255, 0.2);"
    css = re.sub(sp_pattern, sp_repl, css)

    with open("style.css", "w") as f:
        f.write(css)
    print("CSS updated accurately!")

update_css()
