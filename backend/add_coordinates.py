#!/usr/bin/env python3
"""
Script to add GPS coordinates to all landmarks in seed_data.py
"""

# GPS Coordinates for all landmarks
LANDMARK_COORDINATES = {
    # Norway
    "The Old Town of Fredrikstad": (59.2167, 10.9500),
    "Preikestolen (Pulpit Rock)": (58.9863, 6.1909),
    "Bryggen": (60.3975, 5.3245),
    "Nidaros Cathedral": (63.4268, 10.3966),
    "Geirangerfjord": (62.1009, 7.0940),
    "Vigeland Sculpture Park": (59.9270, 10.7007),
    "Northern Lights": (69.6492, 18.9553),  # Tromsø as central location
    "Lofoten Islands": (68.2155, 13.6090),
    "Akershus Fortress": (59.9075, 10.7360),
    "Trolltunga": (60.1242, 6.7400),
    
    # France (examples - need to populate all)
    "Eiffel Tower": (48.8584, 2.2945),
    "Louvre Museum": (48.8606, 2.3376),
    "Arc de Triomphe": (48.8738, 2.2950),
    "Notre-Dame Cathedral": (48.8530, 2.3499),
    "Palace of Versailles": (48.8049, 2.1204),
    "Mont Saint-Michel": (48.6361, -1.5115),
    "Sacré-Cœur": (48.8867, 2.3431),
    "Château de Chambord": (47.6163, 1.5170),
    "Pont du Gard": (43.9475, 4.5353),
    "Carcassonne": (43.2061, 2.3632),
}

if __name__ == "__main__":
    print("GPS Coordinates Ready")
    print(f"Total landmarks with coordinates: {len(LANDMARK_COORDINATES)}")
    for name, (lat, lon) in list(LANDMARK_COORDINATES.items())[:5]:
        print(f"  {name}: {lat}, {lon}")
