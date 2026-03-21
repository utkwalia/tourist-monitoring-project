import re

with open("style.css", "r") as f:
    css = f.read()

# 1. Replace the :root block
root_pattern = r":root\s*\{.*?(?=\}\s*\n\s*\.dark-theme)"
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

    /* Theme variables (Dark Glassmorphism Enforced) */
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
    --theme-item-bg: rgba(255, 255, 255, 0.08);
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
    --glass-bg: rgba(255, 255, 255, 0.05);
    --glass-border: rgba(255, 255, 255, 0.1);
    --shadow-sm: 0 4px 15px rgba(0, 0, 0, 0.1);
    --shadow-md: 0 8px 25px rgba(0, 0, 0, 0.15);
    --shadow-lg: 0 12px 35px rgba(0, 0, 0, 0.2);"""
css = re.sub(root_pattern, root_replacement, css, flags=re.DOTALL)


# 2. Replace controls-panel
cp_pattern = r"\.controls-panel\s*\{(.*?)\}"
cp_replacement = """\.controls-panel {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 380px;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color: var(--theme-text);
    padding: 0;
    height: 100%;
    overflow-y: visible;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: -5px 0 20px rgba(0, 0, 0, 0.3);
    z-index: 2;
}"""
css = re.sub(cp_pattern, cp_replacement, css, count=1, flags=re.DOTALL)


# 3. Replace .panel-section
ps_pattern = r"\.panel-section\s*\{\s*margin-bottom[^}]+\}\s*\.panel-section:last-child\s*\{[^}]+\}"
ps_replacement = """.panel-section {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 18px;
    margin: 15px;
    margin-bottom: 2rem;
    box-shadow: var(--shadow-sm);
}

.panel-section:last-child {
    margin-bottom: 30px;
}"""
css = re.sub(ps_pattern, ps_replacement, css, count=1)


# 4. Strip redundant css from mobile panel-section
m_ps_pattern = r"\.panel-section\s*\{\s*order:\s*6;.*?\}"
m_ps_replacement = """.panel-section {
        order: 6;
        margin-left: 0 !important;
        margin-right: 0 !important;
        margin-bottom: 15px !important;
        border-radius: 24px !important;
    }"""
css = re.sub(m_ps_pattern, m_ps_replacement, css, count=1, flags=re.DOTALL)


# 5. Add glows
glow_h3 = r"\.panel-section h3 i\s*\{\s*color:\s*var\(--theme-accent\);\s*\}"
glow_h3_repl = """.panel-section h3 i {
    color: var(--theme-accent);
    text-shadow: 0 0 10px rgba(49, 208, 199, 0.5);
}"""
css = re.sub(glow_h3, glow_h3_repl, css, count=1)

glow_sos = r"\.sos-slide-label\s*\{\s*(.*?)pointer-events:\s*none;\s*\}"
glow_sos_repl = r".sos-slide-label {\n\1pointer-events: none;\n    text-shadow: 0 0 8px rgba(231, 76, 60, 0.8);\n}"
css = re.sub(glow_sos, glow_sos_repl, css, count=1, flags=re.DOTALL)


with open("style.css", "w") as f:
    f.write(css)

print("CSS update completed successfully!")
