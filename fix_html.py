import re

html_path = 'index.html'
with open(html_path, 'r') as f:
    html = f.read()

# 1. Wrap the desktop panels in controls-scroll-area
button_end = '<i class="fas fa-chevron-right"></i>\n                </button>\n'
if button_end in html and '<div class="controls-scroll-area">' not in html:
    html = html.replace(button_end, button_end + '                <div class="controls-scroll-area">\n')
    
    panel_end = '<div id="audit-trail-list" class="smart-list"></div>\n                </div>\n            </div>'
    html = html.replace(panel_end, '<div id="audit-trail-list" class="smart-list"></div>\n                </div>\n                </div>\n            </div>')

# 2. Inject Mobile Middle Content after map-container
mobile_content = """
            <!-- Mobile Middle Content (Extracted for Flex Order) -->
            <div class="mobile-middle-content mobile-only">
                <!-- Status Cards -->
                <div class="mobile-status-cards">
                    <div class="mobile-status-card status-green">
                        <div class="status-icon"><i class="fas fa-check-circle"></i></div>
                        <div class="status-body">
                            <strong>All systems nominal</strong>
                            <span>Your safety circle is watching</span>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="mobile-quick-actions">
                    <div class="mobile-quick-action">
                        <i class="fas fa-share-nodes"></i>
                        <span>Share Live</span>
                    </div>
                    <div class="mobile-quick-action">
                        <i class="fas fa-microphone"></i>
                        <span>Record</span>
                    </div>
                    <div class="mobile-quick-action">
                        <i class="fas fa-route"></i>
                        <span>Route</span>
                    </div>
                    <div class="mobile-quick-action">
                        <i class="fas fa-triangle-exclamation"></i>
                        <span>Hazard</span>
                    </div>
                </div>
            </div>

            <!-- Mobile Bottom Utilities (Duplicated) -->
            <div class="mobile-bottom-utilities-wrapper mobile-only">
                <div class="panel-section">
                    <h3><i class="fas fa-suitcase"></i> Current Trip</h3>
                    <div id="mobile-trip-status" class="trip-status">
                        <p class="no-active">No active trip</p>
                        <button id="mobile-start-trip-btn" class="btn-secondary">
                            <i class="fas fa-plus"></i>
                            Start New Trip
                        </button>
                    </div>
                </div>
                <div class="panel-section">
                    <h3><i class="fas fa-users"></i> Safety Circle</h3>
                    <div id="mobile-safety-circle-list" class="contact-list"></div>
                    <button id="mobile-add-contact-btn" class="btn-secondary">
                        <i class="fas fa-user-plus"></i>
                        Add Contact
                    </button>
                </div>
            </div>
"""
map_end = '<div id="map" class="map-container"></div>'
if map_end in html and 'mobile-middle-content' not in html:
    html = html.replace(map_end, map_end + '\n' + mobile_content)

with open(html_path, 'w') as f:
    f.write(html)

print("index.html patched.")
