# WanderMark - Authoritative Countries Data
# This is the SINGLE SOURCE OF TRUTH for all countries in the app.
# Total: 100 countries across 5 display continents (20 per continent)
#
# IMPORTANT FOR FUTURE AGENTS:
# - Always check the DATABASE for current state, not this file alone
# - The DB may have been updated independently via migration scripts
# - Use: python3 -c "..." with motor to query actual DB counts
# - Display continents differ from DB continents:
#     DB "North America" + "South America" → Display "Americas"
#     DB "Oceania" → Display "Oceania & Island Paradises"
#
# Last verified against DB: March 2026
# Previous state: 66 countries, 796 landmarks

COUNTRIES_DATA = [
    # ========== EUROPE (20) ==========
    # DB continent: "Europe" → Display: "Europe"
    # Existing (16):
    {"country_id": "norway", "name": "Norway", "continent": "Europe"},
    {"country_id": "france", "name": "France", "continent": "Europe"},
    {"country_id": "italy", "name": "Italy", "continent": "Europe"},
    {"country_id": "uk", "name": "United Kingdom", "continent": "Europe"},
    {"country_id": "spain", "name": "Spain", "continent": "Europe"},
    {"country_id": "greece", "name": "Greece", "continent": "Europe"},
    {"country_id": "germany", "name": "Germany", "continent": "Europe"},
    {"country_id": "portugal", "name": "Portugal", "continent": "Europe"},
    {"country_id": "netherlands", "name": "Netherlands", "continent": "Europe"},
    {"country_id": "switzerland", "name": "Switzerland", "continent": "Europe"},
    {"country_id": "austria", "name": "Austria", "continent": "Europe"},
    {"country_id": "croatia", "name": "Croatia", "continent": "Europe"},
    {"country_id": "denmark", "name": "Denmark", "continent": "Europe"},
    {"country_id": "iceland", "name": "Iceland", "continent": "Europe"},
    {"country_id": "sweden", "name": "Sweden", "continent": "Europe"},
    {"country_id": "finland", "name": "Finland", "continent": "Europe"},
    # New (4):
    {"country_id": "turkey", "name": "Turkey", "continent": "Europe"},
    {"country_id": "ireland", "name": "Ireland", "continent": "Europe"},
    {"country_id": "hungary", "name": "Hungary", "continent": "Europe"},
    {"country_id": "czech_republic", "name": "Czech Republic", "continent": "Europe"},

    # ========== ASIA (20) ==========
    # DB continent: "Asia" → Display: "Asia"
    # Existing (14, after removing UAE and moving Maldives to Oceania):
    {"country_id": "japan", "name": "Japan", "continent": "Asia"},
    {"country_id": "china", "name": "China", "continent": "Asia"},
    {"country_id": "thailand", "name": "Thailand", "continent": "Asia"},
    {"country_id": "india", "name": "India", "continent": "Asia"},
    {"country_id": "vietnam", "name": "Vietnam", "continent": "Asia"},
    {"country_id": "south_korea", "name": "South Korea", "continent": "Asia"},
    {"country_id": "indonesia", "name": "Indonesia", "continent": "Asia"},
    {"country_id": "malaysia", "name": "Malaysia", "continent": "Asia"},
    {"country_id": "singapore", "name": "Singapore", "continent": "Asia"},
    {"country_id": "philippines", "name": "Philippines", "continent": "Asia"},
    {"country_id": "cambodia", "name": "Cambodia", "continent": "Asia"},
    {"country_id": "nepal", "name": "Nepal", "continent": "Asia"},
    {"country_id": "sri_lanka", "name": "Sri Lanka", "continent": "Asia"},
    {"country_id": "taiwan", "name": "Taiwan", "continent": "Asia"},
    # New (6):
    {"country_id": "laos", "name": "Laos", "continent": "Asia"},
    {"country_id": "mongolia", "name": "Mongolia", "continent": "Asia"},
    {"country_id": "bhutan", "name": "Bhutan", "continent": "Asia"},
    {"country_id": "georgia", "name": "Georgia", "continent": "Asia"},
    {"country_id": "uzbekistan", "name": "Uzbekistan", "continent": "Asia"},
    {"country_id": "kyrgyzstan", "name": "Kyrgyzstan", "continent": "Asia"},

    # ========== AFRICA (20) ==========
    # DB continent: "Africa" → Display: "Africa"
    # Existing (8, after moving Mauritius and Seychelles to Oceania):
    {"country_id": "egypt", "name": "Egypt", "continent": "Africa"},
    {"country_id": "south_africa", "name": "South Africa", "continent": "Africa"},
    {"country_id": "morocco", "name": "Morocco", "continent": "Africa"},
    {"country_id": "kenya", "name": "Kenya", "continent": "Africa"},
    {"country_id": "tanzania", "name": "Tanzania", "continent": "Africa"},
    {"country_id": "botswana", "name": "Botswana", "continent": "Africa"},
    {"country_id": "namibia", "name": "Namibia", "continent": "Africa"},
    {"country_id": "tunisia", "name": "Tunisia", "continent": "Africa"},
    # New (12):
    {"country_id": "ghana", "name": "Ghana", "continent": "Africa"},
    {"country_id": "rwanda", "name": "Rwanda", "continent": "Africa"},
    {"country_id": "uganda", "name": "Uganda", "continent": "Africa"},
    {"country_id": "ethiopia", "name": "Ethiopia", "continent": "Africa"},
    {"country_id": "senegal", "name": "Senegal", "continent": "Africa"},
    {"country_id": "zimbabwe", "name": "Zimbabwe", "continent": "Africa"},
    {"country_id": "zambia", "name": "Zambia", "continent": "Africa"},
    {"country_id": "mozambique", "name": "Mozambique", "continent": "Africa"},
    {"country_id": "ivory_coast", "name": "Ivory Coast", "continent": "Africa"},
    {"country_id": "malawi", "name": "Malawi", "continent": "Africa"},
    {"country_id": "lesotho", "name": "Lesotho", "continent": "Africa"},
    {"country_id": "eswatini", "name": "Eswatini", "continent": "Africa"},

    # ========== AMERICAS (20) ==========
    # DB continent: "North America" or "South America" → Display: "Americas"
    # Existing (16):
    {"country_id": "usa", "name": "United States", "continent": "North America"},
    {"country_id": "canada", "name": "Canada", "continent": "North America"},
    {"country_id": "mexico", "name": "Mexico", "continent": "North America"},
    {"country_id": "brazil", "name": "Brazil", "continent": "South America"},
    {"country_id": "peru", "name": "Peru", "continent": "South America"},
    {"country_id": "argentina", "name": "Argentina", "continent": "South America"},
    {"country_id": "chile", "name": "Chile", "continent": "South America"},
    {"country_id": "colombia", "name": "Colombia", "continent": "South America"},
    {"country_id": "ecuador", "name": "Ecuador", "continent": "South America"},
    {"country_id": "costa_rica", "name": "Costa Rica", "continent": "North America"},
    {"country_id": "cuba", "name": "Cuba", "continent": "North America"},
    {"country_id": "jamaica", "name": "Jamaica", "continent": "North America"},
    {"country_id": "dominican_republic", "name": "Dominican Republic", "continent": "North America"},
    {"country_id": "panama", "name": "Panama", "continent": "North America"},
    {"country_id": "bahamas", "name": "Bahamas", "continent": "North America"},
    {"country_id": "barbados", "name": "Barbados", "continent": "North America"},
    # New (4):
    {"country_id": "uruguay", "name": "Uruguay", "continent": "South America"},
    {"country_id": "bolivia", "name": "Bolivia", "continent": "South America"},
    {"country_id": "belize", "name": "Belize", "continent": "North America"},
    {"country_id": "saint_lucia", "name": "Saint Lucia", "continent": "North America"},

    # ========== OCEANIA & ISLAND PARADISES (20) ==========
    # DB continent: "Oceania" → Display: "Oceania & Island Paradises"
    # Existing (7, after removing Tonga):
    {"country_id": "australia", "name": "Australia", "continent": "Oceania"},
    {"country_id": "new_zealand", "name": "New Zealand", "continent": "Oceania"},
    {"country_id": "fiji", "name": "Fiji", "continent": "Oceania"},
    {"country_id": "french_polynesia", "name": "French Polynesia", "continent": "Oceania"},
    {"country_id": "cook_islands", "name": "Cook Islands", "continent": "Oceania"},
    {"country_id": "samoa", "name": "Samoa", "continent": "Oceania"},
    {"country_id": "vanuatu", "name": "Vanuatu", "continent": "Oceania"},
    # Transferred from other continents (4):
    {"country_id": "maldives", "name": "Maldives", "continent": "Oceania"},
    {"country_id": "mauritius", "name": "Mauritius", "continent": "Oceania"},
    {"country_id": "seychelles", "name": "Seychelles", "continent": "Oceania"},
    {"country_id": "hawaii", "name": "Hawaii", "continent": "Oceania"},
    # New (9):
    {"country_id": "madagascar", "name": "Madagascar", "continent": "Oceania"},
    {"country_id": "cape_verde", "name": "Cape Verde", "continent": "Oceania"},
    {"country_id": "papua_new_guinea", "name": "Papua New Guinea", "continent": "Oceania"},
    {"country_id": "palau", "name": "Palau", "continent": "Oceania"},
    {"country_id": "solomon_islands", "name": "Solomon Islands", "continent": "Oceania"},
    {"country_id": "new_caledonia", "name": "New Caledonia", "continent": "Oceania"},
    {"country_id": "guam", "name": "Guam", "continent": "Oceania"},
    {"country_id": "comoros", "name": "Comoros", "continent": "Oceania"},
    {"country_id": "reunion", "name": "Reunion", "continent": "Oceania"},
]

# Helper: get country by ID
def get_country(country_id):
    return next((c for c in COUNTRIES_DATA if c["country_id"] == country_id), None)

# Countries that are NEW (not yet in DB)
NEW_COUNTRY_IDS = [
    # Europe
    "turkey", "ireland", "hungary", "czech_republic",
    # Asia
    "laos", "mongolia", "bhutan", "georgia", "uzbekistan", "kyrgyzstan",
    # Africa
    "ghana", "rwanda", "uganda", "ethiopia", "senegal", "zimbabwe",
    "zambia", "mozambique", "ivory_coast", "malawi", "lesotho", "eswatini",
    # Americas
    "uruguay", "bolivia", "belize", "saint_lucia",
    # Oceania
    "hawaii", "madagascar", "cape_verde", "papua_new_guinea", "palau",
    "solomon_islands", "new_caledonia", "guam", "comoros", "reunion",
]

# Countries being MOVED to different continent
CONTINENT_TRANSFERS = {
    "maldives": "Oceania",      # Was: Asia
    "mauritius": "Oceania",     # Was: Africa
    "seychelles": "Oceania",    # Was: Africa
}

# Countries being REMOVED
REMOVED_COUNTRY_IDS = ["uae", "tonga"]
